-- =========================================================
-- 0004 · CORRECCIÓN: formas de pago pasa a tabla (decisión D-A)
-- =========================================================
-- POR QUÉ: `proveedor.forma_pago varchar(60)` admite UNA sola forma de pago,
-- pero el front ya maneja varias por proveedor (`formasPago: string[]`,
-- commit 10de349). Además, siendo varchar libre, entra cualquier string:
-- el seed tenía '30 dias' y 'contado' con formatos distintos.
--
-- Se reemplaza por catálogo + N:M, que es lo que el resto del modelo ya usa
-- (origen_movimiento, estado_orden_compra son catálogos).
-- =========================================================

CREATE TABLE forma_pago (
  id     serial PRIMARY KEY,
  nombre varchar(60) NOT NULL UNIQUE
);
COMMENT ON TABLE forma_pago IS 'Catálogo de formas de pago acordables con un proveedor (HU-PROV-01).';

CREATE TABLE proveedor_forma_pago (
  proveedor_id  int NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
  forma_pago_id int NOT NULL REFERENCES forma_pago(id),
  PRIMARY KEY (proveedor_id, forma_pago_id)
);
COMMENT ON TABLE proveedor_forma_pago IS 'N:M — un proveedor acepta varias formas de pago.';

-- Catálogo inicial (los valores que usa el front)
INSERT INTO forma_pago (nombre) VALUES
  ('Contado'),
  ('Cuenta Corriente'),
  ('Transferencia'),
  ('Cheque a 30 días')
ON CONFLICT (nombre) DO NOTHING;

-- Migración best-effort de los datos que hubiera en la columna vieja.
-- El varchar libre no mapea 1:1 con el catálogo, así que lo que no matchea
-- queda sin forma de pago y se corrige a mano desde la UI.
INSERT INTO proveedor_forma_pago (proveedor_id, forma_pago_id)
SELECT p.id, f.id
FROM proveedor p
JOIN forma_pago f ON lower(f.nombre) = lower(trim(p.forma_pago))
WHERE p.forma_pago IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE proveedor DROP COLUMN forma_pago;

-- Nombre truncado en el original: plazo_entrega_d_habitual → plazo_entrega_dias.
-- El front usa `plazoEntregaDias`; así el mapper no traduce nada raro.
ALTER TABLE proveedor RENAME COLUMN plazo_entrega_d_habitual TO plazo_entrega_dias;
