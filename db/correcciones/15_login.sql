-- =========================================================
-- 15 · INICIO Y CIERRE DE SESIÓN (HU-SIS-04)
-- =========================================================
--
-- POR QUÉ
--   El último criterio de aceptación de HU-SIS-04 dice: "Registra en bitácora
--   de auditoría cada intento de inicio de sesión (exitoso, fallido o
--   bloqueado) con usuario, fecha, hora e IP de origen".
--
--   La tabla `auditoria_sesion` ya existe con las columnas correctas, pero
--   HOY NO PUEDE RECIBIR NI UNA FILA:
--
--       CREATE TABLE auditoria_sesion (
--         id integer NOT NULL,      -- ← sin DEFAULT nextval(...)
--
--   La secuencia `auditoria_sesion_id_seq` existe, pero no está conectada a la
--   columna. Cualquier INSERT que no pase el `id` a mano falla con
--   "null value in column id violates not-null constraint".
--
--   Comparar con `auditoria`, que sí lo tiene:
--       id bigint DEFAULT nextval('auditoria_id_seq') NOT NULL
--   Se ve como un CREATE TABLE escrito a mano donde se olvidó el `serial`.
--
-- QUÉ HACE
--   1. Conecta la secuencia a `auditoria_sesion.id` (y la deja OWNED BY, para
--      que se borre con la tabla si algún día se borra).
--   2. Índice para la consulta "intentos fallidos recientes".
--   3. Parte `trg_auditoria_usuario` en dos, para que un login fallido no
--      escriba en la bitácora de NEGOCIO.
--   4. Corrige el COMMENT de la tabla, que describe un trigger que no existe.
--
-- QUÉ **NO** HACE
--   · No agrega `usuario.password_hash`. La autenticación es Supabase Auth:
--     la base ya se comprometió con eso (`usuario.auth_id uuid UNIQUE` → FK a
--     `auth.users`, y el trigger `handle_new_user()`). El backend verifica la
--     contraseña contra la API de Supabase Auth, no contra una columna nuestra.
--   · No toca `intentos_fallidos` ni `bloqueado_hasta`: ya están, con su CHECK.
--   · No implementa 2FA. El criterio lo marca "(para el final)" y necesita
--     tabla de secretos TOTP + códigos de recuperación. Queda para su propia HU.
--
-- CÓMO SE APLICA
--   Pegar entero en el SQL Editor de Supabase, una sola vez. Después:
--       npm run db:dump
--   y commitear el db/schema.sql actualizado.
--
--   Es idempotente: se puede volver a correr sin romper nada.
--
-- REFERENCIA
--   docs/backend/HU-SIS-04.md
-- =========================================================


-- ---------------------------------------------------------
-- 1 · auditoria_sesion.id — conectar la secuencia
-- ---------------------------------------------------------
-- Sin esto la bitácora de sesión es una tabla de solo lectura vacía.
--
-- setval() alinea la secuencia con lo que ya haya en la tabla (hoy nada, pero
-- si alguien insertó filas a mano con id explícito, el primer INSERT
-- automático chocaría contra la PK). El `false` del tercer parámetro significa
-- "el próximo nextval devuelve exactamente este valor".

ALTER SEQUENCE auditoria_sesion_id_seq OWNED BY auditoria_sesion.id;

SELECT setval(
  'auditoria_sesion_id_seq',
  COALESCE((SELECT max(id) FROM auditoria_sesion), 0) + 1,
  false
);

ALTER TABLE auditoria_sesion
  ALTER COLUMN id SET DEFAULT nextval('auditoria_sesion_id_seq');


-- ---------------------------------------------------------
-- 2 · Índice para leer la bitácora
-- ---------------------------------------------------------
-- La consulta que importa es "los intentos de tipo X más recientes" (auditar
-- fallidos y bloqueos). `idx_auditoria_sesion_fecha` ya existe pero es sobre
-- `fecha_hora` ASC y sin el evento: para "los 50 bloqueos más nuevos" obliga a
-- recorrer toda la tabla.

CREATE INDEX IF NOT EXISTS idx_auditoria_sesion_evento_fecha
  ON auditoria_sesion USING btree (evento, fecha_hora DESC);


-- ---------------------------------------------------------
-- 3 · Que un login fallido no ensucie la bitácora de negocio
-- ---------------------------------------------------------
-- PROBLEMA
--   `trg_auditoria_usuario` es AFTER INSERT OR DELETE OR UPDATE ON usuario.
--   Contar un intento fallido es un UPDATE:
--
--       UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1 ...
--
--   O sea que CADA contraseña mal tecleada escribía una fila en `auditoria` con
--   el snapshot completo del usuario en `valores_anteriores`/`valores_nuevos`
--   — además de la fila correcta en `auditoria_sesion`.
--
--   Un login fallido no es un cambio de negocio. Y la bitácora de negocio es la
--   que se consulta para "quién modificó este artículo": llenarla de intentos
--   de login la vuelve inútil justo para eso.
--
-- SOLUCIÓN
--   Dos triggers en vez de uno. El de UPDATE lleva una condición WHEN que se
--   saltea los cambios que SOLO tocan las dos columnas del login.
--
--   El truco `to_jsonb(OLD) - 'col'` devuelve el registro como jsonb sin esa
--   clave: si al quitar las dos columnas del login los dos snapshots quedan
--   idénticos, entonces el UPDATE no cambió nada más y no hay nada que auditar.
--   Es el mismo patrón que usa el trigger de inmutabilidad de movimientos.
--
--   Un cambio mixto (ej. inactivar al usuario Y resetear su contador) SÍ se
--   audita: los snapshots difieren en `estado`, que no se descuenta.
--
--   WHEN no se puede usar en un trigger que combina INSERT/DELETE/UPDATE
--   (referenciar OLD/NEW no es válido para los tres a la vez), y por eso hay
--   que partirlo, no basta con un ALTER.

DROP TRIGGER IF EXISTS trg_auditoria_usuario ON usuario;
DROP TRIGGER IF EXISTS trg_auditoria_usuario_update ON usuario;

CREATE TRIGGER trg_auditoria_usuario
  AFTER INSERT OR DELETE ON usuario
  FOR EACH ROW
  EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_usuario_update
  AFTER UPDATE ON usuario
  FOR EACH ROW
  WHEN (
       to_jsonb(OLD) - 'intentos_fallidos' - 'bloqueado_hasta'
    IS DISTINCT FROM
       to_jsonb(NEW) - 'intentos_fallidos' - 'bloqueado_hasta'
  )
  EXECUTE FUNCTION fn_auditoria();


-- ---------------------------------------------------------
-- 4 · Corregir el COMMENT de auditoria_sesion
-- ---------------------------------------------------------
-- El comentario actual dice que la tabla se alimenta "automáticamente desde
-- auth.audit_log_entries de Supabase mediante trigger (no inserción manual)".
--
-- Ese trigger no existe en la base. Y aunque se escribiera, no alcanzaría para
-- el criterio de aceptación, por dos razones:
--
--   · El evento 'bloqueado' NUNCA llega a auth.audit_log_entries. El bloqueo lo
--     aplicamos nosotros ANTES de llamar a Supabase (es lo que dice el propio
--     comentario de `usuario.bloqueado_hasta`), así que para Supabase ese
--     intento no ocurrió.
--   · Un intento con un email que no existe en `usuario` tampoco tiene a quién
--     atribuirse: va con usuario_id NULL y el email en `detalle`. Un trigger
--     sobre la tabla de auth no puede resolver eso.
--
-- La bitácora la escribe el backend, dentro de la misma transacción que cuenta
-- el intento. Eso es lo que garantiza que no exista un intento contado sin su
-- fila de bitácora.

COMMENT ON TABLE auditoria_sesion IS
  'HU-SIS-04: bitácora de intentos de inicio de sesión (login, logout, login_fallido, bloqueado). '
  'La escribe el BACKEND en POST /api/auth/login y /logout, dentro de la misma transacción que '
  'actualiza usuario.intentos_fallidos — así no puede haber un intento contado sin su fila de '
  'bitácora. Tabla aparte de `auditoria` porque un login no es un cambio de fila de una tabla de '
  'negocio: no tiene tabla ni registro_id ni operacion INSERT/UPDATE/DELETE.';

COMMENT ON COLUMN auditoria_sesion.usuario_id IS
  'NULL cuando el intento usó un email que no corresponde a ningún usuario activo. '
  'En ese caso el email va en `detalle`. No se puede exigir NOT NULL: el criterio pide registrar '
  'TODOS los intentos, y un atacante probando emails al azar es justo el que hay que registrar.';

COMMENT ON COLUMN auditoria_sesion.ip_origen IS
  'IP de origen del intento (criterio de HU-SIS-04). Sale de los headers x-forwarded-for / '
  'x-real-ip que pone el proxy. En desarrollo (next dev, sin proxy) no hay header y queda NULL.';

COMMENT ON COLUMN auditoria_sesion.detalle IS
  'Contexto del intento, en jsonb para no agregar una columna por dato: '
  '{ email } en los fallidos sin usuario, { intentos } en los fallidos con usuario, '
  '{ bloqueado_hasta } en los rechazados por bloqueo, { rol } en los exitosos.';
