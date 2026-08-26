-- =========================================================
-- 10 · UN solo catálogo de condiciones de pago
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   Hoy hay dos vocabularios para lo mismo:
--
--     tabla `forma_pago`          → Contado, Cuenta Corriente, Transferencia,
--                                   Cheque a 30 días
--     const del front             → Contado, Cta. cte. 30 días, Cta. cte. 60 días
--
--   Como `orden_compra.forma_pago_id` es una FK NOT NULL, una orden con la
--   condición que eligió el usuario no se puede guardar: ese valor no existe en
--   el catálogo. Y al revés, el select del front nunca podría mostrar
--   'Cheque a 30 días', que sí está en la base.
--
--   La const del front era andamiaje del prototipo. La lista real es esta tabla,
--   y el front la va a consumir por GET /api/condiciones-pago.
--
-- DECISIÓN DEL EQUIPO: una sola tabla, no dos
--   `forma_pago` mezcla dos ejes — CUÁNDO se paga (contado, cuenta corriente) y
--   CON QUÉ se paga (transferencia, cheque). Lo conceptualmente correcto serían
--   dos catálogos, pero eso toca el DER, la orden, la cotización y el N:M de
--   proveedores. Para el Sprint 1 se define una lista única y consistente; si
--   más adelante hace falta separarlas, se separan.
--
-- ⚠️ REQUIERE la corrección 06 aplicada (tabla `proveedor_forma_pago`).
-- =========================================================


-- ---------------------------------------------------------
-- 1. La lista definitiva
-- ---------------------------------------------------------
-- Los acentos y los puntos son parte del valor: es el texto que se muestra.
INSERT INTO forma_pago (nombre) VALUES
  ('Contado'),
  ('Cta. cte. 30 días'),
  ('Cta. cte. 60 días'),
  ('Transferencia'),
  ('Cheque a 30 días')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- 2. 'Cuenta Corriente' se retira: era ambigua
-- ---------------------------------------------------------
-- "Cuenta corriente" sin plazo no dice nada: cuenta corriente ES un plazo. Se
-- reemplaza por 'Cta. cte. 30 días', que es el plazo habitual; el proveedor que
-- tenga otro se corrige a mano desde la pantalla.
--
-- NO se borra la fila antes de mover lo que la referencia: hay FK apuntándole
-- desde proveedores y desde órdenes ya emitidas.
DO $$
DECLARE
  v_viejo int;
  v_nuevo int;
BEGIN
  SELECT id INTO v_viejo FROM forma_pago WHERE nombre = 'Cuenta Corriente';
  SELECT id INTO v_nuevo FROM forma_pago WHERE nombre = 'Cta. cte. 30 días';

  -- Si ya se corrió antes, no hay nada que migrar.
  IF v_viejo IS NULL THEN
    RAISE NOTICE 'No existe la forma de pago "Cuenta Corriente": nada que migrar.';
    RETURN;
  END IF;

  -- 2.a Proveedores (N:M). Se insertan los pares nuevos y después se borran los
  -- viejos: un UPDATE directo chocaría contra la PK compuesta si un proveedor
  -- ya tuviera las dos.
  IF to_regclass('public.proveedor_forma_pago') IS NOT NULL THEN
    INSERT INTO proveedor_forma_pago (proveedor_id, forma_pago_id)
    SELECT proveedor_id, v_nuevo
    FROM proveedor_forma_pago
    WHERE forma_pago_id = v_viejo
    ON CONFLICT DO NOTHING;

    DELETE FROM proveedor_forma_pago WHERE forma_pago_id = v_viejo;
  ELSE
    RAISE EXCEPTION
      'Falta la tabla proveedor_forma_pago: aplicá primero la corrección 06.';
  END IF;

  -- 2.b Órdenes ya emitidas. Acá sí es un UPDATE simple: cada orden tiene UNA
  -- condición de pago.
  UPDATE orden_compra SET forma_pago_id = v_nuevo WHERE forma_pago_id = v_viejo;

  -- 2.c Cotizaciones, si ya existe la tabla (corrección 09).
  IF to_regclass('public.cotizacion') IS NOT NULL THEN
    UPDATE cotizacion SET forma_pago_id = v_nuevo WHERE forma_pago_id = v_viejo;
  END IF;

  -- Recién ahora, sin nadie apuntándole.
  DELETE FROM forma_pago WHERE id = v_viejo;
END $$;


COMMENT ON TABLE forma_pago IS
  'Catalogo unico de condiciones de pago (HU-PROV-01 y HU-COMP-02). '
  'Se expone por GET /api/formas-pago y GET /api/condiciones-pago: mismo catalogo, '
  'dos preguntas distintas (que acepta un proveedor / que se pacto en una compra). '
  'El front NO debe tener su propia lista hardcodeada.';
