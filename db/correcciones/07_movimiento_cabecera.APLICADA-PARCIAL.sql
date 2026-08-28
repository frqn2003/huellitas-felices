-- #########################################################
-- ⚠️ APLICADA PARCIALMENTE el 26/8 — NO volver a correr entera
-- #########################################################
-- QUÉ SÍ QUEDÓ APLICADO (verificado con `npm run db:dump`):
--   · movimiento_stock_cab + movimiento_stock_det
--   · movimiento_numero_seq + fn_generar_numero_movimiento + su trigger
--   · fn_actualizar_stock_det + trg_actualizar_stock_det
--   · la vista v_movimiento_stock
--   · DROP TABLE movimiento_stock (la tabla plana ya no existe)
--
-- QUÉ NO QUEDÓ APLICADO:
--   · trg_mov_cab_inmutable / trg_mov_det_inmutable → dependen de
--     fn_movimiento_inmutable, que viene de la corrección 02 (no aplicada)
--   · tg_auditar_movimiento → depende de fn_auditar, de la corrección 01
--     (no aplicada)
--
-- Esas dos piezas se reponen en `12_faltantes.sql`, después de la 01 y la 02.
-- #########################################################

-- =========================================================
-- 0008 · Movimiento de stock en cabecera-detalle
-- =========================================================
-- ⚠️ PENDIENTE DE DECISIÓN — por eso está en db/migrations/pendientes/,
--    donde el runner no la ve. Si se aprueba, moverla a db/migrations/.
--
-- QUÉ PROBLEMA RESUELVE
--   El criterio de HU-STK-04 está redactado como una especificación de dos
--   tablas, textual:
--
--     "CABECERA del movimiento: número único generado por el sistema, fecha y
--      hora, depósito afectado, tipo de movimiento y usuario responsable.
--      DETALLE del movimiento: una o más líneas, cada una referenciando un
--      artículo y una cantidad; un mismo movimiento puede incluir varios
--      artículos (relación cabecera-detalle)."
--
--   Hoy `movimiento_stock` es UNA tabla plana: una fila = un artículo. Y no
--   tiene el campo `numero` (MOV-XXXX) que el front usa como agrupador.
--
-- POR QUÉ NO ALCANZA CON AGREGAR `numero`
--   Porque repetiría fecha_hora, tipo, usuario, motivo y origen en las N filas
--   de un mismo movimiento. Si mañana hay que corregir el motivo de un
--   movimiento de 8 artículos, hay que tocar 8 filas y confiar en que ninguna
--   quede distinta. Es una violación de 2NF que una cátedra de Sistemas III
--   va a marcar.
--
-- EL FRONT NO SE TOCA
--   La vista `v_movimiento_stock` devuelve el mismo shape plano que ya consume
--   src/data/movimientos.ts.
--
-- ⚠️ LO MÁS DELICADO: LOS TRIGGERS
--   `trg_actualizar_stock` vive hoy sobre `movimiento_stock` y lee `NEW.tipo`.
--   Al partir la tabla, `tipo` queda en la CABECERA y la cantidad en el
--   DETALLE, así que el trigger tiene que mudarse al detalle y buscar el tipo
--   con un JOIN. Si esto se hace mal, el stock deja de actualizarse y nadie se
--   entera hasta que los números no cierran.
--
-- CÓMO PROBARLA ANTES DE APLICARLA EN SERIO
--   Contra una base descartable, no contra la de Supabase directamente.
-- =========================================================


-- ---------------------------------------------------------
-- 1. Secuencia del número de movimiento
-- ---------------------------------------------------------
CREATE SEQUENCE movimiento_numero_seq START 1;


-- ---------------------------------------------------------
-- 2. Cabecera
-- ---------------------------------------------------------
CREATE TABLE movimiento_stock_cab (
  id                      serial PRIMARY KEY,
  numero                  varchar(30) NOT NULL UNIQUE,
  deposito_id             int NOT NULL REFERENCES deposito(id),
  tipo                    tipo_movimiento_stock NOT NULL,
  origen_id               int NOT NULL REFERENCES origen_movimiento(id),
  origen_entidad_id       int,
  fecha_hora              timestamp NOT NULL DEFAULT now(),
  usuario_id              int NOT NULL REFERENCES usuario(id),
  motivo                  varchar(255),
  movimiento_vinculado_id int REFERENCES movimiento_stock_cab(id),
  CONSTRAINT ck_mov_no_autovinculado
    CHECK (movimiento_vinculado_id IS NULL OR movimiento_vinculado_id <> id)
);

COMMENT ON TABLE movimiento_stock_cab IS 'HU-STK-04 cabecera. Un movimiento puede afectar varios articulos.';

CREATE OR REPLACE FUNCTION fn_generar_numero_movimiento() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'MOV-' || LPAD(nextval('movimiento_numero_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_numero_movimiento
  BEFORE INSERT ON movimiento_stock_cab
  FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_movimiento();


-- ---------------------------------------------------------
-- 3. Detalle
-- ---------------------------------------------------------
CREATE TABLE movimiento_stock_det (
  id             serial PRIMARY KEY,
  movimiento_id  int NOT NULL REFERENCES movimiento_stock_cab(id) ON DELETE CASCADE,
  ficha_stock_id int NOT NULL REFERENCES ficha_stock(id),
  cantidad       decimal(12,2) NOT NULL,
  CONSTRAINT ck_mov_det_cantidad CHECK (cantidad > 0),
  CONSTRAINT uq_mov_det_ficha UNIQUE (movimiento_id, ficha_stock_id)
);

COMMENT ON TABLE movimiento_stock_det IS
  'Lineas del movimiento. La cantidad es siempre POSITIVA: el signo lo determina '
  '`tipo` en la cabecera.';

CREATE INDEX idx_mov_det_movimiento ON movimiento_stock_det (movimiento_id);
CREATE INDEX idx_mov_det_ficha      ON movimiento_stock_det (ficha_stock_id);
CREATE INDEX idx_mov_cab_fecha      ON movimiento_stock_cab (fecha_hora DESC);
CREATE INDEX idx_mov_cab_deposito   ON movimiento_stock_cab (deposito_id);


-- ---------------------------------------------------------
-- 4. Migrar los datos existentes
-- ---------------------------------------------------------
-- Cada fila plana se convierte en una cabecera con una sola línea.
-- El depósito sale de la ficha; el número se deriva del id para no gastar la
-- secuencia (que después se realinea).

-- El trigger de inmutabilidad de 0003 impide tocar la tabla vieja; se saca
-- primero porque igual la tabla se elimina al final.
DROP TRIGGER IF EXISTS trg_movimiento_inmutable ON movimiento_stock;
DROP TRIGGER IF EXISTS trg_actualizar_stock     ON movimiento_stock;
DROP TRIGGER IF EXISTS tg_auditar_movimiento    ON movimiento_stock;

INSERT INTO movimiento_stock_cab
  (id, numero, deposito_id, tipo, origen_id, origen_entidad_id, fecha_hora, usuario_id, motivo)
SELECT
  m.id,
  'MOV-' || LPAD(m.id::text, 6, '0'),
  f.deposito_id,
  m.tipo,
  m.origen_id,
  m.origen_entidad_id,
  m.fecha_hora,
  m.usuario_id,
  m.motivo
FROM movimiento_stock m
JOIN ficha_stock f ON f.id = m.ficha_stock_id;

-- Los vínculos, recién cuando existen todas las cabeceras
UPDATE movimiento_stock_cab c
SET movimiento_vinculado_id = m.movimiento_vinculado_id
FROM movimiento_stock m
WHERE m.id = c.id AND m.movimiento_vinculado_id IS NOT NULL;

INSERT INTO movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
SELECT m.id, m.ficha_stock_id, m.cantidad
FROM movimiento_stock m;

-- Realinear el serial y la secuencia.
-- El tercer parámetro de setval es `is_called`: en false, el próximo nextval
-- devuelve el valor seteado en vez de valor+1. Sin eso, sobre una tabla vacía
-- el primer movimiento saldría numerado MOV-000002.
SELECT setval(
  'movimiento_stock_cab_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM movimiento_stock_cab), 0), 1),
  (SELECT count(*) > 0 FROM movimiento_stock_cab)
);
SELECT setval(
  'movimiento_numero_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM movimiento_stock_cab), 0), 1),
  (SELECT count(*) > 0 FROM movimiento_stock_cab)
);

DROP TABLE movimiento_stock;


-- ---------------------------------------------------------
-- 5. El trigger de stock, mudado al detalle
-- ---------------------------------------------------------
-- Diferencia clave con la versión de 0003: `tipo` ya no está en NEW (vive en la
-- cabecera), así que hay que ir a buscarlo. El resto de la lógica es idéntica,
-- incluido el UPDATE atómico con RETURNING que evita el lost update.
CREATE OR REPLACE FUNCTION fn_actualizar_stock_det() RETURNS trigger AS $$
DECLARE
    v_tipo             tipo_movimiento_stock;
    v_stock_resultante decimal(12,2);
BEGIN
    SELECT tipo INTO v_tipo
    FROM movimiento_stock_cab
    WHERE id = NEW.movimiento_id;

    IF v_tipo = 'egreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.ficha_stock_id
        RETURNING stock_actual INTO v_stock_resultante;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;

        IF v_stock_resultante < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente: el movimiento dejaria stock negativo (disponible: %, egreso: %)',
                v_stock_resultante + NEW.cantidad, NEW.cantidad
                USING ERRCODE = 'HF001';
        END IF;

    ELSIF v_tipo = 'ingreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.ficha_stock_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_stock_det
  AFTER INSERT ON movimiento_stock_det
  FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_det();

-- Inmutabilidad, sobre las dos tablas nuevas
CREATE TRIGGER trg_mov_cab_inmutable
  BEFORE UPDATE OR DELETE ON movimiento_stock_cab
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_inmutable();

CREATE TRIGGER trg_mov_det_inmutable
  BEFORE UPDATE OR DELETE ON movimiento_stock_det
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_inmutable();

-- Auditoría sobre la cabecera (el detalle sin cabecera no significa nada)
CREATE TRIGGER tg_auditar_movimiento
  AFTER INSERT OR UPDATE OR DELETE ON movimiento_stock_cab
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('movimientos');


-- ---------------------------------------------------------
-- 6. Vista plana — el shape que el front ya consume
-- ---------------------------------------------------------
CREATE VIEW v_movimiento_stock AS
SELECT
  d.id,
  c.numero,
  d.ficha_stock_id,
  c.deposito_id,
  c.origen_id,
  c.origen_entidad_id,
  c.tipo,
  d.cantidad,
  c.fecha_hora,
  c.usuario_id,
  c.motivo,
  c.movimiento_vinculado_id,
  c.id AS movimiento_id
FROM movimiento_stock_det d
JOIN movimiento_stock_cab c ON c.id = d.movimiento_id;

COMMENT ON VIEW v_movimiento_stock IS
  'Listado plano (1 fila = 1 articulo) para el front. Las filas de un mismo '
  'movimiento comparten `numero`.';
