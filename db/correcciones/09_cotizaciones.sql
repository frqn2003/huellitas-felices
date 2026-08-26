-- =========================================================
-- 09 · FALTAN: las 4 tablas de cotizaciones (HU-COMP-02)
-- =========================================================
-- ⚠️ ESTA CORRECCIÓN REVIERTE LA DECISIÓN D-C.
--
--    `docs/backend/GUIA-IMPLEMENTACION.md` §2 D-C dio las cotizaciones por
--    fuera de alcance, asumiendo que sin HU-COMP-01 (necesidades de compra) el
--    circuito iba directo a la orden. Pero son cosas distintas: HU-COMP-01 es
--    el DISPARADOR de la compra, y la cotización es el paso de SELECCIÓN de
--    proveedor. El criterio de HU-COMP-02 lo pide textual:
--
--      "Antes de adjudicar, permite registrar y comparar cotizaciones de más
--       de un proveedor para los mismos artículos (precio y condiciones), como
--       parte del proceso de selección; la comparación queda documentada en la
--       orden emitida."
--
--    Con D-C ese criterio quedaba sin cubrir y /cotizaciones (que el front ya
--    tiene entero: SolicitudFormModal, CotizacionFormModal,
--    CompararCotizacionesModal, CotizacionesContext) se quedaba en mock.
--    Al aplicar esto, D-C queda sin efecto y B3 de AJUSTES-DER se cierra.
--
-- QUÉ RESUELVE
--    `orden_compra.cotizacion_id` existe hace rato como `int` SIN TABLA DESTINO
--    ni FK: una columna que apunta a la nada. Acá aparece la tabla y la FK.
--
-- ORDEN DE CREACIÓN
--    solicitud_cotizacion → solicitud_detalle → cotizacion → cotizacion_detalle,
--    porque cada una referencia a la anterior. La FK de vuelta
--    (solicitud → cotización adjudicada) se agrega AL FINAL: es circular y no
--    se puede declarar mientras `cotizacion` todavía no existe.
-- =========================================================


-- ---------------------------------------------------------
-- 1. Cabecera: el pedido de precios
-- ---------------------------------------------------------
-- Una solicitud = "necesito estos artículos, quién me los cotiza". Se le piden
-- precios a varios proveedores por los MISMOS artículos, que es lo que hace
-- comparable la comparación.
CREATE SEQUENCE IF NOT EXISTS solicitud_cotizacion_cod_seq;

CREATE TABLE solicitud_cotizacion (
  id         serial PRIMARY KEY,
  -- Número visible del documento: SC-000001. Lo genera la base, igual que
  -- `orden_compra.cod_ord` — ver el trigger más abajo.
  cod_sol    varchar(30) NOT NULL UNIQUE,
  usuario_id int NOT NULL REFERENCES usuario(id),
  fecha      timestamp NOT NULL DEFAULT now(),
  estado     varchar(20) NOT NULL DEFAULT 'Abierta',
  notas      text,
  -- FK a cotizacion(id): se agrega al final del archivo (dependencia circular).
  cotizacion_id_adjudicada int,

  -- POR QUÉ UN CHECK Y NO UNA TABLA DE ESTADOS (como orden_compra):
  -- `estado_orden_compra` es tabla porque el criterio pide "tabla de referencia
  -- fija" Y porque el estado lleva un atributo propio (`es_final`) que el
  -- service consulta. Acá son tres valores sin atributos ni reglas asociadas:
  -- una tabla de 3 filas solo agregaría un JOIN a cada consulta.
  CONSTRAINT ck_sc_estado CHECK (estado IN ('Abierta', 'Adjudicada', 'Cancelada'))
);

COMMENT ON TABLE solicitud_cotizacion IS
  'HU-COMP-02. Pedido de precios a varios proveedores por los mismos articulos.';
COMMENT ON COLUMN solicitud_cotizacion.cod_sol IS
  'Numero del documento (SC-000001). Lo genera la base por secuencia: es el unico '
  'numero real de la solicitud. El front NO lo deriva del id — un id es una PK, no '
  'un numero de documento.';

-- Mismo patrón que fn_generar_cod_orden_compra: la base lo asigna, y si la
-- aplicación mandara uno (una migración de datos viejos, por ejemplo) lo respeta.
CREATE OR REPLACE FUNCTION fn_generar_cod_solicitud() RETURNS trigger AS $$
BEGIN
  IF NEW.cod_sol IS NULL OR NEW.cod_sol = '' THEN
    NEW.cod_sol := 'SC-' || LPAD(nextval('solicitud_cotizacion_cod_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_cod_solicitud
  BEFORE INSERT ON solicitud_cotizacion
  FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_solicitud();
COMMENT ON COLUMN solicitud_cotizacion.cotizacion_id_adjudicada IS
  'Cotizacion ganadora. Queda NULL cuando la adjudicacion fue SPLIT (cada articulo '
  'a un proveedor distinto): ahi no hay UNA ganadora, y la trazabilidad la da '
  'orden_compra.cotizacion_id de cada orden generada.';


-- ---------------------------------------------------------
-- 2. Detalle: qué se pide y cuánto
-- ---------------------------------------------------------
CREATE TABLE solicitud_detalle (
  id                serial PRIMARY KEY,
  solicitud_id      int NOT NULL REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE,
  articulo_id       int NOT NULL REFERENCES articulo(id),
  cantidad_estimada numeric(12,2) NOT NULL,
  nota              varchar(255),

  CONSTRAINT ck_sd_cantidad CHECK (cantidad_estimada > 0),
  -- El mismo artículo dos veces en un pedido no tiene sentido: se suma la
  -- cantidad en una sola línea. Además, sin esto la comparación por artículo
  -- (una fila por artículo) sería ambigua.
  CONSTRAINT uq_sd_solicitud_articulo UNIQUE (solicitud_id, articulo_id)
);

-- ON DELETE CASCADE del lado de la solicitud: si se borrara una solicitud, sus
-- líneas no tienen vida propia. Del lado de `articulo` NO: un artículo con
-- historial de pedidos no se borra (además la baja es lógica, HU-STK-01).


-- ---------------------------------------------------------
-- 3. La cotización que respondió un proveedor
-- ---------------------------------------------------------
CREATE TABLE cotizacion (
  id              serial PRIMARY KEY,
  solicitud_id    int NOT NULL REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE,
  proveedor_id    int NOT NULL REFERENCES proveedor(id),
  forma_pago_id   int NOT NULL REFERENCES forma_pago(id),
  fecha_recepcion timestamp NOT NULL DEFAULT now(),

  -- Un proveedor cotiza UNA vez por solicitud. Si manda un precio corregido,
  -- se edita la cotización existente; dos filas del mismo proveedor harían
  -- ambigua la comparación ("cuál de las dos es la de Vetmed").
  CONSTRAINT uq_cot_solicitud_proveedor UNIQUE (solicitud_id, proveedor_id)
);

-- POR QUÉ forma_pago_id Y NO UN VARCHAR `condicion_pago`
--   El boceto de AJUSTES-DER §B3 proponía `condicion_pago varchar(60)`, pero
--   entonces al adjudicar habría que traducir ese texto libre al
--   `orden_compra.forma_pago_id` (que es FK NOT NULL). Con la FK acá, adjudicar
--   copia un id y listo, y las dos puntas comparten el mismo catálogo.
--   El front sigue viendo el string: el mapper resuelve el nombre por JOIN.
COMMENT ON COLUMN cotizacion.forma_pago_id IS
  'La "condicion de pago" del criterio. Mismo catalogo que orden_compra.forma_pago_id: '
  'lo que el proveedor ofrece en la cotizacion es lo que se pacta en la orden.';


-- ---------------------------------------------------------
-- 4. Detalle de la cotización: el precio por artículo
-- ---------------------------------------------------------
-- Precio UNITARIO, sin cantidad: la cantidad ya está en solicitud_detalle y es
-- la misma para todos los proveedores (si no, no serían comparables).
CREATE TABLE cotizacion_detalle (
  id            serial PRIMARY KEY,
  cotizacion_id int NOT NULL REFERENCES cotizacion(id) ON DELETE CASCADE,
  articulo_id   int NOT NULL REFERENCES articulo(id),
  precio        numeric(12,2) NOT NULL,

  CONSTRAINT ck_cd_precio CHECK (precio >= 0),
  CONSTRAINT uq_cd_cotizacion_articulo UNIQUE (cotizacion_id, articulo_id)
);

COMMENT ON COLUMN cotizacion_detalle.precio IS
  'Precio UNITARIO cotizado. El total de la cotizacion = SUM(precio * '
  'solicitud_detalle.cantidad_estimada) y se calcula, no se guarda: guardarlo '
  'seria un dato derivado que se puede desincronizar.';


-- ---------------------------------------------------------
-- 5. Las dos FK que cierran el circuito
-- ---------------------------------------------------------
ALTER TABLE solicitud_cotizacion
  ADD CONSTRAINT fk_sc_cotizacion_adjudicada
  FOREIGN KEY (cotizacion_id_adjudicada) REFERENCES cotizacion(id);

-- Higiene previa: si quedó algún `cotizacion_id` cargado a mano apuntando a un
-- id que nunca existió, la FK no se podría crear. Se limpia primero.
UPDATE orden_compra
SET cotizacion_id = NULL
WHERE cotizacion_id IS NOT NULL;

-- ESTA es la que hace cumplir "la comparación queda documentada en la orden
-- emitida": cada orden nacida de una adjudicación apunta a la cotización que
-- ganó, y desde ahí se llega a la solicitud y a las cotizaciones que perdieron.
ALTER TABLE orden_compra
  ADD CONSTRAINT fk_oc_cotizacion
  FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id);

COMMENT ON COLUMN orden_compra.cotizacion_id IS
  'HU-COMP-02: cotizacion adjudicada que origino esta orden. NULL = orden '
  'cargada a mano, sin proceso de cotizacion previo (ambos caminos son validos).';


-- ---------------------------------------------------------
-- 6. Índices sobre las FK
-- ---------------------------------------------------------
-- Postgres no los crea solo. Sin ellos, abrir una solicitud para comparar
-- recorre entera cada tabla de detalle.
CREATE INDEX idx_sd_solicitud   ON solicitud_detalle (solicitud_id);
CREATE INDEX idx_sd_articulo    ON solicitud_detalle (articulo_id);
CREATE INDEX idx_cot_solicitud  ON cotizacion (solicitud_id);
CREATE INDEX idx_cot_proveedor  ON cotizacion (proveedor_id);
CREATE INDEX idx_cd_cotizacion  ON cotizacion_detalle (cotizacion_id);
CREATE INDEX idx_cd_articulo    ON cotizacion_detalle (articulo_id);
CREATE INDEX idx_sc_estado      ON solicitud_cotizacion (estado);
CREATE INDEX idx_sc_fecha       ON solicitud_cotizacion (fecha DESC);
CREATE INDEX idx_oc_cotizacion  ON orden_compra (cotizacion_id);


-- ---------------------------------------------------------
-- 7. Auditoría (criterio de HU-COMP-02 y HU-SIS-06)
-- ---------------------------------------------------------
-- Se auditan las CABECERAS, no los detalles: `valor_anterior`/`valor_nuevo`
-- guardan la fila entera en jsonb, y una fila de detalle sin su cabecera no
-- dice nada. El alta de una cotización queda registrada; sus precios se
-- reconstruyen desde la tabla, que es append-only en la práctica (una
-- cotización recibida no se reescribe).
CREATE TRIGGER tg_auditar_solicitud_cotizacion
  AFTER INSERT OR UPDATE OR DELETE ON solicitud_cotizacion
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('compras');

CREATE TRIGGER tg_auditar_cotizacion
  AFTER INSERT OR UPDATE OR DELETE ON cotizacion
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('compras');

-- OJO con fn_auditar(): clasifica como 'baja' solo el paso activo→inactivo del
-- enum `estado_activo_inactivo`. Cancelar una solicitud ('Abierta'→'Cancelada')
-- se audita como 'modificacion'. El dato no se pierde — está en el jsonb — pero
-- si el reporte de bitácora quiere leerlo como baja, hay que ampliar fn_auditar.


-- ---------------------------------------------------------
-- 8. Catálogo de condiciones de pago → va en el archivo 10
-- ---------------------------------------------------------
-- `cotizacion.forma_pago_id` y `orden_compra.forma_pago_id` apuntan al catálogo
-- `forma_pago`, que hoy tiene valores que no coinciden con los que muestra el
-- front. Eso se arregla en `10_catalogo_condiciones_pago.sql`, que deja UNA
-- sola lista para todo el sistema.
--
-- Va en un archivo aparte y no acá porque toca también a proveedores
-- (HU-PROV-01), que usa el mismo catálogo: no es parte de las cotizaciones.
-- APLICAR EL 10 JUNTO CON ESTE.
