-- =========================================================
-- 0001 · BASELINE — Huellitas Felices, Sprint 1
-- =========================================================
-- Estado inicial de la base tal como está hoy en el servidor.
-- Es el DDL que pasó el equipo, SIN cambios de diseño: las correcciones
-- van en las migraciones 0002+ para que quede trazable qué se cambió y por qué.
--
-- Qué se sacó del script original (y a dónde fue):
--   · SELECT * FROM movimiento_stock WHERE ...  → era scratch de consola, se elimina.
--   · DELETE FROM articulo;                     → PELIGROSO en un archivo de schema:
--                                                 se ejecutaría en cada corrida. Eliminado.
--   · Bloque "MOD ENUM"                         → ya está aplicado (el enum nace con
--                                                 ingreso/egreso), no hace falta el ALTER.
--   · TRUNCATE ... RESTART IDENTITY CASCADE     → db/dev/truncate.sql
--   · INSERTs de prueba                         → db/seeds/02_demo.sql
--
-- ⚠️ Este archivo es una HIPÓTESIS del estado remoto: se reconstruyó del código
--    que pasó el equipo, sin acceso a la base. Cuando haya acceso, correr las
--    queries de verificación de docs/backend/AJUSTES-DER.md §6 y diffear.
-- =========================================================


-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE estado_activo_inactivo AS ENUM ('activo', 'inactivo');

-- OJO: solo ingreso/egreso. "transferencia" y "ajuste" NO son tipos de
-- movimiento: son ORIGENES (ver tabla origen_movimiento). Una transferencia
-- es un egreso + un ingreso; un ajuste es un ingreso o un egreso.
CREATE TYPE tipo_movimiento_stock AS ENUM (
  'ingreso',
  'egreso'
);


-- =========================================================
-- TABLAS MÍNIMAS: ROL, EMPLEADO, USUARIO
-- =========================================================

CREATE TABLE rol (
  id serial PRIMARY KEY,
  nombre varchar(50) NOT NULL UNIQUE
);
COMMENT ON COLUMN rol.nombre IS 'Administrador, Gerente, Veterinario, Recepcionista, Personal de deposito, Cajero';

CREATE TABLE empleado (
  id serial PRIMARY KEY,
  nombre varchar(80) NOT NULL,
  apellido varchar(80) NOT NULL,
  dni varchar(20) NOT NULL UNIQUE,
  estado estado_activo_inactivo NOT NULL DEFAULT 'activo'
);

CREATE TABLE usuario (
  id serial PRIMARY KEY,
  empleado_id int NOT NULL UNIQUE REFERENCES empleado(id),
  rol_id int NOT NULL REFERENCES rol(id),
  email varchar(120) NOT NULL UNIQUE,
  estado estado_activo_inactivo NOT NULL DEFAULT 'activo',
  fecha_creacion timestamp NOT NULL DEFAULT now()
);
COMMENT ON COLUMN usuario.empleado_id IS 'Todo usuario del sistema corresponde a un empleado de RRHH';


-- =========================================================
-- 12. DEPÓSITOS Y ARTÍCULOS (STOCK)
-- =========================================================

CREATE TABLE proveedor (
  id serial PRIMARY KEY,
  razon_social varchar(150) NOT NULL,
  cuit varchar(20) NOT NULL UNIQUE,
  direccion varchar(255),
  telefono varchar(30),
  email varchar(120),
  contacto varchar(100),
  rubro varchar(60),
  forma_pago varchar(60),
  plazo_entrega_d_habitual int,
  estado estado_activo_inactivo NOT NULL DEFAULT 'activo',
  calificacion decimal(3,1)
);
COMMENT ON COLUMN proveedor.rubro IS 'medicamentos, alimentos, insumos, servicios';
COMMENT ON COLUMN proveedor.calificacion IS 'Evaluacion de desempeño';

CREATE TABLE articulo (
  id serial PRIMARY KEY,
  codigo varchar(30) NOT NULL UNIQUE,
  nombre varchar(150) NOT NULL,
  descripcion text,
  categoria varchar(60),
  fabricante varchar(100),
  unidad_medida varchar(20) NOT NULL,
  proveedor_preferido_id int REFERENCES proveedor(id),
  estado estado_activo_inactivo NOT NULL DEFAULT 'activo',
  numero_lote varchar(60),
  fecha_vencimiento date
);
COMMENT ON TABLE articulo IS 'El costo de compra y el precio de venta NO se almacenan aqui: ver Lista de Precios y Recepcion de Mercaderia';

CREATE TABLE deposito (
  id serial PRIMARY KEY,
  sucursal_id int NOT NULL,
  nombre varchar(100) NOT NULL,
  ubicacion varchar(150)
);

CREATE TABLE ficha_stock (
  id serial PRIMARY KEY,
  articulo_id int NOT NULL REFERENCES articulo(id),
  deposito_id int NOT NULL REFERENCES deposito(id),
  stock_actual decimal(12,2) NOT NULL DEFAULT 0,
  stock_minimo decimal(10,2) NOT NULL DEFAULT 0,
  stock_critico decimal(10,2),
  UNIQUE (articulo_id, deposito_id)
);

CREATE TABLE origen_movimiento (
  id serial PRIMARY KEY,
  nombre varchar(40) NOT NULL UNIQUE
);

CREATE TABLE movimiento_stock (
  id serial PRIMARY KEY,
  ficha_stock_id int NOT NULL REFERENCES ficha_stock(id),
  origen_id int NOT NULL REFERENCES origen_movimiento(id),
  origen_entidad_id int,
  tipo tipo_movimiento_stock NOT NULL,
  cantidad decimal(12,2) NOT NULL,
  fecha_hora timestamp NOT NULL DEFAULT now(),
  empleado_id int NOT NULL REFERENCES empleado(id),
  motivo varchar(255),
  movimiento_vinculado_id int REFERENCES movimiento_stock(id)
);
COMMENT ON COLUMN movimiento_stock.origen_id IS 'Categoria del origen (venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste, vacunacion, desparasitacion, merma)';
COMMENT ON COLUMN movimiento_stock.origen_entidad_id IS 'Id de la entidad origen (venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia_detalle, etc.) segun "origen_id"';
COMMENT ON COLUMN movimiento_stock.movimiento_vinculado_id IS 'Auto-referencia: enlaza el egreso en origen con el ingreso en destino de una transferencia';


-- =========================================================
-- 14. COMPRAS Y ABASTECIMIENTO
-- =========================================================

CREATE TABLE estado_orden_compra (
  id serial PRIMARY KEY,
  nombre varchar(30) UNIQUE NOT NULL,
  es_final boolean NOT NULL DEFAULT FALSE -- true para 'recibida_total' y 'cancelada'
);

CREATE TABLE orden_compra (
  id serial PRIMARY KEY,
  proveedor_id int NOT NULL REFERENCES proveedor(id),
  cod_ord varchar(30) NOT NULL UNIQUE,
  cotizacion_id int,
  usuario_id int NOT NULL REFERENCES usuario(id),
  estado_id smallint NOT NULL REFERENCES estado_orden_compra(id) DEFAULT 1,
  fecha timestamp NOT NULL,
  fecha_entrega timestamp,
  direccion_entrega varchar,
  notas text,
  subtotal decimal,
  descuento decimal,
  gastos_envio decimal,
  total decimal NOT NULL
);
COMMENT ON COLUMN orden_compra.cotizacion_id IS 'RESERVADO: cotizaciones queda fuera del Sprint 1 (decision D-C). Siempre NULL por ahora.';

CREATE TABLE orden_compra_detalle (
  id serial PRIMARY KEY,
  orden_compra_id int NOT NULL REFERENCES orden_compra(id),
  articulo_id int NOT NULL REFERENCES articulo(id),
  cantidad decimal(12,2) NOT NULL,
  precio_acordado decimal(12,2) NOT NULL
);
