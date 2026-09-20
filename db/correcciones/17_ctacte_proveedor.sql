-- =========================================================
-- 17 · CUENTA CORRIENTE DE PROVEEDORES (HU-FIN-02)
-- =========================================================
--
-- POR QUÉ
--   HU-FIN-02 pide cuatro cosas, y la base hoy impide cumplir dos:
--
--     "Alerta visualmente sobre comprobantes próximos a vencer o vencidos"
--       → `estado_vencimiento` NO mira el saldo: una factura PAGADA y vencida
--         figura 'vencido'. La pantalla la pinta en rojo y el total de vencido
--         sale inflado.
--
--     "Registra los pagos realizados a cada comprobante"
--       → los cuatro triggers de `pago_imputacion` levantan P0001 pelado, que
--         el backend traduce a "La operación fue rechazada por una regla de la
--         base de datos". Sin decir cuál regla, ni qué línea, ni qué monto.
--
--   Y de paso tapa un agujero que apareció revisando esos triggers (§3).
--
-- QUÉ HACE
--   1. La vista pasa a emitir los CINCO estados del dominio, en hora argentina,
--      y agrega `dias_para_vencer`.
--   1.bis 🔴 La vista DEJA DE FILTRAR `estado = 'vigente'`. Con el estado
--      `pagado` que se agregó el 09/09, ese filtro hacía que pagar un
--      comprobante lo BORRARA de la cuenta corriente. Ver la nota de §1.bis.
--   2. `fn_ck_suma_imputada` y `fn_ck_pi_mismo_tercero` levantan SQLSTATE propio.
--   3. 🔴 `fn_ck_comprobante_no_excede` rechaza imputar a un comprobante que no
--      esté vigente (anulado o pagado) o a una NOTA DE CRÉDITO. Hoy las dos
--      cosas se aceptan.
--   4. COMMENT sobre `proveedor.saldo_actual`, que está muerta.
--
-- ESCRITA CONTRA EL DUMP DEL 2026-09-09
--   Ese dump trajo tres cosas de la DBA que esta corrección tiene en cuenta:
--     · el valor `pagado` en el enum `estado_documento`
--     · el trigger `fn_actualiza_estado_comprobante_por_pago`, que marca el
--       comprobante como pagado cuando su saldo llega a cero
--     · la corrección 16 ya aplicada (fn_bloquea_update_pago sin `cliente_id`)
--
-- CÓMO SE APLICA
--   Pegar entero en el SQL Editor de Supabase, una sola vez. Después:
--       npm run db:dump
--   y commitear el db/schema.sql actualizado.
--
--   Es idempotente y NO depende de la 15.
--
--   ⚠️ Reemplaza a la §2 de `16_fix_pagos_cliente.sql`, que también tocaba
--      `fn_ck_comprobante_no_excede`. Esa sección se quitó de la 16 para que el
--      orden de aplicación no importe: si se pegara la 16 DESPUÉS de esta,
--      revertiría las validaciones nuevas sin que nadie se entere.
--
-- REFERENCIA
--   docs/backend/HU-FIN-02.md
-- =========================================================


-- ---------------------------------------------------------
-- 1 · La vista: cinco estados, hora argentina, días para vencer
-- ---------------------------------------------------------
-- CAMBIO 1 · `estado_vencimiento` → `estado_vencimiento`, de 3 valores a 5.
--
--   Antes: vencido | por_vencer | vigente
--   Ahora: credito | saldado | vencido | por_vencer | pendiente
--
--   El front ya habla esos cinco (EstadoCtaCte en src/data/cuentas-corrientes.ts).
--   Con tres, el backend tendría que derivar `saldado` y `credito` mirando el
--   saldo por su cuenta, y la definición de "en qué estado está este
--   comprobante" quedaría partida entre la vista y el mapper.
--
--   EL ORDEN DEL CASE IMPORTA: `credito` va PRIMERO. Una Nota de Crédito
--   vencida es crédito a favor, no deuda vencida — si se evaluara la fecha
--   antes, saldría en rojo como si le debiéramos algo al proveedor.
--
-- CAMBIO 2 · el nombre de la columna NO cambia.
--
--   Se evaluó renombrarla a `estado_cuenta`, porque `credito` y `saldado` no
--   son estados de vencimiento: describen la CUENTA, no la fecha. El nombre
--   queda impreciso y eso se paga en lectura futura — por eso el COMMENT de
--   la vista lo aclara.
--
--   Se descartó el rename por dos motivos:
--
--   · Esta vista la escribió la DBA. Renombrarle una columna significa que, si
--     ella regenera la vista desde su propia fuente, vuelve el nombre viejo y
--     rompe el backend sin que nadie se entere. Menos fricción con quien es
--     dueño del objeto.
--
--   · El argumento de "que falle fuerte si no se aplica esta corrección" ya lo
--     cubre `dias_para_vencer`, que es una columna NUEVA: sin la corrección,
--     `SELECT dias_para_vencer` explota con 42703 y responses.ts loguea "revisá
--     si falta aplicar alguna corrección". Las DOS consultas del módulo la
--     seleccionan, justamente para eso.
--
-- CAMBIO 3 · la fecha se toma en hora ARGENTINA, no en la del servidor.
--
--   Supabase corre en UTC. `CURRENT_DATE` entre las 21:00 y las 00:00 de
--   Argentina ya devuelve el día siguiente, así que un comprobante que vence
--   HOY figura vencido tres horas antes. Para una HU cuyo criterio es "alertar
--   sobre vencidos", es un falso positivo diario — y justo en el horario en que
--   nadie lo está mirando.
--
-- CAMBIO 4 · `dias_para_vencer` como columna.
--
--   Así el front muestra "vence en 3 días" sin volver a restar fechas, y el
--   `DIAS_ALERTA_PROXIMO_VENCER = 7` que tiene hardcodeado deja de ser lógica
--   duplicada del '7 days' de acá abajo.

CREATE OR REPLACE VIEW vista_cuenta_corriente_proveedor AS
WITH hoy AS (
  SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS d
)
SELECT
    cp.id AS comprobante_id,
    cp.proveedor_id,
    cp.letra,
    cp.punto_venta,
    cp.numero_comprobante,
    cp.letra || ' ' || cp.punto_venta || '-' || cp.numero_comprobante AS numero_completo,
    tc.nombre AS tipo_comprobante,
    tc.afecta_saldo,
    cp.fecha_emision,
    cp.fecha_vencimiento,
    cp.monto_total * tc.afecta_saldo::numeric AS monto_signado,
    COALESCE(pi.monto_pagado, 0::numeric) AS monto_pagado,
    (cp.monto_total * tc.afecta_saldo::numeric) - COALESCE(pi.monto_pagado, 0::numeric)
      AS saldo_pendiente,

    -- Negativo = ya venció. El front lo muestra como "vence en N días".
    (cp.fecha_vencimiento - h.d) AS dias_para_vencer,

    CASE
      -- Crédito primero: una NC vencida sigue siendo crédito, no deuda vencida.
      WHEN (cp.monto_total * tc.afecta_saldo::numeric)
           - COALESCE(pi.monto_pagado, 0::numeric) < 0 THEN 'credito'
      WHEN (cp.monto_total * tc.afecta_saldo::numeric)
           - COALESCE(pi.monto_pagado, 0::numeric) = 0 THEN 'saldado'
      WHEN cp.fecha_vencimiento < h.d                    THEN 'vencido'
      WHEN cp.fecha_vencimiento <= h.d + 7               THEN 'por_vencer'
      ELSE 'pendiente'
    -- OJO: el nombre habla de vencimiento pero los dos primeros valores
    -- (credito, saldado) describen el SALDO. Se conservó el nombre original de
    -- la DBA a propósito; ver CAMBIO 2 arriba y el COMMENT de la vista.
    END AS estado_vencimiento

FROM comprobante_proveedor cp
JOIN tipo_comprobante tc ON tc.id = cp.tipo_comprobante_id
CROSS JOIN hoy h
LEFT JOIN (
    SELECT pi_1.comprobante_proveedor_id,
           SUM(pi_1.monto_imputado) AS monto_pagado
    FROM pago_imputacion pi_1
    JOIN pago p ON p.id = pi_1.pago_id
    WHERE p.estado = 'vigente'::estado_documento
      AND pi_1.comprobante_proveedor_id IS NOT NULL
    GROUP BY pi_1.comprobante_proveedor_id
) pi ON pi.comprobante_proveedor_id = cp.id
-- 🔴 CAMBIO IMPORTANTE: antes era `= 'vigente'`. Ver la nota de abajo.
WHERE cp.estado <> 'anulado'::estado_documento;

-- ---------------------------------------------------------
-- 1.bis · 🔴 POR QUÉ LA VISTA YA NO FILTRA `estado = 'vigente'`
-- ---------------------------------------------------------
-- El dump del 2026-09-09 agregó un tercer valor al enum `estado_documento`
-- (`pagado`) y un trigger nuevo, `fn_actualiza_estado_comprobante_por_pago`,
-- que pasa el comprobante de 'vigente' a 'pagado' apenas su saldo llega a cero.
--
-- Con el filtro viejo (`= 'vigente'`) eso tenía una consecuencia que rompe la HU:
--
--   PAGAR UN COMPROBANTE LO HACÍA DESAPARECER DE LA CUENTA CORRIENTE.
--
-- El comprobante salía de la vista en el mismo instante en que se terminaba de
-- pagar, y con él se iba su historial: el usuario registraba el pago y el
-- renglón se esfumaba de la pantalla, justo después de la operación que acababa
-- de hacer. Y el criterio de HU-FIN-02 pide poder ver los pagos imputados a cada
-- comprobante.
--
-- Además dejaba INALCANZABLE el estado `saldado` de este mismo CASE: ningún
-- comprobante con saldo 0 llegaba a la vista para que se lo etiquetara así.
--
-- Con `<> 'anulado'`, un comprobante pagado sigue apareciendo con saldo 0 y
-- estado `saldado`, que es lo que hay que ver. Los anulados siguen afuera: esos
-- sí dejaron de existir a efectos de la cuenta.
--
-- El trigger nuevo no se rompe: su UPDATE tiene `AND estado = 'vigente'`, así
-- que sobre un comprobante ya marcado no hace nada.
--
-- ⚠️ QUEDA UN BUG ABIERTO, DE HU-FIN-03: anular un pago devuelve el saldo del
--    comprobante, pero NADIE lo saca de 'pagado'. El comprobante queda marcado
--    como pagado con saldo positivo. Con esta vista al menos se sigue viendo (y
--    su `estado_vencimiento` dirá 'vencido' o 'pendiente', que es lo correcto); con
--    el filtro viejo habría desaparecido con la deuda adentro. La anulación
--    tiene que revertir el estado, y eso es alcance de HU-FIN-03.

COMMENT ON VIEW vista_cuenta_corriente_proveedor IS
  'HU-FIN-02: un renglón por comprobante NO ANULADO de proveedor, con su saldo y su estado. '
  'Incluye los que estan en estado ''pagado'': si se filtraran, pagar un comprobante lo haria '
  'desaparecer de la cuenta corriente junto con su historial de pagos. '
  'Solo descuenta imputaciones de pagos vigentes: anular un pago devuelve el saldo solo. '
  'OJO CON estado_vencimiento: el nombre es historico y quedo corto. Devuelve CINCO valores '
  '(credito, saldado, vencido, por_vencer, pendiente) y mira el SALDO ademas de la fecha, asi '
  'que describe el estado de la CUENTA. Antes miraba solo la fecha, y por eso una factura ya '
  'pagada y vencida figuraba vencida. '
  'El saldo de un proveedor es SUM(saldo_pendiente) — neto, porque las Notas de Crédito '
  'entran con monto_signado negativo (tipo_comprobante.afecta_saldo = -1). '
  'OJO: un proveedor SIN comprobantes no aparece acá. Para el listado de cuentas corrientes '
  'hay que hacer proveedor LEFT JOIN esta vista, o los proveedores en cero desaparecen.';


-- ---------------------------------------------------------
-- 2 · SQLSTATE propios para los triggers de imputación
-- ---------------------------------------------------------
-- EL PROBLEMA
--   Los cuatro triggers de `pago_imputacion` levantan P0001 (el default de
--   RAISE EXCEPTION). En src/lib/http/errors.ts, un P0001 que no diga "stock
--   insuficiente" cae en el catch-all:
--
--     BusinessRuleError("REGLA_RECHAZADA",
--                       "La operación fue rechazada por una regla de la base de datos.")
--
--   O sea que imputar $10.000 a una factura con $5.000 de saldo le contesta al
--   usuario esa frase. Sin el número, sin el comprobante, sin decir cuál de las
--   tres imputaciones falló. El criterio "registra los pagos realizados a cada
--   comprobante" no se cumple con ese mensaje.
--
-- LA SOLUCIÓN
--   Mismo patrón que ya usa el proyecto para el stock (HF001/HF002/HF003):
--   cada regla levanta su propio SQLSTATE y el backend lo traduce a un mensaje
--   concreto. No es duplicar la regla —sigue viviendo acá, en un solo lugar—:
--   es ponerle nombre.
--
--   Matchear por el texto en castellano sería lo frágil: cambia una tilde y se
--   rompe el mapeo sin que falle ningún test.
--
--     HF010  la suma imputada supera el monto del pago
--     HF011  lo imputado supera el monto del comprobante
--     HF012  el comprobante es de otro proveedor
--     HF013  se intenta imputar a una Nota de Crédito
--     HF014  se intenta imputar a un comprobante anulado

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
$function$;


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
$function$;


-- ---------------------------------------------------------
-- 3 · 🔴 El agujero: se puede pagar un comprobante ANULADO
-- ---------------------------------------------------------
-- EL BUG
--   NINGÚN trigger mira `comprobante_proveedor.estado`. `fn_ck_pi_mismo_tercero`
--   compara solo `proveedor_id`; esta función leía solo `monto_total`.
--
--   Y la vista SÍ filtra `WHERE cp.estado = 'vigente'`. La combinación es lo
--   feo: la plata entra a `pago_imputacion`, queda auditada como legítima, y
--   DESAPARECE DE LA PANTALLA. Un pago fantasma sin traza visible.
--
--   No es teórico. `comprobante_proveedor` se anula con un trigger interno
--   (fn_anula_comprobante_proveedor), así que un comprobante puede pasar a
--   'anulado' entre que el usuario abre el modal y confirma el pago.
--
-- EL SEGUNDO BUG: imputar a una NOTA DE CRÉDITO
--   Una NC del proveedor REDUCE lo que le debemos; no se le paga a una NC. Y el
--   crédito ya está aplicado sin imputación alguna, porque el saldo del
--   proveedor es la suma de `monto_signado` y la NC entra negativa.
--
--   Hoy la base lo permite: esta función compara contra `monto_total`, que es
--   positivo, mientras `monto_signado` es negativo. Imputar $500 a una NC de
--   $1.000 deja el saldo en -1.500: PAGAR AGRANDA LA DEUDA.
--
--   Prohibirlo no pierde funcionalidad, solo cierra una vía de doble conteo. Si
--   algún día hace falta APLICAR una NC contra una factura, eso es una
--   compensación —otra operación, con su propia tabla—, no un `pago`.
--
-- POR QUÉ ACÁ Y NO EN EL SERVICE
--   Esta función ya tiene el SELECT ... FOR UPDATE sobre comprobante_proveedor:
--   un solo lock, tres validaciones. Y un trigger cubre también los seeds, el
--   SQL Editor y el próximo endpoint que alguien escriba — el service solo
--   cubriría POST /api/pagos. Es el mismo argumento que ya está escrito para
--   fn_actualizar_stock_det().
--
-- (De paso se va el ELSE contra `comprobante_cliente`, tabla que no existe.)

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
$function$;


-- ---------------------------------------------------------
-- 4 · proveedor.saldo_actual está muerta
-- ---------------------------------------------------------
-- La columna existe (numeric(12,2) NOT NULL DEFAULT 0) y NINGÚN trigger la
-- mantiene: está siempre en 0.
--
-- El brief del front (docs/briefs/HU-FIN-02.md) dice tres veces
-- "Deuda Total = proveedor.saldo_actual", así que alguien la va a leer y va a
-- mostrar $0 para todos los proveedores. El brief también se corrige.
--
-- No se dropea, por la regla que el equipo acordó: lo que está y no se usa se
-- documenta, no se borra. Un COMMENT es lo que viaja CON la base y lo que va a
-- leer el que abra el esquema dentro de seis meses.

COMMENT ON COLUMN proveedor.saldo_actual IS
  'SIN USO — no la leas. Ningún trigger la mantiene, así que vale 0 para todos los '
  'proveedores. El saldo real se deriva: SUM(saldo_pendiente) de '
  'vista_cuenta_corriente_proveedor para ese proveedor. Se conserva la columna porque '
  'dropearla es irreversible y el día que se quiera un saldo cacheado (con su trigger) '
  'ya está el lugar.';
