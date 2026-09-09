import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { EventoSesion, UsuarioLoginRow } from "./auth.types";

/**
 * HU-SIS-04 — acceso a datos del login.
 *
 * Nada de reglas acá: no decide si bloquear ni cuántos intentos van. Solo lee y
 * escribe. La regla vive en auth.service.ts.
 */

const SELECT_USUARIO = `
  SELECT u.id, u.nombre, u.apellido, u.email, u.rol_id, r.nombre AS rol,
         u.auth_id, u.intentos_fallidos, u.bloqueado_hasta
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
`;

/**
 * Busca al usuario activo por email.
 *
 * `lower(u.email) = $1` y no `u.email = $1`: el índice único de la base es
 * `uq_usuario_email_activo ON (lower(email)) WHERE estado = 'activo'`, así que
 * para la base "Carlos@x.com" y "carlos@x.com" son EL MISMO usuario. Comparar
 * sin `lower` haría que un mail con una mayúscula distinta no encuentre a nadie
 * y el intento se contara como "email inexistente" — cuando el usuario existe.
 *
 * Escribir la comparación así, además, deja que el planner use ese mismo índice.
 */
export async function findUsuarioActivoPorEmail(
  email: string,
  client?: PoolClient,
): Promise<UsuarioLoginRow | undefined> {
  const sql = `${SELECT_USUARIO} WHERE u.estado = 'activo' AND lower(u.email) = $1`;
  const filas = client
    ? (await client.query<UsuarioLoginRow>(sql, [email.toLowerCase()])).rows
    : await query<UsuarioLoginRow>(sql, [email.toLowerCase()]);
  return filas[0];
}

export async function findUsuarioActivoPorId(id: number): Promise<UsuarioLoginRow | undefined> {
  const filas = await query<UsuarioLoginRow>(
    `${SELECT_USUARIO} WHERE u.estado = 'activo' AND u.id = $1`,
    [id],
  );
  return filas[0];
}

/**
 * Suma un intento fallido y devuelve el contador resultante.
 *
 * DOS DECISIONES QUE IMPORTAN:
 *
 * 1. `intentos_fallidos + 1` se calcula EN LA BASE, no en JS. Si se leyera el
 *    valor, se sumara uno y se escribiera, dos intentos simultáneos leerían el
 *    mismo número y el segundo pisaría al primero: tres contraseñas mal
 *    tecleadas en paralelo contarían como una. Es el mismo lost update que
 *    tenía el trigger de stock viejo.
 *
 * 2. `LEAST(..., 3)` NO es un detalle cosmético. La base tiene
 *    `ck_usuario_intentos_fallidos CHECK (intentos_fallidos BETWEEN 0 AND 3)`.
 *    Sin el techo, dos fallos concurrentes partiendo de 2 dejarían uno en 3 y el
 *    otro en 4 → violación del CHECK → **500 en el login**. Con el techo, el
 *    peor caso es que el contador se quede en 3, que es exactamente cuando hay
 *    que bloquear.
 */
export async function sumarIntentoFallido(
  client: PoolClient,
  usuarioId: number,
): Promise<number> {
  const { rows } = await client.query<{ intentos_fallidos: number }>(
    `UPDATE usuario
     SET intentos_fallidos = LEAST(intentos_fallidos + 1, 3)
     WHERE id = $1
     RETURNING intentos_fallidos`,
    [usuarioId],
  );
  return rows[0]?.intentos_fallidos ?? 0;
}

/** Bloquea la cuenta N minutos y devuelve hasta cuándo. */
export async function bloquear(
  client: PoolClient,
  usuarioId: number,
  minutos: number,
): Promise<Date> {
  // El vencimiento lo calcula la base con `now()`, no JS con `new Date()`: si el
  // reloj del server de Node está corrido respecto del de Postgres, el bloqueo
  // duraría más o menos de 15 minutos, y el "tiempo restante" que se le informa
  // al usuario no coincidiría con el momento en que la base lo deja entrar.
  const { rows } = await client.query<{ bloqueado_hasta: Date }>(
    `UPDATE usuario
     SET bloqueado_hasta = now() + ($2 || ' minutes')::interval
     WHERE id = $1
     RETURNING bloqueado_hasta`,
    [usuarioId, String(minutos)],
  );
  return rows[0]!.bloqueado_hasta;
}

/**
 * Vuelve la cuenta a cero: sin intentos fallidos y sin bloqueo.
 *
 * Se llama en dos momentos: tras un login exitoso, y cuando se detecta que un
 * bloqueo ya venció (para que el próximo fallo empiece a contar de nuevo desde
 * 1 y no desde 3, que bloquearía al primer error).
 */
export async function limpiarIntentos(client: PoolClient, usuarioId: number): Promise<void> {
  await client.query(
    `UPDATE usuario
     SET intentos_fallidos = 0, bloqueado_hasta = NULL
     WHERE id = $1
       AND (intentos_fallidos <> 0 OR bloqueado_hasta IS NOT NULL)`,
    [usuarioId],
  );
  // El AND extra evita un UPDATE inútil en el caso normal (login exitoso de una
  // cuenta que nunca falló). Sin él, cada login escribe una fila y despierta al
  // trigger de auditoría para nada.
}

/**
 * Escribe una fila en la bitácora de sesión.
 *
 * Último criterio de HU-SIS-04: "Registra en bitácora de auditoría cada intento
 * de inicio de sesión (exitoso, fallido o bloqueado) con usuario, fecha, hora e
 * IP de origen".
 *
 * · `fecha_hora` la pone la base (DEFAULT now()).
 * · `usuarioId` va NULL cuando el email no corresponde a ningún usuario activo:
 *   el criterio pide registrar TODOS los intentos, y justamente el de un email
 *   inexistente es el que interesa. El email va en `detalle`.
 * · `ip` va NULL si no hay proxy que la informe (el caso de `next dev`).
 *
 * ⚠️ REQUIERE LA CORRECCIÓN 15. `auditoria_sesion.id` no tiene DEFAULT
 *    nextval() en la base: sin aplicar `db/correcciones/15_login.sql`, este
 *    INSERT falla con "null value in column id".
 */
export async function registrarEventoSesion(
  client: PoolClient,
  datos: {
    usuarioId: number | null;
    evento: EventoSesion;
    ip: string | null;
    detalle?: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO auditoria_sesion (usuario_id, evento, ip_origen, detalle)
     VALUES ($1, $2::tipo_evento_sesion, $3::inet, $4::jsonb)`,
    [
      datos.usuarioId,
      datos.evento,
      datos.ip,
      datos.detalle ? JSON.stringify(datos.detalle) : null,
    ],
  );
}
