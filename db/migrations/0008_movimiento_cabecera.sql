-- =========================================================
-- 0008 · CORRECCIÓN: movimiento de stock en cabecera-detalle
-- =========================================================
-- POR QUÉ: el criterio de HU-STK-04 está redactado como una especificación
-- de dos tablas, textual:
--
--   "CABECERA del movimiento: número único generado por el sistema, fecha y
--    hora, depósito afectado, tipo de movimiento y usuario responsable.
--    DETALLE del movimiento: una o más líneas, cada una referenciando un
--    artículo y una cantidad; un mismo movimiento puede incluir varios
--    artículos (relación cabecera-detalle)."
--
-- El baseline tenía UNA tabla plana, y además le faltaba el campo `numero`
-- (MOV-XXXX) que el front usa como agrupador visual.
--
-- Dejarlo plano y solo agregar `numero` repetiría fecha_hora, tipo, usuario,
-- motivo y origen en las N filas de un mismo movimiento — violación de 2NF
-- que una cátedra de Sistemas III va a marcar.
--
-- EL FRONT NO SE TOCA: la vista v_movimiento_stock devuelve exactamente el
-- shape plano que ya consume (src/data/movimientos.ts).
--
-- ---------------------------------------------------------
-- CORRECCIÓN A UN ANÁLISIS ANTERIOR
-- ---------------------------------------------------------
-- En docs/backend/AJUSTES-DER.md se marcó como bloqueante (B4) que
-- `origen_id` fuera NOT NULL, asumiendo que Transferencia y Ajuste no tenían
-- origen documental. Con el DDL real a la vista, ESO ERA INCORRECTO:
--
--   · tipo_movimiento_stock es solo (ingreso, egreso) — 2 valores.
--   · transferencia y ajuste son ORÍGENES, no tipos: están en
--     origen_movimiento junto a venta, receta, cirugia, merma, etc.
--
-- El modelo de la base es más correcto que el del front: una transferencia
-- ES un egreso + un ingreso, y un ajuste ES un ingreso o un egreso. Todo
-- movimiento tiene siempre un origen, así que `origen_id NOT NULL` se queda.
--
-- CONSECUENCIA EN EL FRONT (Fase 5): src/data/movimientos.ts declara
--   TipoMovimiento = Ingreso | Egreso | Transferencia | Ajuste
-- y un mapa origenesPorTipo. Hay que reducir el tipo a Ingreso|Egreso y mover
-- Transferencia/Ajuste al selector de ORIGEN. Afecta a TipoMovimientoBadge.tsx,
-- FiltrosMovimientos.tsx y MovimientoFormModal.tsx.
-- =========================================================


-- ---------------------------------------------------------
-- 1. Secuencia para el número de movimiento
-- ---------------------------------------------------------
-- Con secuencia y no con MAX(numero)+1: dos requests simultáneos leerían
-- el mismo máximo y generarían el mismo número.
CREATE SEQUENCE seq_movimiento_numero START 1;


-- ---------------------------------------------------------
-- 2. Cabecera
-- ---------------------------------------------------------
CREATE TABLE movimiento_stock_cab (
  id                      serial PRIMARY KEY,
  numero                  varchar(30) NOT NULL UNIQUE,
  deposito_id             int NOT NULL REFERENCES deposito(id),
  tipo                    tipo_movimiento_stock NOT NULL,
  origen_id               int NOT NULL REFERENCES origen_movimiento(id),
  origen_entidad_id       int,
  fecha_hora              timestamp NOT NULL DEFAULT now(),
  usuario_id              int NOT NULL REFERENCES usuario(id),
  motivo                  varchar(255),
  movimiento_vinculado_id int REFERENCES movimiento_stock_cab(id)
);

COMMENT ON TABLE  movimiento_stock_cab IS 'HU-STK-04 cabecera. Un movimiento puede afectar varios articulos (ver detalle).';
COMMENT ON COLUMN movimiento_stock_cab.numero IS 'MOV-XXXX, generado por seq_movimiento_numero dentro de la transaccion.';
COMMENT ON COLUMN movimiento_stock_cab.origen_entidad_id IS 'FK polimorfica: id de la entidad origen segun origen_id (orden_compra, venta, etc.). No puede ser FK real; la integridad la valida la app.';
COMMENT ON COLUMN movimiento_stock_cab.movimiento_vinculado_id IS 'Enlaza el egreso en origen con el ingreso en destino de una transferencia.';

-- Una transferencia no puede vincularse consigo misma
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT ck_mov_no_autovinculado
  CHECK (movimiento_vinculado_id IS NULL OR movimiento_vinculado_id <> id);


-- ---------------------------------------------------------
-- 3. Detalle
-- ---------------------------------------------------------
CREATE TABLE movimiento_stock_det (
  id             serial PRIMARY KEY,
  movimiento_id  int NOT NULL REFERENCES movimiento_stock_cab(id) ON DELETE CASCADE,
  ficha_stock_id int NOT NULL REFERENCES ficha_stock(id),
  cantidad       decimal(12,2) NOT NULL,
  CONSTRAINT ck_mov_det_cantidad CHECK (cantidad > 0),
  CONSTRAINT uq_mov_det_ficha UNIQUE (movimiento_id, ficha_stock_id)
);

COMMENT ON TABLE movimiento_stock_det IS 'Lineas del movimiento. La cantidad es siempre POSITIVA: el signo lo determina tipo en la cabecera.';

CREATE INDEX idx_mov_det_movimiento ON movimiento_stock_det (movimiento_id);
CREATE INDEX idx_mov_det_ficha      ON movimiento_stock_det (ficha_stock_id);
CREATE INDEX idx_mov_cab_fecha      ON movimiento_stock_cab (fecha_hora DESC);
CREATE INDEX idx_mov_cab_deposito   ON movimiento_stock_cab (deposito_id);
CREATE INDEX idx_mov_cab_tipo       ON movimiento_stock_cab (tipo);


-- ---------------------------------------------------------
-- 4. Migrar los datos de la tabla plana
-- ---------------------------------------------------------
-- Cada fila vieja se convierte en una cabecera con una sola linea.
-- El deposito se resuelve por la ficha; el numero se deriva del id.
INSERT INTO movimiento_stock_cab
  (id, numero, deposito_id, tipo, origen_id, origen_entidad_id, fecha_hora, usuario_id, motivo)
SELECT
  m.id,
  'MOV-' || lpad(m.id::text, 4, '0'),
  f.deposito_id,
  m.tipo,
  m.origen_id,
  m.origen_entidad_id,
  m.fecha_hora,
  m.usuario_id,
  m.motivo
FROM movimiento_stock m
JOIN ficha_stock f ON f.id = m.ficha_stock_id;

-- Los vinculos, despues de que existan todas las cabeceras
UPDATE movimiento_stock_cab c
SET movimiento_vinculado_id = m.movimiento_vinculado_id
FROM movimiento_stock m
WHERE m.id = c.id AND m.movimiento_vinculado_id IS NOT NULL;

INSERT INTO movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
SELECT m.id, m.ficha_stock_id, m.cantidad
FROM movimiento_stock m;

-- Alinear los serial y la secuencia con los ids migrados
-- El tercer parametro de setval es `is_called`: en false, el proximo nextval
-- devuelve el valor seteado en vez de valor+1. Sin eso, sobre una base vacia
-- el primer movimiento saldria numerado MOV-0002.
SELECT setval(
  'movimiento_stock_cab_id_seq',
  GREATEST(COALESCE((SELECT MAX(id) FROM movimiento_stock_cab), 0), 1),
  (SELECT count(*) > 0 FROM movimiento_stock_cab)
);
SELECT setval(
  'seq_movimiento_numero',
  GREATEST(COALESCE((SELECT MAX(id) FROM movimiento_stock_cab), 0), 1),
  (SELECT count(*) > 0 FROM movimiento_stock_cab)
);

DROP TABLE movimiento_stock;


-- ---------------------------------------------------------
-- 5. Vista plana — el shape que el front ya consume
-- ---------------------------------------------------------
-- Con esto GET /api/movimientos-stock no cambia de forma y la UI de
-- Movimientos sigue funcionando sin tocarse.
CREATE VIEW v_movimiento_stock AS
SELECT
  d.id,
  c.numero,
  d.ficha_stock_id,
  c.deposito_id,
  c.origen_id,
  c.origen_entidad_id,
  c.tipo,
  d.cantidad,
  c.fecha_hora,
  c.usuario_id,
  c.motivo,
  c.movimiento_vinculado_id,
  c.id AS movimiento_id
FROM movimiento_stock_det d
JOIN movimiento_stock_cab c ON c.id = d.movimiento_id;

COMMENT ON VIEW v_movimiento_stock IS 'Listado plano (1 fila = 1 articulo) para el front. Las filas de un mismo movimiento comparten numero.';


-- ---------------------------------------------------------
-- 6. Auditoria del movimiento (venia pendiente de 0005)
-- ---------------------------------------------------------
CREATE TRIGGER tg_auditar_movimiento
  AFTER INSERT OR UPDATE OR DELETE ON movimiento_stock_cab
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('movimientos');
