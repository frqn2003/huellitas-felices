-- =========================================================
-- SEED 01 · CATÁLOGOS
-- =========================================================
-- Estos datos NO son de prueba: sin ellos el sistema no funciona. Un artículo
-- necesita una categoría, un movimiento necesita un origen, una orden necesita
-- un estado.
--
-- Idempotente: se puede correr muchas veces sin duplicar (todo va con
-- ON CONFLICT DO NOTHING sobre la columna única de cada catálogo).
--
-- Corre DESPUÉS de las migraciones: usa los nombres de columna ya renombrados
-- en 0006 (forma_pago.nombre, unidad_medida.nombre) y `deposito` sin sucursal_id (0004).
-- =========================================================


-- ---------------------------------------------------------
-- ROLES
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
-- ESTADOS DE ORDEN DE COMPRA
-- ---------------------------------------------------------
-- `es_final` marca los estados desde los que ya no se puede transicionar. Es lo
-- que consulta puedeTransicionar() en el service de compras, en vez de tener la
-- máquina de estados hardcodeada en el código.
INSERT INTO estado_orden_compra (nombre, es_final) VALUES
  ('Pendiente',        false),
  ('Enviada',          false),
  ('Recibida Parcial', false),
  ('Recibida Total',   true),
  ('Cancelada',        true)
ON CONFLICT (nombre) DO NOTHING;

-- NOTA DE ALCANCE: 'Recibida Parcial' y 'Recibida Total' NO son alcanzables en
-- el Sprint 1. Solo se llega desde HU-COMP-03 (Recepción de Mercadería), que es
-- Sprint 2. Están para que la máquina de estados quede completa.


-- ---------------------------------------------------------
-- ORÍGENES DE MOVIMIENTO
-- ---------------------------------------------------------
-- Recordar: el enum `tipo` solo distingue ingreso/egreso. El "por qué" del
-- movimiento vive acá. Por eso transferencia y ajuste son ORÍGENES, no tipos:
-- una transferencia ES un egreso más un ingreso.
INSERT INTO origen_movimiento (nombre) VALUES
  -- Alcanzables en Sprint 1
  ('recepcion_compra'),
  ('venta'),
  ('transferencia'),
  ('ajuste'),
  ('merma'),
  -- Reservados para los módulos clínicos de sprints siguientes
  ('receta'),
  ('internacion'),
  ('urgencia'),
  ('cirugia'),
  ('practica'),
  ('vacunacion'),
  ('desparasitacion')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- FORMAS / CONDICIONES DE PAGO
-- ---------------------------------------------------------
-- UN SOLO catálogo para las dos preguntas: qué formas acepta un proveedor
-- (HU-PROV-01, N:M) y qué condición se pactó en una compra (HU-COMP-02, una
-- sola). Se expone por GET /api/formas-pago y GET /api/condiciones-pago.
--
-- Esta lista es la fuente de verdad: el front NO tiene su propia const. Los
-- acentos y los puntos son parte del valor, porque es el texto que se muestra.
--
-- 'Cuenta Corriente' ya no está: sin plazo era ambigua (cuenta corriente ES un
-- plazo). La corrección 10 migra los datos viejos a 'Cta. cte. 30 días'.
INSERT INTO forma_pago (nombre) VALUES
  ('Contado'),
  ('Cta. cte. 30 días'),
  ('Cta. cte. 60 días'),
  ('Transferencia'),
  ('Cheque a 30 días')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- CATEGORÍAS DE ARTÍCULO
-- ---------------------------------------------------------
-- El `prefijo` alimenta el trigger que genera el código: un artículo de
-- Medicamentos sale MED-000001. Por eso el prefijo es UNIQUE — dos categorías
-- con el mismo prefijo harían códigos ambiguos.
--
-- Los nombres son los que el front tiene en CATEGORIAS (src/data/articulos.ts).
INSERT INTO categoria (nombre, prefijo) VALUES
  ('Medicamentos', 'MED'),
  ('Insumos',      'INS'),
  ('Alimentos',    'ALI'),
  ('Accesorios',   'ACC')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- UNIDADES DE MEDIDA
-- ---------------------------------------------------------
-- Valores exactos de UNIDADES en src/data/articulos.ts.
INSERT INTO unidad_medida (nombre) VALUES
  ('Unidad'),
  ('Kg'),
  ('L'),
  ('mL'),
  ('Caja')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- FABRICANTES
-- ---------------------------------------------------------
-- Es catálogo y no dato de demo porque `articulo.fabricante_id` es NOT NULL:
-- sin al menos un fabricante no se puede dar de alta ningún artículo.
INSERT INTO fabricante (nombre, pais) VALUES
  ('Laboratorios Pharma S.A.', 'Argentina'),
  ('Nipro Medical',            'Japón'),
  ('PetFood Co',               'Argentina'),
  ('Vetmed Labs',              'Brasil')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- DEPÓSITOS (= sucursales, decisión D-B)
-- ---------------------------------------------------------
-- Las 3 sucursales del enunciado. Son datos de operación: sin depósitos no se
-- puede crear ninguna ficha de stock.
INSERT INTO deposito (nombre, ubicacion) VALUES
  ('Centro', 'Av. Principal 123'),
  ('Norte',  'Calle Norte 456'),
  ('Sur',    'Av. Sur 789')
ON CONFLICT (nombre) DO NOTHING;
