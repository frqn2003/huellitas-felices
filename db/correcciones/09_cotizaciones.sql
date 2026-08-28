-- =========================================================
-- 09 · Cotizaciones (HU-COMP-02) — versión mínima
-- =========================================================
-- QUÉ CUBRE, Y NADA MÁS
--   El criterio de HU-COMP-02, textual:
--
--     "Antes de adjudicar, permite registrar y comparar cotizaciones de más de
--      un proveedor para los mismos artículos (precio y condiciones), como
--      parte del proceso de selección; la comparación queda documentada en la
--      orden emitida."
--
--   De ahí salen exactamente cuatro cosas que hay que poder guardar:
--     1. qué artículos se pidieron cotizar → `solicitud_cotizacion` + su detalle
--     2. qué ofreció cada proveedor        → `cotizacion` + su detalle
--     3. la condición de pago de cada oferta → `cotizacion.forma_pago_id`
--     4. cuál se adjudicó                  → `orden_compra.cotizacion_id` (ya existe)
--
--   Las dos cabeceras no son un lujo: sin la SOLICITUD no existe "los mismos
--   artículos" contra los cuales comparar, que es el corazón del criterio.
--
-- QUÉ SE DEJÓ AFUERA A PROPÓSITO (decisión del equipo: el flujo completo de
-- compras es de otro sprint)
--   · el código SC-000001 con su secuencia y trigger — el id alcanza para
--     identificar una solicitud dentro del sprint;
--   · `cotizacion_id_adjudicada` en la solicitud — la adjudicación ya queda
--     registrada del otro lado, en `orden_compra.cotizacion_id`;
--   · los 9 índices de conveniencia — quedan solo los 2 que sostienen las
--     consultas que el módulo realmente hace;
--   · fechas de validez, moneda, descuentos por cotización, estados
--     intermedios.
--
-- ⚠️ Requiere la auditoría aplicada (usa `fn_auditoria()`).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. La solicitud: qué se pidió cotizar
-- ---------------------------------------------------------
CREATE TABLE solicitud_cotizacion (
  id         serial PRIMARY KEY,
  usuario_id int NOT NULL REFERENCES usuario(id),
  fecha      timestamp NOT NULL DEFAULT now(),
  -- Abierta → Adjudicada | Cancelada. Como varchar con CHECK y no como enum ni
  -- tabla: son tres valores que no cambian y solo los usa esta pantalla.
  estado     varchar(20) NOT NULL DEFAULT 'Abierta',
  notas      text,
  CONSTRAINT ck_solicitud_estado
    CHECK (estado IN ('Abierta', 'Adjudicada', 'Cancelada'))
);

COMMENT ON TABLE solicitud_cotizacion IS
  'HU-COMP-02. Pedido de cotizacion: define LOS MISMOS ARTICULOS sobre los que '
  'despues se comparan las ofertas de varios proveedores.';

CREATE TABLE solicitud_detalle (
  id                serial PRIMARY KEY,
  solicitud_id      int NOT NULL REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE,
  articulo_id       int NOT NULL REFERENCES articulo(id),
  cantidad_estimada decimal(12,2) NOT NULL,
  nota              text,
  CONSTRAINT ck_sd_cantidad CHECK (cantidad_estimada > 0),
  -- Un artículo no se pide dos veces en la misma solicitud: si no, no se sabría
  -- cuál de las dos líneas está cotizando el proveedor.
  CONSTRAINT uq_sd_solicitud_articulo UNIQUE (solicitud_id, articulo_id)
);


-- ---------------------------------------------------------
-- 2. La cotización: qué ofreció cada proveedor
-- ---------------------------------------------------------
CREATE TABLE cotizacion (
  id              serial PRIMARY KEY,
  solicitud_id    int NOT NULL REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE,
  proveedor_id    int NOT NULL REFERENCES proveedor(id),
  -- Las "condiciones" del criterio. Mismo catálogo que usa la orden.
  forma_pago_id   int NOT NULL REFERENCES forma_pago(id),
  fecha_recepcion timestamp NOT NULL DEFAULT now(),
  -- "de MÁS DE UN proveedor": cada uno cotiza una sola vez por solicitud.
  -- Es lo que hace que la comparación sea entre ofertas distintas y no entre
  -- dos versiones de la misma.
  CONSTRAINT uq_cotizacion_solicitud_proveedor UNIQUE (solicitud_id, proveedor_id)
);

CREATE TABLE cotizacion_detalle (
  id            serial PRIMARY KEY,
  cotizacion_id int NOT NULL REFERENCES cotizacion(id) ON DELETE CASCADE,
  articulo_id   int NOT NULL REFERENCES articulo(id),
  precio        decimal(12,2) NOT NULL,
  CONSTRAINT ck_cd_precio CHECK (precio >= 0),
  CONSTRAINT uq_cd_cotizacion_articulo UNIQUE (cotizacion_id, articulo_id)
);


-- ---------------------------------------------------------
-- 3. "La comparación queda documentada en la orden emitida"
-- ---------------------------------------------------------
-- `orden_compra.cotizacion_id` ya existe como int suelto, sin FK. Ahora que la
-- tabla existe, se convierte en una referencia de verdad: una orden nacida de
-- una adjudicación apunta a la cotización que ganó, y desde ahí se llega a la
-- solicitud y a todas las ofertas que compitieron.
ALTER TABLE orden_compra
  ADD CONSTRAINT orden_compra_cotizacion_id_fkey
  FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id);


-- ---------------------------------------------------------
-- 4. Índices
-- ---------------------------------------------------------
-- Solo los dos que sostienen las consultas del módulo: traer los detalles de
-- una solicitud y las cotizaciones de una solicitud. Los UNIQUE de arriba ya
-- crean sus propios índices y cubren el resto de los accesos.
CREATE INDEX idx_sd_solicitud  ON solicitud_detalle (solicitud_id);
CREATE INDEX idx_cd_cotizacion ON cotizacion_detalle (cotizacion_id);


-- ---------------------------------------------------------
-- 5. Auditoría
-- ---------------------------------------------------------
-- Criterio de HU-COMP-02: "registra en bitácora cada emisión, modificación de
-- estado y cancelación".
--
-- `fn_auditoria()` no lleva argumentos: saca la tabla de TG_TABLE_NAME y el
-- usuario de `app.usuario_id`.
CREATE TRIGGER trg_auditoria_solicitud_cotizacion
  AFTER INSERT OR UPDATE ON solicitud_cotizacion
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_cotizacion
  AFTER INSERT ON cotizacion
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

COMMIT;
