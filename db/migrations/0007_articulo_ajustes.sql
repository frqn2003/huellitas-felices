-- =========================================================
-- 0007 · CORRECCIÓN: campos de artículo
-- =========================================================


-- ---------------------------------------------------------
-- 1. FALTABAN: imagen y timestamps
-- ---------------------------------------------------------
-- El front sube y muestra imagen del artículo (ArticuloFormModal.tsx:141,
-- ArticuloThumb.tsx) y muestra createdAt/updatedAt (interfaz Articulo en
-- src/data/articulos.ts). Ninguno existía en la base.
ALTER TABLE articulo ADD COLUMN imagen_url varchar(255);
ALTER TABLE articulo ADD COLUMN created_at timestamp NOT NULL DEFAULT now();
ALTER TABLE articulo ADD COLUMN updated_at timestamp NOT NULL DEFAULT now();

COMMENT ON COLUMN articulo.imagen_url IS 'URL del archivo subido. Vacío/NULL = el front muestra una huella.';

-- updated_at automático: que no dependa de que cada UPDATE se acuerde
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_articulo_updated_at
  BEFORE UPDATE ON articulo
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- ---------------------------------------------------------
-- 2. SE VAN: numero_lote y fecha_vencimiento
-- ---------------------------------------------------------
-- POR QUÉ: están mal normalizados y fuera de alcance.
--
--   Mal normalizados: un artículo tiene N lotes, cada uno con su propio
--   vencimiento. Con estos campos en `articulo`, "Amoxicilina 500mg" solo
--   puede tener UN lote y UNA fecha en todo el sistema, y al recibir una
--   compra nueva habría que sobreescribir la anterior — perdiendo el
--   vencimiento del stock que todavía está en el depósito.
--
--   Fuera de alcance: es HU-STK-05 "Control de Fechas de Vencimiento",
--   que no está en el Sprint 1. El front no tiene estos campos.
--
-- CUANDO ENTRE HU-STK-05, el modelo correcto es:
--   CREATE TABLE lote (
--     id serial PRIMARY KEY,
--     articulo_id int NOT NULL REFERENCES articulo(id),
--     numero varchar(60) NOT NULL,
--     fecha_vencimiento date,
--     UNIQUE (articulo_id, numero)
--   );
--   ... y ficha_stock/movimiento_stock pasan a referenciar el lote.
ALTER TABLE articulo DROP COLUMN numero_lote;
ALTER TABLE articulo DROP COLUMN fecha_vencimiento;


-- ---------------------------------------------------------
-- 3. categoria y unidad_medida: varchar libre → valores controlados
-- ---------------------------------------------------------
-- POR QUÉ: eran varchar sin restricción, así que cualquier string entraba.
-- El seed de prueba ya mostraba el problema: unidad_medida tenía 'caja' y
-- 'bolsa' en minúscula, mientras el front usa "Unidad" | "Kg" | "L" | "mL" |
-- "Caja" (CATEGORIAS y UNIDADES en src/data/articulos.ts). Con un typo o una
-- diferencia de mayúsculas, el filtro por categoría deja de encontrar filas.
--
-- Se normaliza a los valores EXACTOS del front y se cierra con CHECK.
-- Se eligió CHECK y no tabla catálogo porque son listas cerradas y cortas
-- que el front tiene hardcodeadas; si algún día hay que administrarlas
-- desde la UI, pasan a tabla.

UPDATE articulo SET categoria = 'Medicamentos' WHERE lower(categoria) LIKE 'medicamento%';
UPDATE articulo SET categoria = 'Insumos'      WHERE lower(categoria) LIKE 'insumo%';
UPDATE articulo SET categoria = 'Alimentos'    WHERE lower(categoria) LIKE 'aliment%';
UPDATE articulo SET categoria = 'Accesorios'   WHERE lower(categoria) LIKE 'accesorio%';

UPDATE articulo SET unidad_medida = 'Unidad' WHERE lower(unidad_medida) IN ('unidad', 'u');
UPDATE articulo SET unidad_medida = 'Kg'     WHERE lower(unidad_medida) IN ('kg', 'bolsa');
UPDATE articulo SET unidad_medida = 'L'      WHERE lower(unidad_medida) = 'l';
UPDATE articulo SET unidad_medida = 'mL'     WHERE lower(unidad_medida) = 'ml';
UPDATE articulo SET unidad_medida = 'Caja'   WHERE lower(unidad_medida) = 'caja';

-- Defensivo: si en la base del servidor hay articulos sin categoria, el
-- SET NOT NULL de abajo fallaria. Se les asigna la categoria mas generica.
UPDATE articulo SET categoria = 'Insumos' WHERE categoria IS NULL;

ALTER TABLE articulo ALTER COLUMN categoria SET NOT NULL;

ALTER TABLE articulo ADD CONSTRAINT ck_articulo_categoria
  CHECK (categoria IN ('Medicamentos', 'Insumos', 'Alimentos', 'Accesorios'));

ALTER TABLE articulo ADD CONSTRAINT ck_articulo_unidad
  CHECK (unidad_medida IN ('Unidad', 'Kg', 'L', 'mL', 'Caja'));

COMMENT ON COLUMN articulo.categoria IS 'Valores del front: CATEGORIAS en src/data/articulos.ts';
COMMENT ON COLUMN articulo.unidad_medida IS 'Valores del front: UNIDADES en src/data/articulos.ts';
