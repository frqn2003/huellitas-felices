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
CREATE TYPE estado_documento AS ENUM ('vigente', 'anulado', 'pagado');
CREATE TYPE modo_abm AS ENUM ('INSERCION', 'EDICION', 'LECTURA');
CREATE TYPE tipo_evento_sesion AS ENUM ('login', 'logout', 'login_fallido', 'bloqueado');
CREATE TYPE tipo_movimiento_stock AS ENUM ('ingreso', 'egreso');
CREATE TYPE tipo_observacion_recepcion AS ENUM ('faltante', 'danado', 'error');
CREATE TYPE tipo_operacion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE tipo_pago AS ENUM ('pago_proveedor');
CREATE TYPE tipo_recepcion AS ENUM ('parcial', 'total');


-- =========================================================
-- SECUENCIAS
-- =========================================================

CREATE SEQUENCE IF NOT EXISTS agenda_id_seq;
CREATE SEQUENCE IF NOT EXISTS articulo_cod_seq;
CREATE SEQUENCE IF NOT EXISTS articulo_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_sesion_id_seq;
CREATE SEQUENCE IF NOT EXISTS caja_id_seq;
CREATE SEQUENCE IF NOT EXISTS categoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS comprobante_proveedor_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS comprobante_proveedor_id_seq;
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
CREATE SEQUENCE IF NOT EXISTS notificacion_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_cod_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS origen_movimiento_id_seq;
CREATE SEQUENCE IF NOT EXISTS pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS pago_imputacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS presentacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS proveedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_seq;
CREATE SEQUENCE IF NOT EXISTS solicitud_cotizacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS solicitud_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS sucursal_id_seq;
CREATE SEQUENCE IF NOT EXISTS tipo_comprobante_id_seq;
CREATE SEQUENCE IF NOT EXISTS unidad_medida_id_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_id_seq;


-- =========================================================
-- TABLAS
-- =========================================================

CREATE TABLE agenda (
  id integer(32,0) DEFAULT nextval('agenda_id_seq'::regclass) NOT NULL,
  sucursal_id integer(32,0) NOT NULL,
  nombre character varying(100) DEFAULT 'Agenda principal'::character varying NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE auditoria_sesion (
  id integer(32,0) NOT NULL,
  usuario_id integer(32,0),
  evento tipo_evento_sesion NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  ip_origen inet,
  detalle jsonb
);

CREATE TABLE caja (
  id integer(32,0) DEFAULT nextval('caja_id_seq'::regclass) NOT NULL,
  sucursal_id integer(32,0) NOT NULL,
  nombre character varying(100) DEFAULT 'Caja principal'::character varying NOT NULL,
  saldo_actual numeric(12,2) DEFAULT 0 NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE categoria (
  id integer(32,0) DEFAULT nextval('categoria_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL,
  prefijo character varying(5) DEFAULT 'ART'::character varying NOT NULL
);

CREATE TABLE comprobante_proveedor (
  id integer(32,0) DEFAULT nextval('comprobante_proveedor_id_seq'::regclass) NOT NULL,
  proveedor_id integer(32,0) NOT NULL,
  tipo_comprobante_id integer(32,0) NOT NULL,
  fecha_emision date NOT NULL,
  fecha_vencimiento date NOT NULL,
  orden_compra_id integer(32,0) NOT NULL,
  comprobante_corregido_id integer(32,0),
  anula_comprobante_id integer(32,0),
  monto_total numeric(12,2) NOT NULL,
  estado estado_documento DEFAULT 'vigente'::estado_documento NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha_registro timestamp without time zone DEFAULT now() NOT NULL,
  letra character varying(2) NOT NULL,
  punto_venta character varying(4) NOT NULL,
  numero_comprobante character varying(8) NOT NULL
);

CREATE TABLE comprobante_proveedor_detalle (
  id integer(32,0) DEFAULT nextval('comprobante_proveedor_detalle_id_seq'::regclass) NOT NULL,
  comprobante_id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  cantidad numeric(12,2) NOT NULL,
  precio_facturado numeric(12,2) NOT NULL,
  subtotal numeric(14,2)
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

CREATE TABLE notificacion_compra (
  id integer(32,0) DEFAULT nextval('notificacion_compra_id_seq'::regclass) NOT NULL,
  orden_compra_detalle_id integer(32,0) NOT NULL,
  usuario_responsable_id integer(32,0) NOT NULL,
  cantidad_solicitada numeric(12,2) NOT NULL,
  cantidad_recibida numeric(12,2) NOT NULL,
  diferencia numeric(12,2),
  mensaje character varying(255) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  leida boolean DEFAULT false NOT NULL
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

CREATE TABLE pago (
  id integer(32,0) DEFAULT nextval('pago_id_seq'::regclass) NOT NULL,
  tipo tipo_pago NOT NULL,
  proveedor_id integer(32,0) NOT NULL,
  monto numeric(12,2) NOT NULL,
  fecha date DEFAULT CURRENT_DATE NOT NULL,
  forma_pago_id integer(32,0) NOT NULL,
  numero_comprobante character varying(30) NOT NULL,
  anula_pago_id integer(32,0),
  estado estado_documento DEFAULT 'vigente'::estado_documento NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha_registro timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE pago_imputacion (
  id integer(32,0) DEFAULT nextval('pago_imputacion_id_seq'::regclass) NOT NULL,
  pago_id integer(32,0) NOT NULL,
  comprobante_proveedor_id integer(32,0) NOT NULL,
  monto_imputado numeric(12,2) NOT NULL
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

CREATE TABLE sucursal (
  id integer(32,0) DEFAULT nextval('sucursal_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL,
  direccion character varying(255) NOT NULL,
  telefono character varying(30),
  horario_atencion character varying(255),
  razon_social character varying(150) NOT NULL,
  cuit character varying(20) NOT NULL,
  ingresos_brutos character varying(30),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,
  condicion_iva character varying(40)
);

CREATE TABLE tipo_comprobante (
  id integer(32,0) DEFAULT nextval('tipo_comprobante_id_seq'::regclass) NOT NULL,
  nombre character varying(30) NOT NULL,
  afecta_saldo smallint(16,0) DEFAULT 1 NOT NULL,
  prefijo character varying(5) DEFAULT 'COM'::character varying NOT NULL
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
  fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
  intentos_fallidos smallint(16,0) DEFAULT 0 NOT NULL,
  bloqueado_hasta timestamp without time zone,
  sucursal_id integer(32,0),
  auth_id uuid
);


-- =========================================================
-- CLAVES PRIMARIAS, ÚNICOS Y CHECKS
-- =========================================================

ALTER TABLE agenda ADD CONSTRAINT agenda_pkey PRIMARY KEY (id);
ALTER TABLE articulo ADD CONSTRAINT ck_articulo_contenido_neto CHECK ((contenido_neto > (0)::numeric));
ALTER TABLE articulo ADD CONSTRAINT articulo_pkey PRIMARY KEY (id);
ALTER TABLE articulo ADD CONSTRAINT articulo_codigo_key UNIQUE (codigo);
ALTER TABLE auditoria ADD CONSTRAINT ck_auditoria_valores CHECK ((((operacion = 'INSERT'::tipo_operacion_auditoria) AND (valores_anteriores IS NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'UPDATE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'DELETE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NULL))));
ALTER TABLE auditoria ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_pkey PRIMARY KEY (id);
ALTER TABLE caja ADD CONSTRAINT caja_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);
ALTER TABLE categoria ADD CONSTRAINT categoria_prefijo_key UNIQUE (prefijo);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT ck_cp_fecha_vencimiento CHECK ((fecha_vencimiento >= fecha_emision));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT ck_cp_no_autoanulado CHECK (((anula_comprobante_id IS NULL) OR (anula_comprobante_id <> id)));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT ck_cp_no_autocorregido CHECK (((comprobante_corregido_id IS NULL) OR (comprobante_corregido_id <> id)));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_monto_total_check CHECK ((monto_total >= (0)::numeric));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_pkey PRIMARY KEY (id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT uq_cp_proveedor_tipo_letra_pv_numero UNIQUE (proveedor_id, tipo_comprobante_id, letra, punto_venta, numero_comprobante);
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_cantidad_check CHECK ((cantidad > (0)::numeric));
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_precio_facturado_check CHECK ((precio_facturado >= (0)::numeric));
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_pkey PRIMARY KEY (id);
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
ALTER TABLE notificacion_compra ADD CONSTRAINT chk_notificacion_compra_diferencia CHECK ((cantidad_recibida <> cantidad_solicitada));
ALTER TABLE notificacion_compra ADD CONSTRAINT notificacion_compra_pkey PRIMARY KEY (id);
ALTER TABLE notificacion_compra ADD CONSTRAINT uq_notificacion_compra_oc_detalle UNIQUE (orden_compra_detalle_id);
ALTER TABLE orden_compra ADD CONSTRAINT ck_oc_importes CHECK (((COALESCE(subtotal, (0)::numeric) >= (0)::numeric) AND (total >= (0)::numeric) AND (COALESCE(gastos_envio, (0)::numeric) >= (0)::numeric) AND ((COALESCE(descuento, (0)::numeric) >= (0)::numeric) AND (COALESCE(descuento, (0)::numeric) <= (100)::numeric))));
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_pkey PRIMARY KEY (id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_cod_ord_key UNIQUE (cod_ord);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_cantidad CHECK ((cantidad > (0)::numeric));
ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_precio CHECK ((precio_acordado >= (0)::numeric));
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_pkey PRIMARY KEY (id);
ALTER TABLE origen_movimiento ADD CONSTRAINT origen_movimiento_pkey PRIMARY KEY (id);
ALTER TABLE origen_movimiento ADD CONSTRAINT origen_movimiento_nombre_key UNIQUE (nombre);
ALTER TABLE pago ADD CONSTRAINT ck_pago_no_autoanulado CHECK (((anula_pago_id IS NULL) OR (anula_pago_id <> id)));
ALTER TABLE pago ADD CONSTRAINT pago_monto_check CHECK ((monto > (0)::numeric));
ALTER TABLE pago ADD CONSTRAINT pago_pkey PRIMARY KEY (id);
ALTER TABLE pago ADD CONSTRAINT pago_numero_comprobante_key UNIQUE (numero_comprobante);
ALTER TABLE pago_imputacion ADD CONSTRAINT pago_imputacion_monto_imputado_check CHECK ((monto_imputado > (0)::numeric));
ALTER TABLE pago_imputacion ADD CONSTRAINT pago_imputacion_pkey PRIMARY KEY (id);
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
ALTER TABLE sucursal ADD CONSTRAINT sucursal_pkey PRIMARY KEY (id);
ALTER TABLE tipo_comprobante ADD CONSTRAINT tipo_comprobante_afecta_saldo_check CHECK ((afecta_saldo = ANY (ARRAY[1, '-1'::integer])));
ALTER TABLE tipo_comprobante ADD CONSTRAINT tipo_comprobante_pkey PRIMARY KEY (id);
ALTER TABLE tipo_comprobante ADD CONSTRAINT tipo_comprobante_nombre_key UNIQUE (nombre);
ALTER TABLE tipo_comprobante ADD CONSTRAINT tipo_comprobante_prefijo_key UNIQUE (prefijo);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_pkey PRIMARY KEY (id);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_unidad_key UNIQUE (nombre);
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_intentos_fallidos CHECK (((intentos_fallidos >= 0) AND (intentos_fallidos <= 3)));
ALTER TABLE usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE usuario ADD CONSTRAINT usuario_auth_id_key UNIQUE (auth_id);


-- =========================================================
-- CLAVES FORÁNEAS
-- =========================================================

ALTER TABLE agenda ADD CONSTRAINT agenda_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categoria(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_fabricante_id_fkey FOREIGN KEY (fabricante_id) REFERENCES fabricante(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_presentacion_id_fkey FOREIGN KEY (presentacion_id) REFERENCES presentacion(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_unidad_medida_id_fkey FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medida(id);
ALTER TABLE auditoria ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE caja ADD CONSTRAINT caja_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_anula_comprobante_id_fkey FOREIGN KEY (anula_comprobante_id) REFERENCES comprobante_proveedor(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_comprobante_corregido_id_fkey FOREIGN KEY (comprobante_corregido_id) REFERENCES comprobante_proveedor(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_orden_compra_id_fkey FOREIGN KEY (orden_compra_id) REFERENCES orden_compra(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_tipo_comprobante_id_fkey FOREIGN KEY (tipo_comprobante_id) REFERENCES tipo_comprobante(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_comprobante_id_fkey FOREIGN KEY (comprobante_id) REFERENCES comprobante_proveedor(id) ON DELETE CASCADE;
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE;
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id) ON DELETE CASCADE;
ALTER TABLE deposito ADD CONSTRAINT deposito_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_movimiento_vinculado_id_fkey FOREIGN KEY (movimiento_vinculado_id) REFERENCES movimiento_stock_cab(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_origen_id_fkey FOREIGN KEY (origen_id) REFERENCES origen_movimiento(id);
ALTER TABLE movimiento_stock_cab ADD CONSTRAINT movimiento_stock_cab_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE movimiento_stock_det ADD CONSTRAINT movimiento_stock_det_ficha_stock_id_fkey FOREIGN KEY (ficha_stock_id) REFERENCES ficha_stock(id);
ALTER TABLE movimiento_stock_det ADD CONSTRAINT movimiento_stock_det_movimiento_id_fkey FOREIGN KEY (movimiento_id) REFERENCES movimiento_stock_cab(id) ON DELETE CASCADE;
ALTER TABLE notificacion_compra ADD CONSTRAINT notificacion_compra_orden_compra_detalle_id_fkey FOREIGN KEY (orden_compra_detalle_id) REFERENCES orden_compra_detalle(id) ON DELETE CASCADE;
ALTER TABLE notificacion_compra ADD CONSTRAINT notificacion_compra_usuario_responsable_id_fkey FOREIGN KEY (usuario_responsable_id) REFERENCES usuario(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES estado_orden_compra(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_orden_compra_id_fkey FOREIGN KEY (orden_compra_id) REFERENCES orden_compra(id);
ALTER TABLE pago ADD CONSTRAINT pago_anula_pago_id_fkey FOREIGN KEY (anula_pago_id) REFERENCES pago(id);
ALTER TABLE pago ADD CONSTRAINT pago_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE pago ADD CONSTRAINT pago_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE pago ADD CONSTRAINT pago_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE pago_imputacion ADD CONSTRAINT pago_imputacion_comprobante_proveedor_id_fkey FOREIGN KEY (comprobante_proveedor_id) REFERENCES comprobante_proveedor(id);
ALTER TABLE pago_imputacion ADD CONSTRAINT pago_imputacion_pago_id_fkey FOREIGN KEY (pago_id) REFERENCES pago(id) ON DELETE CASCADE;
ALTER TABLE proveedor_forma_pago ADD CONSTRAINT proveedor_forma_pago_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE proveedor_forma_pago ADD CONSTRAINT proveedor_forma_pago_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE CASCADE;
ALTER TABLE solicitud_cotizacion ADD CONSTRAINT solicitud_cotizacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE solicitud_detalle ADD CONSTRAINT solicitud_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE solicitud_detalle ADD CONSTRAINT solicitud_detalle_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE;
ALTER TABLE usuario ADD CONSTRAINT fk_usuario_auth_id FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES rol(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);


-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_agenda_sucursal ON public.agenda USING btree (sucursal_id);
CREATE INDEX idx_articulo_categoria ON public.articulo USING btree (categoria_id);
CREATE INDEX idx_articulo_estado ON public.articulo USING btree (estado);
CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria USING btree (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria USING btree (usuario_id);
CREATE INDEX idx_auditoria_sesion_fecha ON public.auditoria_sesion USING btree (fecha_hora);
CREATE INDEX idx_auditoria_sesion_usuario ON public.auditoria_sesion USING btree (usuario_id);
CREATE INDEX idx_caja_sucursal ON public.caja USING btree (sucursal_id);
CREATE INDEX idx_cp_fecha ON public.comprobante_proveedor USING btree (fecha_emision);
CREATE INDEX idx_cp_oc ON public.comprobante_proveedor USING btree (orden_compra_id);
CREATE INDEX idx_cp_proveedor ON public.comprobante_proveedor USING btree (proveedor_id);
CREATE INDEX idx_cp_proveedor_vigente ON public.comprobante_proveedor USING btree (proveedor_id, estado) WHERE (estado = 'vigente'::estado_documento);
CREATE INDEX idx_cp_tipo ON public.comprobante_proveedor USING btree (tipo_comprobante_id);
CREATE UNIQUE INDEX uq_cp_anula_comprobante_id ON public.comprobante_proveedor USING btree (anula_comprobante_id) WHERE (anula_comprobante_id IS NOT NULL);
CREATE INDEX idx_cpd_articulo ON public.comprobante_proveedor_detalle USING btree (articulo_id);
CREATE INDEX idx_cpd_comprobante ON public.comprobante_proveedor_detalle USING btree (comprobante_id);
CREATE INDEX idx_cd_cotizacion ON public.cotizacion_detalle USING btree (cotizacion_id);
CREATE INDEX idx_deposito_sucursal ON public.deposito USING btree (sucursal_id);
CREATE INDEX idx_ficha_articulo ON public.ficha_stock USING btree (articulo_id);
CREATE INDEX idx_ficha_deposito ON public.ficha_stock USING btree (deposito_id);
CREATE INDEX idx_mov_cab_deposito ON public.movimiento_stock_cab USING btree (deposito_id);
CREATE INDEX idx_mov_cab_fecha ON public.movimiento_stock_cab USING btree (fecha_hora DESC);
CREATE INDEX idx_mov_cab_origen_entidad ON public.movimiento_stock_cab USING btree (origen_id, origen_entidad_id);
CREATE INDEX idx_mov_det_ficha ON public.movimiento_stock_det USING btree (ficha_stock_id);
CREATE INDEX idx_mov_det_movimiento ON public.movimiento_stock_det USING btree (movimiento_id);
CREATE INDEX idx_notif_responsable_pendiente ON public.notificacion_compra USING btree (usuario_responsable_id);
CREATE INDEX idx_oc_estado ON public.orden_compra USING btree (estado_id);
CREATE INDEX idx_oc_fecha ON public.orden_compra USING btree (fecha DESC);
CREATE INDEX idx_oc_proveedor ON public.orden_compra USING btree (proveedor_id);
CREATE INDEX idx_ocd_orden ON public.orden_compra_detalle USING btree (orden_compra_id);
CREATE INDEX idx_ocd_orden_articulo ON public.orden_compra_detalle USING btree (orden_compra_id, articulo_id);
CREATE INDEX idx_pago_fecha ON public.pago USING btree (fecha);
CREATE INDEX idx_pago_proveedor ON public.pago USING btree (proveedor_id);
CREATE INDEX idx_pago_proveedor_vigente ON public.pago USING btree (proveedor_id, estado) WHERE (estado = 'vigente'::estado_documento);
CREATE UNIQUE INDEX uq_pago_anula_pago_id ON public.pago USING btree (anula_pago_id) WHERE (anula_pago_id IS NOT NULL);
CREATE INDEX idx_pi_comprobante_prov ON public.pago_imputacion USING btree (comprobante_proveedor_id);
CREATE UNIQUE INDEX uq_pi_pago_comprobante_prov ON public.pago_imputacion USING btree (pago_id, comprobante_proveedor_id) WHERE (comprobante_proveedor_id IS NOT NULL);
CREATE INDEX idx_proveedor_estado ON public.proveedor USING btree (estado);
CREATE UNIQUE INDEX uq_proveedor_cuit_activo ON public.proveedor USING btree (cuit) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_pfp_forma_pago ON public.proveedor_forma_pago USING btree (forma_pago_id);
CREATE INDEX idx_sd_solicitud ON public.solicitud_detalle USING btree (solicitud_id);
CREATE UNIQUE INDEX uq_sucursal_nombre_activa ON public.sucursal USING btree (lower((nombre)::text)) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_usuario_sucursal ON public.usuario USING btree (sucursal_id);
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

CREATE OR REPLACE VIEW vista_cuenta_corriente_proveedor AS
SELECT cp.id AS comprobante_id,
    cp.proveedor_id,
    cp.letra,
    cp.punto_venta,
    cp.numero_comprobante,
    (((((cp.letra)::text || ' '::text) || (cp.punto_venta)::text) || '-'::text) || (cp.numero_comprobante)::text) AS numero_completo,
    tc.nombre AS tipo_comprobante,
    cp.fecha_emision,
    cp.fecha_vencimiento,
    (cp.monto_total * (tc.afecta_saldo)::numeric) AS monto_signado,
    COALESCE(pi.monto_pagado, (0)::numeric) AS monto_pagado,
    ((cp.monto_total * (tc.afecta_saldo)::numeric) - COALESCE(pi.monto_pagado, (0)::numeric)) AS saldo_pendiente,
        CASE
            WHEN (cp.fecha_vencimiento < CURRENT_DATE) THEN 'vencido'::text
            WHEN (cp.fecha_vencimiento <= (CURRENT_DATE + '7 days'::interval)) THEN 'por_vencer'::text
            ELSE 'vigente'::text
        END AS estado_vencimiento,
    (cp.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer
   FROM ((comprobante_proveedor cp
     JOIN tipo_comprobante tc ON ((tc.id = cp.tipo_comprobante_id)))
     LEFT JOIN ( SELECT pi_1.comprobante_proveedor_id,
            sum(pi_1.monto_imputado) AS monto_pagado
           FROM (pago_imputacion pi_1
             JOIN pago p ON ((p.id = pi_1.pago_id)))
          WHERE ((p.estado = 'vigente'::estado_documento) AND (pi_1.comprobante_proveedor_id IS NOT NULL))
          GROUP BY pi_1.comprobante_proveedor_id) pi ON ((pi.comprobante_proveedor_id = cp.id)))
  WHERE (cp.estado = 'vigente'::estado_documento);


-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION public.fn_abm_sucursal(p_modo modo_abm, p_id integer DEFAULT NULL::integer, p_nombre character varying DEFAULT NULL::character varying, p_direccion character varying DEFAULT NULL::character varying, p_telefono character varying DEFAULT NULL::character varying, p_horario_atencion character varying DEFAULT NULL::character varying, p_razon_social character varying DEFAULT NULL::character varying, p_cuit character varying DEFAULT NULL::character varying, p_condicion_iva character varying DEFAULT NULL::character varying, p_ingresos_brutos character varying DEFAULT NULL::character varying)
 RETURNS SETOF sucursal
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_id             integer;
  v_existe_nombre  boolean;
BEGIN

  -- ---------------- LECTURA ----------------
  IF p_modo = 'LECTURA' THEN
    IF p_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.sucursal WHERE id = p_id;
    ELSE
      RETURN QUERY SELECT * FROM public.sucursal WHERE estado = 'activo' ORDER BY nombre;
    END IF;
    RETURN;
  END IF;

  -- --------- Validaciones comunes a INSERCION y EDICION ---------
  IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
    RAISE EXCEPTION 'El nombre de la sucursal es obligatorio';
  END IF;

  IF p_direccion IS NULL OR btrim(p_direccion) = '' THEN
    RAISE EXCEPTION 'La dirección de la sucursal es obligatoria';
  END IF;

  IF p_razon_social IS NULL OR btrim(p_razon_social) = '' OR p_cuit IS NULL OR btrim(p_cuit) = '' THEN
    RAISE EXCEPTION 'Los datos fiscales (razón social y CUIT) son obligatorios';
  END IF;

  -- Nombre no duplicado entre sucursales ACTIVAS (excluye la propia en EDICION)
  SELECT EXISTS (
    SELECT 1 FROM public.sucursal
    WHERE lower(nombre) = lower(p_nombre)
      AND estado = 'activo'
      AND (p_modo = 'INSERCION' OR id <> p_id)
  ) INTO v_existe_nombre;

  IF v_existe_nombre THEN
    RAISE EXCEPTION 'Ya existe una sucursal activa con el nombre "%"', p_nombre;
  END IF;

  -- ---------------- INSERCION ----------------
  IF p_modo = 'INSERCION' THEN

    INSERT INTO public.sucursal
        (nombre, direccion, telefono, horario_atencion, razon_social, cuit, condicion_iva, ingresos_brutos)
    VALUES
        (p_nombre, p_direccion, p_telefono, p_horario_atencion, p_razon_social, p_cuit, p_condicion_iva, p_ingresos_brutos)
    RETURNING id INTO v_id;

    -- Inicializa caja, agenda y depósito de stock, independientes por sucursal
    INSERT INTO public.caja (sucursal_id, nombre) VALUES (v_id, 'Caja principal');
    INSERT INTO public.agenda (sucursal_id, nombre) VALUES (v_id, 'Agenda principal');
    INSERT INTO public.deposito (sucursal_id, nombre) VALUES (v_id, 'Depósito principal');

    RETURN QUERY SELECT * FROM public.sucursal WHERE id = v_id;
    RETURN;

  -- ---------------- EDICION ----------------
  ELSIF p_modo = 'EDICION' THEN

    IF p_id IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el id de la sucursal a editar';
    END IF;

    UPDATE public.sucursal
    SET nombre           = p_nombre,
        direccion        = p_direccion,
        telefono         = p_telefono,
        horario_atencion = p_horario_atencion,
        razon_social     = p_razon_social,
        cuit             = p_cuit,
        condicion_iva    = p_condicion_iva,
        ingresos_brutos  = p_ingresos_brutos
    WHERE id = p_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe la sucursal con id %', p_id;
    END IF;

    RETURN QUERY SELECT * FROM public.sucursal WHERE id = p_id;
    RETURN;

  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_actualiza_estado_comprobante_por_pago()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_comprobante_id  int;
  v_saldo_pendiente numeric(12,2);
BEGIN
  v_comprobante_id := COALESCE(NEW.comprobante_proveedor_id, OLD.comprobante_proveedor_id);

  IF v_comprobante_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- La vista sólo incluye comprobantes con estado = 'vigente';
  -- si no aparece, ya está anulado o pagado y no hay nada que recalcular.
  SELECT saldo_pendiente INTO v_saldo_pendiente
  FROM public.vista_cuenta_corriente_proveedor
  WHERE comprobante_id = v_comprobante_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_saldo_pendiente <= 0 THEN
    UPDATE public.comprobante_proveedor
    SET estado = 'pagado'
    WHERE id = v_comprobante_id
      AND estado = 'vigente';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_actualiza_oc_por_recepcion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_origen_nombre     varchar(40);
  v_orden_compra_id   int;
  v_total_lineas      int;
  v_lineas_completas  int;
  v_lineas_con_algo   int;
  v_estado_nombre     varchar(30);
  v_estado_id         int;
BEGIN
  SELECT om.nombre, mc.origen_entidad_id
  INTO v_origen_nombre, v_orden_compra_id
  FROM movimiento_stock_cab mc
  JOIN origen_movimiento om ON om.id = mc.origen_id
  WHERE mc.id = NEW.movimiento_id;

  IF v_origen_nombre <> 'recepcion_compra' THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE COALESCE(r.recibido, 0) >= ocd.cantidad),
    count(*) FILTER (WHERE COALESCE(r.recibido, 0) > 0)
  INTO v_total_lineas, v_lineas_completas, v_lineas_con_algo
  FROM orden_compra_detalle ocd
  LEFT JOIN (
      SELECT fs.articulo_id, SUM(msd.cantidad) AS recibido
      FROM movimiento_stock_det msd
      JOIN movimiento_stock_cab mc2 ON mc2.id = msd.movimiento_id
      JOIN origen_movimiento om2 ON om2.id = mc2.origen_id
      JOIN ficha_stock fs ON fs.id = msd.ficha_stock_id
      WHERE om2.nombre = 'recepcion_compra'
        AND mc2.origen_entidad_id = v_orden_compra_id
      GROUP BY fs.articulo_id
  ) r ON r.articulo_id = ocd.articulo_id
  WHERE ocd.orden_compra_id = v_orden_compra_id;

  IF v_lineas_completas = v_total_lineas THEN
    v_estado_nombre := 'recibida_total';
  ELSIF v_lineas_con_algo > 0 THEN
    v_estado_nombre := 'recibida_parcial';
  ELSE
    RETURN NEW;
  END IF;

  SELECT id INTO v_estado_id
  FROM estado_orden_compra
  WHERE nombre = v_estado_nombre;

  IF v_estado_id IS NULL THEN
    RAISE EXCEPTION 'No existe estado_orden_compra con nombre %', v_estado_nombre;
  END IF;

  UPDATE orden_compra
  SET estado_id = v_estado_id
  WHERE id = v_orden_compra_id;

  RETURN NEW;
END;
$function$
;

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
    v_delta            decimal(12,2);
    v_stock_resultante decimal(12,2);
BEGIN
    SELECT tipo INTO v_tipo
    FROM movimiento_stock_cab
    WHERE id = NEW.movimiento_id;

    IF TG_OP = 'INSERT' THEN
        v_delta := NEW.cantidad;
    ELSE
        v_delta := NEW.cantidad - OLD.cantidad;
    END IF;

    IF v_delta = 0 THEN
        RETURN NULL;
    END IF;

    IF v_tipo = 'egreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual - v_delta
        WHERE id = NEW.ficha_stock_id
        RETURNING stock_actual INTO v_stock_resultante;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No existe la ficha de stock %', NEW.ficha_stock_id
                USING ERRCODE = 'HF002';
        END IF;

        IF v_stock_resultante < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente: el movimiento dejaria stock negativo (disponible: %, egreso: %)',
                v_stock_resultante + v_delta, v_delta
                USING ERRCODE = 'HF001';
        END IF;

    ELSIF v_tipo = 'ingreso' THEN
        UPDATE ficha_stock
        SET stock_actual = stock_actual + v_delta
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

CREATE OR REPLACE FUNCTION public.fn_anula_comprobante_proveedor()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.anula_comprobante_id IS NOT NULL THEN
    UPDATE comprobante_proveedor
    SET estado = 'anulado'
    WHERE id = NEW.anula_comprobante_id;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_anula_pago()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.anula_pago_id IS NOT NULL THEN
    UPDATE pago
    SET estado = 'anulado'
    WHERE id = NEW.anula_pago_id;
  END IF;
  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.fn_bloquea_update_comprobante_proveedor()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Transiciones de estado permitidas, sin tocar ningún otro campo.
  IF (
       (OLD.estado = 'vigente' AND NEW.estado IN ('anulado', 'pagado'))
       OR (OLD.estado = 'pagado' AND NEW.estado = 'anulado')
     )
     AND row(NEW.id, NEW.proveedor_id, NEW.tipo_comprobante_id,
              NEW.fecha_emision, NEW.fecha_vencimiento, NEW.orden_compra_id,
              NEW.comprobante_corregido_id, NEW.anula_comprobante_id, NEW.monto_total,
              NEW.usuario_id, NEW.fecha_registro,
              NEW.letra, NEW.punto_venta, NEW.numero_comprobante)
       IS NOT DISTINCT FROM
       row(OLD.id, OLD.proveedor_id, OLD.tipo_comprobante_id,
              OLD.fecha_emision, OLD.fecha_vencimiento, OLD.orden_compra_id,
              OLD.comprobante_corregido_id, OLD.anula_comprobante_id, OLD.monto_total,
              OLD.usuario_id, OLD.fecha_registro,
              OLD.letra, OLD.punto_venta, OLD.numero_comprobante)
  THEN
    RETURN NEW;
  END IF;

  IF row(NEW.*) IS NOT DISTINCT FROM row(OLD.*) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'comprobante_proveedor es inmutable: no se permite UPDATE salvo las transiciones de estado permitidas (vigente->anulado, vigente->pagado, pagado->anulado)';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bloquea_update_pago()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.estado = 'vigente' AND NEW.estado = 'anulado' THEN
    IF row(NEW.id, NEW.tipo, NEW.proveedor_id, NEW.monto, NEW.fecha,
            NEW.forma_pago_id, NEW.numero_comprobante, NEW.usuario_id, NEW.fecha_registro)
       IS NOT DISTINCT FROM
       row(OLD.id, OLD.tipo, OLD.proveedor_id, OLD.monto, OLD.fecha,
            OLD.forma_pago_id, OLD.numero_comprobante, OLD.usuario_id, OLD.fecha_registro)
    THEN
      RETURN NEW;
    END IF;
  END IF;

  IF row(NEW.*) IS NOT DISTINCT FROM row(OLD.*) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'pago es inmutable: no se permite UPDATE salvo la anulación interna (estado vigente -> anulado)';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ck_comprobante_no_excede()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_monto_total   decimal(12,2);
  v_estado        estado_documento;
  v_afecta_saldo  smallint;
  v_imputado      decimal(12,2);
BEGIN
  -- Mismo motivo que en fn_ck_suma_imputada: FOR UPDATE evita que dos
  -- imputaciones concurrentes sobre el mismo comprobante lean la suma histórica
  -- antes de que la otra haga commit.
  -- Nota de orden de locks: este trigger (trg_ck_comprobante_no_excede) se
  -- dispara antes que trg_ck_suma_imputada por orden alfabético del nombre, así
  -- que SIEMPRE se bloquea primero comprobante y después pago, en todas las
  -- transacciones — lo que evita un deadlock cruzado entre ambos locks.
  SELECT cp.monto_total, cp.estado, tc.afecta_saldo
  INTO v_monto_total, v_estado, v_afecta_saldo
  FROM comprobante_proveedor cp
  JOIN tipo_comprobante tc ON tc.id = cp.tipo_comprobante_id
  WHERE cp.id = NEW.comprobante_proveedor_id
  FOR UPDATE OF cp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el comprobante_proveedor %', NEW.comprobante_proveedor_id
      USING ERRCODE = 'HF011';
  END IF;

  -- Anulado: no existe a efectos de la cuenta, y la vista lo esconde. Sin este
  -- chequeo la plata entraba a pago_imputacion, quedaba auditada como legítima,
  -- y desaparecía de la pantalla: un pago fantasma sin traza visible.
  --
  -- Pagado: el saldo ya está en cero. El chequeo de más abajo lo rechazaría
  -- igual (lo imputado ya iguala el monto_total), pero con un mensaje sobre
  -- montos en vez de decir lo que pasa. Se nombra el estado.
  IF v_estado <> 'vigente'::estado_documento THEN
    RAISE EXCEPTION 'El comprobante % está en estado %: no admite imputaciones',
      NEW.comprobante_proveedor_id, v_estado
      USING ERRCODE = 'HF014';
  END IF;

  -- afecta_saldo = -1 es una Nota de Crédito.
  IF v_afecta_saldo = -1 THEN
    RAISE EXCEPTION 'El comprobante % es una Nota de Crédito: no se le imputan pagos',
      NEW.comprobante_proveedor_id
      USING ERRCODE = 'HF013';
  END IF;

  SELECT COALESCE(SUM(pi.monto_imputado), 0) INTO v_imputado
  FROM pago_imputacion pi
  JOIN pago p ON p.id = pi.pago_id
  WHERE pi.comprobante_proveedor_id = NEW.comprobante_proveedor_id
    AND p.estado = 'vigente';

  IF v_imputado + NEW.monto_imputado > v_monto_total THEN
    RAISE EXCEPTION 'La suma imputada histórica (%) supera el monto_total del comprobante (%)',
      v_imputado + NEW.monto_imputado, v_monto_total
      USING ERRCODE = 'HF011';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ck_pi_mismo_tercero()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_pago_proveedor_id  int;
  v_cp_proveedor_id    int;
BEGIN
  SELECT proveedor_id INTO v_pago_proveedor_id
  FROM pago WHERE id = NEW.pago_id;

  SELECT proveedor_id INTO v_cp_proveedor_id
  FROM comprobante_proveedor WHERE id = NEW.comprobante_proveedor_id;

  IF v_cp_proveedor_id IS DISTINCT FROM v_pago_proveedor_id THEN
    RAISE EXCEPTION 'El comprobante_proveedor imputado no pertenece al proveedor del pago'
      USING ERRCODE = 'HF012';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_ck_suma_imputada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_monto_pago   decimal(12,2);
  v_ya_imputado  decimal(12,2);
BEGIN
  -- FOR UPDATE bloquea la fila de pago hasta que termine esta transacción.
  -- Sin esto, dos INSERT concurrentes sobre el mismo pago_id podrían leer la
  -- suma ya imputada ANTES de que el otro haga commit, y los dos pasarían la
  -- validación con datos desactualizados (sobre-imputación real en la tabla
  -- aunque cada INSERT individualmente "cumplía"). Con el lock, el segundo
  -- espera y recalcula con el dato posta.
  SELECT monto INTO v_monto_pago FROM pago WHERE id = NEW.pago_id FOR UPDATE;

  SELECT COALESCE(SUM(monto_imputado), 0) INTO v_ya_imputado
  FROM pago_imputacion
  WHERE pago_id = NEW.pago_id;

  IF v_ya_imputado + NEW.monto_imputado > v_monto_pago THEN
    RAISE EXCEPTION 'La suma imputada (%) supera el monto del pago (%)',
      v_ya_imputado + NEW.monto_imputado, v_monto_pago
      USING ERRCODE = 'HF010';
  END IF;

  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.fn_notificar_diferencia_compra()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cab                    public.movimiento_stock_cab%ROWTYPE;
    v_origen_recepcion_id    integer;
    v_articulo_id            integer;
    v_oc_detalle             public.orden_compra_detalle%ROWTYPE;
    v_cantidad_recibida_tot  numeric(12,2);
    v_usuario_responsable    integer;
    v_mensaje                character varying(255);
BEGIN
    SELECT * INTO v_cab
    FROM public.movimiento_stock_cab
    WHERE id = NEW.movimiento_id;

    IF v_cab.tipo <> 'ingreso' OR v_cab.origen_entidad_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_origen_recepcion_id
    FROM public.origen_movimiento
    WHERE nombre = 'recepcion_compra';

    IF v_origen_recepcion_id IS NULL OR v_cab.origen_id IS DISTINCT FROM v_origen_recepcion_id THEN
        RETURN NEW; -- no es una recepción de compra
    END IF;

    SELECT articulo_id INTO v_articulo_id
    FROM public.ficha_stock
    WHERE id = NEW.ficha_stock_id;

    SELECT * INTO v_oc_detalle
    FROM public.orden_compra_detalle
    WHERE orden_compra_id = v_cab.origen_entidad_id
      AND articulo_id = v_articulo_id;

    IF NOT FOUND THEN
        RETURN NEW; -- el artículo recibido no pertenece a esta OC
    END IF;

    -- Total recibido a la fecha para esta OC + artículo (suma entregas parciales)
    SELECT COALESCE(SUM(msd.cantidad), 0) INTO v_cantidad_recibida_tot
    FROM public.movimiento_stock_det msd
    JOIN public.movimiento_stock_cab msc ON msc.id = msd.movimiento_id
    JOIN public.ficha_stock fs ON fs.id = msd.ficha_stock_id
    WHERE msc.tipo = 'ingreso'
      AND msc.origen_id = v_origen_recepcion_id
      AND msc.origen_entidad_id = v_cab.origen_entidad_id
      AND fs.articulo_id = v_articulo_id;

    IF v_cantidad_recibida_tot = v_oc_detalle.cantidad THEN
        -- La diferencia (si existía) quedó resuelta con esta entrega.
        DELETE FROM public.notificacion_compra
        WHERE orden_compra_detalle_id = v_oc_detalle.id;
        RETURN NEW;
    END IF;

    SELECT usuario_id INTO v_usuario_responsable
    FROM public.orden_compra
    WHERE id = v_cab.origen_entidad_id;

    v_mensaje := left(format(
        'OC #%s - artículo %s: solicitado %s, recibido %s (dif. %s)',
        v_cab.origen_entidad_id,
        v_articulo_id,
        v_oc_detalle.cantidad,
        v_cantidad_recibida_tot,
        v_cantidad_recibida_tot - v_oc_detalle.cantidad
    ), 255);

    INSERT INTO public.notificacion_compra (
        orden_compra_detalle_id, usuario_responsable_id,
        cantidad_solicitada, cantidad_recibida, mensaje
    ) VALUES (
        v_oc_detalle.id, v_usuario_responsable,
        v_oc_detalle.cantidad, v_cantidad_recibida_tot, v_mensaje
    )
    ON CONFLICT (orden_compra_detalle_id) DO UPDATE
        SET cantidad_recibida = EXCLUDED.cantidad_recibida,
            mensaje           = EXCLUDED.mensaje,
            fecha_hora        = now(),
            leida             = false;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_pi_upsert_monto_imputado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing_id int;
BEGIN
  -- Advisory lock por (pago_id, comprobante_proveedor_id): serializa dos
  -- INSERT concurrentes sobre el MISMO par para que no pasen los dos
  -- el "todavía no existe" al mismo tiempo.
  PERFORM pg_advisory_xact_lock(
    hashtext('pago_imputacion'),
    hashtext(NEW.pago_id::text || ':' || NEW.comprobante_proveedor_id::text)
  );

  SELECT id INTO v_existing_id
  FROM pago_imputacion
  WHERE pago_id = NEW.pago_id
    AND comprobante_proveedor_id = NEW.comprobante_proveedor_id;

  IF v_existing_id IS NOT NULL THEN
    -- Ya existe una imputación de este pago contra este comprobante:
    -- se suma el nuevo monto sobre la fila existente en vez de crear
    -- una segunda fila ambigua para el mismo concepto.
    UPDATE pago_imputacion
    SET monto_imputado = monto_imputado + NEW.monto_imputado
    WHERE id = v_existing_id;

    RETURN NULL; -- cancela el INSERT original: ya se aplicó como UPDATE
  END IF;

  RETURN NEW; -- primera vez que se imputa este pago contra este comprobante
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_valida_mov_det_recepcion_compra()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_origen_nombre    varchar(40);
  v_orden_compra_id  int;
  v_articulo_id      int;
  v_existe_linea     boolean;
BEGIN
  SELECT om.nombre, mc.origen_entidad_id
  INTO v_origen_nombre, v_orden_compra_id
  FROM movimiento_stock_cab mc
  JOIN origen_movimiento om ON om.id = mc.origen_id
  WHERE mc.id = NEW.movimiento_id;

  IF v_origen_nombre = 'recepcion_compra' THEN

    SELECT articulo_id INTO v_articulo_id
    FROM ficha_stock
    WHERE id = NEW.ficha_stock_id;

    SELECT EXISTS (
      SELECT 1 FROM orden_compra_detalle
      WHERE orden_compra_id = v_orden_compra_id
        AND articulo_id = v_articulo_id
    ) INTO v_existe_linea;

    IF NOT v_existe_linea THEN
      RAISE EXCEPTION 'El artículo % no forma parte de la orden_compra %', v_articulo_id, v_orden_compra_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_valida_mov_recepcion_compra()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_origen_nombre  varchar(40);
  v_es_final       boolean;
  v_estado_nombre  varchar(30);
BEGIN
  SELECT nombre INTO v_origen_nombre
  FROM origen_movimiento
  WHERE id = NEW.origen_id;

  IF v_origen_nombre = 'recepcion_compra' THEN

    IF NEW.origen_entidad_id IS NULL THEN
      RAISE EXCEPTION 'Un movimiento con origen recepcion_compra requiere origen_entidad_id = orden_compra.id';
    END IF;

    IF NEW.tipo <> 'ingreso' THEN
      RAISE EXCEPTION 'Un movimiento con origen recepcion_compra debe ser de tipo ingreso';
    END IF;

    SELECT eoc.es_final, eoc.nombre INTO v_es_final, v_estado_nombre
    FROM orden_compra oc
    JOIN estado_orden_compra eoc ON eoc.id = oc.estado_id
    WHERE oc.id = NEW.origen_entidad_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe orden_compra con id % (origen_entidad_id)', NEW.origen_entidad_id;
    END IF;

    IF v_es_final THEN
      RAISE EXCEPTION 'La orden_compra % ya está en estado final (%): no se pueden registrar más recepciones',
        NEW.origen_entidad_id, v_estado_nombre;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuario (
    auth_id,
    email,
    nombre,
    apellido,
    dni,
    rol_id,
    sucursal_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'apellido',
    NEW.raw_user_meta_data->>'dni',
    (NEW.raw_user_meta_data->>'rol_id')::integer,
    (NEW.raw_user_meta_data->>'sucursal_id')::integer
  );
  RETURN NEW;
END;

$function$
;


-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_articulo_updated_at BEFORE UPDATE ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_articulo AFTER INSERT OR DELETE OR UPDATE ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_cod_articulo BEFORE INSERT ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_articulo();
CREATE TRIGGER trg_auditoria_comprobante_proveedor AFTER INSERT ON public.comprobante_proveedor FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_bloquea_update_comprobante_proveedor BEFORE UPDATE ON public.comprobante_proveedor FOR EACH ROW EXECUTE FUNCTION fn_bloquea_update_comprobante_proveedor();
CREATE TRIGGER trg_cp_anula_comprobante AFTER INSERT ON public.comprobante_proveedor FOR EACH ROW WHEN ((new.anula_comprobante_id IS NOT NULL)) EXECUTE FUNCTION fn_anula_comprobante_proveedor();
CREATE TRIGGER trg_auditoria_cotizacion AFTER INSERT ON public.cotizacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_deposito AFTER INSERT OR UPDATE ON public.deposito FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_movimiento_stock_cab AFTER INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_numero_movimiento BEFORE INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_movimiento();
CREATE TRIGGER trg_valida_mov_recepcion_compra BEFORE INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_valida_mov_recepcion_compra();
CREATE TRIGGER trg_actualiza_oc_por_recepcion AFTER INSERT ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_actualiza_oc_por_recepcion();
CREATE TRIGGER trg_actualizar_stock_det AFTER INSERT ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_det();
CREATE TRIGGER trg_notificar_diferencia_compra AFTER INSERT ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_notificar_diferencia_compra();
CREATE TRIGGER trg_valida_mov_det_recepcion_compra BEFORE INSERT ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_valida_mov_det_recepcion_compra();
CREATE TRIGGER trg_auditoria_orden_compra_estado AFTER UPDATE ON public.orden_compra FOR EACH ROW WHEN ((old.estado_id IS DISTINCT FROM new.estado_id)) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_orden_compra_insert AFTER INSERT ON public.orden_compra FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_cod_orden_compra BEFORE INSERT ON public.orden_compra FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_orden_compra();
CREATE TRIGGER trg_auditoria_pago AFTER INSERT ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_bloquea_update_pago BEFORE UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION fn_bloquea_update_pago();
CREATE TRIGGER trg_pago_anula_pago AFTER INSERT ON public.pago FOR EACH ROW WHEN ((new.anula_pago_id IS NOT NULL)) EXECUTE FUNCTION fn_anula_pago();
CREATE TRIGGER trg_actualiza_estado_comprobante_por_pago AFTER INSERT OR UPDATE ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_actualiza_estado_comprobante_por_pago();
CREATE TRIGGER trg_auditoria_pago_imputacion AFTER INSERT ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_pago_imputacion_update AFTER UPDATE ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_ck_comprobante_no_excede BEFORE INSERT ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_ck_comprobante_no_excede();
CREATE TRIGGER trg_ck_pi_mismo_tercero BEFORE INSERT ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_ck_pi_mismo_tercero();
CREATE TRIGGER trg_ck_suma_imputada BEFORE INSERT ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_ck_suma_imputada();
CREATE TRIGGER trg_pi_upsert_monto_imputado BEFORE INSERT ON public.pago_imputacion FOR EACH ROW EXECUTE FUNCTION fn_pi_upsert_monto_imputado();
CREATE TRIGGER trg_auditoria_proveedor AFTER INSERT OR DELETE OR UPDATE ON public.proveedor FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_solicitud_cotizacion AFTER INSERT OR UPDATE ON public.solicitud_cotizacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_sucursal AFTER INSERT OR UPDATE ON public.sucursal FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_sucursal_updated_at BEFORE UPDATE ON public.sucursal FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
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
COMMENT ON COLUMN auditoria_sesion.detalle IS 'Payload crudo de auth.audit_log_entries.';
COMMENT ON COLUMN movimiento_stock_cab.movimiento_vinculado_id IS 'Auto-referencia: enlaza el egreso en origen con el ingreso en destino de una transferencia';
COMMENT ON COLUMN movimiento_stock_cab.origen_entidad_id IS 'Id de la entidad origen (venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia_detalle, etc.) segun "origen_id"';
COMMENT ON COLUMN movimiento_stock_cab.origen_id IS 'Categoria del origen (venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma)';
COMMENT ON COLUMN movimiento_stock_det.cantidad IS 'Siempre POSITIVA. El signo lo determina `tipo` (ingreso suma, egreso resta).';
COMMENT ON COLUMN notificacion_compra.cantidad_recibida IS 'Cantidad total recibida acumulada a la fecha (suma de todas las entregas parciales) para ese artículo/OC.';
COMMENT ON COLUMN notificacion_compra.cantidad_solicitada IS 'Cantidad pactada en orden_compra_detalle.';
COMMENT ON COLUMN notificacion_compra.diferencia IS 'recibida - solicitada. Positivo = recibido de más, negativo = faltante.';
COMMENT ON COLUMN notificacion_compra.orden_compra_detalle_id IS 'Línea de orden_compra_detalle contra la que se compara lo recibido.';
COMMENT ON COLUMN orden_compra.descuento IS 'PORCENTAJE 0-100, no un monto. El monto se calcula sobre el subtotal. El back recalcula siempre: el total que manda el front se descarta.';
COMMENT ON COLUMN pago.numero_comprobante IS 'A diferencia de comprobante_proveedor/comprobante_cliente/recepcion_mercaderia, este número NO se autogenera por trigger: es el número de recibo/cheque/comprobante externo que trae el pago (dato provisto por el usuario o el medio de pago), no un correlativo interno.';
COMMENT ON COLUMN proveedor.calificacion IS 'Evaluacion de desempeño';
COMMENT ON COLUMN rol.nombre IS 'Administrador, Gerente, Veterinario, Recepcionista, Personal de deposito, Cajero';
COMMENT ON COLUMN sucursal.cuit IS 'Dato fiscal: CUIT de la sucursal.';
COMMENT ON COLUMN sucursal.razon_social IS 'Dato fiscal: razón social con la que la sucursal factura.';
COMMENT ON COLUMN tipo_comprobante.afecta_saldo IS 'Factura/ND = +1, NC = -1. Usado por vista_cuenta_corriente_proveedor para el signo del saldo.';
COMMENT ON COLUMN tipo_comprobante.nombre IS 'Factura, Nota de Crédito, Nota de Débito';
COMMENT ON COLUMN usuario.bloqueado_hasta IS 'HU-SIS-04: si es futuro, el login se rechaza antes de invocar Supabase Auth.';
COMMENT ON COLUMN usuario.intentos_fallidos IS 'HU-SIS-04. CHECK entre 0 y 3.';
COMMENT ON TABLE agenda IS 'Estructura mínima: se crea automáticamente 1 por sucursal. Ampliar con turnos/franjas horarias cuando se desarrolle ese módulo.';
COMMENT ON TABLE articulo IS 'El costo de compra y el precio de venta NO se almacenan aqui: ver Lista de Precios y Recepcion de Mercaderia';
COMMENT ON TABLE auditoria IS 'Bitácora general: cada fila es un evento (alta/modificación/baja) de una entidad auditada.';
COMMENT ON TABLE auditoria_sesion IS 'HU-SIS-04: bitácora de login/logout, alimentada automáticamente desde auth.audit_log_entries de Supabase mediante trigger (no inserción manual). Tabla aparte de auditoria porque un login no es un cambio de fila de una tabla de negocio.';
COMMENT ON TABLE caja IS 'Estructura mínima: se crea automáticamente 1 por sucursal. Ampliar con movimientos de caja / arqueos cuando se desarrolle ese módulo.';
COMMENT ON TABLE comprobante_proveedor IS 'HU-PROV-04: comprobantes de proveedor (factura, NC, ND) vinculados a una OC recibida. No se modifica una vez registrado (ver trg_bloquea_update_comprobante_proveedor), salvo el propio trigger interno que setea estado=''anulado''. ANULACIÓN vs CORRECCIÓN — dos mecanismos distintos: comprobante_corregido_id es una NC/ND legítima que AJUSTA el monto de una factura (ej. devolución parcial): es un documento nuevo con su propio monto_total/afecta_saldo, que entra en el cálculo de saldo como cualquier otro comprobante vigente. anula_comprobante_id anula por completo un comprobante cargado por ERROR: solo marca estado=''anulado'' en el original, no toca montos ni pagos ya imputados (si tenía pagos parciales, esa plata sigue en pago_imputacion; la vista simplemente deja de considerar ese comprobante). La fila de anulación en sí es documental, no participa en ningún cálculo.';
COMMENT ON TABLE comprobante_proveedor_detalle IS 'HU-PROV-04: líneas del comprobante — puede facturar varios artículos de la misma OC.';
COMMENT ON TABLE forma_pago IS 'Catalogo unico de condiciones de pago (HU-PROV-01 y HU-COMP-02). Se expone por GET /api/formas-pago y GET /api/condiciones-pago: mismo catalogo, dos preguntas distintas (que acepta un proveedor / que se pacto en una compra). El front NO debe tener su propia lista hardcodeada.';
COMMENT ON TABLE movimiento_stock_cab IS 'HU-STK-04 cabecera. Un movimiento puede afectar varios articulos.';
COMMENT ON TABLE notificacion_compra IS 'HU-COMP-03: notifica al responsable de compras (usuario_id de la OC) cuando difiere lo recibido de lo solicitado. Una notificación viva por línea de OC (orden_compra_detalle_id); se actualiza con cada entrega parcial y se borra al resolverse la diferencia.';
COMMENT ON TABLE pago IS 'HU-FIN-03: pagos a proveedores y cobranzas a clientes. Inmutable tras el INSERT (ver trg_bloquea_update_pago), salvo el propio trigger interno de estado. Se anula registrando un pago NUEVO con anula_pago_id -> pago original; ese trigger solo marca estado=''anulado'', no borra pago_imputacion (se conserva el historial completo). Un eventual pago de reemplazo es un INSERT independiente, sin relación estructural con el anulado, con sus propias pago_imputacion.';
COMMENT ON TABLE pago_imputacion IS 'HU-FIN-03: relación 1 a muchos entre un pago y los comprobantes que cancela. Dos validaciones BEFORE INSERT, calculadas al vuelo con subquery (no contra una columna cacheada): (1) la suma imputada en este pago no supera pago.monto; (2) la suma imputada HISTÓRICA de este comprobante (entre todos los pagos vigentes que lo tocaron) no supera su monto_total. Un trigger adicional valida que el comprobante imputado pertenezca al mismo proveedor/cliente que pago.proveedor_id / pago.cliente_id.';
COMMENT ON TABLE proveedor_forma_pago IS 'N:M — un proveedor acepta varias formas de pago (HU-PROV-01, decision D-A). ON DELETE CASCADE solo del lado proveedor: si se borrara un proveedor caen sus pares, pero una forma de pago del catalogo nunca se borra si esta en uso.';
COMMENT ON TABLE solicitud_cotizacion IS 'HU-COMP-02. Pedido de cotizacion: define LOS MISMOS ARTICULOS sobre los que despues se comparan las ofertas de varios proveedores.';
COMMENT ON TABLE sucursal IS 'Sucursales de la empresa. Cada una opera con caja, agenda y depósito de stock propios e independientes.';
