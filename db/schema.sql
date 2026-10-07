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
CREATE TYPE tipo_movimiento_caja AS ENUM ('ingreso', 'egreso');
CREATE TYPE tipo_movimiento_stock AS ENUM ('ingreso', 'egreso');
CREATE TYPE tipo_observacion_recepcion AS ENUM ('faltante', 'danado', 'error');
CREATE TYPE tipo_operacion_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE tipo_pago AS ENUM ('pago_proveedor');
CREATE TYPE tipo_recepcion AS ENUM ('parcial', 'total');


-- =========================================================
-- SECUENCIAS
-- =========================================================

CREATE SEQUENCE IF NOT EXISTS agenda_id_seq;
CREATE SEQUENCE IF NOT EXISTS agenda_profesional_id_seq;
CREATE SEQUENCE IF NOT EXISTS agenda_semanal_id_seq;
CREATE SEQUENCE IF NOT EXISTS articulo_cod_seq;
CREATE SEQUENCE IF NOT EXISTS articulo_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS auditoria_sesion_id_seq;
CREATE SEQUENCE IF NOT EXISTS caja_apertura_id_seq;
CREATE SEQUENCE IF NOT EXISTS caja_id_seq;
CREATE SEQUENCE IF NOT EXISTS categoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS cliente_id_seq;
CREATE SEQUENCE IF NOT EXISTS comprobante_proveedor_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS comprobante_proveedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS consulta_medica_id_seq;
CREATE SEQUENCE IF NOT EXISTS consulta_medica_insumo_id_seq;
CREATE SEQUENCE IF NOT EXISTS consulta_medica_nota_id_seq;
CREATE SEQUENCE IF NOT EXISTS cotizacion_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS cotizacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS deposito_id_seq;
CREATE SEQUENCE IF NOT EXISTS estado_orden_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS estado_turno_id_seq;
CREATE SEQUENCE IF NOT EXISTS fabricante_id_seq;
CREATE SEQUENCE IF NOT EXISTS ficha_stock_id_seq;
CREATE SEQUENCE IF NOT EXISTS forma_pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS historial_precios_id_seq;
CREATE SEQUENCE IF NOT EXISTS historial_precios_practica_id_seq;
CREATE SEQUENCE IF NOT EXISTS lista_precio_id_seq;
CREATE SEQUENCE IF NOT EXISTS lista_precio_practica_id_seq;
CREATE SEQUENCE IF NOT EXISTS lote_vencimiento_id_seq;
CREATE SEQUENCE IF NOT EXISTS mascota_id_seq;
CREATE SEQUENCE IF NOT EXISTS movimiento_caja_id_seq;
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
CREATE SEQUENCE IF NOT EXISTS practica_id_seq;
CREATE SEQUENCE IF NOT EXISTS presentacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS proveedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_seq;
CREATE SEQUENCE IF NOT EXISTS solicitud_cotizacion_id_seq;
CREATE SEQUENCE IF NOT EXISTS solicitud_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS sucursal_id_seq;
CREATE SEQUENCE IF NOT EXISTS tipo_comprobante_id_seq;
CREATE SEQUENCE IF NOT EXISTS turno_id_seq;
CREATE SEQUENCE IF NOT EXISTS unidad_medida_id_seq;
CREATE SEQUENCE IF NOT EXISTS usuario_id_seq;
CREATE SEQUENCE IF NOT EXISTS venta_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS venta_id_seq;
CREATE SEQUENCE IF NOT EXISTS venta_medio_pago_id_seq;


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

CREATE TABLE agenda_profesional (
  id integer(32,0) NOT NULL,
  agenda_semanal_id integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL
);

CREATE TABLE agenda_semanal (
  id integer(32,0) NOT NULL,
  agenda_id integer(32,0) NOT NULL,
  dia_semana smallint(16,0) NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL
);

CREATE TABLE articulo (
  id integer(32,0) DEFAULT nextval('articulo_id_seq'::regclass) NOT NULL,
  categoria_id integer(32,0) NOT NULL,
  unidad_medida_id integer(32,0) NOT NULL,
  codigo character varying(30) NOT NULL,
  nombre character varying(150) NOT NULL,
  descripcion text,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
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

CREATE TABLE caja_apertura (
  id integer(32,0) NOT NULL,
  caja_id integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  monto_inicial numeric(12,2) NOT NULL,
  fecha_apertura timestamp without time zone DEFAULT now() NOT NULL,
  estado boolean DEFAULT true NOT NULL,
  monto_contado numeric(12,2),
  monto_esperado numeric(12,2),
  diferencia numeric(12,2),
  fecha_cierre timestamp without time zone
);

CREATE TABLE categoria (
  id integer(32,0) DEFAULT nextval('categoria_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL,
  prefijo character varying(5) DEFAULT 'ART'::character varying NOT NULL
);

CREATE TABLE cliente (
  id integer(32,0) NOT NULL,
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  documento character varying NOT NULL,
  direccion character varying,
  telefono character varying NOT NULL,
  email character varying NOT NULL,
  fecha_nacimiento date,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
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

CREATE TABLE consulta_medica (
  id integer(32,0) NOT NULL,
  turno_id integer(32,0) NOT NULL,
  cliente_id integer(32,0) NOT NULL,
  mascota_id integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  motivo_consulta text NOT NULL,
  diagnostico text,
  tratamiento text,
  medicacion_indicada text,
  temperatura numeric(4,1),
  frecuencia_cardiaca integer(32,0),
  peso numeric(6,2),
  estado_fisico_general text,
  cerrada boolean DEFAULT false NOT NULL,
  fecha_cierre timestamp without time zone
);

CREATE TABLE consulta_medica_insumo (
  id integer(32,0) NOT NULL,
  consulta_id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  cantidad integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE consulta_medica_nota (
  id integer(32,0) NOT NULL,
  consulta_id integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  nota text NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL
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

CREATE TABLE estado_turno (
  id integer(32,0) NOT NULL,
  nombre character varying NOT NULL,
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

CREATE TABLE historial_precios (
  id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  precio numeric(12,2) NOT NULL,
  vigencia_desde date NOT NULL,
  vigencia_hasta date,
  usuario_id integer(32,0) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE historial_precios_practica (
  id integer(32,0) NOT NULL,
  practica_id integer(32,0) NOT NULL,
  precio numeric(12,2) NOT NULL,
  vigencia_desde date NOT NULL,
  vigencia_hasta date,
  usuario_id integer(32,0) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE lista_precio (
  id integer(32,0) NOT NULL,
  articulo_id integer(32,0) NOT NULL,
  precio numeric(12,2) NOT NULL,
  vigencia_desde date DEFAULT CURRENT_DATE NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha_registro timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE lista_precio_practica (
  id integer(32,0) NOT NULL,
  practica_id integer(32,0) NOT NULL,
  precio numeric(12,2) NOT NULL,
  vigencia_desde date DEFAULT CURRENT_DATE NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  fecha_registro timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE lote_vencimiento (
  id integer(32,0) DEFAULT nextval('lote_vencimiento_id_seq'::regclass) NOT NULL,
  ficha_stock_id integer(32,0) NOT NULL,
  numero_lote character varying NOT NULL,
  fecha_vencimiento date,
  cantidad numeric DEFAULT 0 NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE mascota (
  id integer(32,0) NOT NULL,
  cliente_id integer(32,0) NOT NULL,
  nombre character varying NOT NULL,
  especie character varying NOT NULL,
  raza character varying,
  sexo character varying NOT NULL,
  peso numeric,
  fecha_nacimiento date,
  senas_particulares text,
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE movimiento_caja (
  id integer(32,0) NOT NULL,
  caja_apertura_id integer(32,0) NOT NULL,
  tipo tipo_movimiento_caja NOT NULL,
  monto numeric(12,2) NOT NULL,
  motivo character varying(255) NOT NULL,
  venta_id integer(32,0),
  usuario_id integer(32,0) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL
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
  subtotal numeric(14,2)
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

CREATE TABLE practica (
  id integer(32,0) NOT NULL,
  nombre character varying NOT NULL,
  duracion_estimada_minutos integer(32,0),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL
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

CREATE TABLE turno (
  id integer(32,0) NOT NULL,
  cliente_id integer(32,0) NOT NULL,
  mascota_id integer(32,0) NOT NULL,
  sucursal_id integer(32,0) NOT NULL,
  agenda_profesional_id integer(32,0) NOT NULL,
  practica_id integer(32,0) NOT NULL,
  estado_id smallint(16,0) DEFAULT 1 NOT NULL,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  notas text,
  usuario_id integer(32,0) NOT NULL,
  fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
  pagado boolean DEFAULT false NOT NULL
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

CREATE TABLE venta (
  id integer(32,0) NOT NULL,
  sucursal_id integer(32,0) NOT NULL,
  deposito_id integer(32,0) NOT NULL,
  consulta_id integer(32,0),
  usuario_id integer(32,0) NOT NULL,
  fecha timestamp without time zone DEFAULT now() NOT NULL,
  total numeric(12,2) DEFAULT 0 NOT NULL,
  estado estado_documento DEFAULT 'vigente'::estado_documento NOT NULL
);

CREATE TABLE venta_detalle (
  id integer(32,0) NOT NULL,
  venta_id integer(32,0) NOT NULL,
  articulo_id integer(32,0),
  cantidad numeric(12,2) NOT NULL,
  precio_unitario numeric(12,2) NOT NULL,
  subtotal numeric(14,2),
  consulta_medica_insumo_id integer(32,0),
  practica_id integer(32,0)
);

CREATE TABLE venta_medio_pago (
  id integer(32,0) NOT NULL,
  venta_id integer(32,0) NOT NULL,
  forma_pago_id integer(32,0) NOT NULL,
  monto numeric(12,2) NOT NULL
);


-- =========================================================
-- CLAVES PRIMARIAS, ÚNICOS Y CHECKS
-- =========================================================

ALTER TABLE agenda ADD CONSTRAINT agenda_pkey PRIMARY KEY (id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_check CHECK ((hora_fin > hora_inicio));
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_pkey PRIMARY KEY (id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_uk UNIQUE (agenda_semanal_id, usuario_id, hora_inicio);
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_check CHECK ((hora_fin > hora_inicio));
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7)));
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_pkey PRIMARY KEY (id);
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_uk UNIQUE (agenda_id, dia_semana, hora_inicio);
ALTER TABLE articulo ADD CONSTRAINT ck_articulo_contenido_neto CHECK ((contenido_neto > (0)::numeric));
ALTER TABLE articulo ADD CONSTRAINT articulo_pkey PRIMARY KEY (id);
ALTER TABLE articulo ADD CONSTRAINT articulo_codigo_key UNIQUE (codigo);
ALTER TABLE auditoria ADD CONSTRAINT ck_auditoria_valores CHECK ((((operacion = 'INSERT'::tipo_operacion_auditoria) AND (valores_anteriores IS NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'UPDATE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NOT NULL)) OR ((operacion = 'DELETE'::tipo_operacion_auditoria) AND (valores_anteriores IS NOT NULL) AND (valores_nuevos IS NULL))));
ALTER TABLE auditoria ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_pkey PRIMARY KEY (id);
ALTER TABLE caja ADD CONSTRAINT caja_pkey PRIMARY KEY (id);
ALTER TABLE caja_apertura ADD CONSTRAINT ck_caja_apertura_cierre_datos CHECK ((((estado = true) AND (monto_contado IS NULL) AND (monto_esperado IS NULL) AND (fecha_cierre IS NULL)) OR ((estado = false) AND (monto_contado IS NOT NULL) AND (monto_esperado IS NOT NULL) AND (fecha_cierre IS NOT NULL))));
ALTER TABLE caja_apertura ADD CONSTRAINT ck_caja_apertura_monto_inicial CHECK ((monto_inicial >= (0)::numeric));
ALTER TABLE caja_apertura ADD CONSTRAINT caja_apertura_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);
ALTER TABLE categoria ADD CONSTRAINT categoria_prefijo_key UNIQUE (prefijo);
ALTER TABLE cliente ADD CONSTRAINT cliente_pkey PRIMARY KEY (id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT ck_cp_fecha_vencimiento CHECK ((fecha_vencimiento >= fecha_emision));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT ck_cp_no_autoanulado CHECK (((anula_comprobante_id IS NULL) OR (anula_comprobante_id <> id)));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT ck_cp_no_autocorregido CHECK (((comprobante_corregido_id IS NULL) OR (comprobante_corregido_id <> id)));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_monto_total_check CHECK ((monto_total >= (0)::numeric));
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_pkey PRIMARY KEY (id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT uq_cp_proveedor_tipo_letra_pv_numero UNIQUE (proveedor_id, tipo_comprobante_id, letra, punto_venta, numero_comprobante);
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_cantidad_check CHECK ((cantidad > (0)::numeric));
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_precio_facturado_check CHECK ((precio_facturado >= (0)::numeric));
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_pkey PRIMARY KEY (id);
ALTER TABLE consulta_medica ADD CONSTRAINT ck_consulta_cierre CHECK (((NOT cerrada) OR (fecha_cierre IS NOT NULL)));
ALTER TABLE consulta_medica ADD CONSTRAINT ck_consulta_frecuencia CHECK (((frecuencia_cardiaca IS NULL) OR (frecuencia_cardiaca > 0)));
ALTER TABLE consulta_medica ADD CONSTRAINT ck_consulta_peso CHECK (((peso IS NULL) OR (peso > (0)::numeric)));
ALTER TABLE consulta_medica ADD CONSTRAINT ck_consulta_temperatura CHECK (((temperatura IS NULL) OR (temperatura > (0)::numeric)));
ALTER TABLE consulta_medica ADD CONSTRAINT consulta_medica_pkey PRIMARY KEY (id);
ALTER TABLE consulta_medica ADD CONSTRAINT consulta_medica_turno_id_key UNIQUE (turno_id);
ALTER TABLE consulta_medica_insumo ADD CONSTRAINT ck_consulta_medica_insumo_cantidad CHECK ((cantidad > 0));
ALTER TABLE consulta_medica_insumo ADD CONSTRAINT consulta_medica_insumo_pkey PRIMARY KEY (id);
ALTER TABLE consulta_medica_nota ADD CONSTRAINT consulta_medica_nota_pkey PRIMARY KEY (id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_pkey PRIMARY KEY (id);
ALTER TABLE cotizacion ADD CONSTRAINT uq_cotizacion_solicitud_proveedor UNIQUE (solicitud_id, proveedor_id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT ck_cd_precio CHECK ((precio >= (0)::numeric));
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_pkey PRIMARY KEY (id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT uq_cd_cotizacion_articulo UNIQUE (cotizacion_id, articulo_id);
ALTER TABLE deposito ADD CONSTRAINT deposito_pkey PRIMARY KEY (id);
ALTER TABLE deposito ADD CONSTRAINT uq_deposito_id_sucursal UNIQUE (id, sucursal_id);
ALTER TABLE estado_orden_compra ADD CONSTRAINT estado_orden_compra_pkey PRIMARY KEY (id);
ALTER TABLE estado_orden_compra ADD CONSTRAINT estado_orden_compra_nombre_key UNIQUE (nombre);
ALTER TABLE estado_turno ADD CONSTRAINT estado_turno_pkey PRIMARY KEY (id);
ALTER TABLE estado_turno ADD CONSTRAINT estado_turno_nombre_key UNIQUE (nombre);
ALTER TABLE fabricante ADD CONSTRAINT fabricante_pkey PRIMARY KEY (id);
ALTER TABLE fabricante ADD CONSTRAINT fabricante_nombre_key UNIQUE (nombre);
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_critico_menor CHECK (((stock_critico IS NULL) OR (stock_critico <= stock_minimo)));
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_umbrales CHECK (((stock_minimo >= (0)::numeric) AND ((stock_critico IS NULL) OR (stock_critico >= (0)::numeric))));
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_pkey PRIMARY KEY (id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_deposito_id_key UNIQUE (articulo_id, deposito_id);
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_pkey PRIMARY KEY (id);
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_nom_forma_key UNIQUE (nombre);
ALTER TABLE historial_precios ADD CONSTRAINT ck_historial_precios_precio CHECK ((precio >= (0)::numeric));
ALTER TABLE historial_precios ADD CONSTRAINT ck_historial_precios_vigencia CHECK (((vigencia_hasta IS NULL) OR (vigencia_hasta >= vigencia_desde)));
ALTER TABLE historial_precios ADD CONSTRAINT historial_precios_pkey PRIMARY KEY (id);
ALTER TABLE historial_precios_practica ADD CONSTRAINT ck_historial_precios_practica_precio CHECK ((precio >= (0)::numeric));
ALTER TABLE historial_precios_practica ADD CONSTRAINT ck_historial_precios_practica_vigencia CHECK (((vigencia_hasta IS NULL) OR (vigencia_hasta >= vigencia_desde)));
ALTER TABLE historial_precios_practica ADD CONSTRAINT historial_precios_practica_pkey PRIMARY KEY (id);
ALTER TABLE lista_precio ADD CONSTRAINT ck_lista_precio_precio CHECK ((precio >= (0)::numeric));
ALTER TABLE lista_precio ADD CONSTRAINT lista_precio_pkey PRIMARY KEY (id);
ALTER TABLE lista_precio ADD CONSTRAINT lista_precio_articulo_id_key UNIQUE (articulo_id);
ALTER TABLE lista_precio_practica ADD CONSTRAINT ck_lista_precio_practica_precio CHECK ((precio >= (0)::numeric));
ALTER TABLE lista_precio_practica ADD CONSTRAINT lista_precio_practica_pkey PRIMARY KEY (id);
ALTER TABLE lista_precio_practica ADD CONSTRAINT lista_precio_practica_practica_id_key UNIQUE (practica_id);
ALTER TABLE lote_vencimiento ADD CONSTRAINT lote_vencimiento_cantidad_check CHECK ((cantidad >= (0)::numeric));
ALTER TABLE lote_vencimiento ADD CONSTRAINT lote_vencimiento_pkey PRIMARY KEY (id);
ALTER TABLE lote_vencimiento ADD CONSTRAINT lote_vencimiento_ficha_lote_unique UNIQUE (ficha_stock_id, numero_lote);
ALTER TABLE mascota ADD CONSTRAINT mascota_peso_check CHECK (((peso IS NULL) OR (peso > (0)::numeric)));
ALTER TABLE mascota ADD CONSTRAINT mascota_pkey PRIMARY KEY (id);
ALTER TABLE movimiento_caja ADD CONSTRAINT ck_movimiento_caja_monto CHECK ((monto > (0)::numeric));
ALTER TABLE movimiento_caja ADD CONSTRAINT movimiento_caja_pkey PRIMARY KEY (id);
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
ALTER TABLE practica ADD CONSTRAINT practica_duracion_estimada_minutos_check CHECK (((duracion_estimada_minutos IS NULL) OR (duracion_estimada_minutos > 0)));
ALTER TABLE practica ADD CONSTRAINT practica_pkey PRIMARY KEY (id);
ALTER TABLE practica ADD CONSTRAINT practica_nombre_key UNIQUE (nombre);
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
ALTER TABLE turno ADD CONSTRAINT turno_check CHECK ((hora_fin > hora_inicio));
ALTER TABLE turno ADD CONSTRAINT turno_pkey PRIMARY KEY (id);
ALTER TABLE turno ADD CONSTRAINT turno_sin_superposicion_excl EXCLUDE USING gist (agenda_profesional_id WITH =, fecha WITH =, tsrange((fecha + hora_inicio), (fecha + hora_fin)) WITH &&) WHERE ((estado_id <> 3));
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_pkey PRIMARY KEY (id);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_unidad_key UNIQUE (nombre);
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_intentos_fallidos CHECK (((intentos_fallidos >= 0) AND (intentos_fallidos <= 3)));
ALTER TABLE usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE usuario ADD CONSTRAINT usuario_auth_id_key UNIQUE (auth_id);
ALTER TABLE venta ADD CONSTRAINT ck_venta_total CHECK ((total >= (0)::numeric));
ALTER TABLE venta ADD CONSTRAINT venta_pkey PRIMARY KEY (id);
ALTER TABLE venta ADD CONSTRAINT trg_venta_validar_pagada TRIGGER DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE venta ADD CONSTRAINT uq_venta_consulta UNIQUE (consulta_id);
ALTER TABLE venta_detalle ADD CONSTRAINT ck_venta_detalle_articulo_o_practica CHECK ((num_nonnulls(articulo_id, practica_id) = 1));
ALTER TABLE venta_detalle ADD CONSTRAINT ck_venta_detalle_cantidad CHECK ((cantidad > (0)::numeric));
ALTER TABLE venta_detalle ADD CONSTRAINT ck_venta_detalle_practica_sin_insumo CHECK (((practica_id IS NULL) OR (consulta_medica_insumo_id IS NULL)));
ALTER TABLE venta_detalle ADD CONSTRAINT ck_venta_detalle_precio CHECK ((precio_unitario >= (0)::numeric));
ALTER TABLE venta_detalle ADD CONSTRAINT venta_detalle_pkey PRIMARY KEY (id);
ALTER TABLE venta_medio_pago ADD CONSTRAINT ck_venta_medio_pago_monto CHECK ((monto > (0)::numeric));
ALTER TABLE venta_medio_pago ADD CONSTRAINT venta_medio_pago_pkey PRIMARY KEY (id);
ALTER TABLE venta_medio_pago ADD CONSTRAINT trg_venta_medio_pago_validar_total TRIGGER DEFERRABLE INITIALLY DEFERRED;


-- =========================================================
-- CLAVES FORÁNEAS
-- =========================================================

ALTER TABLE agenda ADD CONSTRAINT agenda_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_agenda_semanal_id_fkey FOREIGN KEY (agenda_semanal_id) REFERENCES agenda_semanal(id);
ALTER TABLE agenda_profesional ADD CONSTRAINT agenda_profesional_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE agenda_semanal ADD CONSTRAINT agenda_semanal_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES agenda(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categoria(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_fabricante_id_fkey FOREIGN KEY (fabricante_id) REFERENCES fabricante(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_presentacion_id_fkey FOREIGN KEY (presentacion_id) REFERENCES presentacion(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_unidad_medida_id_fkey FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medida(id);
ALTER TABLE auditoria ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE auditoria_sesion ADD CONSTRAINT auditoria_sesion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE SET NULL;
ALTER TABLE caja ADD CONSTRAINT caja_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE caja_apertura ADD CONSTRAINT caja_apertura_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES caja(id);
ALTER TABLE caja_apertura ADD CONSTRAINT caja_apertura_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_anula_comprobante_id_fkey FOREIGN KEY (anula_comprobante_id) REFERENCES comprobante_proveedor(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_comprobante_corregido_id_fkey FOREIGN KEY (comprobante_corregido_id) REFERENCES comprobante_proveedor(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_orden_compra_id_fkey FOREIGN KEY (orden_compra_id) REFERENCES orden_compra(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_tipo_comprobante_id_fkey FOREIGN KEY (tipo_comprobante_id) REFERENCES tipo_comprobante(id);
ALTER TABLE comprobante_proveedor ADD CONSTRAINT comprobante_proveedor_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE comprobante_proveedor_detalle ADD CONSTRAINT comprobante_proveedor_detalle_comprobante_id_fkey FOREIGN KEY (comprobante_id) REFERENCES comprobante_proveedor(id) ON DELETE CASCADE;
ALTER TABLE consulta_medica ADD CONSTRAINT consulta_medica_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(id);
ALTER TABLE consulta_medica ADD CONSTRAINT consulta_medica_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascota(id);
ALTER TABLE consulta_medica ADD CONSTRAINT consulta_medica_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES turno(id);
ALTER TABLE consulta_medica ADD CONSTRAINT consulta_medica_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE consulta_medica_insumo ADD CONSTRAINT consulta_medica_insumo_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE consulta_medica_insumo ADD CONSTRAINT consulta_medica_insumo_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES consulta_medica(id) ON DELETE CASCADE;
ALTER TABLE consulta_medica_insumo ADD CONSTRAINT consulta_medica_insumo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE consulta_medica_nota ADD CONSTRAINT consulta_medica_nota_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES consulta_medica(id) ON DELETE CASCADE;
ALTER TABLE consulta_medica_nota ADD CONSTRAINT consulta_medica_nota_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE cotizacion ADD CONSTRAINT cotizacion_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES solicitud_cotizacion(id) ON DELETE CASCADE;
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE cotizacion_detalle ADD CONSTRAINT cotizacion_detalle_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id) ON DELETE CASCADE;
ALTER TABLE deposito ADD CONSTRAINT deposito_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE historial_precios ADD CONSTRAINT historial_precios_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE historial_precios ADD CONSTRAINT historial_precios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE historial_precios_practica ADD CONSTRAINT historial_precios_practica_practica_id_fkey FOREIGN KEY (practica_id) REFERENCES practica(id);
ALTER TABLE historial_precios_practica ADD CONSTRAINT historial_precios_practica_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE lista_precio ADD CONSTRAINT lista_precio_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE lista_precio ADD CONSTRAINT lista_precio_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE lista_precio_practica ADD CONSTRAINT lista_precio_practica_practica_id_fkey FOREIGN KEY (practica_id) REFERENCES practica(id);
ALTER TABLE lista_precio_practica ADD CONSTRAINT lista_precio_practica_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE lote_vencimiento ADD CONSTRAINT lote_vencimiento_ficha_stock_id_fkey FOREIGN KEY (ficha_stock_id) REFERENCES ficha_stock(id);
ALTER TABLE mascota ADD CONSTRAINT mascota_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(id);
ALTER TABLE movimiento_caja ADD CONSTRAINT movimiento_caja_caja_apertura_id_fkey FOREIGN KEY (caja_apertura_id) REFERENCES caja_apertura(id);
ALTER TABLE movimiento_caja ADD CONSTRAINT movimiento_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE movimiento_caja ADD CONSTRAINT movimiento_caja_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES venta(id);
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
ALTER TABLE turno ADD CONSTRAINT turno_agenda_profesional_id_fkey FOREIGN KEY (agenda_profesional_id) REFERENCES agenda_profesional(id);
ALTER TABLE turno ADD CONSTRAINT turno_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES cliente(id);
ALTER TABLE turno ADD CONSTRAINT turno_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES estado_turno(id);
ALTER TABLE turno ADD CONSTRAINT turno_mascota_id_fkey FOREIGN KEY (mascota_id) REFERENCES mascota(id);
ALTER TABLE turno ADD CONSTRAINT turno_practica_id_fkey FOREIGN KEY (practica_id) REFERENCES practica(id);
ALTER TABLE turno ADD CONSTRAINT turno_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE turno ADD CONSTRAINT turno_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE usuario ADD CONSTRAINT fk_usuario_auth_id FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES rol(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE venta ADD CONSTRAINT fk_venta_deposito_sucursal FOREIGN KEY (deposito_id, sucursal_id) REFERENCES deposito(id, sucursal_id);
ALTER TABLE venta ADD CONSTRAINT venta_consulta_id_fkey FOREIGN KEY (consulta_id) REFERENCES consulta_medica(id);
ALTER TABLE venta ADD CONSTRAINT venta_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
ALTER TABLE venta ADD CONSTRAINT venta_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE venta_detalle ADD CONSTRAINT venta_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE venta_detalle ADD CONSTRAINT venta_detalle_consulta_medica_insumo_id_fkey FOREIGN KEY (consulta_medica_insumo_id) REFERENCES consulta_medica_insumo(id);
ALTER TABLE venta_detalle ADD CONSTRAINT venta_detalle_practica_id_fkey FOREIGN KEY (practica_id) REFERENCES practica(id);
ALTER TABLE venta_detalle ADD CONSTRAINT venta_detalle_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES venta(id) ON DELETE RESTRICT;
ALTER TABLE venta_medio_pago ADD CONSTRAINT venta_medio_pago_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE venta_medio_pago ADD CONSTRAINT venta_medio_pago_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES venta(id) ON DELETE RESTRICT;


-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_agenda_sucursal ON public.agenda USING btree (sucursal_id);
CREATE INDEX agenda_profesional_usuario_id_idx ON public.agenda_profesional USING btree (usuario_id);
CREATE INDEX idx_articulo_categoria ON public.articulo USING btree (categoria_id);
CREATE INDEX idx_articulo_estado ON public.articulo USING btree (estado);
CREATE INDEX idx_auditoria_fecha ON public.auditoria USING btree (fecha_hora DESC);
CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria USING btree (tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON public.auditoria USING btree (usuario_id);
CREATE INDEX idx_auditoria_sesion_fecha ON public.auditoria_sesion USING btree (fecha_hora);
CREATE INDEX idx_auditoria_sesion_usuario ON public.auditoria_sesion USING btree (usuario_id);
CREATE INDEX idx_caja_sucursal ON public.caja USING btree (sucursal_id);
CREATE INDEX idx_caja_apertura_caja ON public.caja_apertura USING btree (caja_id, fecha_apertura DESC);
CREATE UNIQUE INDEX uq_caja_apertura_abierta ON public.caja_apertura USING btree (caja_id) WHERE (estado = true);
CREATE UNIQUE INDEX cliente_documento_uidx ON public.cliente USING btree (documento);
CREATE UNIQUE INDEX cliente_email_uidx ON public.cliente USING btree (email);
CREATE INDEX idx_cp_fecha ON public.comprobante_proveedor USING btree (fecha_emision);
CREATE INDEX idx_cp_oc ON public.comprobante_proveedor USING btree (orden_compra_id);
CREATE INDEX idx_cp_proveedor ON public.comprobante_proveedor USING btree (proveedor_id);
CREATE INDEX idx_cp_proveedor_vigente ON public.comprobante_proveedor USING btree (proveedor_id, estado) WHERE (estado = 'vigente'::estado_documento);
CREATE INDEX idx_cp_tipo ON public.comprobante_proveedor USING btree (tipo_comprobante_id);
CREATE UNIQUE INDEX uq_cp_anula_comprobante_id ON public.comprobante_proveedor USING btree (anula_comprobante_id) WHERE (anula_comprobante_id IS NOT NULL);
CREATE INDEX idx_cpd_articulo ON public.comprobante_proveedor_detalle USING btree (articulo_id);
CREATE INDEX idx_cpd_comprobante ON public.comprobante_proveedor_detalle USING btree (comprobante_id);
CREATE INDEX idx_consulta_medica_cliente ON public.consulta_medica USING btree (cliente_id);
CREATE INDEX idx_consulta_medica_mascota ON public.consulta_medica USING btree (mascota_id, fecha_hora DESC);
CREATE INDEX idx_consulta_medica_insumo_consulta ON public.consulta_medica_insumo USING btree (consulta_id);
CREATE INDEX idx_consulta_medica_nota_consulta ON public.consulta_medica_nota USING btree (consulta_id);
CREATE INDEX idx_cd_cotizacion ON public.cotizacion_detalle USING btree (cotizacion_id);
CREATE INDEX idx_deposito_sucursal ON public.deposito USING btree (sucursal_id);
CREATE INDEX idx_ficha_articulo ON public.ficha_stock USING btree (articulo_id);
CREATE INDEX idx_ficha_deposito ON public.ficha_stock USING btree (deposito_id);
CREATE INDEX idx_historial_precios_articulo ON public.historial_precios USING btree (articulo_id, vigencia_desde DESC);
CREATE UNIQUE INDEX uq_historial_precios_vigente ON public.historial_precios USING btree (articulo_id) WHERE (vigencia_hasta IS NULL);
CREATE INDEX idx_historial_precios_practica_practica ON public.historial_precios_practica USING btree (practica_id, vigencia_desde DESC);
CREATE UNIQUE INDEX uq_historial_precios_practica_vigente ON public.historial_precios_practica USING btree (practica_id) WHERE (vigencia_hasta IS NULL);
CREATE INDEX idx_lista_precio_usuario ON public.lista_precio USING btree (usuario_id);
CREATE INDEX idx_lista_precio_practica_usuario ON public.lista_precio_practica USING btree (usuario_id);
CREATE INDEX idx_lote_vencimiento_fecha ON public.lote_vencimiento USING btree (fecha_vencimiento);
CREATE INDEX mascota_cliente_id_idx ON public.mascota USING btree (cliente_id);
CREATE INDEX idx_movimiento_caja_apertura ON public.movimiento_caja USING btree (caja_apertura_id);
CREATE INDEX idx_movimiento_caja_venta ON public.movimiento_caja USING btree (venta_id) WHERE (venta_id IS NOT NULL);
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
CREATE INDEX turno_cliente_id_idx ON public.turno USING btree (cliente_id);
CREATE INDEX turno_estado_id_idx ON public.turno USING btree (estado_id);
CREATE INDEX turno_mascota_id_idx ON public.turno USING btree (mascota_id);
CREATE INDEX turno_practica_id_idx ON public.turno USING btree (practica_id);
CREATE INDEX turno_sucursal_fecha_idx ON public.turno USING btree (sucursal_id, fecha);
CREATE INDEX turno_usuario_id_idx ON public.turno USING btree (usuario_id);
CREATE INDEX idx_usuario_sucursal ON public.usuario USING btree (sucursal_id);
CREATE UNIQUE INDEX uq_usuario_dni_activo ON public.usuario USING btree (dni) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE UNIQUE INDEX uq_usuario_email_activo ON public.usuario USING btree (lower((email)::text)) WHERE (estado = 'activo'::estado_activo_inactivo);
CREATE INDEX idx_venta_consulta ON public.venta USING btree (consulta_id) WHERE (consulta_id IS NOT NULL);
CREATE INDEX idx_venta_deposito ON public.venta USING btree (deposito_id);
CREATE INDEX idx_venta_sucursal_fecha ON public.venta USING btree (sucursal_id, fecha DESC);
CREATE INDEX idx_venta_detalle_articulo ON public.venta_detalle USING btree (articulo_id);
CREATE INDEX idx_venta_detalle_practica ON public.venta_detalle USING btree (practica_id) WHERE (practica_id IS NOT NULL);
CREATE INDEX idx_venta_detalle_venta ON public.venta_detalle USING btree (venta_id);
CREATE UNIQUE INDEX uq_venta_detalle_consulta_insumo ON public.venta_detalle USING btree (consulta_medica_insumo_id) WHERE (consulta_medica_insumo_id IS NOT NULL);
CREATE INDEX idx_venta_medio_pago_venta ON public.venta_medio_pago USING btree (venta_id);


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

CREATE OR REPLACE VIEW vw_huecos_disponibles AS
WITH fechas AS (
         SELECT (generate_series((CURRENT_DATE)::timestamp with time zone, ((CURRENT_DATE + 60))::timestamp with time zone, '1 day'::interval))::date AS fecha
        ), franjas_fecha AS (
         SELECT ap.id AS agenda_profesional_id,
            ap.usuario_id,
            ap.hora_inicio AS franja_inicio,
            ap.hora_fin AS franja_fin,
            d.fecha
           FROM ((agenda_profesional ap
             JOIN agenda_semanal ags ON ((ags.id = ap.agenda_semanal_id)))
             JOIN fechas d ON (((EXTRACT(isodow FROM d.fecha))::smallint = ags.dia_semana)))
          WHERE ((ap.estado = 'activo'::estado_activo_inactivo) AND (ags.estado = 'activo'::estado_activo_inactivo))
        ), turnos_bordes AS (
         SELECT ff.agenda_profesional_id,
            ff.usuario_id,
            ff.fecha,
            ff.franja_inicio,
            ff.franja_fin,
            t.hora_inicio,
            t.hora_fin,
            lag(t.hora_fin) OVER (PARTITION BY ff.agenda_profesional_id, ff.fecha ORDER BY t.hora_inicio) AS fin_anterior
           FROM (franjas_fecha ff
             LEFT JOIN turno t ON (((t.agenda_profesional_id = ff.agenda_profesional_id) AND (t.fecha = ff.fecha) AND (t.estado_id <> 3))))
        )
 SELECT turnos_bordes.agenda_profesional_id,
    turnos_bordes.usuario_id,
    turnos_bordes.fecha,
    COALESCE(turnos_bordes.fin_anterior, turnos_bordes.franja_inicio) AS hueco_inicio,
    COALESCE(turnos_bordes.hora_inicio, turnos_bordes.franja_fin) AS hueco_fin
   FROM turnos_bordes
  WHERE (COALESCE(turnos_bordes.fin_anterior, turnos_bordes.franja_inicio) < COALESCE(turnos_bordes.hora_inicio, turnos_bordes.franja_fin))
UNION ALL
 SELECT ff.agenda_profesional_id,
    ff.usuario_id,
    ff.fecha,
    max(t.hora_fin) AS hueco_inicio,
    ff.franja_fin AS hueco_fin
   FROM (franjas_fecha ff
     JOIN turno t ON (((t.agenda_profesional_id = ff.agenda_profesional_id) AND (t.fecha = ff.fecha) AND (t.estado_id <> 3))))
  GROUP BY ff.agenda_profesional_id, ff.usuario_id, ff.fecha, ff.franja_fin
 HAVING (max(t.hora_fin) < ff.franja_fin);


-- =========================================================
-- FUNCIONES
-- =========================================================

CREATE OR REPLACE FUNCTION public.cash_dist(money, money)
 RETURNS money
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$cash_dist$function$
;

CREATE OR REPLACE FUNCTION public.date_dist(date, date)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$date_dist$function$
;

CREATE OR REPLACE FUNCTION public.float4_dist(real, real)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float4_dist$function$
;

CREATE OR REPLACE FUNCTION public.float8_dist(double precision, double precision)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$float8_dist$function$
;

CREATE OR REPLACE FUNCTION public.fn_abm_lista_precio(p_modo modo_abm, p_id integer DEFAULT NULL::integer, p_articulo_id integer DEFAULT NULL::integer, p_precio numeric DEFAULT NULL::numeric, p_usuario_id integer DEFAULT NULL::integer)
 RETURNS SETOF lista_precio
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado_articulo public.estado_activo_inactivo;
  v_existe          boolean;
BEGIN

  -- ---------------- LECTURA ----------------
  IF p_modo = 'LECTURA' THEN
    IF p_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.lista_precio WHERE id = p_id;
    ELSIF p_articulo_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.lista_precio WHERE articulo_id = p_articulo_id;
    ELSE
      RETURN QUERY SELECT * FROM public.lista_precio ORDER BY articulo_id;
    END IF;
    RETURN;
  END IF;

  -- --------- Validaciones comunes a INSERCION y EDICION ---------
  IF p_articulo_id IS NULL THEN
    RAISE EXCEPTION 'El artículo es obligatorio';
  END IF;

  SELECT estado INTO v_estado_articulo FROM public.articulo WHERE id = p_articulo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El artículo % no existe', p_articulo_id;
  END IF;
  IF v_estado_articulo <> 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION 'No se puede fijar un precio de venta para un artículo inactivo (id=%)', p_articulo_id;
  END IF;

  IF p_precio IS NULL OR p_precio < 0 THEN
    RAISE EXCEPTION 'El precio es obligatorio y no puede ser negativo';
  END IF;

  IF p_usuario_id IS NULL THEN
    RAISE EXCEPTION 'El usuario responsable es obligatorio';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.lista_precio WHERE articulo_id = p_articulo_id) INTO v_existe;

  -- ---------------- INSERCION ----------------
  IF p_modo = 'INSERCION' THEN
    IF v_existe THEN
      RAISE EXCEPTION 'El artículo % ya tiene un precio cargado; use EDICION para actualizarlo', p_articulo_id;
    END IF;

    RETURN QUERY
      INSERT INTO public.lista_precio (articulo_id, precio, usuario_id)
      VALUES (p_articulo_id, p_precio, p_usuario_id)
      RETURNING *;
    RETURN;
  END IF;

  -- ---------------- EDICION ----------------
  IF p_modo = 'EDICION' THEN
    IF NOT v_existe THEN
      RAISE EXCEPTION 'El artículo % no tiene un precio cargado todavía; use INSERCION', p_articulo_id;
    END IF;

    RETURN QUERY
      UPDATE public.lista_precio
      SET precio     = p_precio,
          usuario_id = p_usuario_id
      WHERE articulo_id = p_articulo_id
      RETURNING *;
    RETURN;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_abm_lista_precio_practica(p_modo modo_abm, p_id integer DEFAULT NULL::integer, p_practica_id integer DEFAULT NULL::integer, p_precio numeric DEFAULT NULL::numeric, p_usuario_id integer DEFAULT NULL::integer)
 RETURNS SETOF lista_precio_practica
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado_practica public.estado_activo_inactivo;
  v_existe          boolean;
BEGIN

  -- ---------------- LECTURA ----------------
  IF p_modo = 'LECTURA' THEN
    IF p_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.lista_precio_practica WHERE id = p_id;
    ELSIF p_practica_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.lista_precio_practica WHERE practica_id = p_practica_id;
    ELSE
      RETURN QUERY SELECT * FROM public.lista_precio_practica ORDER BY practica_id;
    END IF;
    RETURN;
  END IF;

  -- --------- Validaciones comunes a INSERCION y EDICION ---------
  IF p_practica_id IS NULL THEN
    RAISE EXCEPTION 'La práctica es obligatoria';
  END IF;

  SELECT estado INTO v_estado_practica FROM public.practica WHERE id = p_practica_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La práctica % no existe', p_practica_id;
  END IF;
  IF v_estado_practica <> 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION 'No se puede fijar un precio de venta para una práctica inactiva (id=%)', p_practica_id;
  END IF;

  IF p_precio IS NULL OR p_precio < 0 THEN
    RAISE EXCEPTION 'El precio es obligatorio y no puede ser negativo';
  END IF;

  IF p_usuario_id IS NULL THEN
    RAISE EXCEPTION 'El usuario responsable es obligatorio';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.lista_precio_practica WHERE practica_id = p_practica_id) INTO v_existe;

  -- ---------------- INSERCION ----------------
  IF p_modo = 'INSERCION' THEN
    IF v_existe THEN
      RAISE EXCEPTION 'La práctica % ya tiene un precio cargado; use EDICION para actualizarlo', p_practica_id;
    END IF;

    RETURN QUERY
      INSERT INTO public.lista_precio_practica (practica_id, precio, usuario_id)
      VALUES (p_practica_id, p_precio, p_usuario_id)
      RETURNING *;
    RETURN;
  END IF;

  -- ---------------- EDICION ----------------
  IF p_modo = 'EDICION' THEN
    IF NOT v_existe THEN
      RAISE EXCEPTION 'La práctica % no tiene un precio cargado todavía; use INSERCION', p_practica_id;
    END IF;

    RETURN QUERY
      UPDATE public.lista_precio_practica
      SET precio     = p_precio,
          usuario_id = p_usuario_id
      WHERE practica_id = p_practica_id
      RETURNING *;
    RETURN;
  END IF;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.fn_agenda_profesional_validar_rango()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_franja_inicio time without time zone;
  v_franja_fin    time without time zone;
BEGIN
  SELECT ags.hora_inicio, ags.hora_fin
  INTO v_franja_inicio, v_franja_fin
  FROM public.agenda_semanal ags
  WHERE ags.id = NEW.agenda_semanal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'La franja semanal indicada (id=%) no existe.', NEW.agenda_semanal_id;
  END IF;

  IF NEW.hora_inicio < v_franja_inicio OR NEW.hora_fin > v_franja_fin THEN
    RAISE EXCEPTION
      'El horario del profesional (% - %) debe estar dentro del rango de la franja general de la sucursal (% - %).',
      NEW.hora_inicio, NEW.hora_fin, v_franja_inicio, v_franja_fin;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_agenda_profesional_validar_rol()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_rol_nombre character varying;
BEGIN
  SELECT r.nombre
  INTO v_rol_nombre
  FROM public.usuario u
  JOIN public.rol r ON r.id = u.rol_id
  WHERE u.id = NEW.usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'El usuario indicado (id=%) no existe.', NEW.usuario_id;
  END IF;

  IF lower(v_rol_nombre) <> 'veterinario' THEN
    RAISE EXCEPTION
      'El usuario (id=%) no puede asignarse a agenda_profesional: su rol es "%", se requiere "Veterinario".',
      NEW.usuario_id, v_rol_nombre;
  END IF;

  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.fn_bloquea_insumo_consulta_cerrada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_cerrada boolean;
BEGIN
  SELECT cerrada INTO v_cerrada FROM public.consulta_medica WHERE id = NEW.consulta_id;

  IF v_cerrada THEN
    RAISE EXCEPTION 'La consulta médica % está cerrada: no se pueden indicar más insumos', NEW.consulta_id
      USING ERRCODE = 'HF058';
  END IF;

  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.fn_bloquea_update_consulta_medica()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.cerrada = true THEN
    RAISE EXCEPTION 'La consulta médica % está cerrada: no se permite modificarla. Agregue una consulta_medica_nota si necesita aclarar algo.', OLD.id
      USING ERRCODE = 'HF041';
  END IF;

  -- Si se está cerrando la consulta y no se envió explícitamente fecha_cierre, la autocompleta con now()
  IF NEW.cerrada = true AND NEW.fecha_cierre IS NULL THEN
    NEW.fecha_cierre := now();
  END IF;

  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.fn_caja_actualizar_saldo_apertura()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.caja SET saldo_actual = NEW.monto_inicial WHERE id = NEW.caja_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_actualizar_saldo_movimiento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_caja_id integer;
BEGIN
  SELECT caja_id INTO v_caja_id
  FROM public.caja_apertura
  WHERE id = NEW.caja_apertura_id;

  IF NEW.tipo = 'ingreso' THEN
    UPDATE public.caja SET saldo_actual = saldo_actual + NEW.monto WHERE id = v_caja_id;
  ELSE
    UPDATE public.caja SET saldo_actual = saldo_actual - NEW.monto WHERE id = v_caja_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_calcular_cierre()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_ingresos numeric(12,2);
  v_egresos  numeric(12,2);
BEGIN
  IF NEW.estado = false AND OLD.estado = true THEN

    SELECT COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0),
           COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)
    INTO v_ingresos, v_egresos
    FROM public.movimiento_caja
    WHERE caja_apertura_id = NEW.id;

    IF NEW.monto_contado IS NULL THEN
      RAISE EXCEPTION 'Debe informar el monto contado para cerrar la caja'
        USING ERRCODE = 'HF042';
    END IF;

    NEW.monto_esperado := NEW.monto_inicial + v_ingresos - v_egresos;
    NEW.fecha_cierre   := now();

  ELSIF NEW.estado = true AND OLD.estado = false THEN
    RAISE EXCEPTION 'No se puede reabrir una caja ya cerrada'
      USING ERRCODE = 'HF043';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_movimiento_validar_abierta()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado boolean;
BEGIN
  SELECT estado INTO v_estado FROM public.caja_apertura WHERE id = NEW.caja_apertura_id;

  IF v_estado IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'No se pueden registrar movimientos: la caja (apertura id=%) no está abierta', NEW.caja_apertura_id
      USING ERRCODE = 'HF044';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_caja_validar_apertura_sucursal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sucursal_id  integer;
  v_otra_abierta boolean;
BEGIN
  IF NEW.estado = true THEN
    SELECT sucursal_id INTO v_sucursal_id
    FROM public.caja
    WHERE id = NEW.caja_id;

    SELECT EXISTS (
      SELECT 1
      FROM public.caja_apertura ca
      JOIN public.caja c ON c.id = ca.caja_id
      WHERE c.sucursal_id = v_sucursal_id
        AND ca.estado = true
        AND ca.id IS DISTINCT FROM NEW.id
    ) INTO v_otra_abierta;

    IF v_otra_abierta THEN
      RAISE EXCEPTION 'No se permite abrir una nueva caja: ya existe una caja abierta en la sucursal %', v_sucursal_id
        USING ERRCODE = 'HF045';
    END IF;
  END IF;

  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.fn_cliente_validar_duplicados()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado public.estado_activo_inactivo;
BEGIN
  -- Documento duplicado
  SELECT c.estado INTO v_estado
  FROM public.cliente c
  WHERE c.documento = NEW.documento
    AND c.id IS DISTINCT FROM NEW.id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'No se puede registrar: el documento "%" ya pertenece a un cliente % existente.',
      NEW.documento, v_estado
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Email duplicado
  SELECT c.estado INTO v_estado
  FROM public.cliente c
  WHERE c.email = NEW.email
    AND c.id IS DISTINCT FROM NEW.id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'No se puede registrar: el email "%" ya pertenece a un cliente % existente.',
      NEW.email, v_estado
      USING ERRCODE = 'unique_violation';
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

CREATE OR REPLACE FUNCTION public.fn_historial_precios()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Primer precio del artículo: se abre la primera fila de vigencia, sin fila previa que cerrar.
    INSERT INTO public.historial_precios (articulo_id, precio, vigencia_desde, vigencia_hasta, usuario_id)
    VALUES (NEW.articulo_id, NEW.precio, NEW.vigencia_desde, NULL, NEW.usuario_id);

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.precio IS DISTINCT FROM OLD.precio THEN
      -- Cierra la vigencia del precio anterior (la fila con vigencia_hasta NULL).
      -- Si se actualiza el mismo día de creación o cambio previo, GREATEST evita que vigencia_hasta < vigencia_desde.
      UPDATE public.historial_precios
      SET vigencia_hasta = GREATEST(vigencia_desde, NEW.vigencia_desde - 1)
      WHERE articulo_id = NEW.articulo_id
        AND vigencia_hasta IS NULL;

      -- Abre la vigencia del precio nuevo.
      INSERT INTO public.historial_precios (articulo_id, precio, vigencia_desde, vigencia_hasta, usuario_id)
      VALUES (NEW.articulo_id, NEW.precio, NEW.vigencia_desde, NULL, NEW.usuario_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_historial_precios_practica()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Primer precio de la práctica: se abre la primera fila de vigencia, sin fila previa que cerrar.
    INSERT INTO public.historial_precios_practica (practica_id, precio, vigencia_desde, vigencia_hasta, usuario_id)
    VALUES (NEW.practica_id, NEW.precio, NEW.vigencia_desde, NULL, NEW.usuario_id);

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.precio IS DISTINCT FROM OLD.precio THEN
      -- Cierra la vigencia del precio anterior (la fila con vigencia_hasta NULL).
      -- GREATEST evita que vigencia_hasta < vigencia_desde si se actualiza el mismo día.
      UPDATE public.historial_precios_practica
      SET vigencia_hasta = GREATEST(vigencia_desde, NEW.vigencia_desde - 1)
      WHERE practica_id = NEW.practica_id
        AND vigencia_hasta IS NULL;

      -- Abre la vigencia del precio nuevo.
      INSERT INTO public.historial_precios_practica (practica_id, precio, vigencia_desde, vigencia_hasta, usuario_id)
      VALUES (NEW.practica_id, NEW.precio, NEW.vigencia_desde, NULL, NEW.usuario_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_lista_precio_actualizar_vigencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.precio IS DISTINCT FROM OLD.precio THEN
    NEW.vigencia_desde := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_lista_precio_practica_actualizar_vigencia()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.precio IS DISTINCT FROM OLD.precio THEN
    NEW.vigencia_desde := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_mascota_validar_fecha_nacimiento()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.fecha_nacimiento IS NOT NULL AND NEW.fecha_nacimiento > CURRENT_DATE THEN
    RAISE EXCEPTION
      'La fecha de nacimiento de la mascota (%) no puede ser posterior a hoy (%).',
      NEW.fecha_nacimiento, CURRENT_DATE
      USING ERRCODE = 'check_violation';
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

CREATE OR REPLACE FUNCTION public.fn_turno_abrir_consulta()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado_nombre  varchar(30);
  v_usuario_id     integer;
BEGIN
  SELECT nombre INTO v_estado_nombre FROM public.estado_turno WHERE id = NEW.estado_id;

  IF v_estado_nombre = 'atendido' THEN

    SELECT ap.usuario_id INTO v_usuario_id
    FROM public.agenda_profesional ap
    WHERE ap.id = NEW.agenda_profesional_id;

    INSERT INTO public.consulta_medica (turno_id, cliente_id, mascota_id, usuario_id, motivo_consulta)
    VALUES (
      NEW.id,
      NEW.cliente_id,
      NEW.mascota_id,
      COALESCE(v_usuario_id, NEW.usuario_id),
      COALESCE(NULLIF(btrim(NEW.notas), ''), 'Consulta generada automáticamente al marcar el turno como atendido')
    )
    ON CONFLICT (turno_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_sincronizar_sucursal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sucursal_id integer;
BEGIN
  SELECT a.sucursal_id
  INTO v_sucursal_id
  FROM public.agenda_profesional ap
  JOIN public.agenda_semanal ags ON ags.id = ap.agenda_semanal_id
  JOIN public.agenda a          ON a.id  = ags.agenda_id
  WHERE ap.id = NEW.agenda_profesional_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'La agenda profesional indicada (id=%) no existe.', NEW.agenda_profesional_id;
  END IF;

  NEW.sucursal_id := v_sucursal_id;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_estados_activos()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_estado_cliente  public.estado_activo_inactivo;
  v_estado_mascota  public.estado_activo_inactivo;
  v_estado_practica public.estado_activo_inactivo;
BEGIN
  SELECT c.estado INTO v_estado_cliente
  FROM public.cliente c WHERE c.id = NEW.cliente_id;

  IF v_estado_cliente IS DISTINCT FROM 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION
      'No se puede registrar el turno: el cliente (id=%) está %.',
      NEW.cliente_id, v_estado_cliente;
  END IF;

  SELECT m.estado INTO v_estado_mascota
  FROM public.mascota m WHERE m.id = NEW.mascota_id;

  IF v_estado_mascota IS DISTINCT FROM 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION
      'No se puede registrar el turno: la mascota (id=%) está %.',
      NEW.mascota_id, v_estado_mascota;
  END IF;

  SELECT p.estado INTO v_estado_practica
  FROM public.practica p WHERE p.id = NEW.practica_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'La práctica indicada (id=%) no existe.', NEW.practica_id;
  END IF;

  IF v_estado_practica IS DISTINCT FROM 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION
      'No se puede registrar el turno: la práctica (id=%) está dada de baja.',
      NEW.practica_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_fecha_no_pasada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.fecha < CURRENT_DATE THEN
    RAISE EXCEPTION
      'No se puede registrar un turno con fecha pasada (%). La fecha actual es %.',
      NEW.fecha, CURRENT_DATE
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_horario()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_dia_semana        smallint;
  v_franja_inicio     time without time zone;
  v_franja_fin        time without time zone;
  v_estado_ap         public.estado_activo_inactivo;
  v_estado_ags        public.estado_activo_inactivo;
BEGIN
  SELECT ags.dia_semana, ap.hora_inicio, ap.hora_fin, ap.estado, ags.estado
  INTO v_dia_semana, v_franja_inicio, v_franja_fin, v_estado_ap, v_estado_ags
  FROM public.agenda_profesional ap
  JOIN public.agenda_semanal ags ON ags.id = ap.agenda_semanal_id
  WHERE ap.id = NEW.agenda_profesional_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'La agenda profesional indicada (id=%) no existe.', NEW.agenda_profesional_id;
  END IF;

  -- 0) La franja (individual y/o general de sucursal) tiene que estar activa
  IF v_estado_ap IS DISTINCT FROM 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION
      'No se puede registrar el turno: la agenda del profesional (id=%) está %.',
      NEW.agenda_profesional_id, v_estado_ap;
  END IF;

  IF v_estado_ags IS DISTINCT FROM 'activo'::public.estado_activo_inactivo THEN
    RAISE EXCEPTION
      'No se puede registrar el turno: la franja general de la sucursal para ese día está %.',
      v_estado_ags;
  END IF;

  -- 1) El día del turno tiene que coincidir con el día que trabaja esa franja
  IF EXTRACT(ISODOW FROM NEW.fecha)::smallint <> v_dia_semana THEN
    RAISE EXCEPTION
      'El profesional no atiende esta agenda el día correspondiente a %  (día semana ISO: %, esperado: %).',
      NEW.fecha, EXTRACT(ISODOW FROM NEW.fecha)::smallint, v_dia_semana;
  END IF;

  -- 2) El turno tiene que caer dentro del horario de atención del profesional
  IF NEW.hora_inicio < v_franja_inicio OR NEW.hora_fin > v_franja_fin THEN
    RAISE EXCEPTION
      'El turno (% - %) está fuera del horario de atención del profesional para esta agenda (% - %).',
      NEW.hora_inicio, NEW.hora_fin, v_franja_inicio, v_franja_fin;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_turno_validar_mascota_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_cliente_id_real integer;
BEGIN
  SELECT m.cliente_id
  INTO v_cliente_id_real
  FROM public.mascota m
  WHERE m.id = NEW.mascota_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'La mascota indicada (id=%) no existe.', NEW.mascota_id;
  END IF;

  IF v_cliente_id_real IS DISTINCT FROM NEW.cliente_id THEN
    RAISE EXCEPTION
      'La mascota (id=%) no pertenece al cliente indicado (id=%); pertenece al cliente id=%.',
      NEW.mascota_id, NEW.cliente_id, v_cliente_id_real;
  END IF;

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

CREATE OR REPLACE FUNCTION public.fn_venta_bloquear_modificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado IN ('pagado'::public.estado_documento, 'anulado'::public.estado_documento) THEN
      RAISE EXCEPTION 'No se puede eliminar una venta con estado "%"', OLD.estado
        USING ERRCODE = 'HF057';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'pagado'::public.estado_documento THEN
      IF NEW.estado = 'anulado'::public.estado_documento THEN
        -- Al anular, no se permite alterar los datos de la venta original
        IF NEW.total IS DISTINCT FROM OLD.total OR
           NEW.sucursal_id IS DISTINCT FROM OLD.sucursal_id OR
           NEW.deposito_id IS DISTINCT FROM OLD.deposito_id OR
           NEW.consulta_id IS DISTINCT FROM OLD.consulta_id THEN
          RAISE EXCEPTION 'Al anular la venta no se pueden alterar sus datos originales'
            USING ERRCODE = 'HF057';
        END IF;
      ELSE
        RAISE EXCEPTION 'No se permite modificar los datos de una venta que ya ha sido pagada'
          USING ERRCODE = 'HF057';
      END IF;
    ELSIF OLD.estado = 'anulado'::public.estado_documento THEN
      RAISE EXCEPTION 'Una venta anulada no admite modificaciones'
        USING ERRCODE = 'HF057';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_crear_movimiento_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_origen_id integer;
BEGIN
  -- El depósito de origen del stock es el informado en la venta (venta.deposito_id),
  -- que por FK compuesta pertenece a la sucursal de la venta.
  SELECT id INTO v_origen_id FROM public.origen_movimiento WHERE nombre = 'venta';
  IF v_origen_id IS NULL THEN
    RAISE EXCEPTION 'Falta configurar el origen de movimiento "venta" en origen_movimiento'
      USING ERRCODE = 'HF046';
  END IF;

  INSERT INTO public.movimiento_stock_cab (deposito_id, tipo, origen_id, origen_entidad_id, usuario_id, motivo)
  VALUES (NEW.deposito_id, 'egreso', v_origen_id, NEW.id, NEW.usuario_id, 'Venta N° ' || NEW.id);

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_detalle_bloquear_modificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_venta_id integer;
  v_estado   public.estado_documento;
BEGIN
  v_venta_id := COALESCE(NEW.venta_id, OLD.venta_id);

  SELECT estado INTO v_estado
  FROM public.venta
  WHERE id = v_venta_id;

  IF v_estado IN ('pagado'::public.estado_documento, 'anulado'::public.estado_documento) THEN
    RAISE EXCEPTION 'No se pueden agregar, modificar ni eliminar ítems de una venta con estado "%"', v_estado
      USING ERRCODE = 'HF057';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_detalle_descontar_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_movimiento_id    integer;
  v_deposito_id      integer;
  v_ficha_id         integer;
  v_origen_id        integer;
  v_categoria_nombre varchar(100);
BEGIN
  -- Las prácticas no tienen stock físico: no se descuenta nada.
  IF NEW.practica_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Distingue servicios de productos usando la categoría del artículo
  SELECT lower(c.nombre) INTO v_categoria_nombre
  FROM public.articulo a
  JOIN public.categoria c ON c.id = a.categoria_id
  WHERE a.id = NEW.articulo_id;

  IF v_categoria_nombre LIKE '%servicio%' THEN
    -- Es un servicio (consulta médica, ecografía, práctica o prestación sin stock físico)
    RETURN NEW;
  END IF;

  SELECT id INTO v_origen_id FROM public.origen_movimiento WHERE nombre = 'venta';

  SELECT mc.id, mc.deposito_id INTO v_movimiento_id, v_deposito_id
  FROM public.movimiento_stock_cab mc
  WHERE mc.origen_id = v_origen_id
    AND mc.origen_entidad_id = NEW.venta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el movimiento de stock asociado a la venta %', NEW.venta_id
      USING ERRCODE = 'HF048';
  END IF;

  -- Para artículos físicos, DEBE existir ficha de stock en el depósito indicado
  SELECT id INTO v_ficha_id
  FROM public.ficha_stock
  WHERE articulo_id = NEW.articulo_id
    AND deposito_id = v_deposito_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El artículo % no posee ficha de stock en el depósito %', NEW.articulo_id, v_deposito_id
      USING ERRCODE = 'HF049';
  END IF;

  -- Reutiliza HU-STK-04: fn_actualizar_stock_det() descuenta ficha_stock y
  -- rechaza si el resultado quedara negativo.
  -- ON CONFLICT consolida líneas con el mismo artículo en la misma venta,
  -- evitando violar la restricción única uq_mov_det_ficha.
  INSERT INTO public.movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
  VALUES (v_movimiento_id, v_ficha_id, NEW.cantidad)
  ON CONFLICT (movimiento_id, ficha_stock_id)
  DO UPDATE SET cantidad = public.movimiento_stock_det.cantidad + EXCLUDED.cantidad;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_detalle_tomar_precio()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_precio numeric(12,2);
BEGIN
  IF NEW.practica_id IS NOT NULL THEN
    SELECT precio INTO v_precio
    FROM public.lista_precio_practica
    WHERE practica_id = NEW.practica_id;

    IF v_precio IS NULL THEN
      RAISE EXCEPTION 'La práctica % no tiene precio de venta cargado', NEW.practica_id
        USING ERRCODE = 'HF047';
    END IF;
  ELSE
    SELECT precio INTO v_precio
    FROM public.lista_precio
    WHERE articulo_id = NEW.articulo_id;

    IF v_precio IS NULL THEN
      RAISE EXCEPTION 'El artículo/servicio % no tiene precio de venta cargado', NEW.articulo_id
        USING ERRCODE = 'HF047';
    END IF;
  END IF;

  NEW.precio_unitario := v_precio;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_detalle_validar_movimiento_insumo()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_articulo_id       integer;
  v_cantidad          numeric(12,2);
  v_consulta_id_ins   integer;
  v_consulta_id_venta integer;
BEGIN
  IF NEW.consulta_medica_insumo_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cmi.articulo_id, cmi.cantidad, cmi.consulta_id
  INTO v_articulo_id, v_cantidad, v_consulta_id_ins
  FROM public.consulta_medica_insumo cmi
  WHERE cmi.id = NEW.consulta_medica_insumo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El insumo de consulta % no existe', NEW.consulta_medica_insumo_id
      USING ERRCODE = 'HF053';
  END IF;

  IF v_articulo_id <> NEW.articulo_id THEN
    RAISE EXCEPTION 'El artículo de la línea (%) no coincide con el insumo indicado en la consulta (%)', NEW.articulo_id, v_articulo_id
      USING ERRCODE = 'HF054';
  END IF;

  IF v_cantidad <> NEW.cantidad THEN
    RAISE EXCEPTION 'La cantidad de la línea (%) no coincide con la cantidad indicada en la consulta (%)', NEW.cantidad, v_cantidad
      USING ERRCODE = 'HF059';
  END IF;

  SELECT consulta_id INTO v_consulta_id_venta FROM public.venta WHERE id = NEW.venta_id;

  IF v_consulta_id_venta IS DISTINCT FROM v_consulta_id_ins THEN
    RAISE EXCEPTION 'El insumo indicado pertenece a otra consulta médica, no a la de esta venta'
      USING ERRCODE = 'HF055';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_medio_pago_bloquear_modificacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_venta_id integer;
  v_estado   public.estado_documento;
BEGIN
  v_venta_id := COALESCE(NEW.venta_id, OLD.venta_id);

  SELECT estado INTO v_estado
  FROM public.venta
  WHERE id = v_venta_id;

  IF v_estado IN ('pagado'::public.estado_documento, 'anulado'::public.estado_documento) THEN
    RAISE EXCEPTION 'No se pueden agregar, modificar ni eliminar medios de pago de una venta con estado "%"', v_estado
      USING ERRCODE = 'HF057';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_medio_pago_ingreso_caja()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_nombre_forma varchar(100);
  v_sucursal_id  integer;
  v_usuario_id   integer;
  v_apertura_id  integer;
BEGIN
  SELECT nombre INTO v_nombre_forma FROM public.forma_pago WHERE id = NEW.forma_pago_id;

  IF lower(v_nombre_forma) = 'efectivo' THEN

    SELECT v.sucursal_id, v.usuario_id INTO v_sucursal_id, v_usuario_id
    FROM public.venta v WHERE v.id = NEW.venta_id;

    -- Obtiene la caja abierta en la sucursal de la venta
    SELECT ca.id INTO v_apertura_id
    FROM public.caja_apertura ca
    JOIN public.caja c ON c.id = ca.caja_id
    WHERE c.sucursal_id = v_sucursal_id
      AND ca.estado = true
    LIMIT 1;

    IF v_apertura_id IS NULL THEN
      RAISE EXCEPTION 'No hay una caja abierta en la sucursal % para registrar el cobro en efectivo de la venta %', v_sucursal_id, NEW.venta_id
        USING ERRCODE = 'HF052';
    END IF;

    INSERT INTO public.movimiento_caja (caja_apertura_id, tipo, monto, motivo, venta_id, usuario_id)
    VALUES (v_apertura_id, 'ingreso', NEW.monto, 'Cobro venta N° ' || NEW.venta_id, NEW.venta_id, v_usuario_id);

  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_medio_pago_validar_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_venta_id     integer;
  v_total        numeric(12,2);
  v_suma         numeric(12,2);
  v_consulta_id  integer;
  v_turno_id     integer;
  v_estado       public.estado_documento;
BEGIN
  v_venta_id := COALESCE(NEW.venta_id, OLD.venta_id);

  SELECT total, consulta_id, estado INTO v_total, v_consulta_id, v_estado
  FROM public.venta
  WHERE id = v_venta_id
  FOR UPDATE;

  -- Una venta anulada no admite pagos ni puede revivirse
  IF v_estado = 'anulado'::public.estado_documento THEN
    RAISE EXCEPTION 'No se pueden registrar ni modificar pagos para la venta % porque se encuentra anulada', v_venta_id
      USING ERRCODE = 'HF056';
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO v_suma
  FROM public.venta_medio_pago
  WHERE venta_id = v_venta_id;

  IF v_suma <> v_total THEN
    RAISE EXCEPTION 'La suma de los medios de pago (%) no coincide con el total de la venta % (%)',
      v_suma, v_venta_id, v_total
      USING ERRCODE = 'HF051';
  END IF;

  -- Al cubrirse el total de la venta, pasa su estado a 'pagado' únicamente si estaba 'vigente'
  IF v_estado = 'vigente'::public.estado_documento THEN
    UPDATE public.venta
    SET estado = 'pagado'::public.estado_documento
    WHERE id = v_venta_id;
  END IF;

  -- Si la venta proviene de una atención médica (consulta_medica asociada a un turno),
  -- marca automáticamente el turno como pagado (pagado = true).
  IF v_consulta_id IS NOT NULL THEN
    SELECT turno_id INTO v_turno_id
    FROM public.consulta_medica
    WHERE id = v_consulta_id;

    IF v_turno_id IS NOT NULL THEN
      UPDATE public.turno
      SET pagado = true
      WHERE id = v_turno_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_recalcular_totales()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_venta_id integer;
  v_total    numeric(12,2);
BEGIN
  v_venta_id := COALESCE(NEW.venta_id, OLD.venta_id);

  SELECT COALESCE(SUM(subtotal), 0) INTO v_total
  FROM public.venta_detalle
  WHERE venta_id = v_venta_id;

  UPDATE public.venta
  SET total = v_total
  WHERE id = v_venta_id;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_revertir_anulacion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_origen_id        integer;
  v_mov_egreso_id    integer;
  v_mov_ingreso_id   integer;
  v_monto_efectivo   numeric(12,2);
  v_apertura_id      integer;
  v_turno_id         integer;
BEGIN
  -- 1) Reposición de stock: busca el movimiento de egreso generado por la venta
  SELECT id INTO v_origen_id FROM public.origen_movimiento WHERE nombre = 'venta';

  IF v_origen_id IS NOT NULL THEN
    SELECT mc.id INTO v_mov_egreso_id
    FROM public.movimiento_stock_cab mc
    WHERE mc.origen_id = v_origen_id
      AND mc.origen_entidad_id = OLD.id
      AND mc.tipo = 'egreso';

    -- Si hubo egreso de stock registrado para la venta, crea el movimiento compensatorio de ingreso
    IF v_mov_egreso_id IS NOT NULL THEN
      INSERT INTO public.movimiento_stock_cab (deposito_id, tipo, origen_id, origen_entidad_id, usuario_id, motivo)
      VALUES (OLD.deposito_id, 'ingreso', v_origen_id, OLD.id, NEW.usuario_id, 'Anulación Venta N° ' || OLD.id)
      RETURNING id INTO v_mov_ingreso_id;

      -- Inserta en movimiento_stock_det para reponer stock_actual en cada ficha_stock
      -- (trg_actualizar_stock_det con tipo='ingreso' incrementa ficha_stock.stock_actual)
      INSERT INTO public.movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
      SELECT v_mov_ingreso_id, msd.ficha_stock_id, msd.cantidad
      FROM public.movimiento_stock_det msd
      WHERE msd.movimiento_id = v_mov_egreso_id;
    END IF;
  END IF;

  -- 2) Devolución de fondos en caja si hubo cobro en efectivo
  SELECT COALESCE(SUM(vmp.monto), 0)
  INTO v_monto_efectivo
  FROM public.venta_medio_pago vmp
  JOIN public.forma_pago fp ON fp.id = vmp.forma_pago_id
  WHERE vmp.venta_id = OLD.id
    AND lower(fp.nombre) = 'efectivo';

  IF v_monto_efectivo > 0 THEN
    SELECT ca.id INTO v_apertura_id
    FROM public.caja_apertura ca
    JOIN public.caja c ON c.id = ca.caja_id
    WHERE c.sucursal_id = OLD.sucursal_id
      AND ca.estado = true
    LIMIT 1;

    IF v_apertura_id IS NULL THEN
      RAISE EXCEPTION 'No hay una caja abierta en la sucursal % para registrar el egreso por anulación de la venta %',
        OLD.sucursal_id, OLD.id
        USING ERRCODE = 'HF052';
    END IF;

    -- Registra el egreso en caja (trg_caja_actualizar_saldo_movimiento resta saldo_actual de caja)
    INSERT INTO public.movimiento_caja (caja_apertura_id, tipo, monto, motivo, venta_id, usuario_id)
    VALUES (v_apertura_id, 'egreso', v_monto_efectivo, 'Anulación Venta N° ' || OLD.id, OLD.id, NEW.usuario_id);
  END IF;

  -- 3) Reversión del estado de pago del turno (si provino de atención médica)
  IF OLD.consulta_id IS NOT NULL THEN
    SELECT cm.turno_id INTO v_turno_id
    FROM public.consulta_medica cm
    WHERE cm.id = OLD.consulta_id;

    IF v_turno_id IS NOT NULL THEN
      UPDATE public.turno
      SET pagado = false
      WHERE id = v_turno_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_validar_cierre_pagada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_total_actual  numeric(12,2);
  v_estado_actual public.estado_documento;
  v_cant_det      integer;
  v_suma          numeric(12,2);
BEGIN
  -- Consulta el estado y total REALES de la venta al momento del COMMIT
  -- (evita el snapshot estático de NEW que contenía total = 0 del momento del INSERT)
  SELECT total, estado INTO v_total_actual, v_estado_actual
  FROM public.venta
  WHERE id = NEW.id;

  -- Si la venta fue cancelada/anulada explícitamente en la transacción, se omite exigir cobro
  IF v_estado_actual = 'anulado'::public.estado_documento THEN
    RETURN NEW;
  END IF;

  -- Exige al menos un ítem de detalle en la venta
  SELECT COUNT(*) INTO v_cant_det
  FROM public.venta_detalle
  WHERE venta_id = NEW.id;

  IF v_cant_det = 0 THEN
    RAISE EXCEPTION 'La venta % no tiene ninguna línea de detalle cargada', NEW.id
      USING ERRCODE = 'HF050';
  END IF;

  -- Valida que existan medios de pago que cubran el total real acumulado de la venta
  SELECT COALESCE(SUM(monto), 0) INTO v_suma
  FROM public.venta_medio_pago
  WHERE venta_id = NEW.id;

  IF v_suma <> v_total_actual THEN
    RAISE EXCEPTION 'La venta % no está saldada: el total es % y la suma de pagos registrados es %',
      NEW.id, v_total_actual, v_suma
      USING ERRCODE = 'HF051';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_venta_validar_consulta_cerrada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_cerrada boolean;
BEGIN
  IF NEW.consulta_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cerrada INTO v_cerrada FROM public.consulta_medica WHERE id = NEW.consulta_id;

  IF v_cerrada IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'La consulta médica % todavía no está cerrada: no se puede facturar una atención en curso', NEW.consulta_id
      USING ERRCODE = 'HF060';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_consistent(internal, bit, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bit_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bit_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_consistent(internal, boolean, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_same(gbtreekey2, gbtreekey2, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bool_union(internal, internal)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE STRICT
AS '$libdir/btree_gist', $function$gbt_bool_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bpchar_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bpchar_consistent(internal, character, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bpchar_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_consistent(internal, bytea, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_bytea_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_bytea_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_consistent(internal, money, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_distance(internal, money, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_cash_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_cash_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_consistent(internal, date, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_distance(internal, date, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_date_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_date_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_consistent(internal, anyenum, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_enum_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_enum_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_consistent(internal, real, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_distance(internal, real, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float4_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_consistent(internal, double precision, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_distance(internal, double precision, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_float8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_float8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_consistent(internal, inet, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_inet_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_inet_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_consistent(internal, smallint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_distance(internal, smallint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_same(gbtreekey4, gbtreekey4, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int2_union(internal, internal)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int2_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_consistent(internal, integer, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_distance(internal, integer, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int4_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int4_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_consistent(internal, bigint, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_distance(internal, bigint, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_int8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_int8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_consistent(internal, interval, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_distance(internal, interval, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_intv_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_intv_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_consistent(internal, macaddr8, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad8_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad8_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_consistent(internal, macaddr, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_macad_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_macad_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_consistent(internal, numeric, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_numeric_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_numeric_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_consistent(internal, oid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_distance(internal, oid, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_same(gbtreekey8, gbtreekey8, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_oid_union(internal, internal)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_oid_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_same(gbtreekey_var, gbtreekey_var, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_text_union(internal, internal)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_text_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_consistent(internal, time without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_distance(internal, time without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_time_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_time_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_timetz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_timetz_consistent(internal, time with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_timetz_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_consistent(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_distance(internal, timestamp without time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_same(gbtreekey16, gbtreekey16, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_ts_union(internal, internal)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_ts_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_consistent(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_tstz_distance(internal, timestamp with time zone, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_tstz_distance$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_compress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_consistent(internal, uuid, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_same(gbtreekey32, gbtreekey32, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_same$function$
;

CREATE OR REPLACE FUNCTION public.gbt_uuid_union(internal, internal)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_uuid_union$function$
;

CREATE OR REPLACE FUNCTION public.gbt_var_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gbt_var_fetch(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbt_var_fetch$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey16_in(cstring)
 RETURNS gbtreekey16
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey16_out(gbtreekey16)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey2_in(cstring)
 RETURNS gbtreekey2
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey2_out(gbtreekey2)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey32_in(cstring)
 RETURNS gbtreekey32
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey32_out(gbtreekey32)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey4_in(cstring)
 RETURNS gbtreekey4
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey4_out(gbtreekey4)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey8_in(cstring)
 RETURNS gbtreekey8
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey8_out(gbtreekey8)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey_var_in(cstring)
 RETURNS gbtreekey_var
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_in$function$
;

CREATE OR REPLACE FUNCTION public.gbtreekey_var_out(gbtreekey_var)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$gbtreekey_out$function$
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

CREATE OR REPLACE FUNCTION public.int2_dist(smallint, smallint)
 RETURNS smallint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int2_dist$function$
;

CREATE OR REPLACE FUNCTION public.int4_dist(integer, integer)
 RETURNS integer
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int4_dist$function$
;

CREATE OR REPLACE FUNCTION public.int8_dist(bigint, bigint)
 RETURNS bigint
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$int8_dist$function$
;

CREATE OR REPLACE FUNCTION public.interval_dist(interval, interval)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$interval_dist$function$
;

CREATE OR REPLACE FUNCTION public.oid_dist(oid, oid)
 RETURNS oid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$oid_dist$function$
;

CREATE OR REPLACE FUNCTION public.time_dist(time without time zone, time without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$time_dist$function$
;

CREATE OR REPLACE FUNCTION public.ts_dist(timestamp without time zone, timestamp without time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$ts_dist$function$
;

CREATE OR REPLACE FUNCTION public.tstz_dist(timestamp with time zone, timestamp with time zone)
 RETURNS interval
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/btree_gist', $function$tstz_dist$function$
;


-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_agenda_profesional_validar_rango BEFORE INSERT OR UPDATE ON public.agenda_profesional FOR EACH ROW EXECUTE FUNCTION fn_agenda_profesional_validar_rango();
CREATE TRIGGER trg_agenda_profesional_validar_rol BEFORE INSERT OR UPDATE ON public.agenda_profesional FOR EACH ROW EXECUTE FUNCTION fn_agenda_profesional_validar_rol();
CREATE TRIGGER trg_articulo_updated_at BEFORE UPDATE ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_articulo AFTER INSERT OR DELETE OR UPDATE ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_cod_articulo BEFORE INSERT ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_articulo();
CREATE TRIGGER trg_auditoria_caja_apertura AFTER INSERT OR UPDATE ON public.caja_apertura FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_caja_actualizar_saldo_apertura AFTER INSERT ON public.caja_apertura FOR EACH ROW EXECUTE FUNCTION fn_caja_actualizar_saldo_apertura();
CREATE TRIGGER trg_caja_calcular_cierre BEFORE UPDATE ON public.caja_apertura FOR EACH ROW WHEN ((old.estado IS DISTINCT FROM new.estado)) EXECUTE FUNCTION fn_caja_calcular_cierre();
CREATE TRIGGER trg_caja_validar_apertura_sucursal BEFORE INSERT OR UPDATE OF estado, caja_id ON public.caja_apertura FOR EACH ROW WHEN ((new.estado = true)) EXECUTE FUNCTION fn_caja_validar_apertura_sucursal();
CREATE TRIGGER trg_auditoria_cliente AFTER INSERT OR UPDATE ON public.cliente FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_cliente_validar_duplicados BEFORE INSERT OR UPDATE ON public.cliente FOR EACH ROW EXECUTE FUNCTION fn_cliente_validar_duplicados();
CREATE TRIGGER trg_auditoria_comprobante_proveedor AFTER INSERT ON public.comprobante_proveedor FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_bloquea_update_comprobante_proveedor BEFORE UPDATE ON public.comprobante_proveedor FOR EACH ROW EXECUTE FUNCTION fn_bloquea_update_comprobante_proveedor();
CREATE TRIGGER trg_cp_anula_comprobante AFTER INSERT ON public.comprobante_proveedor FOR EACH ROW WHEN ((new.anula_comprobante_id IS NOT NULL)) EXECUTE FUNCTION fn_anula_comprobante_proveedor();
CREATE TRIGGER trg_auditoria_consulta_medica AFTER INSERT OR UPDATE ON public.consulta_medica FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_bloquea_update_consulta_medica BEFORE UPDATE ON public.consulta_medica FOR EACH ROW EXECUTE FUNCTION fn_bloquea_update_consulta_medica();
CREATE TRIGGER trg_auditoria_consulta_medica_insumo AFTER INSERT ON public.consulta_medica_insumo FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_bloquea_insumo_consulta_cerrada BEFORE INSERT ON public.consulta_medica_insumo FOR EACH ROW EXECUTE FUNCTION fn_bloquea_insumo_consulta_cerrada();
CREATE TRIGGER trg_auditoria_consulta_medica_nota AFTER INSERT ON public.consulta_medica_nota FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_cotizacion AFTER INSERT ON public.cotizacion FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_deposito AFTER INSERT OR UPDATE ON public.deposito FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_historial_precios AFTER INSERT OR UPDATE ON public.lista_precio FOR EACH ROW EXECUTE FUNCTION fn_historial_precios();
CREATE TRIGGER trg_lista_precio_actualizar_vigencia BEFORE UPDATE ON public.lista_precio FOR EACH ROW EXECUTE FUNCTION fn_lista_precio_actualizar_vigencia();
CREATE TRIGGER trg_lista_precio_updated_at BEFORE UPDATE ON public.lista_precio FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_historial_precios_practica AFTER INSERT OR UPDATE ON public.lista_precio_practica FOR EACH ROW EXECUTE FUNCTION fn_historial_precios_practica();
CREATE TRIGGER trg_lista_precio_practica_actualizar_vigencia BEFORE UPDATE ON public.lista_precio_practica FOR EACH ROW EXECUTE FUNCTION fn_lista_precio_practica_actualizar_vigencia();
CREATE TRIGGER trg_lista_precio_practica_updated_at BEFORE UPDATE ON public.lista_precio_practica FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_auditoria_mascota AFTER INSERT OR UPDATE ON public.mascota FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_mascota_validar_fecha_nacimiento BEFORE INSERT OR UPDATE ON public.mascota FOR EACH ROW EXECUTE FUNCTION fn_mascota_validar_fecha_nacimiento();
CREATE TRIGGER trg_auditoria_movimiento_caja AFTER INSERT OR UPDATE ON public.movimiento_caja FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_caja_actualizar_saldo_movimiento AFTER INSERT ON public.movimiento_caja FOR EACH ROW EXECUTE FUNCTION fn_caja_actualizar_saldo_movimiento();
CREATE TRIGGER trg_caja_movimiento_validar_abierta BEFORE INSERT ON public.movimiento_caja FOR EACH ROW EXECUTE FUNCTION fn_caja_movimiento_validar_abierta();
CREATE TRIGGER trg_auditoria_movimiento_stock_cab AFTER INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_generar_numero_movimiento BEFORE INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_movimiento();
CREATE TRIGGER trg_valida_mov_recepcion_compra BEFORE INSERT ON public.movimiento_stock_cab FOR EACH ROW EXECUTE FUNCTION fn_valida_mov_recepcion_compra();
CREATE TRIGGER trg_actualiza_oc_por_recepcion AFTER INSERT ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_actualiza_oc_por_recepcion();
CREATE TRIGGER trg_actualizar_stock_det AFTER INSERT OR UPDATE ON public.movimiento_stock_det FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_det();
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
CREATE TRIGGER trg_auditoria_turno_alta AFTER INSERT ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_turno_estado AFTER UPDATE ON public.turno FOR EACH ROW WHEN ((old.estado_id IS DISTINCT FROM new.estado_id)) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_turno_pagado AFTER UPDATE ON public.turno FOR EACH ROW WHEN ((old.pagado IS DISTINCT FROM new.pagado)) EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_turno_abrir_consulta AFTER UPDATE ON public.turno FOR EACH ROW WHEN ((old.estado_id IS DISTINCT FROM new.estado_id)) EXECUTE FUNCTION fn_turno_abrir_consulta();
CREATE TRIGGER trg_turno_sincronizar_sucursal BEFORE INSERT OR UPDATE OF agenda_profesional_id ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_sincronizar_sucursal();
CREATE TRIGGER trg_turno_validar_estados_activos BEFORE INSERT OR UPDATE OF cliente_id, mascota_id, practica_id ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_validar_estados_activos();
CREATE TRIGGER trg_turno_validar_fecha_no_pasada BEFORE INSERT ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_validar_fecha_no_pasada();
CREATE TRIGGER trg_turno_validar_horario BEFORE INSERT OR UPDATE OF fecha, hora_inicio, hora_fin, agenda_profesional_id ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_validar_horario();
CREATE TRIGGER trg_turno_validar_mascota_cliente BEFORE INSERT OR UPDATE OF cliente_id, mascota_id ON public.turno FOR EACH ROW EXECUTE FUNCTION fn_turno_validar_mascota_cliente();
CREATE TRIGGER trg_auditoria_usuario AFTER INSERT OR DELETE OR UPDATE ON public.usuario FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_auditoria_venta AFTER INSERT OR UPDATE ON public.venta FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_venta_bloquear_modificacion BEFORE DELETE OR UPDATE ON public.venta FOR EACH ROW EXECUTE FUNCTION fn_venta_bloquear_modificacion();
CREATE TRIGGER trg_venta_crear_movimiento_stock AFTER INSERT ON public.venta FOR EACH ROW EXECUTE FUNCTION fn_venta_crear_movimiento_stock();
CREATE TRIGGER trg_venta_revertir_anulacion AFTER UPDATE OF estado ON public.venta FOR EACH ROW WHEN (((old.estado IS DISTINCT FROM new.estado) AND (new.estado = 'anulado'::estado_documento))) EXECUTE FUNCTION fn_venta_revertir_anulacion();
CREATE TRIGGER trg_venta_validar_consulta_cerrada BEFORE INSERT ON public.venta FOR EACH ROW EXECUTE FUNCTION fn_venta_validar_consulta_cerrada();
CREATE CONSTRAINT TRIGGER trg_venta_validar_pagada AFTER INSERT ON public.venta DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_venta_validar_cierre_pagada();
CREATE TRIGGER trg_auditoria_venta_detalle AFTER INSERT OR DELETE ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_venta_detalle_bloquear_modificacion BEFORE INSERT OR DELETE OR UPDATE ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION fn_venta_detalle_bloquear_modificacion();
CREATE TRIGGER trg_venta_detalle_descontar_stock AFTER INSERT ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION fn_venta_detalle_descontar_stock();
CREATE TRIGGER trg_venta_detalle_tomar_precio BEFORE INSERT ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION fn_venta_detalle_tomar_precio();
CREATE TRIGGER trg_venta_detalle_validar_movimiento_insumo BEFORE INSERT ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION fn_venta_detalle_validar_movimiento_insumo();
CREATE TRIGGER trg_venta_recalcular_totales AFTER INSERT OR DELETE OR UPDATE ON public.venta_detalle FOR EACH ROW EXECUTE FUNCTION fn_venta_recalcular_totales();
CREATE TRIGGER trg_auditoria_venta_medio_pago AFTER INSERT ON public.venta_medio_pago FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
CREATE TRIGGER trg_venta_medio_pago_bloquear_modificacion BEFORE INSERT OR DELETE OR UPDATE ON public.venta_medio_pago FOR EACH ROW EXECUTE FUNCTION fn_venta_medio_pago_bloquear_modificacion();
CREATE TRIGGER trg_venta_medio_pago_ingreso_caja AFTER INSERT ON public.venta_medio_pago FOR EACH ROW EXECUTE FUNCTION fn_venta_medio_pago_ingreso_caja();
CREATE CONSTRAINT TRIGGER trg_venta_medio_pago_validar_total AFTER INSERT OR DELETE OR UPDATE ON public.venta_medio_pago DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fn_venta_medio_pago_validar_total();


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
COMMENT ON COLUMN caja_apertura.diferencia IS 'monto_contado - monto_esperado. Positivo = sobrante, negativo = faltante.';
COMMENT ON COLUMN caja_apertura.estado IS 'TRUE = abierta, FALSE = cerrada.';
COMMENT ON COLUMN consulta_medica.cerrada IS 'Una vez en true, la consulta no admite UPDATE (salvo el propio cierre); las correcciones se agregan como consulta_medica_nota.';
COMMENT ON COLUMN consulta_medica.medicacion_indicada IS 'Indicaciones médicas en texto libre (dosis, frecuencia, duración). Cubre el requerimiento de Diego Cuello de Sprint Review 3; HU-CLIN-03 (recetas digitales en PDF) queda pendiente para un sprint posterior.';
COMMENT ON COLUMN consulta_medica.motivo_consulta IS 'Se precarga con turno.notas al abrirse automáticamente; editable hasta el cierre.';
COMMENT ON COLUMN historial_precios.vigencia_hasta IS 'NULL = este es el precio actualmente vigente para el artículo (la fila "abierta"). A lo sumo una fila con vigencia_hasta NULL por articulo_id (uq_historial_precios_vigente).';
COMMENT ON COLUMN historial_precios_practica.vigencia_hasta IS 'NULL = este es el precio actualmente vigente para la práctica (la fila "abierta"). A lo sumo una fila con vigencia_hasta NULL por practica_id (uq_historial_precios_practica_vigente).';
COMMENT ON COLUMN lista_precio.vigencia_desde IS 'Fecha desde la que rige el precio actual. Se actualiza sola cuando cambia `precio`; no representa un historial (ver historial_precios para eso).';
COMMENT ON COLUMN lista_precio_practica.vigencia_desde IS 'Fecha desde la que rige el precio actual. Se actualiza sola cuando cambia `precio`; no representa un historial (ver historial_precios_practica para eso).';
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
COMMENT ON COLUMN turno.pagado IS 'Indica si el turno fue pagado (true) o no (false).';
COMMENT ON COLUMN usuario.bloqueado_hasta IS 'HU-SIS-04: si es futuro, el login se rechaza antes de invocar Supabase Auth.';
COMMENT ON COLUMN usuario.intentos_fallidos IS 'HU-SIS-04. CHECK entre 0 y 3.';
COMMENT ON COLUMN venta_detalle.practica_id IS 'Si no es NULL, la línea cobra una práctica (turno.practica_id) y no un artículo: articulo_id debe ser NULL (ck_venta_detalle_articulo_o_practica). El precio se toma de lista_precio_practica (fn_venta_detalle_tomar_precio) y no descuenta stock (fn_venta_detalle_descontar_stock).';
COMMENT ON TABLE agenda IS 'Estructura mínima: se crea automáticamente 1 por sucursal. Ampliar con turnos/franjas horarias cuando se desarrolle ese módulo.';
COMMENT ON TABLE articulo IS 'El costo de compra y el precio de venta NO se almacenan aqui: ver Lista de Precios y Recepcion de Mercaderia';
COMMENT ON TABLE auditoria IS 'Bitácora general: cada fila es un evento (alta/modificación/baja) de una entidad auditada.';
COMMENT ON TABLE auditoria_sesion IS 'HU-SIS-04: bitácora de login/logout, alimentada automáticamente desde auth.audit_log_entries de Supabase mediante trigger (no inserción manual). Tabla aparte de auditoria porque un login no es un cambio de fila de una tabla de negocio.';
COMMENT ON TABLE caja IS 'Estructura mínima: se crea automáticamente 1 por sucursal. Ampliar con movimientos de caja / arqueos cuando se desarrolle ese módulo.';
COMMENT ON TABLE caja_apertura IS 'HU-VTA-03: ciclo de apertura/cierre de una caja (una fila por jornada de un cajero). monto_esperado y diferencia se calculan automáticamente al cerrar (fn_caja_calcular_cierre) como inicial + ingresos - egresos de movimiento_caja.';
COMMENT ON TABLE comprobante_proveedor IS 'HU-PROV-04: comprobantes de proveedor (factura, NC, ND) vinculados a una OC recibida. No se modifica una vez registrado (ver trg_bloquea_update_comprobante_proveedor), salvo el propio trigger interno que setea estado=''anulado''. ANULACIÓN vs CORRECCIÓN — dos mecanismos distintos: comprobante_corregido_id es una NC/ND legítima que AJUSTA el monto de una factura (ej. devolución parcial): es un documento nuevo con su propio monto_total/afecta_saldo, que entra en el cálculo de saldo como cualquier otro comprobante vigente. anula_comprobante_id anula por completo un comprobante cargado por ERROR: solo marca estado=''anulado'' en el original, no toca montos ni pagos ya imputados (si tenía pagos parciales, esa plata sigue en pago_imputacion; la vista simplemente deja de considerar ese comprobante). La fila de anulación en sí es documental, no participa en ningún cálculo.';
COMMENT ON TABLE comprobante_proveedor_detalle IS 'HU-PROV-04: líneas del comprobante — puede facturar varios artículos de la misma OC.';
COMMENT ON TABLE consulta_medica IS 'HU-CLIN-01: detalle de la atención (diagnóstico, signos vitales, tratamiento/medicación). turno_id es UNIQUE porque, en este sprint, toda consulta nace de un turno pasado a estado ''atendido'' (ver fn_turno_abrir_consulta, trigger sobre turno). Inmutable una vez cerrada (fn_bloquea_update_consulta_medica): sólo admite agregar consulta_medica_nota. Los insumos/medicamentos aplicados se registran en consulta_medica_insumo, una tabla puramente declarativa que NO mueve stock; el descuento real contra movimiento_stock (HU-STK-04) ocurre recién al facturarse en una venta (ver fn_venta_detalle_descontar_stock).';
COMMENT ON TABLE consulta_medica_insumo IS 'HU-CLIN-01: insumo/medicamento que el veterinario indica como aplicado durante la consulta, seleccionado del catálogo de artículos (HU-STK-01) con su cantidad. NO descuenta stock por sí sola: es sólo la declaración de uso que queda disponible para su liquidación en Caja (HU-VTA-01, ver venta_detalle.consulta_medica_insumo_id). El stock recién se descuenta cuando esa línea se factura.';
COMMENT ON TABLE consulta_medica_nota IS 'HU-CLIN-01: notas aclaratorias agregadas después de cerrada la consulta. No se editan ni se borran.';
COMMENT ON TABLE forma_pago IS 'Catalogo unico de condiciones de pago (HU-PROV-01 y HU-COMP-02). Se expone por GET /api/formas-pago y GET /api/condiciones-pago: mismo catalogo, dos preguntas distintas (que acepta un proveedor / que se pacto en una compra). El front NO debe tener su propia lista hardcodeada.';
COMMENT ON TABLE historial_precios IS 'HU-STK-03: historial de vigencias reales de precio de venta (una fila por cada período en que un precio estuvo vigente para un artículo). Usa los mismos nombres que lista_precio.vigencia_desde (vigencia_desde/vigencia_hasta) para evitar confusiones de nomenclatura. vigencia_hasta es NULL mientras ese precio sigue siendo el vigente; se completa recién cuando se carga el precio siguiente (fn_historial_precios cierra la fila abierta con vigencia_hasta = nueva.vigencia_desde - 1 día, y abre una fila nueva con vigencia_hasta = NULL). Es de solo lectura desde la aplicación: la escribe únicamente el trigger fn_historial_precios().';
COMMENT ON TABLE historial_precios_practica IS 'Historial de vigencias reales de precio de venta de una práctica (una fila por cada período en que un precio estuvo vigente). Mismos nombres de columnas que historial_precios (vigencia_desde/vigencia_hasta). vigencia_hasta es NULL mientras ese precio sigue siendo el vigente; se completa recién cuando se carga el precio siguiente (fn_historial_precios_practica cierra la fila abierta con vigencia_hasta = nueva.vigencia_desde - 1 día, y abre una fila nueva con vigencia_hasta = NULL). Es de solo lectura desde la aplicación: la escribe únicamente el trigger fn_historial_precios_practica().';
COMMENT ON TABLE lista_precio IS 'HU-STK-03: precio de venta vigente de un artículo o servicio, independiente del costo de compra (que se fija en la recepción de OC, HU-COMP-03). UNA fila por artículo (UNIQUE articulo_id): actualizar el precio es un UPDATE in place, no se acumulan filas históricas acá. vigencia_desde se reasigna automáticamente a CURRENT_DATE en cada cambio de precio (fn_lista_precio_actualizar_vigencia). El historial de cambios se registra aparte en historial_precios.';
COMMENT ON TABLE lista_precio_practica IS 'Precio de venta vigente de una práctica (consulta, vacunación, etc.). Equivalente a lista_precio pero para practica en lugar de articulo. UNA fila por práctica (UNIQUE practica_id): actualizar el precio es un UPDATE in place, no se acumulan filas históricas acá. vigencia_desde se reasigna automáticamente a CURRENT_DATE en cada cambio de precio (fn_lista_precio_practica_actualizar_vigencia). El historial de cambios se registra aparte en historial_precios_practica.';
COMMENT ON TABLE movimiento_caja IS 'HU-VTA-03: ingresos y egresos de una caja abierta. Sin atributo "origen" ni catálogo de orígenes: a diferencia de movimiento_stock (que tiene un conjunto acotado de orígenes de negocio), un movimiento de caja manual puede deberse a cualquier motivo textual (motivo cubre eso, como el concepto libre de un resumen bancario). venta_id es un FK real y tipado (no un id genérico): NULL para movimientos cargados a mano por el cajero, y = la venta cuyo cobro en efectivo generó el ingreso automático (HU-VTA-02, fn_venta_medio_pago_ingreso_caja). Si en el futuro aparece otro origen automático distinto de venta, se evalúa agregar otra columna tipada específica o migrar recién ahí al patrón origen_id/origen_entidad_id de movimiento_stock.';
COMMENT ON TABLE movimiento_stock_cab IS 'HU-STK-04 cabecera. Un movimiento puede afectar varios articulos.';
COMMENT ON TABLE notificacion_compra IS 'HU-COMP-03: notifica al responsable de compras (usuario_id de la OC) cuando difiere lo recibido de lo solicitado. Una notificación viva por línea de OC (orden_compra_detalle_id); se actualiza con cada entrega parcial y se borra al resolverse la diferencia.';
COMMENT ON TABLE pago IS 'HU-FIN-03: pagos a proveedores y cobranzas a clientes. Inmutable tras el INSERT (ver trg_bloquea_update_pago), salvo el propio trigger interno de estado. Se anula registrando un pago NUEVO con anula_pago_id -> pago original; ese trigger solo marca estado=''anulado'', no borra pago_imputacion (se conserva el historial completo). Un eventual pago de reemplazo es un INSERT independiente, sin relación estructural con el anulado, con sus propias pago_imputacion.';
COMMENT ON TABLE pago_imputacion IS 'HU-FIN-03: relación 1 a muchos entre un pago y los comprobantes que cancela. Dos validaciones BEFORE INSERT, calculadas al vuelo con subquery (no contra una columna cacheada): (1) la suma imputada en este pago no supera pago.monto; (2) la suma imputada HISTÓRICA de este comprobante (entre todos los pagos vigentes que lo tocaron) no supera su monto_total. Un trigger adicional valida que el comprobante imputado pertenezca al mismo proveedor/cliente que pago.proveedor_id / pago.cliente_id.';
COMMENT ON TABLE proveedor_forma_pago IS 'N:M — un proveedor acepta varias formas de pago (HU-PROV-01, decision D-A). ON DELETE CASCADE solo del lado proveedor: si se borrara un proveedor caen sus pares, pero una forma de pago del catalogo nunca se borra si esta en uso.';
COMMENT ON TABLE solicitud_cotizacion IS 'HU-COMP-02. Pedido de cotizacion: define LOS MISMOS ARTICULOS sobre los que despues se comparan las ofertas de varios proveedores.';
COMMENT ON TABLE sucursal IS 'Sucursales de la empresa. Cada una opera con caja, agenda y depósito de stock propios e independientes.';
COMMENT ON TABLE venta IS 'HU-VTA-01: cabecera de venta (consulta + insumos + medicamentos + alimentos + accesorios). No tiene cliente_id: la venta puede ser de un cliente registrado o de alguien que entró a la tienda; si proviene de una atención, el cliente surge de consulta_id -> consulta_medica.cliente_id. deposito_id indica el depósito (interno de la sucursal) del que se descuenta el stock; la FK compuesta fk_venta_deposito_sucursal garantiza que pertenezca a sucursal_id. Si consulta_id no es NULL, la venta se originó desde el botón de cobro de una atención finalizada (HU-CLIN-01); uq_venta_consulta garantiza que esa consulta se facture una única vez (una segunda venta contra la misma consulta es rechazada por la base). total se recalcula automáticamente (fn_venta_recalcular_totales) como la suma de venta_detalle.subtotal. No se calculan subtotal ni impuestos por separado: por indicación de cátedra el proyecto no contempla impuestos (pendiente corregir el criterio de aceptación en el Backlog).';
COMMENT ON TABLE venta_detalle IS 'HU-VTA-01: líneas de la venta (relación cabecera-detalle). precio_unitario se completa siempre desde lista_precio (fn_venta_detalle_tomar_precio); no es editable manualmente, aunque el front lo envíe se descarta. consulta_medica_insumo_id es la trazabilidad opcional cuando la línea corresponde a un insumo indicado durante una consulta (HU-CLIN-01): en ese caso el artículo/cantidad se validan contra esa indicación (fn_venta_detalle_validar_movimiento_insumo), pero el descuento de stock se hace igual que cualquier otra línea, recién acá (fn_venta_detalle_descontar_stock) — el stock NUNCA se descuenta antes de la venta.';
COMMENT ON TABLE venta_medio_pago IS 'HU-VTA-02: uno o varios medios de pago por venta (relación 1 a muchos), reutilizando el catálogo forma_pago ya existente (efectivo, transferencia, tarjeta, billetera virtual son filas de ese catálogo). Sin integración con pasarelas externas: registro manual. La suma de montos debe igualar venta.total (fn_venta_medio_pago_validar_total, constraint trigger DEFERRED para permitir cargar varias líneas en la misma transacción antes de validar el total).';
