-- =========================================================
-- 14 · RECEPCIÓN DE MERCADERÍA (HU-COMP-03)
-- =========================================================
--
-- POR QUÉ
--   HU-COMP-03 registra la recepción parcial o total de mercadería contra una
--   Orden de Compra. Hoy la base no tiene dónde guardarla: los estados
--   'Recibida Parcial' y 'Recibida Total' están sembrados desde el Sprint 1
--   (db/seeds/01_catalogos.sql) pero son INALCANZABLES porque no existe la
--   entidad que los produce.
--
--   Además HU-PROV-04 exige que la OC vinculada a un comprobante esté en estado
--   recibida (parcial o total). Sin esto, ese módulo no tiene contra qué
--   validar.
--
-- QUÉ AGREGA
--   · 2 enums     · tipo_recepcion, tipo_observacion_recepcion
--   · 3 tablas    · recepcion_mercaderia, recepcion_mercaderia_detalle,
--                   notificacion_compra
--   · 1 secuencia · recepcion_numero_seq (numeración REC-000001)
--   · 2 triggers  · numeración + auditoría
--   · 1 seed      · estado 'Cerrada con Faltante'
--   · 1 COMMENT corregido en movimiento_stock_cab.origen_entidad_id
--
-- QUÉ **NO** TOCA
--   Ninguna tabla existente cambia de estructura. Cero riesgo para el Sprint 1.
--
-- CÓMO SE APLICA
--   Pegar entero en el SQL Editor de Supabase, una sola vez. Después:
--       npm run db:dump
--   y commitear el db/schema.sql actualizado.
--
--   Es idempotente: se puede volver a correr sin romper nada.
--
-- REFERENCIA
--   docs/backend/HU-COMP-03.md §4 (cambios en la base) y §8 (los cuatro
--   conflictos con el brief del front que este archivo resuelve del lado BD).
-- =========================================================


-- ---------------------------------------------------------
-- 1 · ENUMS
-- ---------------------------------------------------------
-- `danado` va SIN ñ a propósito: es un valor de enum (un identificador), no
-- texto de interfaz. La pantalla muestra "Dañado" y el mapeo lo hace el front
-- (OBSERVACIONES_RECEPCION en src/data/recepciones.ts).
--
-- CREATE TYPE no acepta IF NOT EXISTS, así que va envuelto en un DO.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_recepcion') THEN
    CREATE TYPE tipo_recepcion AS ENUM ('parcial', 'total');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_observacion_recepcion') THEN
    CREATE TYPE tipo_observacion_recepcion AS ENUM ('faltante', 'danado', 'error');
  END IF;
END
$$;


-- ---------------------------------------------------------
-- 2 · SECUENCIA DE NUMERACIÓN
-- ---------------------------------------------------------
-- Igual que `movimiento_numero_seq` y `orden_compra_cod_seq`: el número lo
-- genera la BASE, no la aplicación. Es lo único que garantiza que dos
-- recepciones simultáneas no compartan número.

CREATE SEQUENCE IF NOT EXISTS recepcion_numero_seq;


-- ---------------------------------------------------------
-- 3 · CABECERA · recepcion_mercaderia
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS recepcion_mercaderia (
  id                  serial       PRIMARY KEY,

  -- REC-000001. Lo pone trg_generar_numero_recepcion (BEFORE INSERT), por eso
  -- es NOT NULL aunque la aplicación nunca lo mande.
  --
  -- OJO: el brief del front numera REC-0001 (4 dígitos). La convención de esta
  -- base es LPAD(..., 6, '0') — OC-000001, MOV-000001. Se usa 6.
  numero              varchar(30)  NOT NULL,

  orden_compra_id     integer      NOT NULL,
  deposito_id         integer      NOT NULL,

  -- DERIVADO, no elegido por el usuario (decisión D-1 del doc).
  --
  -- Lo calcula el service comparando, por línea de OC, la cantidad pedida
  -- contra la suma de TODO lo recibido en TODAS las recepciones de esa orden.
  -- La columna se conserva como etiqueta histórica: "esta fue la entrega que
  -- cerró la orden". Sirve para el listado y para la auditoría.
  tipo_recepcion      tipo_recepcion NOT NULL,

  -- Quién recibió (personal de depósito). Sale de la sesión, nunca del body.
  usuario_id          integer      NOT NULL,

  fecha_hora          timestamp    NOT NULL DEFAULT now(),
  observacion_general text
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recepcion_mercaderia_numero_key') THEN
    ALTER TABLE recepcion_mercaderia
      ADD CONSTRAINT recepcion_mercaderia_numero_key UNIQUE (numero);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recepcion_mercaderia_orden_compra_id_fkey') THEN
    ALTER TABLE recepcion_mercaderia
      ADD CONSTRAINT recepcion_mercaderia_orden_compra_id_fkey
      FOREIGN KEY (orden_compra_id) REFERENCES orden_compra(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recepcion_mercaderia_deposito_id_fkey') THEN
    ALTER TABLE recepcion_mercaderia
      ADD CONSTRAINT recepcion_mercaderia_deposito_id_fkey
      FOREIGN KEY (deposito_id) REFERENCES deposito(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recepcion_mercaderia_usuario_id_fkey') THEN
    ALTER TABLE recepcion_mercaderia
      ADD CONSTRAINT recepcion_mercaderia_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES usuario(id);
  END IF;
END
$$;

-- El listado filtra por OC y ordena por fecha descendente.
CREATE INDEX IF NOT EXISTS idx_rm_orden ON recepcion_mercaderia USING btree (orden_compra_id);
CREATE INDEX IF NOT EXISTS idx_rm_fecha ON recepcion_mercaderia USING btree (fecha_hora DESC);


-- ---------------------------------------------------------
-- 4 · DETALLE · recepcion_mercaderia_detalle
-- ---------------------------------------------------------
-- El detalle apunta a `orden_compra_detalle_id`, NO a `articulo_id`. Así queda
-- anclado a la línea concreta de la orden y el acumulado de lo recibido se
-- calcula sin ambigüedad si el mismo artículo apareciera dos veces en la OC.
CREATE TABLE IF NOT EXISTS recepcion_mercaderia_detalle (
  id                      serial        PRIMARY KEY,
  recepcion_id            integer       NOT NULL,
  orden_compra_detalle_id integer       NOT NULL,

  -- ⚠️ Guarda el PENDIENTE AL MOMENTO de esta entrega, no la cantidad total de
  -- la OC (decisión D-4 del doc).
  --
  -- El total de la OC sería redundante: se recupera con un JOIN cuando se
  -- quiera. El pendiente al momento, en cambio, NO es recuperable después: una
  -- vez que entran dos recepciones más, saber qué faltaba en la primera exige
  -- reproducir toda la secuencia en orden por fecha. Eso lo convierte en un
  -- hecho histórico genuino.
  --
  -- Efecto colateral buscado: `diferencia` pasa a significar lo que uno espera
  -- —"de lo que faltaba, esto no vino"— en vez de mostrar un faltante fantasma
  -- en cada entrega parcial.
  --
  -- Lo calcula el service con la OC ya bloqueada. Lo que mande el front en este
  -- campo se descarta (mismo criterio que orden_compra.descuento).
  cantidad_solicitada     numeric(12,2) NOT NULL,

  -- Puede ser 0: "vino la entrega y de este artículo no llegó nada".
  cantidad_recibida       numeric(12,2) NOT NULL,

  -- Columna generada: no se puede insertar ni desincronizar de sus dos
  -- factores. STORED porque se filtra e indexa por ella.
  diferencia              numeric(12,2)
                          GENERATED ALWAYS AS (cantidad_solicitada - cantidad_recibida) STORED,

  -- Obligatoria si diferencia <> 0, prohibida si diferencia = 0. Esa regla se
  -- valida en el service (OBSERVACION_REQUERIDA / OBSERVACION_INVALIDA): acá
  -- solo se declara que el valor es opcional y de qué enum sale.
  observacion             tipo_observacion_recepcion,
  observacion_detalle     text
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_rmd_solicitada') THEN
    ALTER TABLE recepcion_mercaderia_detalle
      ADD CONSTRAINT ck_rmd_solicitada CHECK (cantidad_solicitada > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_rmd_recibida') THEN
    ALTER TABLE recepcion_mercaderia_detalle
      ADD CONSTRAINT ck_rmd_recibida CHECK (cantidad_recibida >= 0);
  END IF;

  -- Una línea de OC no puede aparecer dos veces en la MISMA recepción (sí en
  -- recepciones distintas: es justamente la segunda entrega parcial).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_rmd_recepcion_linea') THEN
    ALTER TABLE recepcion_mercaderia_detalle
      ADD CONSTRAINT uq_rmd_recepcion_linea UNIQUE (recepcion_id, orden_compra_detalle_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recepcion_mercaderia_detalle_recepcion_id_fkey') THEN
    ALTER TABLE recepcion_mercaderia_detalle
      ADD CONSTRAINT recepcion_mercaderia_detalle_recepcion_id_fkey
      FOREIGN KEY (recepcion_id) REFERENCES recepcion_mercaderia(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recepcion_mercaderia_detalle_ocd_fkey') THEN
    ALTER TABLE recepcion_mercaderia_detalle
      ADD CONSTRAINT recepcion_mercaderia_detalle_ocd_fkey
      FOREIGN KEY (orden_compra_detalle_id) REFERENCES orden_compra_detalle(id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_rmd_ocd
  ON recepcion_mercaderia_detalle USING btree (orden_compra_detalle_id);

-- Índice PARCIAL: solo indexa las líneas con faltante/sobrante. Es lo que hace
-- barato listar "recepciones con diferencias" sin escanear toda la tabla — la
-- gran mayoría de las líneas llegan completas y no ocupan lugar en el índice.
CREATE INDEX IF NOT EXISTS idx_rmd_con_diferencia
  ON recepcion_mercaderia_detalle USING btree (recepcion_id)
  WHERE cantidad_solicitada <> cantidad_recibida;


-- ---------------------------------------------------------
-- 5 · NOTIFICACIONES · notificacion_compra
-- ---------------------------------------------------------
-- ⚠️ El brief del front dice que esta tabla "ya existe en BD". NO existe: se
--    crea acá.
--
-- El criterio pide "notificando al responsable de compras", pero no hay tal rol
-- ni tal campo en ninguna tabla. Se usa `orden_compra.usuario_id` (decisión
-- D-3): es quien emitió la orden y por lo tanto quien tiene el contexto para
-- reclamarle al proveedor.
CREATE TABLE IF NOT EXISTS notificacion_compra (
  id                     serial       PRIMARY KEY,
  recepcion_detalle_id   integer      NOT NULL,
  usuario_responsable_id integer      NOT NULL,
  mensaje                varchar(255) NOT NULL,
  fecha_hora             timestamp    NOT NULL DEFAULT now(),
  leida                  boolean      NOT NULL DEFAULT false
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notificacion_compra_detalle_fkey') THEN
    ALTER TABLE notificacion_compra
      ADD CONSTRAINT notificacion_compra_detalle_fkey
      FOREIGN KEY (recepcion_detalle_id) REFERENCES recepcion_mercaderia_detalle(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notificacion_compra_usuario_fkey') THEN
    ALTER TABLE notificacion_compra
      ADD CONSTRAINT notificacion_compra_usuario_fkey
      FOREIGN KEY (usuario_responsable_id) REFERENCES usuario(id);
  END IF;
END
$$;

-- Parcial otra vez: la única consulta que importa es "qué tiene sin leer este
-- usuario". Las leídas no se buscan nunca y no vale la pena indexarlas.
CREATE INDEX IF NOT EXISTS idx_notif_compra_pendientes
  ON notificacion_compra USING btree (usuario_responsable_id)
  WHERE leida = false;


-- ---------------------------------------------------------
-- 6 · NUMERACIÓN AUTOMÁTICA
-- ---------------------------------------------------------
-- Clon literal de fn_generar_numero_movimiento() con el prefijo REC-.
CREATE OR REPLACE FUNCTION public.fn_generar_numero_recepcion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'REC-' || LPAD(nextval('recepcion_numero_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$
;

DROP TRIGGER IF EXISTS trg_generar_numero_recepcion ON public.recepcion_mercaderia;
CREATE TRIGGER trg_generar_numero_recepcion
  BEFORE INSERT ON public.recepcion_mercaderia
  FOR EACH ROW EXECUTE FUNCTION fn_generar_numero_recepcion();


-- ---------------------------------------------------------
-- 7 · AUDITORÍA
-- ---------------------------------------------------------
-- Criterio: "Registra en bitácora de auditoría cada recepción".
--
-- Se engancha la fn_auditoria() genérica que ya existe. La aplicación no
-- escribe en `auditoria`: solo llama a withAuditUser() al abrir la transacción
-- para que el trigger sepa QUIÉN operó. Si se olvidara, la fila queda con
-- usuario_id NULL y no sirve para auditar.
--
-- Solo AFTER INSERT: una recepción no se edita ni se borra. Si vino de más o de
-- menos, se registra otra recepción o un movimiento de ajuste — mismo criterio
-- que movimiento_stock_cab.
DROP TRIGGER IF EXISTS trg_auditoria_recepcion_mercaderia ON public.recepcion_mercaderia;
CREATE TRIGGER trg_auditoria_recepcion_mercaderia
  AFTER INSERT ON public.recepcion_mercaderia
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 8 · UN ESTADO MÁS EN EL CATÁLOGO
-- ---------------------------------------------------------
-- Resuelve el problema de LA ORDEN QUE NUNCA CIERRA: si el proveedor avisa que
-- un artículo no lo va a mandar nunca (discontinuado, sin stock), esa línea
-- queda corta para siempre y la OC se quedaría en 'Recibida Parcial'
-- eternamente. Sin una salida, en producción se juntan órdenes zombie.
--
-- Es `es_final = true`, así que puedeTransicionar() ya la trata como terminal
-- sin tocar una línea de código.
--
-- ⚠️ ALCANCE: la acción que lo usa (POST /api/ordenes-compra/:id/cerrar) queda
--    FUERA de HU-COMP-03. El estado se siembra ahora para no tener que hacer un
--    ALTER después; la acción se implementa cuando se pida.
INSERT INTO estado_orden_compra (nombre, es_final) VALUES
  ('Cerrada con Faltante', true)
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- 9 · COMENTARIOS
-- ---------------------------------------------------------
COMMENT ON TABLE recepcion_mercaderia IS
  'HU-COMP-03 cabecera. Una recepción de mercadería contra una Orden de Compra. `tipo_recepcion` es DERIVADO por el backend (D-1), no lo elige el usuario: es la etiqueta de si esta entrega cerró la orden o no.';

COMMENT ON COLUMN recepcion_mercaderia_detalle.cantidad_solicitada IS
  'PENDIENTE AL MOMENTO de esta entrega, no la cantidad total de la OC (D-4). El total de la OC se recupera con un JOIN; el pendiente al momento es un hecho histórico irrecuperable. Lo calcula el back con la OC bloqueada: lo que manda el front se descarta.';

COMMENT ON COLUMN recepcion_mercaderia_detalle.diferencia IS
  'Generada: cantidad_solicitada - cantidad_recibida. Positiva = faltó. Cada línea con diferencia <> 0 genera una fila en notificacion_compra.';

COMMENT ON TABLE notificacion_compra IS
  'HU-COMP-03. Aviso al emisor de la OC (orden_compra.usuario_id, decisión D-3) por cada línea recibida con diferencia. No existe un rol "responsable de compras" en el modelo.';

-- CORRECCIÓN del comentario existente (§8.4 del doc).
--
-- Decía `recepcion_mercaderia_detalle`, y es incorrecto: la cabecera de
-- movimiento es UNA por recepción, con varios detalles, así que apunta a
-- `recepcion_mercaderia.id`. El comentario viejo mandaba a escribir el id
-- equivocado.
COMMENT ON COLUMN movimiento_stock_cab.origen_entidad_id IS
  'Id de la entidad origen segun "origen_id": venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia (la CABECERA, no su detalle), etc.';


-- ---------------------------------------------------------
-- 10 · OPCIONAL — red de seguridad contra sobre-recepción
-- ---------------------------------------------------------
-- Queda COMENTADO: es una decisión abierta (§9 del doc).
--
-- Con el SELECT ... FOR UPDATE que toma el service alcanza para el camino de la
-- aplicación. Este trigger sería la protección para alguien escribiendo desde
-- el SQL Editor — el mismo criterio con el que este proyecto ya puso
-- ck_ficha_stock_no_negativo sobre el stock. Coherente, pero no imprescindible
-- para cerrar la HU.
--
-- Para activarlo: descomentar y volver a correr este archivo.
--
-- CREATE OR REPLACE FUNCTION public.fn_validar_sobre_recepcion()
--  RETURNS trigger
--  LANGUAGE plpgsql
-- AS $function$
-- DECLARE
--   v_pedido    numeric(12,2);
--   v_acumulado numeric(12,2);
-- BEGIN
--   SELECT cantidad INTO v_pedido
--   FROM orden_compra_detalle
--   WHERE id = NEW.orden_compra_detalle_id;
--
--   SELECT COALESCE(SUM(cantidad_recibida), 0) INTO v_acumulado
--   FROM recepcion_mercaderia_detalle
--   WHERE orden_compra_detalle_id = NEW.orden_compra_detalle_id;
--
--   IF v_acumulado > v_pedido THEN
--     RAISE EXCEPTION 'Sobre-recepcion: la linea % acumula % sobre % pedidas',
--       NEW.orden_compra_detalle_id, v_acumulado, v_pedido
--       USING ERRCODE = 'HF004';
--   END IF;
--
--   RETURN NULL;
-- END;
-- $function$
-- ;
--
-- DROP TRIGGER IF EXISTS trg_validar_sobre_recepcion ON public.recepcion_mercaderia_detalle;
-- CREATE TRIGGER trg_validar_sobre_recepcion
--   AFTER INSERT ON public.recepcion_mercaderia_detalle
--   FOR EACH ROW EXECUTE FUNCTION fn_validar_sobre_recepcion();
--
-- Si se activa, agregar el mapeo de 'HF004' en src/lib/http/errors.ts
-- (traducirErrorPostgres) para que salga como 409 SOBRE_RECEPCION y no como 500.


-- =========================================================
-- VERIFICACIÓN
-- =========================================================
-- Después de correr esto, estas tres consultas tienen que devolver filas:
--
--   SELECT table_name FROM information_schema.tables
--    WHERE table_name IN ('recepcion_mercaderia','recepcion_mercaderia_detalle','notificacion_compra');
--
--   SELECT typname FROM pg_type WHERE typname IN ('tipo_recepcion','tipo_observacion_recepcion');
--
--   SELECT nombre, es_final FROM estado_orden_compra ORDER BY id;
--   -- 6 filas, la última 'Cerrada con Faltante' / true
-- =========================================================
