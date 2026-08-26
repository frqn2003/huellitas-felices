-- =========================================================
-- 11 · FALTA: movimiento_stock.cod_mov (el número MOV-XXXX)
-- =========================================================
-- QUÉ PROBLEMA RESUELVE — dos cosas, y la segunda es un bug de datos:
--
--   a) EL NÚMERO NO EXISTE EN LA BASE. Hoy lo arma el SELECT del repo con
--      'MOV-' || LPAD(id, 4). O sea que el "número de movimiento" es la PK
--      disfrazada. Un id es una clave interna, no un número de documento: si
--      alguien inserta desde otro lado, o si algún día se depuran filas, el
--      número cambia o se pisa. El criterio de HU-STK-04 pide "número asignado
--      por el sistema", y el sistema es la base.
--
--   b) DERIVARLO DEL id ROMPE EL AGRUPADOR. `src/data/movimientos.ts:9` dice
--      textual: "un movimiento grupal con varios artículos genera N registros
--      que COMPARTEN `numero`". Con 'MOV-' || id, un registro de 3 artículos
--      sale con tres números distintos (MOV-0007, MOV-0008, MOV-0009) y en la
--      pantalla se ven como tres movimientos que no tienen nada que ver.
--
-- CÓMO SE ASIGNA
--   Una vez por OPERACIÓN, no por fila: el service saca un nextval al empezar
--   la transacción y escribe el mismo `cod_mov` en las N filas que genera
--   (incluidas las dos puntas de una transferencia, que son una sola operación).
--   Por eso el trigger solo completa el valor cuando no vino informado — al
--   revés que en la orden de compra, donde una fila = un documento.
--
-- SI ALGÚN DÍA SE APLICA EL 07 (cabecera-detalle), esta columna se muda a la
-- cabecera y ahí el agrupador pasa a ser estructural en vez de un valor
-- repetido. Mientras el movimiento sea plano, esto es lo correcto.
-- =========================================================


CREATE SEQUENCE IF NOT EXISTS movimiento_stock_cod_seq;

-- Nullable al principio: la tabla ya tiene filas y hay que completarlas antes
-- de poder exigir el NOT NULL.
ALTER TABLE movimiento_stock ADD COLUMN cod_mov varchar(30);

COMMENT ON COLUMN movimiento_stock.cod_mov IS
  'Numero del movimiento (MOV-000001). Lo genera la base por secuencia. NO es unico '
  'por fila: las N lineas de un mismo registro comparten numero, y es asi a proposito '
  '(agrupador visual, ver src/data/movimientos.ts). El par egreso+ingreso de una '
  'transferencia tambien lo comparte: es una sola operacion.';


-- ---------------------------------------------------------
-- Backfill de lo que ya está cargado
-- ---------------------------------------------------------
-- A los movimientos viejos se les respeta el número que la aplicación venía
-- mostrando ('MOV-' || id), para que no cambie lo que alguien ya vio o anotó.
-- Se rellena a 6 dígitos, que es el formato del resto del sistema (OC-000001).
UPDATE movimiento_stock
SET cod_mov = 'MOV-' || LPAD(id::text, 6, '0')
WHERE cod_mov IS NULL;

ALTER TABLE movimiento_stock ALTER COLUMN cod_mov SET NOT NULL;

-- La secuencia arranca después del id más alto ya usado, así los números nuevos
-- no chocan con los del backfill.
SELECT setval(
  'movimiento_stock_cod_seq',
  GREATEST((SELECT COALESCE(max(id), 0) FROM movimiento_stock), 1)
);

-- Sin UNIQUE, justamente porque se repite entre las líneas de un mismo
-- movimiento. El índice sí hace falta: la pantalla busca por número.
CREATE INDEX idx_mov_cod ON movimiento_stock (cod_mov);


-- ---------------------------------------------------------
-- Red de seguridad
-- ---------------------------------------------------------
-- El número lo asigna el service (uno por operación). Este trigger solo cubre
-- el INSERT suelto desde el SQL Editor, para que nunca quede una fila sin
-- número: si `cod_mov` vino informado, no lo toca.
CREATE OR REPLACE FUNCTION fn_generar_cod_movimiento() RETURNS trigger AS $$
BEGIN
  IF NEW.cod_mov IS NULL OR NEW.cod_mov = '' THEN
    NEW.cod_mov := 'MOV-' || LPAD(nextval('movimiento_stock_cod_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_cod_movimiento
  BEFORE INSERT ON movimiento_stock
  FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_movimiento();
