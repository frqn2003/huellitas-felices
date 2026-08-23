-- =========================================================
-- SEED 02 · DATOS DE DEMO
-- =========================================================
-- Datos de prueba para la demo del sprint. Se pueden borrar sin romper nada.
-- Corre DESPUÉS de 01_catalogos.sql (necesita rol, deposito, forma_pago,
-- origen_movimiento y estado_orden_compra ya cargados).
--
-- Se usan los MISMOS nombres que el front tiene hardcodeados
-- (Ana Martinez, Carlos Lopez, Maria Garcia; Amoxicilina 500mg, Jeringa 5ml...)
-- para que al conectar cada pantalla los datos calcen y se note si algo falla.
--
-- ---------------------------------------------------------
-- BUGS CORREGIDOS DE LOS INSERTS ORIGINALES
-- ---------------------------------------------------------
-- Los INSERT de prueba que venían con el DDL no corrían. Cuatro problemas:
--
--  1. orden_compra usaba la columna `estado` con valores 'pendiente'/'enviada'.
--     La columna real es `estado_id` (int, FK a estado_orden_compra).
--
--  2. estado_orden_compra nunca se poblaba, así que `estado_id DEFAULT 1`
--     violaba la FK. Corregido en 01_catalogos.sql.
--
--  3. orden_compra no incluía `cod_ord`, que es NOT NULL UNIQUE → fallaba
--     siempre. Ahora se genera OC-0001, OC-0002.
--
--  4. `descuento` se cargaba como 500.00, o sea un MONTO en pesos
--     (10000 - 500 + 300 = 9800). Pero el front lo trata como PORCENTAJE
--     0-100 (ver src/data/ordenes-compra.ts: "porcentaje de descuento
--     aplicado (0-100). El monto se calcula sobre el subtotal").
--     ⚠️ HAY QUE DECIDIRLO: acá se asume PORCENTAJE, que es lo que espera el
--     front, y la migración 0006 lo fuerza con CHECK (descuento BETWEEN 0 AND 100).
--     Si el equipo prefiere monto, hay que cambiar el CHECK y avisar al front.
-- =========================================================


-- ---------------------------------------------------------
-- USUARIOS (empleado ya fusionado — migración 0002)
-- ---------------------------------------------------------
INSERT INTO usuario (nombre, apellido, dni, email, rol_id, estado)
SELECT v.nombre, v.apellido, v.dni, v.email, r.id, 'activo'
FROM (VALUES
  ('Ana',    'Martinez', '30111222', 'ana.martinez@huellitas.com',  'Administrador'),
  ('Carlos', 'Lopez',    '32444555', 'carlos.lopez@huellitas.com',  'Personal de depósito'),
  ('Maria',  'Garcia',   '33666777', 'maria.garcia@huellitas.com',  'Recepcionista')
) AS v(nombre, apellido, dni, email, rol)
JOIN rol r ON r.nombre = v.rol
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------
-- PROVEEDORES
-- ---------------------------------------------------------
INSERT INTO proveedor (razon_social, cuit, direccion, telefono, email, contacto, rubro, plazo_entrega_dias, estado, calificacion) VALUES
  ('Nutricion Animal SRL',   '30-71234567-8', 'Av. Bolivia 1450, Salta Capital', '387-4551122', 'ventas@nutricionanimal.com.ar',   'Marcela Funes', 'alimentos',    5,  'activo',   4.5),
  ('VetInsumos Norte SA',    '30-70987654-2', 'Alvarado 890, Salta Capital',     '387-4223344', 'pedidos@vetinsumosnorte.com',    'Diego Herrera', 'insumos',      2,  'activo',   4.0),
  ('Farmavet Distribuidora', '27-65432198-3', 'Ruta 9 Km 4.5, Cerrillos',        '387-4998877', 'administracion@farmavet.com.ar', 'Lucia Paz',     'medicamentos', 7,  'activo',   4.2),
  ('Balanceados del Norte',  '30-69876543-1', 'Belgrano 220, Salta Capital',     '387-4667788', 'contacto@balanceadosnorte.com',  'Ruben Salinas', 'alimentos',    10, 'inactivo', 3.0)
ON CONFLICT DO NOTHING;

-- Formas de pago por proveedor (N:M — decisión D-A).
-- Replica los datos del front, que ya maneja varias por proveedor.
--
-- OJO CON EL ORDEN DE LOS JOIN: la lista de VALUES va PRIMERO en el FROM.
-- Si se pone `FROM proveedor p JOIN forma_pago f ON f.nombre = v.forma JOIN (VALUES...) v`,
-- el ON de forma_pago referencia `v` antes de que exista y Postgres falla con
-- "missing FROM-clause entry for table v".
INSERT INTO proveedor_forma_pago (proveedor_id, forma_pago_id)
SELECT p.id, f.id
FROM (VALUES
  ('Nutricion Animal SRL',   'Cuenta Corriente'),
  ('Nutricion Animal SRL',   'Transferencia'),
  ('VetInsumos Norte SA',    'Contado'),
  ('Farmavet Distribuidora', 'Cheque a 30 días'),
  ('Farmavet Distribuidora', 'Contado'),
  ('Balanceados del Norte',  'Cuenta Corriente')
) AS v(razon, forma)
JOIN proveedor  p ON p.razon_social = v.razon
JOIN forma_pago f ON f.nombre       = v.forma
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------
-- ARTICULOS
-- ---------------------------------------------------------
-- Sin numero_lote ni fecha_vencimiento (se quitaron en 0007: van por lote,
-- y son HU-STK-05). Categorias y unidades con los valores EXACTOS del front.
INSERT INTO articulo (codigo, nombre, descripcion, categoria, fabricante, unidad_medida, proveedor_preferido_id, estado)
SELECT v.codigo, v.nombre, v.descripcion, v.categoria, v.fabricante, v.unidad, p.id, v.estado::estado_activo_inactivo
FROM (VALUES
  ('ART001', 'Amoxicilina 500mg', 'Antibiotico de amplio espectro para infecciones bacterianas', 'Medicamentos', 'Laboratorios Pharma S.A.', 'Unidad', 'Farmavet Distribuidora', 'activo'),
  ('ART002', 'Jeringa 5ml',       'Jeringa descartable con aguja 21G',                           'Insumos',      'Nipro Medical',            'Unidad', NULL,                     'inactivo'),
  ('ART003', 'Alimento Premium',  'Alimento balanceado premium para perro adulto',               'Alimentos',    'PetFood Co',               'Kg',     'Nutricion Animal SRL',   'activo'),
  ('ART004', 'Collar antipulgas', 'Collar antiparasitario externo, 8 meses de proteccion',       'Accesorios',   'Vetmed Labs',              'Unidad', 'VetInsumos Norte SA',    'activo')
) AS v(codigo, nombre, descripcion, categoria, fabricante, unidad, proveedor, estado)
LEFT JOIN proveedor p ON p.razon_social = v.proveedor
ON CONFLICT (codigo) DO NOTHING;


-- ---------------------------------------------------------
-- FICHAS DE STOCK
-- ---------------------------------------------------------
-- stock_actual arranca en 0 SIEMPRE (criterio HU-STK-02: "se actualiza
-- exclusivamente mediante los movimientos registrados"). Los saldos que se
-- ven mas abajo salen de los movimientos, no de un valor cargado a mano.
INSERT INTO ficha_stock (articulo_id, deposito_id, stock_actual, stock_minimo, stock_critico)
SELECT a.id, d.id, 0, v.minimo, v.critico
FROM (VALUES
  ('ART001', 'Centro', 20.00, 5.00),
  ('ART002', 'Centro', 30.00, 10.00),
  ('ART003', 'Norte',  15.00, 5.00),
  ('ART004', 'Sur',    10.00, NULL::numeric)
) AS v(codigo, deposito, minimo, critico)
JOIN articulo a ON a.codigo = v.codigo
JOIN deposito d ON d.nombre = v.deposito
ON CONFLICT (articulo_id, deposito_id) DO NOTHING;


-- ---------------------------------------------------------
-- MOVIMIENTOS (cabecera + detalle, migración 0008)
-- ---------------------------------------------------------
-- Los tres movimientos cuentan una historia consistente: primero entra
-- mercaderia, despues sale. Un egreso sobre una ficha en cero seria imposible
-- en la app real (el service lo rechaza por ck_ficha_stock_no_negativo), asi
-- que el seed no lo hace tampoco.
--
--   MOV-0001  ingreso  ART001 @ Centro  +45  → stock 45
--   MOV-0002  ingreso  ART003 @ Norte   +15  → stock 15
--   MOV-0003  egreso   ART003 @ Norte    -5  → stock 10

-- Helper: inserta cabecera + una linea en un solo statement.
-- La CTE `cab` es data-modifying: devuelve el id recien creado para el detalle.

-- MOV-0001 · ingreso por recepcion de compra
WITH cab AS (
  INSERT INTO movimiento_stock_cab (numero, deposito_id, tipo, origen_id, origen_entidad_id, usuario_id, motivo)
  SELECT
    'MOV-' || lpad(nextval('seq_movimiento_numero')::text, 4, '0'),
    (SELECT id FROM deposito WHERE nombre = 'Centro'),
    'ingreso',
    (SELECT id FROM origen_movimiento WHERE nombre = 'recepcion_compra'),
    NULL,
    (SELECT id FROM usuario WHERE dni = '32444555'),
    'Ingreso inicial por recepcion de mercaderia'
  RETURNING id
)
INSERT INTO movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
SELECT cab.id, f.id, 45.00
FROM cab
JOIN ficha_stock f ON true
JOIN articulo a ON a.id = f.articulo_id
JOIN deposito d ON d.id = f.deposito_id
WHERE a.codigo = 'ART001' AND d.nombre = 'Centro';

-- MOV-0002 · ingreso por recepcion de compra
WITH cab AS (
  INSERT INTO movimiento_stock_cab (numero, deposito_id, tipo, origen_id, origen_entidad_id, usuario_id, motivo)
  SELECT
    'MOV-' || lpad(nextval('seq_movimiento_numero')::text, 4, '0'),
    (SELECT id FROM deposito WHERE nombre = 'Norte'),
    'ingreso',
    (SELECT id FROM origen_movimiento WHERE nombre = 'recepcion_compra'),
    NULL,
    (SELECT id FROM usuario WHERE dni = '32444555'),
    'Reposicion de alimento balanceado'
  RETURNING id
)
INSERT INTO movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
SELECT cab.id, f.id, 15.00
FROM cab
JOIN ficha_stock f ON true
JOIN articulo a ON a.id = f.articulo_id
JOIN deposito d ON d.id = f.deposito_id
WHERE a.codigo = 'ART003' AND d.nombre = 'Norte';

-- MOV-0003 · egreso por venta
WITH cab AS (
  INSERT INTO movimiento_stock_cab (numero, deposito_id, tipo, origen_id, origen_entidad_id, usuario_id, motivo)
  SELECT
    'MOV-' || lpad(nextval('seq_movimiento_numero')::text, 4, '0'),
    (SELECT id FROM deposito WHERE nombre = 'Norte'),
    'egreso',
    (SELECT id FROM origen_movimiento WHERE nombre = 'venta'),
    45,
    (SELECT id FROM usuario WHERE dni = '33666777'),
    'Venta a cliente #45'
  RETURNING id
)
INSERT INTO movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
SELECT cab.id, f.id, 5.00
FROM cab
JOIN ficha_stock f ON true
JOIN articulo a ON a.id = f.articulo_id
JOIN deposito d ON d.id = f.deposito_id
WHERE a.codigo = 'ART003' AND d.nombre = 'Norte';

-- Saldos resultantes de los movimientos de arriba.
-- En la app esto lo hace el service de movimientos dentro de la misma
-- transaccion que inserta el movimiento (repo.sumarStock). Acá se ajusta
-- aparte porque el seed inserta por SQL directo, sin pasar por el service.
UPDATE ficha_stock f SET stock_actual = v.saldo
FROM (VALUES
  ('ART001', 'Centro', 45.00),
  ('ART003', 'Norte',  10.00)
) AS v(codigo, deposito, saldo),
articulo a, deposito d
WHERE f.articulo_id = a.id
  AND f.deposito_id = d.id
  AND a.codigo = v.codigo
  AND d.nombre = v.deposito;


-- ---------------------------------------------------------
-- ORDENES DE COMPRA
-- ---------------------------------------------------------
-- cotizacion_id queda NULL: cotizaciones esta fuera del Sprint 1 (decision D-C).
-- descuento en PORCENTAJE (ver bug 4 arriba).
INSERT INTO orden_compra
  (cod_ord, proveedor_id, usuario_id, estado_id, fecha, fecha_entrega, direccion_entrega, condicion_pago, notas, subtotal, descuento, gastos_envio, total)
SELECT
  'OC-' || lpad(nextval('seq_orden_compra_numero')::text, 4, '0'),
  p.id,
  u.id,
  e.id,
  v.fecha::timestamp,
  v.entrega::timestamp,
  v.direccion,
  v.condicion,
  v.notas,
  v.subtotal,
  v.descuento,
  v.envio,
  v.total
FROM (VALUES
  ('Farmavet Distribuidora', '30111222', 'Pendiente', '2026-08-01 10:00:00', '2026-08-06 10:00:00', 'Av. Principal 123', 'Contado',            'Pedido mensual de antibioticos',    9800.00,  5.00, 300.00,  9610.00),
  ('Nutricion Animal SRL',   '32444555', 'Enviada',   '2026-08-03 14:30:00', '2026-08-05 14:30:00', 'Calle Norte 456',   'Cta. cte. 30 días', 'Reposicion de alimento balanceado', 25500.00, 0.00, 500.00, 26000.00)
) AS v(proveedor, dni, estado, fecha, entrega, direccion, condicion, notas, subtotal, descuento, envio, total)
JOIN proveedor           p ON p.razon_social = v.proveedor
JOIN usuario             u ON u.dni          = v.dni
JOIN estado_orden_compra e ON e.nombre       = v.estado;

-- total = subtotal - (subtotal * descuento/100) + envio
--   OC-0001: 9800 - 490 + 300 = 9610  ✓
--   OC-0002: 25500 - 0 + 500 = 26000  ✓

INSERT INTO orden_compra_detalle (orden_compra_id, articulo_id, cantidad, precio_acordado)
SELECT o.id, a.id, v.cantidad, v.precio
FROM (VALUES
  ('OC-0001', 'ART001', 100.00, 98.00),
  ('OC-0002', 'ART003', 50.00,  510.00)
) AS v(cod, codigo, cantidad, precio)
JOIN orden_compra o ON o.cod_ord = v.cod
JOIN articulo     a ON a.codigo  = v.codigo;
