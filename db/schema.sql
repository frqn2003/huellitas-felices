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


-- =========================================================
-- SECUENCIAS
-- =========================================================

CREATE SEQUENCE IF NOT EXISTS articulo_cod_seq;
CREATE SEQUENCE IF NOT EXISTS articulo_id_seq;
CREATE SEQUENCE IF NOT EXISTS categoria_id_seq;
CREATE SEQUENCE IF NOT EXISTS deposito_id_seq;
CREATE SEQUENCE IF NOT EXISTS estado_orden_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS fabricante_id_seq;
CREATE SEQUENCE IF NOT EXISTS ficha_stock_id_seq;
CREATE SEQUENCE IF NOT EXISTS forma_pago_id_seq;
CREATE SEQUENCE IF NOT EXISTS movimiento_stock_id_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_cod_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_detalle_id_seq;
CREATE SEQUENCE IF NOT EXISTS orden_compra_id_seq;
CREATE SEQUENCE IF NOT EXISTS origen_movimiento_id_seq;
CREATE SEQUENCE IF NOT EXISTS proveedor_id_seq;
CREATE SEQUENCE IF NOT EXISTS rol_id_seq;
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
  imagen_url character varying(255)
);

CREATE TABLE categoria (
  id integer(32,0) DEFAULT nextval('categoria_id_seq'::regclass) NOT NULL,
  nombre character varying(100) NOT NULL,
  prefijo character varying(5) DEFAULT 'ART'::character varying NOT NULL
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
  nom_forma character varying(100) NOT NULL
);

CREATE TABLE movimiento_stock (
  id integer(32,0) DEFAULT nextval('movimiento_stock_id_seq'::regclass) NOT NULL,
  ficha_stock_id integer(32,0) NOT NULL,
  origen_id integer(32,0) NOT NULL,
  usuario_id integer(32,0) NOT NULL,
  origen_entidad_id integer(32,0),
  tipo tipo_movimiento_stock NOT NULL,
  cantidad numeric(12,2) NOT NULL,
  fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
  motivo character varying(255),
  movimiento_vinculado_id integer(32,0)
);

CREATE TABLE orden_compra (
  id integer(32,0) DEFAULT nextval('orden_compra_id_seq'::regclass) NOT NULL,
  proveedor_id integer(32,0) NOT NULL,
  cod_ord character varying(30) NOT NULL,
  cotizacion_id integer(32,0),
  usuario_id integer(32,0) NOT NULL,
  estado_id smallint(16,0) DEFAULT 1 NOT NULL,
  fecha timestamp without time zone NOT NULL,
  fecha_entrega timestamp without time zone,
  notas text,
  subtotal numeric,
  descuento numeric,
  gastos_envio numeric,
  total numeric NOT NULL,
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

CREATE TABLE proveedor (
  id integer(32,0) DEFAULT nextval('proveedor_id_seq'::regclass) NOT NULL,
  razon_social character varying(150) NOT NULL,
  forma_pago_id integer(32,0) NOT NULL,
  cuit character varying(20) NOT NULL,
  direccion character varying(255),
  telefono character varying(30),
  email character varying(120),
  contacto character varying(100),
  plazo_entrega_d_habitual integer(32,0),
  estado estado_activo_inactivo DEFAULT 'activo'::estado_activo_inactivo NOT NULL,
  calificacion numeric(3,1)
);

CREATE TABLE rol (
  id integer(32,0) DEFAULT nextval('rol_id_seq'::regclass) NOT NULL,
  nombre character varying(50) NOT NULL
);

CREATE TABLE unidad_medida (
  id integer(32,0) DEFAULT nextval('unidad_medida_id_seq'::regclass) NOT NULL,
  unidad character varying(50) NOT NULL
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

ALTER TABLE articulo ADD CONSTRAINT articulo_pkey PRIMARY KEY (id);
ALTER TABLE articulo ADD CONSTRAINT articulo_codigo_key UNIQUE (codigo);
ALTER TABLE categoria ADD CONSTRAINT categoria_pkey PRIMARY KEY (id);
ALTER TABLE categoria ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);
ALTER TABLE categoria ADD CONSTRAINT categoria_prefijo_key UNIQUE (prefijo);
ALTER TABLE deposito ADD CONSTRAINT deposito_pkey PRIMARY KEY (id);
ALTER TABLE estado_orden_compra ADD CONSTRAINT estado_orden_compra_pkey PRIMARY KEY (id);
ALTER TABLE estado_orden_compra ADD CONSTRAINT estado_orden_compra_nombre_key UNIQUE (nombre);
ALTER TABLE fabricante ADD CONSTRAINT fabricante_pkey PRIMARY KEY (id);
ALTER TABLE fabricante ADD CONSTRAINT fabricante_nombre_key UNIQUE (nombre);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_pkey PRIMARY KEY (id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_deposito_id_key UNIQUE (articulo_id, deposito_id);
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_pkey PRIMARY KEY (id);
ALTER TABLE forma_pago ADD CONSTRAINT forma_pago_nom_forma_key UNIQUE (nom_forma);
ALTER TABLE movimiento_stock ADD CONSTRAINT movimiento_stock_pkey PRIMARY KEY (id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_pkey PRIMARY KEY (id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_cod_ord_key UNIQUE (cod_ord);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_pkey PRIMARY KEY (id);
ALTER TABLE origen_movimiento ADD CONSTRAINT origen_movimiento_pkey PRIMARY KEY (id);
ALTER TABLE origen_movimiento ADD CONSTRAINT origen_movimiento_nombre_key UNIQUE (nombre);
ALTER TABLE proveedor ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id);
ALTER TABLE proveedor ADD CONSTRAINT proveedor_cuit_key UNIQUE (cuit);
ALTER TABLE rol ADD CONSTRAINT rol_pkey PRIMARY KEY (id);
ALTER TABLE rol ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_pkey PRIMARY KEY (id);
ALTER TABLE unidad_medida ADD CONSTRAINT unidad_medida_unidad_key UNIQUE (unidad);
ALTER TABLE usuario ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);
ALTER TABLE usuario ADD CONSTRAINT usuario_dni_key UNIQUE (dni);
ALTER TABLE usuario ADD CONSTRAINT usuario_email_key UNIQUE (email);


-- =========================================================
-- CLAVES FORÁNEAS
-- =========================================================

ALTER TABLE articulo ADD CONSTRAINT articulo_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES categoria(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_fabricante_id_fkey FOREIGN KEY (fabricante_id) REFERENCES fabricante(id);
ALTER TABLE articulo ADD CONSTRAINT articulo_unidad_medida_id_fkey FOREIGN KEY (unidad_medida_id) REFERENCES unidad_medida(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE ficha_stock ADD CONSTRAINT ficha_stock_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE movimiento_stock ADD CONSTRAINT movimiento_stock_ficha_stock_id_fkey FOREIGN KEY (ficha_stock_id) REFERENCES ficha_stock(id);
ALTER TABLE movimiento_stock ADD CONSTRAINT movimiento_stock_movimiento_vinculado_id_fkey FOREIGN KEY (movimiento_vinculado_id) REFERENCES movimiento_stock(id);
ALTER TABLE movimiento_stock ADD CONSTRAINT movimiento_stock_origen_id_fkey FOREIGN KEY (origen_id) REFERENCES origen_movimiento(id);
ALTER TABLE movimiento_stock ADD CONSTRAINT movimiento_stock_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES deposito(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES estado_orden_compra(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES proveedor(id);
ALTER TABLE orden_compra ADD CONSTRAINT orden_compra_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuario(id);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_articulo_id_fkey FOREIGN KEY (articulo_id) REFERENCES articulo(id);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT orden_compra_detalle_orden_compra_id_fkey FOREIGN KEY (orden_compra_id) REFERENCES orden_compra(id);
ALTER TABLE proveedor ADD CONSTRAINT proveedor_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES forma_pago(id);
ALTER TABLE usuario ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES rol(id);


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


-- =========================================================
-- TRIGGERS
-- =========================================================

CREATE TRIGGER trg_generar_cod_articulo BEFORE INSERT ON public.articulo FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_articulo();
CREATE TRIGGER trg_actualizar_stock AFTER INSERT ON public.movimiento_stock FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock();
CREATE TRIGGER trg_generar_cod_orden_compra BEFORE INSERT ON public.orden_compra FOR EACH ROW EXECUTE FUNCTION fn_generar_cod_orden_compra();


-- =========================================================
-- COMENTARIOS
-- =========================================================

COMMENT ON COLUMN articulo.imagen_url IS 'URL de la imagen representativa del artículo';
COMMENT ON COLUMN movimiento_stock.movimiento_vinculado_id IS 'Auto-referencia: enlaza el egreso en origen con el ingreso en destino de una transferencia';
COMMENT ON COLUMN movimiento_stock.origen_entidad_id IS 'Id de la entidad origen (venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia_detalle, etc.) segun "origen_id"';
COMMENT ON COLUMN movimiento_stock.origen_id IS 'Categoria del origen (venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma)';
COMMENT ON COLUMN proveedor.calificacion IS 'Evaluacion de desempeño';
COMMENT ON COLUMN rol.nombre IS 'Administrador, Gerente, Veterinario, Recepcionista, Personal de deposito, Cajero';
COMMENT ON TABLE articulo IS 'El costo de compra y el precio de venta NO se almacenan aqui: ver Lista de Precios y Recepcion de Mercaderia';
