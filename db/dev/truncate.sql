-- =========================================================
-- UTILIDAD DE DESARROLLO — vaciar todas las tablas
-- =========================================================
-- Mantiene tablas, columnas, relaciones y enums. Reinicia los serial.
-- NO es una migración: vive en db/dev/ justamente para que el runner
-- de migraciones no lo ejecute nunca por accidente.
--
-- Uso: npm run db:reset  (migra desde cero + seeds)
--      o a mano: psql $DATABASE_URL -f db/dev/truncate.sql
-- =========================================================

TRUNCATE TABLE
  auditoria,
  orden_compra_detalle,
  orden_compra,
  estado_orden_compra,
  movimiento_stock_det,
  movimiento_stock_cab,
  ficha_stock,
  articulo,
  deposito,
  origen_movimiento,
  proveedor_forma_pago,
  forma_pago,
  proveedor,
  usuario,
  rol
RESTART IDENTITY
CASCADE;
