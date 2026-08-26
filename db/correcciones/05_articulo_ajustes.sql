-- =========================================================
-- 0006 · Artículo: timestamps y limpieza de campos fuera de alcance
-- =========================================================


-- ---------------------------------------------------------
-- 1. FALTAN: created_at y updated_at
-- ---------------------------------------------------------
-- La interfaz `Articulo` del front (src/data/articulos.ts) los declara y la UI
-- los muestra. Sin estas columnas, esos campos llegan vacíos.
ALTER TABLE articulo ADD COLUMN created_at timestamp NOT NULL DEFAULT now();
ALTER TABLE articulo ADD COLUMN updated_at timestamp NOT NULL DEFAULT now();

-- updated_at automático: que no dependa de que cada UPDATE se acuerde de tocarlo.
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
-- 2. SE VAN: numero_lote y fecha_vencimiento
-- ---------------------------------------------------------
-- QUÉ PROBLEMA RESUELVE — dos, en realidad:
--
--   a) Están MAL NORMALIZADOS. Un artículo tiene N lotes, cada uno con su
--      propio vencimiento. Con estos campos en `articulo`, "Amoxicilina 500mg"
--      solo puede tener UN lote y UNA fecha en todo el sistema. Al recibir una
--      compra nueva habría que pisar los valores anteriores, perdiendo el
--      vencimiento del stock que TODAVÍA ESTÁ en el depósito. Justo el dato
--      que sirve para no vender algo vencido.
--
--   b) Están FUERA DE ALCANCE. Son HU-STK-05 "Control de Fechas de
--      Vencimiento", que no entra en el Sprint 1. El front no tiene esos campos.
--
-- CUANDO ENTRE HU-STK-05, el modelo correcto es:
--
--   CREATE TABLE lote (
--     id serial PRIMARY KEY,
--     articulo_id int NOT NULL REFERENCES articulo(id),
--     numero varchar(60) NOT NULL,
--     fecha_vencimiento date,
--     UNIQUE (articulo_id, numero)
--   );
--
--   ...y ficha_stock / movimiento_stock pasan a referenciar el lote, no el
--   artículo suelto.
--
-- ⚠️ Si prefieren no perder los datos que ya están cargados, comentar estas dos
--    líneas y dejar las columnas nullable y sin uso. Pero entonces hay que
--    documentar que NO se llenan, para que nadie las tome por buenas.
ALTER TABLE articulo DROP COLUMN numero_lote;
ALTER TABLE articulo DROP COLUMN fecha_vencimiento;


-- ---------------------------------------------------------
-- 3. Consistencia de nombres en los catálogos
-- ---------------------------------------------------------
-- Todos los catálogos usan `nombre` (rol, categoria, fabricante,
-- origen_movimiento, estado_orden_compra) menos dos, que quedaron con nombres
-- propios. Eso obliga a recordar caso por caso cómo se llama la columna al
-- escribir cada query.
ALTER TABLE unidad_medida RENAME COLUMN unidad    TO nombre;
ALTER TABLE forma_pago    RENAME COLUMN nom_forma TO nombre;

-- Nombre truncado: el front usa `plazoEntregaDias`, así que el mapper no tiene
-- que traducir nada raro.
ALTER TABLE proveedor RENAME COLUMN plazo_entrega_d_habitual TO plazo_entrega_dias;
