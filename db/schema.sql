-- =========================================================
-- Huellitas Felices — schema de la base
-- =========================================================
-- GENERADO AUTOMÁTICAMENTE por  npm run db:dump
-- NO editar a mano: los cambios se hacen en el SQL Editor de Supabase y
-- después se corre el dump de nuevo.
--
-- El archivo corre de arriba a abajo sobre una base vacía y reconstruye
-- todo: enums, secuencias, tablas, constraints, índices, funciones y triggers.
-- =========================================================


-- =========================================================
-- TIPOS ENUMERADOS
-- =========================================================

CREATE TYPE estado_activo_inactivo AS ENUM ('activo', 'inactivo');
CREATE TYPE tipo_movimiento_stock AS ENUM ('ingreso', 'egreso');
CREATE TYPE tipo_operacion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');


-- =========================================================
-- SECUENCIAS
-- =========================================================

CREATE SEQUENCE IF NOT EXISTS articulo_cod_seq;
CREATE SEQUENCE IF NOT EXISTS articulo_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS categoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS cotizacion_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS cotizacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS deposito_id_seq;
CREATE SEQUENCE IF NOT EXISTS estado_orden_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS fabricante_id_seq;
CREATE SEQUENCE IF NOT EXISTS ficha_stock_id_seq;
CREATE SEQUENCE IF NOT EXISTS forma_pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS movimiento_numero_seq;
CREATE SEQUENCE IF NOT EXISTS movimiento_stock_cab_id_seq;
CREATE SEQUENCE IF NOT EXISTS movimiento_stock_det_id_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_cod_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS origen_movimiento_id_seq;
CREATE SEQUENCE IF NOT EXISTS presentacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS proveedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_seq;
CREATE SEQUENCE IF NOT EXISTS solicitud_cotizacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS solicitud_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS unidad_medida_id_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_id_seq;


-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE articulo (
  id integer(32,0) DEFAULT nextval('articulo_id_seq'::regclass) NOT NULL,
  categoria_id integer(32,0) NOT NULL,
  unidad_medida_id integer(32,0) NOT NULL,
  codigo character varying(30) NOT NULL,
  nombre character varying(150) NOT NULL,
  descripcion text,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  numero_lote character varying(60),
  fecha_vencimiento date,
  fabricante_id integer(32,0) NOT NULL,
  imagen_url character varying(255),
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  contenido_neto numeric(10,2) DEFAULT 1 NOT NULL,
  presentacion_id integer(32,0) NOT NULL
);

CREATE TABLE auditoria (
  id bigint(64,0) DEFAULT nextval('auditoria_id_seq'::regclass) NOT NULL,
  tabla character varying(50) NOT NULL,
  operacion tipo_operacion_auditoria NOT NULL,
  registro_id integer(32,0) NOT NULL,
  usuario_id integer(32,0),
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  valores_anteriores jsonb,
  valores_nuevos jsonb
);

CREATE TABLE categoria (
  id integer(32,0) DEFAULT nextval('categoria_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL,
  prefijo character varying(5) DEFAULT 'ART'::character varying NOT NULL
);

CREATE TABLE cotizacion (
  id integer(32,0) DEFAULT nextval('cotizacion_id_seq'::regclass) NOT NULL,
  solicitud_id integer(32,0) NOT NULL,
  proveedor_id integer(32,0) NOT NULL,
  forma_pago_id integer(32,0) NOT NULL,
  fecha_recepcion timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE cotizacion_detalle (
  id integer(32,0) DEFAULT nextval('cotizacion_detalle_id_seq'::regclass) NOT NULL,
  cotizacion_id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  precio numeric(12,2) NOT NULL
);

CREATE TABLE deposito (
  id integer(32,0) DEFAULT nextval('deposito_id_seq'::regclass) NOT NULL,
  sucursal_id integer(32,0) NOT NULL,
  nombre character varying(100) NOT NULL,
  ubicacion character varying(150)
);

CREATE TABLE estado_orden_compra (
  id integer(32,0) DEFAULT nextval('estado_orden_compra_id_seq'::regclass) NOT NULL,
  nombre character varying(30) NOT NULL,
  es_final boolean DEFAULT false NOT NULL
);

CREATE TABLE fabricante (
  id integer(32,0) DEFAULT nextval('fabricante_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL,
  pais character varying(60),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL
);

CREATE TABLE ficha_stock (
  id integer(32,0) DEFAULT nextval('ficha_stock_id_seq'::regclass) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  deposito_id integer(32,0) NOT NULL,
  stock_actual numeric(12,2) DEFAULT 0 NOT NULL,
  stock_minimo numeric(10,2) DEFAULT 0 NOT NULL,
  stock_critico numeric(10,2)
);

CREATE TABLE forma_pago (
  id integer(32,0) DEFAULT nextval('forma_pago_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL
);

CREATE TABLE movimiento_stock_cab (
  id integer(32,0) DEFAULT nextval('movimiento_stock_cab_id_seq'::regclass) NOT NULL,
  numero character varying(30) NOT NULL,
  deposito_id integer(32,0) NOT NULL,
  tipo tipo_movimiento_stock NOT NULL,
  origen_id integer(32,0) NOT NULL,
  origen_entidad_id integer(32,0),
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  motivo character varying(255),
  movimiento_vinculado_id integer(32,0)
);

CREATE TABLE movimiento_stock_det (
  id integer(32,0) DEFAULT nextval('movimiento_stock_det_id_seq'::regclass) NOT NULL,
  movimiento_id integer(32,0) NOT NULL,
  ficha_stock_id integer(32,0) NOT NULL,
  cantidad numeric(12,2) NOT NULL
);

CREATE TABLE orden_compra (
  id integer(32,0) DEFAULT nextval('orden_compra_id_seq'::regclass) NOT NULL,
  proveedor_id integer(32,0) NOT NULL,
  cod_ord character varying(30) NOT NULL,
  cotizacion_id integer(32,0),
  usuario_id integer(32,0) NOT NULL,
  estado_id smallint(16,0) DEFAULT 1 NOT NULL,
  fecha timestamp without time zone DEFAULT now() NOT NULL,
  fecha_entrega timestamp without time zone,
  notas text,
  subtotal numeric(12,2),
  descuento numeric(12,2),
  gastos_envio numeric(12,2),
  total numeric(12,2) NOT NULL,
  deposito_id integer(32,0),
  forma_pago_id integer(32,0) NOT NULL
);

CREATE TABLE orden_compra_detalle (
  id integer(32,0) DEFAULT nextval('orden_compra_detalle_id_seq'::regclass) NOT NULL,
  orden_compra_id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  cantidad numeric(12,2) NOT NULL,
  precio_acordado numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL
);

CREATE TABLE origen_movimiento (
  id integer(32,0) DEFAULT nextval('origen_movimiento_id_seq'::regclass) NOT NULL,
  nombre character varying(40) NOT NULL
);

CREATE TABLE presentacion (
  id integer(32,0) DEFAULT nextval('presentacion_id_seq'::regclass) NOT NULL,
  nombre character varying(50) NOT NULL
);

CREATE TABLE proveedor (
  id integer(32,0) DEFAULT nextval('proveedor_id_seq'::regclass) NOT NULL,
  razon_social character varying(150) NOT NULL,
  cuit character varying(20) NOT NULL,
  direccion character varying(255),
  telefono character varying(30),
  email character varying(120),
  contacto character varying(100),
  plazo_entrega_dias integer(32,0),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  calificacion numeric(3,1)
);

CREATE TABLE proveedor_forma_pago (
  proveedor_id integer(32,0) NOT NULL,
  forma_pago_id integer(32,0) NOT NULL
);

CREATE TABLE rol (
  id integer(32,0) DEFAULT nextval('rol_id_seq'::regclass) NOT NULL,
  nombre character varying(50) NOT NULL
);

CREATE TABLE solicitud_cotizacion (
  id integer(32,0) DEFAULT nextval('solicitud_cotizacion_id_seq'::regclass) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha timestamp without time zone DEFAULT now() NOT NULL,
  estado character varying(20) DEFAULT 'Abierta'::character varying NOT NULL,
  notas text
);

CREATE TABLE solicitud_detalle (
  id integer(32,0) DEFAULT nextval('solicitud_detalle_id_seq'::regclass) NOT NULL,
  solicitud_id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  cantidad_estimada numeric(12,2) NOT NULL,
  nota text
);

CREATE TABLE unidad_medida (
  id integer(32,0) DEFAULT nextval('unidad_medida_id_seq'::regclass) NOT NULL,
  nombre character varying(50) NOT NULL
);

CREATE TABLE usuario (
  id integer(32,0) DEFAULT nextval('usuario_id_seq'::regclass) NOT NULL,
  rol_id integer(32,0) NOT NULL,
  nombre character varying(80) NOT NULL,
  apellido character varying(80) NOT NULL,
  dni character varying(20) NOT NULL,
  email character varying(120) NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


-- =========================================================
-- CLAVES PRIMARIAS, ÚNICOS Y CHECKS
-- =========================================================

ALTER TABLE articulo ADD CONSTRAINT ck_articulo_contenido_neto CHECK ((contenido_neto > (0)::numeric));
ALTER TABLE articulo ADD CONSTRAINT articulo_pkey PRIMARY KEY (id);
ALTER TABLE articulo ADD CONSTRAINT articulo_codigo_key UNIQUE (codigo);
ALTER TABLE auditoria ADD CONSTRAINT ck_auditoria_valores CHECK ((((operacion = 'INSERT'::tipo_operacion_auditoria) AND (valores_anteriores IS NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'UPDATE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'DELETE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NULL))));
ALTER TABLE auditoria ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);
ALTER TABLE categoria ADD CONSTRAINT categoria_prefijo_key UNIQUE (prefijo);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_pkey PRIMARY KEY (id);
ALTER TABLE cotizacion ADD CONSTRAINT uq_cotizacion_solicitud_proveedor UNIQUE (solicitud_id, proveedor_id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT ck_cd_precio CHECK ((precio >= (0)::numeric));
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_pkey PRIMARY KEY (id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT uq_cd_cotizacion_articulo UNIQUE (cotizacion_id, articulo_id);
ALTER TABLE deposito ADD CONSTRAINT deposito_pkey PRIMARY KEY (id);
ALTER TABLE estado_orden_compra ADD CONSTRAINT estado_orden_compra_pkey PRIMARY KEY (id);
ALTER TABLE estado_orden_compra ADD CONSTRAINT estado_orden_compra_nombre_key UNIQUE (nombre);
ALTER TABLE fabricante ADD CONSTRAINT fabricante_pkey PRIMARY KEY (id);
ALTER TABLE fabricante ADD CONSTRAINT fabricante_nombre_key UNIQUE (nombre);
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_critico_menor CHECK (((stock_critico IS NULL) OR (stock_critico <= stock_minimo)));
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_umbrales CHECK (((stock_minimo >= (0)::numeric) AND ((stock_critico IS NULL) OR (stock_critico >= (0)::numeric))));
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_pkey PRIMARY KEY (id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_deposito_id_key UNIQUE (articulo_id, deposito_id);
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_pkey PRIMARY KEY (id);
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_nom_forma_key UNIQUE (nombre);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT ck_mov_no_autovinculado CHECK (((movimiento_vinculado_id IS NULL) OR (movimiento_vinculado_id <> id)));
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_pkey PRIMARY KEY (id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_numero_key UNIQUE (numero);
ALTER TABLE movimiento_stock_det ADD CONSTRAINT ck_mov_det_cantidad CHECK ((cantidad > (0)::numeric));
ALTER TABLE movimiento_stock_det ADD CONSTRAINT ck_movimiento_cantidad CHECK ((cantidad > (0)::numeric));
ALTER TABLE movimiento_stock_det ADD CONSTRAINT movimiento_stock_det_pkey PRIMARY KEY (id);
ALTER TABLE movimiento_stock_det ADD CONSTRAINT uq_mov_det_ficha UNIQUE (movimiento_id, ficha_stock_id);
ALTER TABLE orden_compra ADD CONSTRAINT ck_oc_importes CHECK (((COALESCE(subtotal, (0)::numeric) >= (0)::numeric) AND (total >= (0)::numeric) AND (COALESCE(gastos_envio, (0)::numeric) >= (0)::numeric) AND ((COALESCE(descuento, (0)::numeric) >= (0)::numeric) AND (COALESCE(descuento, (0)::numeric) <= (100)::numeric))));
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_pkey PRIMARY KEY (id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_cod_ord_key UNIQUE (cod_ord);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_cantidad CHECK ((cantidad > (0)::numeric));
ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_precio CHECK ((precio_acordado >= (0)::numeric));
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_pkey PRIMARY KEY (id);
ALTER TABLE origen_movimiento ADD CONSTRAINT origen_movimiento_pkey PRIMARY KEY (id);
ALTER TABLE origen_movimiento ADD CONSTRAINT origen_movimiento_nombre_key UNIQUE (nombre);
ALTER TABLE presentacion ADD CONSTRAINT presentacion_pkey PRIMARY KEY (id);
ALTER TABLE presentacion ADD CONSTRAINT presentacion_nombre_key UNIQUE (nombre);
ALTER TABLE proveedor ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id);
ALTER TABLE proveedor_forma_pago ADD CONSTRAINT proveedor_forma_pago_pkey PRIMARY KEY (proveedor_id, forma_pago_id);
ALTER TABLE rol ADD CONSTRAINT rol_pkey PRIMARY KEY (id);
ALTER TABLE rol ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);
ALTER TABLE solicitud_cotizacion ADD CONSTRAINT ck_solicitud_estado CHECK (((estado)::text = ANY ((ARRAY['Abierta'::character varying, 'Adjudicada'::character varying, 'Cancelada'::character varying])::text[])));
ALTER TABLE solicitud_cotizacion ADD CONSTRAINT solicitud_cotizacion_pkey PRIMARY KEY (id);
ALTER TABLE solicitud_detalle ADD CONSTRAINT ck_sd_cantidad CHECK ((cantidad_estimada > (0)::numeric));
ALTER TABLE solicitud_detalle ADD CONSTRAINT solicitud_detalle_pkey PRIMARY KEY (id);
ALTER TABLE solicitud_detalle ADD CONSTRAINT uq_sd_solicitud_articulo UNIQUE (solicitud_id, articulo_id);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_pkey PRIMARY KEY (id);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_unidad_key UNIQUE (nombre);
ALTER TABLE usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


-- =========================================================
-- CLAVES FORÁNEAS
-- =========================================================

ALTER TABLE articulo ADD CONSTRAINT articulo_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categoria(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_fabricante_id_fkey FOREIGN KEY (fabricante_id) REFERENCES fabricante(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_presentacion_id_fkey FOREIGN KEY (presentacion_id) REFERENCES presentacion(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_unidad_medida_id_fkey FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medida(id);
ALTER TABLE auditoria ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE;
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id) ON DELETE CASCADE;
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_movimiento_vinculado_id_fkey FOREIGN KEY (movimiento_vinculado_id) REFERENCES movimiento_stock_cab(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_origen_id_fkey FOREIGN KEY (origen_id) REFERENCES origen_movimiento(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE movimiento_stock_det ADD CONSTRAINT movimiento_stock_det_ficha_stock_id_fkey FOREIGN KEY (ficha_stock_id) REFERENCES ficha_stock(id);
ALTER TABLE movimiento_stock_det ADD CONSTRAINT movimiento_stock_det_movimiento_id_fkey FOREIGN KEY (movimiento_id) REFERENCES movimiento_stock_cab(id) ON DELETE CASCADE;
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES estado_orden_compra(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_orden_compra_id_fkey FOREIGN KEY (orden_compra_id) REFERENCES orden_compra(id);
ALTER TABLE proveedor_forma_pago ADD CONSTRAINT proveedor_forma_pago_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE proveedor_forma_pago ADD CONSTRAINT proveedor_forma_pago_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE CASCADE;
ALTER TABLE solicitud_cotizacion ADD CONSTRAINT solicitud_cotizacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE solicitud_detalle ADD CONSTRAINT solicitud_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE solicitud_detalle ADD CONSTRAINT solicitud_detalle_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES rol(id);


-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_articulo_categoria ON public.articulo USING btree (categoria_id);
CREATE INDEX idx_articulo_estado ON public.articulo USING btree (estado);
CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria USING btree (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria USING btree (usuario_id);
CREATE INDEX idx_cd_cotizacion ON public.cotizacion_detalle USING btree (cotizacion_id);
CREATE INDEX idx_ficha_articulo ON public.ficha_stock USING btree (articulo_id);
CREATE INDEX idx_ficha_deposito ON public.ficha_stock USING btree (deposito_id);
CREATE INDEX idx_mov_cab_deposito ON public.movimiento_stock_cab USING btree (deposito_id);
CREATE INDEX idx_mov_cab_fecha ON public.movimiento_stock_cab USING btree (fecha_hora DESC);
CREATE INDEX idx_mov_det_ficha ON public.movimiento_stock_det USING btree (ficha_stock_id);
CREATE INDEX idx_mov_det_movimiento ON public.movimiento_stock_det USING btree (movimiento_id);
CREATE INDEX idx_oc_estado ON public.orden_compra USING btree (estado_id);
CREATE INDEX idx_oc_fecha ON public.orden_compra USING btree (fecha DESC);
CREATE INDEX idx_oc_proveedor ON public.orden_compra USING btree (proveedor_id);
CREATE INDEX idx_ocd_orden ON public.orden_compra_detalle USING btree (orden_compra_id);
CREATE INDEX idx_proveedor_estado ON public.proveedor USING btree (estado);
CREATE UNIQUE INDEX uq_proveedor_cuit_activo ON public.proveedor USING btree (cuit) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_pfp_forma_pago ON public.proveedor_forma_pago USING btree (forma_pago_id);
CREATE INDEX idx_sd_solicitud ON public.solicitud_detalle USING btree (solicitud_id);
CREATE UNIQUE INDEX uq_usuario_dni_activo ON public.usuario USING btree (dni) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_usuario_email_activo ON public.usuario USING btree (lower((email)::text)) WHERE (estado = 'activo'::estado_activo_inactivo);


-- =========================================================
-- VISTAS
-- =========================================================

CREATE OR REPLACE VIEW v_movimiento_stock AS
SELECT d.id,
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
   FROM (movimiento_stock_det d
     JOIN movimiento_stock_cab c ON ((c.id = d.movimiento_id)));


-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION public.fn_actualizar_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_stock_resultante decimal(12,2);
BEGIN
    IF NEW.tipo = 'egreso' THEN
        SELECT stock_actual - NEW.cantidad INTO v_stock_resultante
        FROM ficha_stock
        WHERE id = NEW.ficha_stock_id;

        IF v_stock_resultante < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente: el movimiento dejaría stock negativo (actual: %, egreso: %)',
                (SELECT stock_actual FROM ficha_stock WHERE id = NEW.ficha_stock_id),
                NEW.cantidad;
        END IF;

        UPDATE ficha_stock
        SET stock_actual = v_stock_resultante
        WHERE id = NEW.ficha_stock_id;

    ELSIF NEW.tipo = 'ingreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.ficha_stock_id;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_actualizar_stock_det()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tipo             tipo_movimiento_stock;
    v_stock_resultante decimal(12,2);
BEGIN
    SELECT tipo INTO v_tipo
    FROM movimiento_stock_cab
    WHERE id = NEW.movimiento_id;

    IF v_tipo = 'egreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual - NEW.cantidad
        WHERE id = NEW.ficha_stock_id
        RETURNING stock_actual INTO v_stock_resultante;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;

        IF v_stock_resultante < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente: el movimiento dejaria stock negativo (disponible: %, egreso: %)',
                v_stock_resultante + NEW.cantidad, NEW.cantidad
                USING ERRCODE = 'HF001';
        END IF;

    ELSIF v_tipo = 'ingreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual + NEW.cantidad
        WHERE id = NEW.ficha_stock_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;
    END IF;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_usuario_id int;
BEGIN
  v_usuario_id := NULLIF(current_setting('app.usuario_id', true), '')::int;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, v_usuario_id, NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, v_usuario_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria (tabla, operacion, registro_id, usuario_id, valores_anteriores, valores_nuevos)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, v_usuario_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_generar_cod_articulo()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_prefijo varchar(5);
BEGIN
  SELECT prefijo INTO v_prefijo
  FROM categoria
  WHERE id = NEW.categoria_id;

  -- Fallback por si la categoría no tiene prefijo cargado
  IF v_prefijo IS NULL THEN
    v_prefijo := 'ART';
  END IF;

  NEW.codigo := v_prefijo || '-' || LPAD(nextval('articulo_cod_seq')::text, 6, '0');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_generar_cod_orden_compra()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Solo genera el código si no vino informado desde la aplicación
  IF NEW.cod_ord IS NULL OR NEW.cod_ord = '' THEN
    NEW.cod_ord := 'OC-' || LPAD(nextval('orden_compra_cod_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_generar_numero_movimiento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'MOV-' || LPAD(nextval('movimiento_numero_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$
;


-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_auditoria_articulo AFTER INSERT OR DELETE OR UPDATE ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_cod_articulo BEFORE INSERT ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_articulo();
CREATE TRIGGER trg_auditoria_cotizacion AFTER INSERT ON public.cotizacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_deposito AFTER INSERT OR UPDATE ON public.deposito FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_movimiento_stock_cab AFTER INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_numero_movimiento BEFORE INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_movimiento();
CREATE TRIGGER trg_actualizar_stock_det AFTER INSERT ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_det();
CREATE TRIGGER trg_auditoria_orden_compra_estado AFTER UPDATE ON public.orden_compra FOR EACH ROW WHEN ((old.estado_id IS DISTINCT FROM new.estado_id)) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_orden_compra_insert AFTER INSERT ON public.orden_compra FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_cod_orden_compra BEFORE INSERT ON public.orden_compra FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_orden_compra();
CREATE TRIGGER trg_auditoria_proveedor AFTER INSERT OR DELETE OR UPDATE ON public.proveedor FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_solicitud_cotizacion AFTER INSERT OR UPDATE ON public.solicitud_cotizacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_usuario AFTER INSERT OR DELETE OR UPDATE ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- =========================================================
-- COMENTARIOS
-- =========================================================

COMMENT ON COLUMN articulo.imagen_url IS 'URL de la imagen representativa del artículo';
COMMENT ON COLUMN auditoria.registro_id IS 'PK (columna id) del registro afectado en la tabla origen.';
COMMENT ON COLUMN auditoria.tabla IS 'Nombre de la tabla origen (usuario, articulo, proveedor, orden_compra, movimiento_stock_cab, deposito).';
COMMENT ON COLUMN auditoria.usuario_id IS 'Usuario responsable del cambio, tomado de la variable de sesión app.usuario_id. Puede ser NULL si el backend no la informó (ej. proceso batch).';
COMMENT ON COLUMN auditoria.valores_anteriores IS 'Snapshot completo de la fila ANTES del cambio (NULL en INSERT).';
COMMENT ON COLUMN auditoria.valores_nuevos IS 'Snapshot completo de la fila DESPUÉS del cambio (NULL en DELETE).';
COMMENT ON COLUMN movimiento_stock_cab.movimiento_vinculado_id IS 'Auto-referencia: enlaza el egreso en origen con el ingreso en destino de una transferencia';
COMMENT ON COLUMN movimiento_stock_cab.origen_entidad_id IS 'Id de la entidad origen (venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia_detalle, etc.) segun "origen_id"';
COMMENT ON COLUMN movimiento_stock_cab.origen_id IS 'Categoria del origen (venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma)';
COMMENT ON COLUMN movimiento_stock_det.cantidad IS 'Siempre POSITIVA. El signo lo determina `tipo` (ingreso suma, egreso resta).';
COMMENT ON COLUMN orden_compra.descuento IS 'PORCENTAJE 0-100, no un monto. El monto se calcula sobre el subtotal. El back recalcula siempre: el total que manda el front se descarta.';
COMMENT ON COLUMN proveedor.calificacion IS 'Evaluacion de desempeño';
COMMENT ON COLUMN rol.nombre IS 'Administrador, Gerente, Veterinario, Recepcionista, Personal de deposito, Cajero';
COMMENT ON TABLE articulo IS 'El costo de compra y el precio de venta NO se almacenan aqui: ver Lista de Precios y Recepcion de Mercaderia';
COMMENT ON TABLE auditoria IS 'Bitácora general: cada fila es un evento (alta/modificación/baja) de una entidad auditada.';
COMMENT ON TABLE forma_pago IS 'Catalogo unico de condiciones de pago (HU-PROV-01 y HU-COMP-02). Se expone por GET /api/formas-pago y GET /api/condiciones-pago: mismo catalogo, dos preguntas distintas (que acepta un proveedor / que se pacto en una compra). El front NO debe tener su propia lista hardcodeada.';
COMMENT ON TABLE movimiento_stock_cab IS 'HU-STK-04 cabecera. Un movimiento puede afectar varios articulos.';
COMMENT ON TABLE proveedor_forma_pago IS 'N:M — un proveedor acepta varias formas de pago (HU-PROV-01, decision D-A). ON DELETE CASCADE solo del lado proveedor: si se borrara un proveedor caen sus pares, pero una forma de pago del catalogo nunca se borra si esta en uso.';
COMMENT ON TABLE solicitud_cotizacion IS 'HU-COMP-02. Pedido de cotizacion: define LOS MISMOS ARTICULOS sobre los que despues se comparan las ofertas de varios proveedores.';
