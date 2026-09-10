-- =========================================================
-- 16 · RESTOS DE `cliente` EN LOS TRIGGERS DE PAGOS
-- =========================================================
--
-- POR QUÉ
--   El dump del 2026-09-08 limpió las referencias a clientes/ventas en dos
--   funciones (`fn_ck_pi_mismo_tercero` y `fn_pi_upsert_monto_imputado`), que
--   es lo que pidió el PO. Pero quedaron DOS sin limpiar, y una de ellas rompe
--   una operación real.
--
--   Esto NO es una decisión de diseño ni un pedido nuevo: son funciones que
--   nombran columnas y tablas que ya no existen en la base.
--
-- QUÉ ARREGLA
--   1. 🔴 `fn_bloquea_update_pago` — ANULAR UN PAGO ES IMPOSIBLE HOY.
--   2. ⚪ dos COMMENT que describen tablas borradas.
--
--   (La limpieza de `fn_ck_comprobante_no_excede` se movió a la corrección 17,
--    que reescribe esa función entera. Ver §2.)
--
-- CÓMO SE APLICA
--   Pegar entero en el SQL Editor de Supabase, una sola vez. Después:
--       npm run db:dump
--   y commitear el db/schema.sql actualizado.
--
--   Es idempotente (todo es CREATE OR REPLACE / COMMENT).
--
-- REFERENCIA
--   docs/backend/REVISION-PO-SPRINT2.md § "Lo que encontré revisando"
-- =========================================================


-- ---------------------------------------------------------
-- 1 · fn_bloquea_update_pago — 🔴 rompe la anulación de pagos
-- ---------------------------------------------------------
-- EL BUG
--   La función compara los campos del pago para permitir SOLO el cambio de
--   estado vigente → anulado, y en esa comparación incluye `NEW.cliente_id` /
--   `OLD.cliente_id`. La tabla `pago` NO TIENE esa columna:
--
--       pago(id, tipo, proveedor_id, monto, fecha, forma_pago_id,
--            numero_comprobante, anula_pago_id, estado, usuario_id,
--            fecha_registro)
--
-- POR QUÉ EXPLOTA Y NO ES SOLO CÓDIGO MUERTO
--   El cuerpo de una función plpgsql se compila la primera vez que se EJECUTA,
--   así que la referencia inválida no molestó mientras nadie anuló un pago.
--   Pero la ruta que la toca es la ruta normal de anulación:
--
--     INSERT INTO pago (..., anula_pago_id = <pago original>)
--       → trg_pago_anula_pago (AFTER INSERT)
--         → fn_anula_pago(): UPDATE pago SET estado = 'anulado' WHERE id = ...
--           → trg_bloquea_update_pago (BEFORE UPDATE)
--             → entra en la rama vigente → anulado
--               → evalúa NEW.cliente_id
--                 → ERROR 42703: record "new" has no field "cliente_id"
--
--   Y como el error sale de un trigger AFTER INSERT, se cae toda la
--   transacción: no queda anulado el pago original NI registrado el pago de
--   anulación. La operación devuelve 500 y no pasa nada.
--
-- EL ARREGLO
--   Sacar los dos `cliente_id` de la comparación. Nada más: la lógica de
--   inmutabilidad no cambia.
--
--   Se mantiene la lista explícita de columnas en vez de un `row(NEW.*)`
--   porque acá el punto es justamente permitir que `estado` cambie y exigir que
--   todo lo demás quede igual. (El `row(NEW.*)` de más abajo cubre el otro
--   caso: un UPDATE que no cambia absolutamente nada, que se deja pasar.)

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
$function$;


-- ---------------------------------------------------------
-- 2 · fn_ck_comprobante_no_excede — MOVIDA a la corrección 17
-- ---------------------------------------------------------
-- Acá iba la limpieza del ELSE muerto contra `comprobante_cliente`.
--
-- Se movió a `17_ctacte_proveedor.sql` §3, que reescribe esa función entera
-- para agregarle dos validaciones nuevas (comprobante anulado y Nota de
-- Crédito) además de la limpieza.
--
-- POR QUÉ SE MOVIÓ EN VEZ DE DEJARLA EN LAS DOS
--   Dos archivos con `CREATE OR REPLACE` de la misma función hacen que el
--   resultado dependa del ORDEN en que se peguen. Si alguien aplicara esta 16
--   DESPUÉS de la 17, revertiría las validaciones nuevas —volviendo a permitir
--   pagos a comprobantes anulados— sin ningún error y sin que nadie se entere.
--
--   Con la función en un solo archivo, el orden no importa.

-- ---------------------------------------------------------
-- 3 · COMMENT que describen tablas que ya no existen
-- ---------------------------------------------------------
-- Cosmético, pero los COMMENT son la documentación que viaja CON la base: el
-- que abra el esquema en seis meses los va a leer como si fueran verdad.
--
-- Los dos nombran `comprobante_cliente` y `recepcion_mercaderia`, que se
-- eliminaron (la segunda, por decisión del PO: la recepción es un movimiento
-- de stock).

COMMENT ON COLUMN pago.numero_comprobante IS
  'A diferencia de comprobante_proveedor, este número NO se autogenera por trigger: es el '
  'número de recibo/cheque/comprobante externo que trae el pago (dato provisto por el usuario '
  'o el medio de pago), no un correlativo interno.';

COMMENT ON TABLE pago_imputacion IS
  'HU-FIN-03: relación 1 a muchos entre un pago y los comprobantes de proveedor que cancela. '
  'Dos validaciones BEFORE INSERT, calculadas al vuelo con subquery (no contra una columna '
  'cacheada): (1) la suma imputada en este pago no supera pago.monto; (2) la suma imputada '
  'HISTÓRICA de este comprobante (entre todos los pagos vigentes que lo tocaron) no supera su '
  'monto_total. Un trigger adicional valida que el comprobante imputado pertenezca al mismo '
  'proveedor que pago.proveedor_id.';
