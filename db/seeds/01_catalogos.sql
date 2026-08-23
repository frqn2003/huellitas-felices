-- =========================================================
-- SEED 01 · CATÁLOGOS (tablas de referencia fijas)
-- =========================================================
-- Idempotente: se puede correr varias veces sin duplicar.
-- Estos datos NO son de prueba: son parte del funcionamiento del sistema.
-- =========================================================


-- ---------------------------------------------------------
-- ROL
-- ---------------------------------------------------------
INSERT INTO rol (nombre) VALUES
  ('Administrador'),
  ('Gerente general'),
  ('Veterinario'),
  ('Recepcionista'),
  ('Personal de depósito'),
  ('Cajero')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- ESTADO_ORDEN_COMPRA  ← ESTO FALTABA Y ROMPÍA LA BASE
-- ---------------------------------------------------------
-- El DDL define `estado_id smallint NOT NULL REFERENCES estado_orden_compra(id)
-- DEFAULT 1`, pero la tabla nunca se poblaba. Resultado: TODO insert en
-- orden_compra fallaba con violacion de FK (no existe la fila id=1).
--
-- Los 5 estados son la "tabla de referencia fija" que pide HU-COMP-02.
-- es_final marca los estados desde los que ya no se puede transicionar,
-- y es lo que usa puedeTransicionar() en el service de compras.
INSERT INTO estado_orden_compra (id, nombre, es_final) VALUES
  (1, 'Pendiente',        false),
  (2, 'Enviada',          false),
  (3, 'Recibida Parcial', false),
  (4, 'Recibida Total',   true),
  (5, 'Cancelada',        true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('estado_orden_compra_id_seq', (SELECT MAX(id) FROM estado_orden_compra));

-- NOTA DE ALCANCE: 'Recibida Parcial' y 'Recibida Total' NO son alcanzables en
-- el Sprint 1. Solo se llega a ellas desde HU-COMP-03 (Recepcion de Mercaderia),
-- que es Sprint 2. Estan en el catalogo para que la maquina de estados quede
-- completa, pero ninguna transicion del Sprint 1 las produce.


-- ---------------------------------------------------------
-- ORIGEN_MOVIMIENTO
-- ---------------------------------------------------------
-- Recordar: `tipo` solo distingue ingreso/egreso. El "por que" del movimiento
-- vive aca. Por eso transferencia y ajuste son ORIGENES, no tipos.
--
-- Se limpian dos cosas del listado original:
--   · Estaban 'transferencia_sucursal' Y 'transferencia' (redundantes) →
--     queda 'transferencia', que es lo que usa el front.
--   · El comentario del DDL decia 'ajuste_manual' pero el insert ponia
--     'ajuste' → queda 'ajuste'.

-- Alcanzables en Sprint 1:
INSERT INTO origen_movimiento (nombre) VALUES
  ('recepcion_compra'),      -- ingreso por HU-COMP-03 / carga manual
  ('venta'),                 -- egreso
  ('transferencia'),         -- par egreso+ingreso entre depositos (HU-STK-02)
  ('ajuste'),                -- correccion manual de inventario
  ('merma')                  -- perdida, rotura, vencimiento
ON CONFLICT (nombre) DO NOTHING;

-- Reservados para sprints siguientes (modulos clinicos):
INSERT INTO origen_movimiento (nombre) VALUES
  ('receta'),
  ('internacion'),
  ('urgencia'),
  ('cirugia'),
  ('practica'),
  ('vacunacion'),
  ('desparasitacion')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- FORMA_PAGO
-- ---------------------------------------------------------
-- Ya se cargo en la migracion 0004 (necesitaba existir para migrar los datos
-- de la columna vieja). Se repite aca por si se corre el seed sobre una base
-- limpiada con db/dev/truncate.sql.
INSERT INTO forma_pago (nombre) VALUES
  ('Contado'),
  ('Cuenta Corriente'),
  ('Transferencia'),
  ('Cheque a 30 días')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- DEPOSITO (= sucursal, decision D-B)
-- ---------------------------------------------------------
-- Las 3 sucursales del enunciado. Son datos de operacion, no de prueba:
-- sin depositos no se puede crear ninguna ficha de stock.
INSERT INTO deposito (nombre, ubicacion) VALUES
  ('Centro', 'Av. Principal 123'),
  ('Norte',  'Calle Norte 456'),
  ('Sur',    'Av. Sur 789')
ON CONFLICT (nombre) DO NOTHING;
