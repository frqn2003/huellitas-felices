-- =========================================================
-- 0007 · Formas de pago del proveedor: 1:N → N:M (decisión D-A)
-- =========================================================
-- ⚠️ ESTA MIGRACIÓN IMPLEMENTA UNA DECISIÓN, no corrige un error.
--    Si el equipo cambia de opinión, no se corre y se revierte el front.
--
-- QUÉ PROBLEMA RESUELVE
--   `proveedor.forma_pago_id` es una FK simple: UNA forma de pago por proveedor.
--   Pero el front ya maneja varias (`formasPago: string[]`, commit 10de349), y
--   en la realidad un proveedor suele aceptar más de una: contado y cuenta
--   corriente, por ejemplo.
--
--   Con el modelo actual hay que elegir una y perder el resto.
--
-- CÓMO SE MODELA "VARIOS A VARIOS"
--   Un proveedor acepta N formas de pago, y una forma de pago la aceptan N
--   proveedores. Eso no entra en una columna: necesita una tabla intermedia
--   cuyas filas son los pares (proveedor, forma de pago). La PK compuesta
--   impide cargar el mismo par dos veces.
--
-- ⚠️ OJO: `orden_compra.forma_pago_id` NO se toca. Ahí sigue siendo una sola,
--    y está bien: el proveedor ACEPTA varias, pero cada orden se pacta con UNA.
--    Son dos conceptos distintos aunque compartan el catálogo.
-- =========================================================

CREATE TABLE proveedor_forma_pago (
  proveedor_id  int NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
  forma_pago_id int NOT NULL REFERENCES forma_pago(id),
  PRIMARY KEY (proveedor_id, forma_pago_id)
);

COMMENT ON TABLE proveedor_forma_pago IS
  'N:M — un proveedor acepta varias formas de pago (HU-PROV-01, decision D-A). '
  'ON DELETE CASCADE solo del lado proveedor: si se borrara un proveedor caen sus '
  'pares, pero una forma de pago del catalogo nunca se borra si esta en uso.';

CREATE INDEX idx_pfp_forma_pago ON proveedor_forma_pago (forma_pago_id);


-- ---------------------------------------------------------
-- Migrar los datos que ya existen
-- ---------------------------------------------------------
-- Cada proveedor arranca con la única forma de pago que tenía. Sin este paso,
-- al soltar la columna vieja se perdería el dato.
INSERT INTO proveedor_forma_pago (proveedor_id, forma_pago_id)
SELECT id, forma_pago_id
FROM proveedor
WHERE forma_pago_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Recién ahora se puede soltar la columna, con los datos ya copiados.
ALTER TABLE proveedor DROP COLUMN forma_pago_id;


-- ---------------------------------------------------------
-- Catálogo completo
-- ---------------------------------------------------------
-- Los 4 valores que usa el front. Hoy la tabla tiene 2.
-- Los acentos importan: el front manda "Cheque a 30 días" con tilde, y si el
-- valor guardado no coincide EXACTO el select no lo encuentra.
INSERT INTO forma_pago (nombre) VALUES
  ('Contado'),
  ('Cuenta Corriente'),
  ('Transferencia'),
  ('Cheque a 30 días')
ON CONFLICT (nombre) DO NOTHING;
