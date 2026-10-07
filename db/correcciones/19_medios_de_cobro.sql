-- =========================================================
-- 19 · MEDIOS DE COBRO (HU-VTA-02)
-- =========================================================
--
-- POR QUÉ
--   HU-VTA-02 pide cobrar con efectivo, transferencia, tarjeta o billetera
--   virtual. Los medios de cobro son filas del catálogo `forma_pago` (mismo
--   catálogo que las condiciones de compra a proveedores). Hoy puede faltar
--   alguna: el seed original no trae "Efectivo" (el trigger de caja lo detecta
--   por nombre), "Tarjeta" ni "Billetera virtual".
--
-- QUÉ HACE
--   Inserta las filas que falten. No toca ni renombra las existentes.
--
-- NOTA
--   Estas filas también van a aparecer en los formularios de proveedores y de
--   órdenes de compra, porque comparten catálogo. Es una decisión de diseño del
--   schema (ver COMMENT de `forma_pago`), no de esta corrección.
--
-- Idempotente: se puede correr más de una vez.
-- =========================================================

INSERT INTO forma_pago (nombre) VALUES
  ('Efectivo'),
  ('Transferencia'),
  ('Tarjeta'),
  ('Billetera virtual')
ON CONFLICT (nombre) DO NOTHING;
