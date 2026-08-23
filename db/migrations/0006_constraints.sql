-- =========================================================
-- 0006 · CORRECCIÓN: constraints que faltaban o estaban mal
-- =========================================================
-- Cada UNIQUE de acá es la traducción literal de un criterio de aceptación.
-- Sin el índice, la validación de la app se escapa por concurrencia: dos
-- requests simultáneos pasan los dos el chequeo previo y los dos insertan.
-- =========================================================


-- ---------------------------------------------------------
-- 1. CUIT: el UNIQUE total estaba MAL
-- ---------------------------------------------------------
-- HU-PROV-01 dice: "valida que el CUIT no se encuentre duplicado
-- ENTRE PROVEEDORES ACTIVOS".
-- El UNIQUE total del baseline impide reutilizar el CUIT de un proveedor
-- dado de baja, que sí debe poder volver a usarse (p. ej. si se dio de baja
-- por error, o la empresa vuelve a operar). Se reemplaza por índice parcial.
ALTER TABLE proveedor DROP CONSTRAINT proveedor_cuit_key;

CREATE UNIQUE INDEX uq_proveedor_cuit_activo
  ON proveedor (cuit)
  WHERE estado = 'activo';


-- ---------------------------------------------------------
-- 2. Artículo: faltaba el UNIQUE de nombre
-- ---------------------------------------------------------
-- HU-STK-01: "valida que el nombre no se encuentre duplicado entre
-- artículos activos". No existía ninguna restricción sobre `nombre`.
-- lower() para que "Amoxicilina" y "amoxicilina" cuenten como el mismo.
CREATE UNIQUE INDEX uq_articulo_nombre_activo
  ON articulo (lower(nombre))
  WHERE estado = 'activo';

-- `codigo` ya tenía UNIQUE total en el baseline y así se queda:
-- el código es identificador de catálogo, no se reutiliza tras una baja.


-- ---------------------------------------------------------
-- 3. Usuario: DNI y email únicos entre activos
-- ---------------------------------------------------------
-- HU-SIS-01: "valida que el email y el DNI no se encuentren duplicados
-- entre usuarios activos". El baseline los tenía como UNIQUE total.
ALTER TABLE usuario DROP CONSTRAINT usuario_email_key;

CREATE UNIQUE INDEX uq_usuario_email_activo
  ON usuario (lower(email))
  WHERE estado = 'activo';

CREATE UNIQUE INDEX uq_usuario_dni_activo
  ON usuario (dni)
  WHERE estado = 'activo';


-- ---------------------------------------------------------
-- 4. orden_compra: tipos de FK que no coincidían
-- ---------------------------------------------------------
-- estado_id era smallint apuntando a estado_orden_compra.id (serial = integer).
-- Funciona por casteo implícito, pero es una FK con tipos distintos: se unifica.
ALTER TABLE orden_compra ALTER COLUMN estado_id TYPE int;


-- ---------------------------------------------------------
-- 5. orden_compra: importes sin precisión
-- ---------------------------------------------------------
-- subtotal, descuento, gastos_envio y total eran `decimal` pelado (precisión
-- arbitraria), mientras el resto del modelo usa decimal(12,2). El front
-- redondea a 2 decimales (parseImporte en src/data/ordenes-compra.ts).
ALTER TABLE orden_compra ALTER COLUMN subtotal     TYPE decimal(12,2);
ALTER TABLE orden_compra ALTER COLUMN descuento    TYPE decimal(12,2);
ALTER TABLE orden_compra ALTER COLUMN gastos_envio TYPE decimal(12,2);
ALTER TABLE orden_compra ALTER COLUMN total        TYPE decimal(12,2);

-- direccion_entrega era varchar sin límite
ALTER TABLE orden_compra ALTER COLUMN direccion_entrega TYPE varchar(255);

-- Importes no negativos
ALTER TABLE orden_compra ADD CONSTRAINT ck_oc_importes CHECK (
  subtotal >= 0 AND total >= 0
  AND COALESCE(gastos_envio, 0) >= 0
  AND COALESCE(descuento, 0) BETWEEN 0 AND 100
);
COMMENT ON COLUMN orden_compra.descuento IS 'Porcentaje 0-100. El monto se calcula sobre el subtotal (el back recalcula, nunca confía en el front).';

ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_cantidad CHECK (cantidad > 0);
ALTER TABLE orden_compra_detalle ADD CONSTRAINT ck_ocd_precio   CHECK (precio_acordado >= 0);

-- Un artículo no se repite dentro de la misma orden
CREATE UNIQUE INDEX uq_ocd_orden_articulo
  ON orden_compra_detalle (orden_compra_id, articulo_id);


-- ---------------------------------------------------------
-- 6. ficha_stock: invariantes de umbrales
-- ---------------------------------------------------------
-- HU-STK-02: "el stock actual se inicializa en cero y se actualiza
-- exclusivamente mediante los movimientos registrados".
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_stock_no_negativo
  CHECK (stock_actual >= 0);

ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_umbrales
  CHECK (stock_minimo >= 0 AND (stock_critico IS NULL OR stock_critico >= 0));

-- El crítico debe ser más bajo que el mínimo (si no, el estado "bajo" nunca se ve)
ALTER TABLE ficha_stock ADD CONSTRAINT ck_ficha_critico_menor
  CHECK (stock_critico IS NULL OR stock_critico <= stock_minimo);


-- ---------------------------------------------------------
-- 7. Índices para los filtros que el front ya tiene
-- ---------------------------------------------------------
CREATE INDEX idx_articulo_categoria   ON articulo (categoria);
CREATE INDEX idx_articulo_estado      ON articulo (estado);
CREATE INDEX idx_proveedor_estado     ON proveedor (estado);
CREATE INDEX idx_ficha_deposito       ON ficha_stock (deposito_id);
CREATE INDEX idx_ficha_articulo       ON ficha_stock (articulo_id);
CREATE INDEX idx_oc_proveedor         ON orden_compra (proveedor_id);
CREATE INDEX idx_oc_estado            ON orden_compra (estado_id);
CREATE INDEX idx_oc_fecha             ON orden_compra (fecha DESC);
CREATE INDEX idx_ocd_orden            ON orden_compra_detalle (orden_compra_id);
