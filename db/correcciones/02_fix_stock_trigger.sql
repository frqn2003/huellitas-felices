-- =========================================================
-- 0003 · BUG: fn_actualizar_stock pierde egresos concurrentes
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--
-- La versión actual de la rama de egreso hace esto:
--
--     SELECT stock_actual - NEW.cantidad INTO v_stock_resultante ...   -- (1) lee
--     IF v_stock_resultante < 0 THEN RAISE EXCEPTION ...               -- (2) valida
--     UPDATE ficha_stock SET stock_actual = v_stock_resultante ...     -- (3) escribe
--
-- El SELECT de (1) no toma ningún lock. Con dos egresos de 8 al mismo tiempo
-- sobre un stock de 10:
--
--     T1 lee 10 → calcula 2 → valida OK
--     T2 lee 10 → calcula 2 → valida OK          (todavía no commiteó T1)
--     T1 escribe stock_actual = 2
--     T2 escribe stock_actual = 2   ← pisa con su valor viejo
--
-- Resultado: salieron 16 unidades del depósito y el sistema descontó 8.
-- Es un "lost update" clásico, y arruina justo el dato que este sistema
-- tiene que decir bien.
--
-- La rama de INGRESO ya estaba bien: `SET stock_actual = stock_actual + N`
-- se resuelve dentro del propio UPDATE, que sí toma lock y relee. El problema
-- aparece solo cuando el valor se calcula AFUERA y después se escribe.
--
-- CÓMO SE ARREGLA — dos capas, las dos necesarias:
--
--   1. Hacer el UPDATE atómico y validar DESPUÉS, con RETURNING. Así el
--      descuento se calcula sobre el valor real bajo lock.
--   2. Un CHECK en la tabla, como red de seguridad a nivel motor: aunque
--      alguien escriba en ficha_stock por fuera del trigger, no puede dejar
--      el stock negativo.
--
-- Además se le pone un ERRCODE propio al RAISE. Sin eso, la app tiene que
-- reconocer el error matcheando el texto en castellano del mensaje, que se
-- rompe con cualquier cambio de redacción (ver src/lib/http/errors.ts).
-- =========================================================


-- ---------------------------------------------------------
-- 1. Red de seguridad a nivel motor
-- ---------------------------------------------------------
-- Va primero: si los datos actuales ya violaran la regla, mejor enterarse acá.
ALTER TABLE ficha_stock
  ADD CONSTRAINT ck_ficha_stock_no_negativo CHECK (stock_actual >= 0);


-- ---------------------------------------------------------
-- 2. Trigger corregido
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_stock() RETURNS trigger AS $$
DECLARE
    v_stock_resultante decimal(12,2);
BEGIN
    IF NEW.tipo = 'egreso' THEN
        -- Descuento y lectura del resultado en UNA sola operación atómica.
        -- El UPDATE toma el lock de la fila y relee el valor actual, así que
        -- dos egresos simultáneos se serializan en vez de pisarse.
        UPDATE ficha_stock
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.ficha_stock_id
        RETURNING stock_actual INTO v_stock_resultante;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;

        -- La validación va DESPUÉS del descuento. No es un problema: estamos
        -- dentro de la transacción del INSERT, así que el RAISE hace ROLLBACK
        -- de todo, incluido este UPDATE.
        IF v_stock_resultante < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente: el movimiento dejaria stock negativo (disponible: %, egreso: %)',
                v_stock_resultante + NEW.cantidad,
                NEW.cantidad
                USING ERRCODE = 'HF001';
        END IF;

    ELSIF NEW.tipo = 'ingreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.ficha_stock_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;
    END IF;

    RETURN NULL;  -- AFTER trigger
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_actualizar_stock() IS
  'HU-STK-04. Actualiza ficha_stock.stock_actual y rechaza egresos que dejarian negativo. '
  'La APLICACION NO debe actualizar el stock: lo hace este trigger. '
  'ERRCODE HF001 = stock insuficiente, HF002 = ficha inexistente.';


-- ---------------------------------------------------------
-- 3. Que no se pueda editar ni borrar un movimiento
-- ---------------------------------------------------------
-- El trigger solo corre en INSERT. Si alguien hiciera UPDATE o DELETE de un
-- movimiento, el stock NO se recalcularía y quedaría desalineado para siempre.
-- Un movimiento es un hecho histórico: se corrige con un contra-movimiento.
CREATE OR REPLACE FUNCTION fn_movimiento_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de stock no se editan ni se borran: registra un movimiento inverso'
    USING ERRCODE = 'HF003';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movimiento_inmutable
  BEFORE UPDATE OR DELETE ON movimiento_stock
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_inmutable();
