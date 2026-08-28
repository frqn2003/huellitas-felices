-- #########################################################
-- ⛔ DESCARTADA — NO APLICAR
-- #########################################################
-- Este archivo elimina `deposito.sucursal_id` bajo la decisión D-B
-- ("depósito = sucursal", una sucursal tiene un solo depósito).
--
-- EL EQUIPO DECIDIÓ LO CONTRARIO: son VARIOS depósitos por sucursal.
-- D-B queda revertida. Lo que va en su lugar es `13_sucursal.sql`, que crea la
-- tabla `sucursal` y convierte `deposito.sucursal_id` en una FK real.
--
-- Se conserva solo como registro de la decisión anterior.
-- #########################################################

-- =========================================================
-- 0004 · CORRECCIÓN: depósito = sucursal (decisión D-B)
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   `deposito.sucursal_id` es `int NOT NULL` y NO apunta a ninguna tabla: no
--   existe una tabla `sucursal`. Es una foreign key huérfana. Hoy hay que
--   inventar un número al insertar un depósito, y ese número no significa nada.
--
--   Esto bloquea HU-STK-02, que se llama literalmente "Fichas de Stock POR
--   SUCURSAL": no se puede agrupar por algo que no existe.
--
-- LA DECISIÓN DEL EQUIPO (D-B)
--   En vez de crear la tabla `sucursal`, se colapsan en una sola entidad: cada
--   sucursal tiene un depósito y solo uno, así que `deposito` ES la sucursal.
--
--   El backlog lo respalda: HU-STK-02 dice "cada sucursal tiene su propio
--   depósito, con stock independiente del resto" — describe un 1:1.
--
-- ⚠️ DEUDA TÉCNICA DECLARADA, con punto de quiebre conocido
--   HU-SUC-01 (Sprint 2+) le pide a la sucursal "horarios de atención y datos
--   fiscales", y HU-VTA-03 le cuelga una caja. Eso son atributos de sucursal,
--   no de depósito. Cuando entren esas HU hay que volver a separarlas.
--   Para Sprint 1 la simplificación es válida — pero va asentada en el acta.
--
-- ⚠️ IMPACTO EN EL FRONT (el front modela 1 sucursal : N depósitos)
--   src/data/stock.ts        → eliminar SUCURSALES; Deposito pierde sucursalId
--                              y sucursal; depositosIniciales baja de 5 a 3.
--   DepositoFormModal.tsx:97 → el select de sucursal ya no aplica, se quita.
--   FiltrosStock.tsx:115     → el filtro por sucursal duplica al de depósito.
--   Mientras se limpia, el API puede devolver `sucursal = nombre` para que la
--   tabla de stock siga funcionando sin tocarla.
-- =========================================================

ALTER TABLE deposito DROP COLUMN sucursal_id;

-- El nombre pasa a ser el identificador humano de la sucursal: Centro, Norte, Sur.
ALTER TABLE deposito ADD CONSTRAINT uq_deposito_nombre UNIQUE (nombre);

COMMENT ON TABLE deposito IS
  'Deposito = Sucursal (decision D-B, Sprint 1). Una sucursal, un deposito. '
  'Se vuelven a separar cuando entre HU-SUC-01.';
COMMENT ON COLUMN deposito.nombre IS 'Nombre de la sucursal/deposito: Centro, Norte, Sur.';
