-- =========================================================
-- 0002 · CORRECCIÓN: fusionar `empleado` en `usuario`
-- =========================================================
-- POR QUÉ: el ERP es solo para empleados. No hay usuarios que no sean
-- empleados, ni empleados sin usuario: la relación 1:1 obliga a un JOIN
-- en cada consulta y no aporta nada.
--
-- Además el criterio de HU-SIS-01 describe UNA entidad, no dos:
--   "Campos: nombre, apellido, DNI, email, rol, sucursales asignadas y estado".
--
-- CONSECUENCIA EN EL FRONT (hacer al conectar Movimientos, Fase 5):
--   src/data/movimientos.ts → empleadoId→usuarioId, empleado→usuario,
--   EMPLEADOS→USUARIOS, EMPLEADO_ACTUAL→USUARIO_ACTUAL. Idem sus usos en
--   MovimientosTable.tsx, MovimientoFormModal.tsx y FiltrosMovimientos.tsx.
--   El endpoint GET /api/empleados pasa a ser GET /api/usuarios.
-- =========================================================

-- 1. usuario absorbe los datos personales de empleado
ALTER TABLE usuario ADD COLUMN nombre   varchar(80);
ALTER TABLE usuario ADD COLUMN apellido varchar(80);
ALTER TABLE usuario ADD COLUMN dni      varchar(20);

UPDATE usuario u
SET nombre   = e.nombre,
    apellido = e.apellido,
    dni      = e.dni
FROM empleado e
WHERE e.id = u.empleado_id;

ALTER TABLE usuario ALTER COLUMN nombre   SET NOT NULL;
ALTER TABLE usuario ALTER COLUMN apellido SET NOT NULL;
ALTER TABLE usuario ALTER COLUMN dni      SET NOT NULL;

-- 2. movimiento_stock.empleado_id → usuario_id
ALTER TABLE movimiento_stock ADD COLUMN usuario_id int;

UPDATE movimiento_stock m
SET usuario_id = u.id
FROM usuario u
WHERE u.empleado_id = m.empleado_id;

ALTER TABLE movimiento_stock ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE movimiento_stock
  ADD CONSTRAINT fk_movimiento_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE movimiento_stock DROP COLUMN empleado_id;

-- 3. Adiós empleado
ALTER TABLE usuario DROP COLUMN empleado_id;
DROP TABLE empleado;

COMMENT ON TABLE usuario IS 'Identidad única del sistema (HU-SIS-01). El ERP es interno: todo usuario es un empleado.';

-- 4. Previsto para Sprint 2 (HU-SIS-04 login, HU-SIS-03 multi-sucursal).
--    Se dejan comentados para que la forma esté decidida y no haya que migrar dos veces:
-- ALTER TABLE usuario ADD COLUMN password_hash varchar(255);
-- ALTER TABLE usuario ADD COLUMN debe_cambiar_password boolean NOT NULL DEFAULT true;
