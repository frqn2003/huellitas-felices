-- =========================================================
-- UTILIDAD DE DESARROLLO — vaciar todas las tablas
-- =========================================================
-- Mantiene tablas, columnas, relaciones y enums. Reinicia los serial.
-- NO es una migración: vive en db/dev/ justamente para que el runner de
-- migraciones no la ejecute nunca por accidente.
--
-- Uso:  psql "$DATABASE_URL" -f db/dev/truncate.sql
--       (o pegar el contenido en el SQL Editor de Supabase)
--
-- Después: npm run db:seed  para volver a cargar catálogos y demo.
--
-- ⚠️ No incluye movimiento_stock_cab / movimiento_stock_det: esas tablas solo
--    existen si se aplicó la migración pendiente 0008. Si se aplica, agregarlas.
-- =========================================================

TRUNCATE TABLE
  auditoria,
  orden_compra_detalle,
  orden_compra,
  movimiento_stock,
  ficha_stock,
  articulo,
  deposito,
  proveedor_forma_pago,
  proveedor,
  usuario,
  -- catálogos (si solo se quieren borrar los datos de demo, sacar de acá abajo)
  estado_orden_compra,
  origen_movimiento,
  forma_pago,
  categoria,
  unidad_medida,
  fabricante,
  rol
RESTART IDENTITY
CASCADE;

-- Las secuencias de los códigos no las toca TRUNCATE porque no pertenecen a
-- ninguna columna: son independientes. Se reinician a mano.
SELECT setval('articulo_cod_seq',     1, false);
SELECT setval('orden_compra_cod_seq', 1, false);
