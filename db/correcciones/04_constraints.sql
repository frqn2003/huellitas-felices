-- =========================================================
-- 0005 · FALTAN: los constraints que exigen los criterios de aceptación
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   La base no tiene NI UN SOLO CHECK, y dos de sus UNIQUE están mal planteados.
--   Cada cosa de acá es la traducción literal de un criterio del Excel.
--
-- POR QUÉ EN LA BASE Y NO SOLO EN EL CÓDIGO
--   Un chequeo en el service se escapa por concurrencia: dos requests
--   simultáneos pasan LOS DOS la validación (todavía no hay duplicado) y los
--   dos insertan. El índice es lo que garantiza la regla de verdad; el service
--   es lo que da el mensaje lindo. Van los dos.
-- =========================================================


-- ---------------------------------------------------------
-- 1. CUIT: el UNIQUE total está MAL
-- ---------------------------------------------------------
-- HU-PROV-01: "valida que el CUIT no se encuentre duplicado ENTRE PROVEEDORES
-- ACTIVOS". Con el UNIQUE total actual, si das de baja un proveedor por error
-- nunca más podés volver a usar ese CUIT — ni siquiera para el mismo.
--
-- Un índice PARCIAL (el `WHERE`) aplica la unicidad solo a algunas filas. Es la
-- traducción exacta de "entre activos".
ALTER TABLE proveedor DROP CONSTRAINT proveedor_cuit_key;

CREATE UNIQUE INDEX uq_proveedor_cuit_activo
  ON proveedor (cuit)
  WHERE estado = 'activo';


-- ---------------------------------------------------------
-- 2. Artículo: falta por completo el UNIQUE de nombre
-- ---------------------------------------------------------
-- HU-STK-01: "valida que el nombre no se encuentre duplicado entre artículos
-- activos". Hoy no hay ninguna restricción sobre `nombre`.
--
-- lower() para que "Amoxicilina" y "amoxicilina" cuenten como el mismo nombre.
CREATE UNIQUE INDEX uq_articulo_nombre_activo
  ON articulo (lower(nombre))
  WHERE estado = 'activo';

-- `codigo` ya tiene UNIQUE total y así se queda: lo genera un trigger con una
-- secuencia, nunca se repite y no se reutiliza tras una baja.


-- ---------------------------------------------------------
-- 3. Usuario: DNI y email únicos entre ACTIVOS
-- ---------------------------------------------------------
-- HU-SIS-01: "valida que el email y el DNI no se encuentren duplicados entre
-- usuarios activos". Hoy son UNIQUE totales, mismo problema que el CUIT.
ALTER TABLE usuario DROP CONSTRAINT usuario_email_key;
ALTER TABLE usuario DROP CONSTRAINT usuario_dni_key;

CREATE UNIQUE INDEX uq_usuario_email_activo
  ON usuario (lower(email))
  WHERE estado = 'activo';

CREATE UNIQUE INDEX uq_usuario_dni_activo
  ON usuario (dni)
  WHERE estado = 'activo';


-- ---------------------------------------------------------
-- 4. Umbrales de stock coherentes
-- ---------------------------------------------------------
-- El CHECK de stock_actual >= 0 ya se agregó en 0003 junto con el fix del trigger.
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_umbrales
  CHECK (stock_minimo >= 0 AND (stock_critico IS NULL OR stock_critico >= 0));

-- El crítico tiene que ser MENOR o igual al mínimo. Si fuera al revés, el
-- estado "bajo" nunca se vería: se saltaría directo de normal a crítico.
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_critico_menor
  CHECK (stock_critico IS NULL OR stock_critico <= stock_minimo);


-- ---------------------------------------------------------
-- 5. Cantidades y montos con sentido
-- ---------------------------------------------------------
ALTER TABLE movimiento_stock ADD CONSTRAINT ck_movimiento_cantidad
  CHECK (cantidad > 0);
COMMENT ON COLUMN movimiento_stock.cantidad IS
  'Siempre POSITIVA. El signo lo determina `tipo` (ingreso suma, egreso resta).';

ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_cantidad CHECK (cantidad > 0);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_precio   CHECK (precio_acordado >= 0);

-- Un artículo no puede repetirse dentro de la misma orden: si se pide más
-- cantidad, se edita la línea existente.
CREATE UNIQUE INDEX uq_ocd_orden_articulo
  ON orden_compra_detalle (orden_compra_id, articulo_id);


-- ---------------------------------------------------------
-- 6. Importes de la orden: precisión y rango
-- ---------------------------------------------------------
-- subtotal, descuento, gastos_envio y total son `numeric` sin precisión, cuando
-- el resto del modelo usa decimal(12,2) y el front redondea a 2 decimales.
ALTER TABLE orden_compra ALTER COLUMN subtotal     TYPE decimal(12,2);
ALTER TABLE orden_compra ALTER COLUMN descuento    TYPE decimal(12,2);
ALTER TABLE orden_compra ALTER COLUMN gastos_envio TYPE decimal(12,2);
ALTER TABLE orden_compra ALTER COLUMN total        TYPE decimal(12,2);

ALTER TABLE orden_compra ADD CONSTRAINT ck_oc_importes CHECK (
  COALESCE(subtotal, 0) >= 0
  AND total >= 0
  AND COALESCE(gastos_envio, 0) >= 0
  AND COALESCE(descuento, 0) BETWEEN 0 AND 100
);
COMMENT ON COLUMN orden_compra.descuento IS
  'PORCENTAJE 0-100, no un monto. El monto se calcula sobre el subtotal. '
  'El back recalcula siempre: el total que manda el front se descarta.';

-- La fecha de emisión la pone el servidor, no el front: el front no decide
-- "cuándo" se emitió una orden.
ALTER TABLE orden_compra ALTER COLUMN fecha SET DEFAULT now();


-- ---------------------------------------------------------
-- 7. Índices sobre las foreign keys
-- ---------------------------------------------------------
-- Postgres NO crea índices automáticos en las FK (sí en las PK). Sin ellos,
-- traer el detalle de una orden recorre la tabla entera. Con 1 fila da igual;
-- con 10.000 no.
CREATE INDEX idx_articulo_categoria  ON articulo (categoria_id);
CREATE INDEX idx_articulo_estado     ON articulo (estado);
CREATE INDEX idx_proveedor_estado    ON proveedor (estado);
CREATE INDEX idx_ficha_deposito      ON ficha_stock (deposito_id);
CREATE INDEX idx_ficha_articulo      ON ficha_stock (articulo_id);
CREATE INDEX idx_mov_ficha           ON movimiento_stock (ficha_stock_id);
CREATE INDEX idx_mov_fecha           ON movimiento_stock (fecha_hora DESC);
CREATE INDEX idx_mov_tipo            ON movimiento_stock (tipo);
CREATE INDEX idx_oc_proveedor        ON orden_compra (proveedor_id);
CREATE INDEX idx_oc_estado           ON orden_compra (estado_id);
CREATE INDEX idx_oc_fecha            ON orden_compra (fecha DESC);
CREATE INDEX idx_ocd_orden           ON orden_compra_detalle (orden_compra_id);
