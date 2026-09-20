-- =========================================================
-- SEED 02 · DATOS DE DEMO
-- =========================================================
-- Datos de prueba. Se pueden borrar sin romper nada.
-- Corre DESPUÉS de 01_catalogos.sql.
--
-- Se usan los mismos nombres que el front tiene hardcodeados (Ana Martínez,
-- Amoxicilina 500mg, Nutrición Animal SRL...) para que al conectar cada
-- pantalla los datos calcen y se note enseguida si algo no anda.
--
-- ---------------------------------------------------------
-- DOS COSAS QUE ACÁ SE VEN EN ACCIÓN
-- ---------------------------------------------------------
--
-- 1. NO SE MANDA `codigo` NI `cod_ord`.
--    Los generan triggers de la base (fn_generar_cod_articulo,
--    fn_generar_cod_orden_compra). Aunque las columnas sean NOT NULL, el
--    trigger es BEFORE INSERT: completa el valor antes de que se controle.
--    Lo mismo vale para el API: no debe mandar esos campos.
--
-- 2. NO SE ESCRIBE `ficha_stock.stock_actual` A MANO.
--    Las fichas nacen en 0 y el stock sube o baja SOLO por los movimientos,
--    que dispara fn_actualizar_stock. Es el criterio de HU-STK-02: "el stock
--    actual se actualiza exclusivamente mediante los movimientos registrados".
--    Si el seed lo pusiera a mano, estaría mintiendo sobre cómo funciona.
--
-- Todo va con guardas NOT EXISTS para poder correrlo más de una vez sin
-- duplicar (no se puede usar ON CONFLICT porque las claves naturales, como el
-- código de artículo, las genera la base).
-- =========================================================


-- ---------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------
INSERT INTO usuario (nombre, apellido, dni, email, rol_id, estado)
SELECT v.nombre, v.apellido, v.dni, v.email, r.id, 'activo'
FROM (VALUES
  ('Ana',    'Martínez', '30111222', 'ana.martinez@huellitas.com',  'Administrador'),
  ('Carlos', 'López',    '32444555', 'carlos.lopez@huellitas.com',  'Personal de depósito'),
  ('María',  'García',   '33666777', 'maria.garcia@huellitas.com',  'Recepcionista')
) AS v(nombre, apellido, dni, email, rol)
JOIN rol r ON r.nombre = v.rol
WHERE NOT EXISTS (SELECT 1 FROM usuario u WHERE u.dni = v.dni);


-- ---------------------------------------------------------
-- PROVEEDORES
-- ---------------------------------------------------------
INSERT INTO proveedor (razon_social, cuit, direccion, telefono, email, contacto, plazo_entrega_dias, estado, calificacion)
SELECT v.razon, v.cuit, v.direccion, v.telefono, v.email, v.contacto, v.plazo, v.estado::estado_activo_inactivo, v.calif
FROM (VALUES
  ('Nutrición Animal SRL',   '30-71234567-8', 'Av. Bolivia 1450, Salta Capital', '387-4551122', 'ventas@nutricionanimal.com.ar',   'Marcela Funes', 5,  'activo',   4.5),
  ('VetInsumos Norte SA',    '30-70987654-2', 'Alvarado 890, Salta Capital',     '387-4223344', 'pedidos@vetinsumosnorte.com',    'Diego Herrera', 2,  'activo',   4.0),
  ('Farmavet Distribuidora', '27-65432198-3', 'Ruta 9 Km 4.5, Cerrillos',        '387-4998877', 'administracion@farmavet.com.ar', 'Lucía Paz',     7,  'activo',   4.2),
  ('Balanceados del Norte',  '30-69876543-1', 'Belgrano 220, Salta Capital',     '387-4667788', 'contacto@balanceadosnorte.com',  'Rubén Salinas', 10, 'inactivo', 3.0)
) AS v(razon, cuit, direccion, telefono, email, contacto, plazo, estado, calif)
WHERE NOT EXISTS (SELECT 1 FROM proveedor p WHERE p.cuit = v.cuit);

-- Formas de pago por proveedor (N:M — decisión D-A, migración 0007).
--
-- OJO CON EL ORDEN DE LOS JOIN: la lista de VALUES va PRIMERO en el FROM.
-- Si se pusiera `FROM proveedor p JOIN forma_pago f ON f.nombre = v.forma`, el
-- ON estaría referenciando `v` antes de que exista, y Postgres falla con
-- "missing FROM-clause entry for table v".
INSERT INTO proveedor_forma_pago (proveedor_id, forma_pago_id)
SELECT p.id, f.id
FROM (VALUES
  ('30-71234567-8', 'Cta. cte. 30 días'),
  ('30-71234567-8', 'Transferencia'),
  ('30-70987654-2', 'Contado'),
  ('27-65432198-3', 'Cheque a 30 días'),
  ('27-65432198-3', 'Contado'),
  ('30-69876543-1', 'Cta. cte. 30 días')
) AS v(cuit, forma)
JOIN proveedor  p ON p.cuit   = v.cuit
JOIN forma_pago f ON f.nombre = v.forma
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------
-- ARTÍCULOS
-- ---------------------------------------------------------
-- Sin `codigo`: lo genera el trigger a partir del prefijo de la categoría.
INSERT INTO articulo (categoria_id, unidad_medida_id, fabricante_id, nombre, descripcion, estado)
SELECT c.id, u.id, fab.id, v.nombre, v.descripcion, v.estado::estado_activo_inactivo
FROM (VALUES
  ('Amoxicilina 500mg', 'Antibiótico de amplio espectro para infecciones bacterianas', 'Medicamentos', 'Unidad', 'Laboratorios Pharma S.A.', 'activo'),
  ('Jeringa 5ml',       'Jeringa descartable con aguja 21G',                           'Insumos',      'Unidad', 'Nipro Medical',            'inactivo'),
  ('Alimento Premium',  'Alimento balanceado premium para perro adulto',               'Alimentos',    'Kg',     'PetFood Co',               'activo'),
  ('Collar antipulgas', 'Collar antiparasitario externo, 8 meses de protección',       'Accesorios',   'Unidad', 'Vetmed Labs',              'activo')
) AS v(nombre, descripcion, categoria, unidad, fabricante, estado)
JOIN categoria      c   ON c.nombre   = v.categoria
JOIN unidad_medida  u   ON u.nombre   = v.unidad
JOIN fabricante     fab ON fab.nombre = v.fabricante
WHERE NOT EXISTS (SELECT 1 FROM articulo a WHERE lower(a.nombre) = lower(v.nombre));


-- ---------------------------------------------------------
-- FICHAS DE STOCK
-- ---------------------------------------------------------
-- stock_actual arranca en 0 SIEMPRE. Los saldos salen de los movimientos.
-- El crítico tiene que ser <= al mínimo (constraint ck_ficha_critico_menor).
INSERT INTO ficha_stock (articulo_id, deposito_id, stock_actual, stock_minimo, stock_critico)
SELECT a.id, d.id, 0, v.minimo, v.critico
FROM (VALUES
  ('Amoxicilina 500mg', 'Centro', 20.00, 5.00),
  ('Jeringa 5ml',       'Centro', 30.00, 10.00),
  ('Alimento Premium',  'Norte',  15.00, 5.00),
  ('Collar antipulgas', 'Sur',    10.00, NULL::numeric)
) AS v(articulo, deposito, minimo, critico)
JOIN articulo a ON a.nombre = v.articulo
JOIN deposito d ON d.nombre = v.deposito
ON CONFLICT (articulo_id, deposito_id) DO NOTHING;


-- ---------------------------------------------------------
-- MOVIMIENTOS
-- ---------------------------------------------------------
-- El orden importa: primero entra mercadería, después sale. Un egreso sobre
-- una ficha en cero lo rechaza el trigger (ERRCODE HF001), así que el seed
-- tampoco puede hacer trampa.
--
--   MOV 1  ingreso  Amoxicilina @ Centro  +45  → stock 45
--   MOV 2  ingreso  Alimento    @ Norte   +15  → stock 15
--   MOV 3  egreso   Alimento    @ Norte    -5  → stock 10
--
-- Los saldos NO se escriben acá: los deja fn_actualizar_stock.
INSERT INTO movimiento_stock (ficha_stock_id, origen_id, usuario_id, origen_entidad_id, tipo, cantidad, motivo)
SELECT f.id, o.id, us.id, v.entidad, v.tipo::tipo_movimiento_stock, v.cantidad, v.motivo
FROM (VALUES
  (1, 'Amoxicilina 500mg', 'Centro', 'recepcion_compra', '32444555', NULL::int, 'ingreso', 45.00, 'Ingreso inicial por recepción de mercadería'),
  (2, 'Alimento Premium',  'Norte',  'recepcion_compra', '32444555', NULL,      'ingreso', 15.00, 'Reposición de alimento balanceado'),
  (3, 'Alimento Premium',  'Norte',  'venta',            '33666777', 45,        'egreso',   5.00, 'Venta a cliente #45')
) AS v(orden, articulo, deposito, origen, dni, entidad, tipo, cantidad, motivo)
JOIN articulo          a  ON a.nombre = v.articulo
JOIN deposito          d  ON d.nombre = v.deposito
JOIN ficha_stock       f  ON f.articulo_id = a.id AND f.deposito_id = d.id
JOIN origen_movimiento o  ON o.nombre = v.origen
JOIN usuario           us ON us.dni   = v.dni
WHERE NOT EXISTS (SELECT 1 FROM movimiento_stock m)
ORDER BY v.orden;


-- ---------------------------------------------------------
-- ÓRDENES DE COMPRA
-- ---------------------------------------------------------
-- Sin `cod_ord`: lo genera el trigger (OC-000001, OC-000002).
-- `descuento` es PORCENTAJE 0-100, no un monto (constraint ck_oc_importes).
--   total = subtotal - (subtotal * descuento/100) + gastos_envio
--   OC 1: 9800 - 490 + 300 = 9610
--   OC 2: 25500 - 0 + 500  = 26000
INSERT INTO orden_compra
  (proveedor_id, usuario_id, estado_id, forma_pago_id, deposito_id, fecha, fecha_entrega, notas, subtotal, descuento, gastos_envio, total)
SELECT p.id, us.id, e.id, fp.id, d.id, v.fecha::timestamp, v.entrega::timestamp,
       v.notas, v.subtotal, v.descuento, v.envio, v.total
FROM (VALUES
  ('27-65432198-3', '30111222', 'Pendiente', 'Contado',          'Centro', '2026-08-01 10:00:00', '2026-08-06 10:00:00', 'Pedido mensual de antibióticos',     9800.00, 5.00, 300.00,  9610.00),
  ('30-71234567-8', '32444555', 'Enviada',   'Cta. cte. 30 días', 'Norte',  '2026-08-03 14:30:00', '2026-08-05 14:30:00', 'Reposición de alimento balanceado', 25500.00, 0.00, 500.00, 26000.00)
) AS v(cuit, dni, estado, forma, deposito, fecha, entrega, notas, subtotal, descuento, envio, total)
JOIN proveedor           p  ON p.cuit    = v.cuit
JOIN usuario             us ON us.dni    = v.dni
JOIN estado_orden_compra e  ON e.nombre  = v.estado
JOIN forma_pago          fp ON fp.nombre = v.forma
JOIN deposito            d  ON d.nombre  = v.deposito
WHERE NOT EXISTS (SELECT 1 FROM orden_compra o);

INSERT INTO orden_compra_detalle (orden_compra_id, articulo_id, cantidad, precio_acordado, subtotal)
SELECT o.id, a.id, v.cantidad, v.precio, v.cantidad * v.precio
FROM (VALUES
  ('Pedido mensual de antibióticos',     'Amoxicilina 500mg', 100.00, 98.00),
  ('Reposición de alimento balanceado',  'Alimento Premium',   50.00, 510.00)
) AS v(nota, articulo, cantidad, precio)
JOIN orden_compra o ON o.notas   = v.nota
JOIN articulo     a ON a.nombre  = v.articulo
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------
-- ORDEN DE COMPRA PARA PROBAR HU-COMP-03
-- ---------------------------------------------------------
-- Las dos órdenes de arriba no sirven para demostrar la recepción: tienen UNA
-- sola línea, así que la primera entrega ya cierra la orden y nunca se ve el
-- estado 'Recibida Parcial'.
--
-- Esta tiene DOS líneas y está 'Enviada', que es el camino completo:
--
--   1ª recepción parcial  → 30 de 60 Amoxicilina  → OC en 'Recibida Parcial'
--   2ª recepción          → los 30 que faltan + los 20 collares
--                         → OC en 'Recibida Total' SIN que nadie elija "total"
--
-- Dos cosas más que quedan cubiertas con este dato:
--
--  · 'Collar antipulgas' tiene ficha de stock SOLO en el depósito 'Sur', y la
--    orden entrega en 'Centro'. Es el caso de la decisión D-2: la recepción
--    crea la ficha al vuelo y la devuelve en `fichasCreadas` para que la
--    pantalla avise que hay que configurarle los umbrales.
--
--  · La emite Ana Martínez, así que las notificaciones por diferencia le llegan
--    a ella (D-3: se notifica a `orden_compra.usuario_id`).
--
-- La guarda va por `notas` y no por `NOT EXISTS (SELECT 1 FROM orden_compra)`
-- como el bloque de arriba: si no, esta orden no se cargaría nunca en una base
-- que ya tiene las otras dos.
INSERT INTO orden_compra
  (proveedor_id, usuario_id, estado_id, forma_pago_id, deposito_id, fecha, fecha_entrega, notas, subtotal, descuento, gastos_envio, total)
SELECT p.id, us.id, e.id, fp.id, d.id, v.fecha::timestamp, v.entrega::timestamp,
       v.notas, v.subtotal, v.descuento, v.envio, v.total
FROM (VALUES
  ('30-70987654-2', '30111222', 'Enviada', 'Contado', 'Centro',
   '2026-08-28 09:00:00', '2026-09-02 09:00:00',
   'Pedido para probar recepción parcial (HU-COMP-03)',
   11000.00, 0.00, 0.00, 11000.00)
) AS v(cuit, dni, estado, forma, deposito, fecha, entrega, notas, subtotal, descuento, envio, total)
JOIN proveedor           p  ON p.cuit    = v.cuit
JOIN usuario             us ON us.dni    = v.dni
JOIN estado_orden_compra e  ON e.nombre  = v.estado
JOIN forma_pago          fp ON fp.nombre = v.forma
JOIN deposito            d  ON d.nombre  = v.deposito
WHERE NOT EXISTS (
  SELECT 1 FROM orden_compra o
  WHERE o.notas = 'Pedido para probar recepción parcial (HU-COMP-03)'
);

INSERT INTO orden_compra_detalle (orden_compra_id, articulo_id, cantidad, precio_acordado, subtotal)
SELECT o.id, a.id, v.cantidad, v.precio, v.cantidad * v.precio
FROM (VALUES
  ('Amoxicilina 500mg', 60.00, 100.00),
  ('Collar antipulgas', 20.00, 250.00)
) AS v(articulo, cantidad, precio)
JOIN orden_compra o ON o.notas  = 'Pedido para probar recepción parcial (HU-COMP-03)'
JOIN articulo     a ON a.nombre = v.articulo
WHERE NOT EXISTS (
  SELECT 1 FROM orden_compra_detalle d
  WHERE d.orden_compra_id = o.id AND d.articulo_id = a.id
);
