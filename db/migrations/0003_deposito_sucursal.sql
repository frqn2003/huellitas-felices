-- =========================================================
-- 0003 · CORRECCIÓN: depósito = sucursal (decisión D-B)
-- =========================================================
-- POR QUÉ: `deposito.sucursal_id` era int NOT NULL sin tabla destino (FK
-- huérfana: no existe tabla `sucursal`). El equipo decidió que cada sucursal
-- tiene un depósito y solo uno, así que se colapsan en una sola entidad
-- en lugar de crear la tabla `sucursal`.
--
-- APOYO EN EL BACKLOG: HU-STK-02 dice "cada sucursal tiene su propio
-- depósito, con stock independiente del resto" → describe un 1:1.
--
-- ⚠️ DEUDA TÉCNICA DECLARADA, con punto de quiebre conocido:
--   HU-SUC-01 (Sprint 2+) le pide a la sucursal "horarios de atención y datos
--   fiscales", y HU-VTA-03 le cuelga una caja. Esos son atributos de sucursal,
--   no de depósito. Cuando entren esas HU hay que separar las tablas de nuevo.
--   Asentado en el acta del sprint.
--
-- ⚠️ CONSECUENCIA EN EL FRONT (el front modela 1 sucursal : N depósitos):
--   src/data/stock.ts        → eliminar SUCURSALES; Deposito pierde sucursalId
--                              y sucursal; depositosIniciales baja de 5 a 3.
--   DepositoFormModal.tsx:97 → quitar el select de sucursal (ya no aplica).
--   FiltrosStock.tsx:115     → el filtro por sucursal duplica al de depósito:
--                              quitarlo o renombrarlo a "Depósito".
--   Mientras se limpia, el API puede devolver `sucursal = nombre` para que la
--   tabla de stock siga funcionando sin cambios.
-- =========================================================

ALTER TABLE deposito DROP COLUMN sucursal_id;

ALTER TABLE deposito ADD CONSTRAINT uq_deposito_nombre UNIQUE (nombre);

COMMENT ON TABLE deposito IS 'Depósito = Sucursal (decisión D-B, Sprint 1). Una sucursal, un depósito. Se separa cuando entre HU-SUC-01.';
COMMENT ON COLUMN deposito.nombre IS 'Nombre de la sucursal/depósito: Centro, Norte, Sur';
