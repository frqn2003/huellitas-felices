-- #########################################################
-- ⛔ DESCARTADA — NO APLICAR
-- #########################################################
-- Este archivo agrega `articulo.proveedor_preferido_id`.
--
-- EL EQUIPO DECIDIÓ QUE EL PROVEEDOR PREFERIDO SE CALCULA, NO SE GUARDA:
-- se deriva de la última orden de compra no cancelada del artículo, con un
-- LEFT JOIN LATERAL en `articulo.repo.ts`. Así no hay un dato duplicado que
-- se pueda desincronizar del historial real de compras.
--
-- El criterio de HU-STK-01 ("proveedor preferido (opcional)") se sigue
-- cumpliendo: el campo se muestra en el formulario, de solo lectura.
--
-- Se conserva solo como registro de la decisión anterior.
-- #########################################################

-- =========================================================
-- 08 · FALTA: articulo.proveedor_preferido_id
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   El criterio de HU-STK-01 dice, textual:
--
--     "Campos: código único, nombre, descripción, unidad de medida, categoría
--      y PROVEEDOR PREFERIDO (opcional)."
--
--   La versión anterior del DDL tenía `proveedor_preferido_id`; la versión
--   nueva lo perdió al normalizar los catálogos. El front sí lo tiene: el
--   formulario de artículo muestra un select "Proveedor preferido"
--   (ArticuloFormModal.tsx) y la interfaz `Articulo` declara
--   `proveedorPreferido: Proveedor | null`.
--
--   Sin esta columna, ese campo del formulario no tiene dónde guardarse.
--
-- POR QUÉ ES NULLABLE
--   El criterio dice "(opcional)". Un artículo puede no tener proveedor
--   preferido: se compra a quien mejor cotice.
--
-- POR QUÉ NO LLEVA ON DELETE CASCADE
--   Borrar un proveedor NO debe borrar los artículos. De hecho los proveedores
--   nunca se borran: la baja es lógica (HU-PROV-01). Si algún día se intentara
--   un DELETE real, que falle es lo correcto.
-- =========================================================

ALTER TABLE articulo
  ADD COLUMN proveedor_preferido_id int REFERENCES proveedor(id);

COMMENT ON COLUMN articulo.proveedor_preferido_id IS
  'HU-STK-01, opcional. Proveedor sugerido para reponer este articulo. '
  'NO implica exclusividad: la orden de compra puede emitirse a cualquier otro.';

-- Índice sobre la FK: sin esto, filtrar artículos por proveedor recorre la
-- tabla entera. El filtro existe en el front (FiltrosArticulos.tsx).
CREATE INDEX idx_articulo_proveedor_preferido
  ON articulo (proveedor_preferido_id);
