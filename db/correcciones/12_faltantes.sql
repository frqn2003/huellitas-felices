-- =========================================================
-- 12 · Lo que faltó del script del 26/8
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   El `correcciones.sql` del 26/8 se cortó a mitad de camino: aplicó las
--   tablas de movimiento y sus triggers, pero se salteó varias piezas de las
--   correcciones 02, 04 y 05. Este archivo repone exactamente eso, verificado
--   contra `db/schema.sql`.
--
-- ⚠️ REQUIERE la auditoría ya aplicada: usa `fn_auditoria()`, la función que
--    creó el equipo. Ya está en la base, así que este archivo se puede correr.
--
-- Cada bloque dice qué criterio de aceptación lo exige.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Red de seguridad del stock (faltó de la corrección 02)
-- ---------------------------------------------------------
-- El trigger `fn_actualizar_stock_det` ya rechaza los egresos que dejarían
-- negativo, pero eso protege el camino de la aplicación. Este CHECK protege la
-- tabla: aunque alguien escriba `ficha_stock` desde el SQL Editor, el stock no
-- puede quedar negativo.
ALTER TABLE ficha_stock
  ADD CONSTRAINT ck_ficha_stock_no_negativo CHECK (stock_actual >= 0);


-- ---------------------------------------------------------
-- 2. Nombre de artículo único entre activos (faltó de la 04)
-- ---------------------------------------------------------
-- HU-STK-01, textual: "valida que el nombre no se encuentre duplicado entre
-- artículos ACTIVOS". Hoy no hay NINGUNA restricción sobre `articulo.nombre`.
--
-- Índice PARCIAL (el WHERE): un artículo dado de baja libera su nombre, que es
-- lo que dice el criterio. Y lower() para que "Amoxicilina" y "amoxicilina"
-- cuenten como el mismo.
--
-- El service ya chequea antes para dar el mensaje lindo; esto es lo que
-- garantiza la regla cuando dos personas guardan al mismo tiempo.
CREATE UNIQUE INDEX uq_articulo_nombre_activo
  ON articulo (lower(nombre))
  WHERE estado = 'activo';


-- ---------------------------------------------------------
-- 3. Un artículo no se repite dentro de la misma orden (faltó de la 04)
-- ---------------------------------------------------------
-- Si se quiere más cantidad, se edita la línea existente.
CREATE UNIQUE INDEX uq_ocd_orden_articulo
  ON orden_compra_detalle (orden_compra_id, articulo_id);


-- ---------------------------------------------------------
-- 4. updated_at automático (faltó de la 05)
-- ---------------------------------------------------------
-- Las columnas están, pero sin el trigger `updated_at` queda para siempre igual
-- a `created_at`. El front lo muestra en el detalle del artículo.
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articulo_updated_at
  BEFORE UPDATE ON articulo
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- ---------------------------------------------------------
-- 5. Los movimientos no se editan ni se borran (faltó de la 02 y la 07)
-- ---------------------------------------------------------
-- POR QUÉ: el trigger que ajusta el stock corre solo en INSERT. Si alguien
-- hiciera UPDATE o DELETE de un movimiento, el stock NO se recalcularía y
-- quedaría desalineado para siempre, sin ningún aviso.
--
-- Un movimiento es un hecho histórico: se corrige con un contra-movimiento.
CREATE OR REPLACE FUNCTION fn_movimiento_inmutable() RETURNS trigger AS $$
BEGIN
  -- ÚNICA EXCEPCIÓN: enlazar las dos puntas de una transferencia.
  --
  -- Una transferencia son DOS cabeceras (un egreso en el depósito de origen y
  -- un ingreso en el de destino) que se apuntan mutuamente con
  -- `movimiento_vinculado_id`. Con una FK autorreferencial no hay orden de
  -- inserción que evite un UPDATE: la segunda cabecera todavía no existe cuando
  -- se inserta la primera.
  --
  -- Se permite ese UPDATE y SOLO ese: si cualquier otra columna cambió, se
  -- rechaza igual. Así el movimiento sigue siendo un hecho histórico inmutable.
  IF TG_OP = 'UPDATE'
     AND TG_TABLE_NAME = 'movimiento_stock_cab'
     AND OLD.movimiento_vinculado_id IS NULL
     AND NEW.movimiento_vinculado_id IS NOT NULL
     AND to_jsonb(NEW) - 'movimiento_vinculado_id'
       = to_jsonb(OLD) - 'movimiento_vinculado_id' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Los movimientos de stock no se editan ni se borran: registra un movimiento inverso'
    USING ERRCODE = 'HF003';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mov_cab_inmutable
  BEFORE UPDATE OR DELETE ON movimiento_stock_cab
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_inmutable();

-- El detalle no tiene excepción: nunca se edita ni se borra.
CREATE TRIGGER trg_mov_det_inmutable
  BEFORE UPDATE OR DELETE ON movimiento_stock_det
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_inmutable();

-- NOTA: la auditoría del movimiento ya está — el equipo la aplicó como
-- `trg_auditoria_movimiento_stock_cab AFTER INSERT`, con la función
-- `fn_auditoria()`. No se duplica acá.


-- ---------------------------------------------------------
-- 5.b FALTA: auditoría de la ficha de stock
-- ---------------------------------------------------------
-- HU-STK-02, textual: "registra en bitácora de auditoría cada alta o
-- modificación de ficha y cada transferencia".
--
-- Están auditadas articulo, deposito, movimiento_stock_cab, orden_compra,
-- proveedor y usuario. `ficha_stock` quedó afuera, y es donde vive el umbral
-- mínimo/crítico: cambiarlo altera cuándo salta la alerta de reposición, así
-- que es justo el tipo de cambio que hay que poder auditar.
--
-- Sin DELETE porque las fichas no se borran.
CREATE TRIGGER trg_auditoria_ficha_stock
  AFTER INSERT OR UPDATE ON ficha_stock
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 6. Limpieza: función huérfana
-- ---------------------------------------------------------
-- `fn_actualizar_stock()` es la versión vieja, la que tenía el bug de
-- concurrencia (leía el stock, calculaba afuera, y escribía un valor stale:
-- dos egresos simultáneos descontaban una sola vez). Su trigger murió con el
-- DROP de la tabla plana, así que hoy es código muerto en la base.
--
-- Se borra para que nadie la vuelva a enganchar por error. La versión buena es
-- `fn_actualizar_stock_det()`, que hace el UPDATE atómico con RETURNING.
DROP FUNCTION IF EXISTS fn_actualizar_stock();


-- ---------------------------------------------------------
-- 7. Fuera de alcance del Sprint 1: lote y vencimiento (decisión D1)
-- ---------------------------------------------------------
-- POR QUÉ SE VAN: ningún criterio de aceptación del Sprint 1 los menciona
-- —son HU-STK-05, Sprint 2— y no los usa nadie: cero ocurrencias de `lote` o
-- `vencimiento` en todo `src/`.
--
-- Además están mal normalizados: un artículo tiene N lotes, cada uno con su
-- vencimiento. Con estas columnas, "Amoxicilina 500mg" solo puede tener UN
-- lote en todo el sistema, y al recibir una compra nueva habría que pisar el
-- vencimiento del stock que todavía está en el depósito.
--
-- Cuando entre HU-STK-05, el modelo correcto es una tabla `lote`
-- (articulo_id, numero, fecha_vencimiento) y que el saldo se lleve por lote.
ALTER TABLE articulo DROP COLUMN IF EXISTS numero_lote;
ALTER TABLE articulo DROP COLUMN IF EXISTS fecha_vencimiento;

COMMIT;
