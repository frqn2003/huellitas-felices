-- =========================================================
-- 0009 · CORRECCIÓN: campos que faltaban en la orden de compra
-- =========================================================


-- ---------------------------------------------------------
-- 1. FALTABA: condicion_pago
-- ---------------------------------------------------------
-- POR QUÉ: es el PRIMER criterio de aceptación de HU-COMP-02, textual:
--   "Cabecera de la orden: proveedor, fecha de emision, CONDICIONES DE PAGO
--    y estado."
-- Y el front ya lo manda: OrdenCompra.condicion_pago, con el catalogo
-- CONDICIONES_PAGO de src/data/ordenes-compra.ts.
--
-- Se deja como varchar con CHECK y no como tabla catalogo porque el front lo
-- tiene como constante fija. El propio comentario del front lo anticipa:
-- "si pasa a tabla de catalogo, poblar desde GET /api/condiciones-pago".
ALTER TABLE orden_compra ADD COLUMN condicion_pago varchar(60);

-- Backfill de las ordenes que ya existan
UPDATE orden_compra SET condicion_pago = 'Contado' WHERE condicion_pago IS NULL;

ALTER TABLE orden_compra ALTER COLUMN condicion_pago SET NOT NULL;

ALTER TABLE orden_compra ADD CONSTRAINT ck_oc_condicion_pago
  CHECK (condicion_pago IN ('Contado', 'Cta. cte. 30 días', 'Cta. cte. 60 días'));

COMMENT ON COLUMN orden_compra.condicion_pago IS 'HU-COMP-02. Valores del front: CONDICIONES_PAGO en src/data/ordenes-compra.ts';


-- ---------------------------------------------------------
-- 2. fecha con default
-- ---------------------------------------------------------
-- Era NOT NULL sin DEFAULT: obliga a que la app mande la fecha de emision,
-- cuando deberia ponerla el servidor (el front no debe decidir "cuando" se
-- emitio una orden).
ALTER TABLE orden_compra ALTER COLUMN fecha SET DEFAULT now();


-- ---------------------------------------------------------
-- 3. Secuencia para cod_ord
-- ---------------------------------------------------------
-- OC-XXXX secuencial, generado por el back al confirmar (criterio HU-COMP-02:
-- "genera la orden con numero unico secuencial").
CREATE SEQUENCE seq_orden_compra_numero START 1;

SELECT setval(
  'seq_orden_compra_numero',
  GREATEST(COALESCE((SELECT MAX(id) FROM orden_compra), 0), 1),
  (SELECT count(*) > 0 FROM orden_compra)
);
