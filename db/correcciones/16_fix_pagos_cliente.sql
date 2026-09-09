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
--   2. 🟠 `fn_ck_comprobante_no_excede` — rama muerta contra `comprobante_cliente`.
--   3. ⚪ dos COMMENT que describen tablas borradas.
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
-- 2 · fn_ck_comprobante_no_excede — rama muerta
-- ---------------------------------------------------------
-- EL BUG
--   La función abre con `IF NEW.comprobante_proveedor_id IS NOT NULL THEN ...
--   ELSE ...`, y el ELSE consulta `comprobante_cliente` y
--   `pi.comprobante_cliente_id`: una tabla y una columna que no existen.
--
-- POR QUÉ IMPORTA AUNQUE PAREZCA INALCANZABLE
--   Existe `ck_pi_solo_comprobante_proveedor CHECK (comprobante_proveedor_id
--   IS NOT NULL)`, así que "el ELSE nunca corre" parece razonable. No lo es:
--   los triggers BEFORE INSERT se ejecutan ANTES de validar los CHECK. Un
--   INSERT con `comprobante_proveedor_id = NULL` entra al ELSE y devuelve
--   `42P01: relation "comprobante_cliente" does not exist` — un 500 confuso —
--   en vez del 23514 limpio del CHECK, que el backend ya traduce a un 422.
--
-- EL ARREGLO
--   Borrar la rama. El comprobante siempre es de proveedor.
--
--   Se conserva textual el comentario sobre el orden de locks: es lo que
--   explica por qué estos dos triggers no se deadlockean entre sí, y es
--   exactamente el tipo de razonamiento que se pierde en una reescritura.

CREATE OR REPLACE FUNCTION public.fn_ck_comprobante_no_excede()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_monto_total  decimal(12,2);
  v_imputado     decimal(12,2);
BEGIN
  -- Mismo motivo que en fn_ck_suma_imputada: FOR UPDATE evita que dos
  -- imputaciones concurrentes sobre el mismo comprobante lean la suma
  -- histórica antes de que la otra haga commit.
  -- Nota de orden de locks: este trigger (trg_ck_comprobante_no_excede)
  -- se dispara antes que trg_ck_suma_imputada por orden alfabético del
  -- nombre, así que SIEMPRE se bloquea primero comprobante y después
  -- pago, en todas las transacciones — mismo orden en cualquier INSERT
  -- concurrente, lo que evita un deadlock cruzado entre ambos locks.
  SELECT monto_total INTO v_monto_total
  FROM comprobante_proveedor WHERE id = NEW.comprobante_proveedor_id
  FOR UPDATE;

  SELECT COALESCE(SUM(pi.monto_imputado), 0) INTO v_imputado
  FROM pago_imputacion pi
  JOIN pago p ON p.id = pi.pago_id
  WHERE pi.comprobante_proveedor_id = NEW.comprobante_proveedor_id
    AND p.estado = 'vigente';

  IF v_imputado + NEW.monto_imputado > v_monto_total THEN
    RAISE EXCEPTION 'La suma imputada histórica (%) supera el monto_total del comprobante (%)',
      v_imputado + NEW.monto_imputado, v_monto_total;
  END IF;

  RETURN NEW;
END;
$function$;


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
