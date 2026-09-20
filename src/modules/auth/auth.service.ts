import { withTransaction } from "@/lib/db/tx";
import {
  CredencialesInvalidasError,
  CuentaBloqueadaError,
  ServicioAuthNoDisponibleError,
} from "@/lib/http/errors";
import { verificarCredenciales } from "@/lib/auth/gotrue";
import { escribirCookie } from "@/lib/auth/cookie";
import { destroySession, type Session } from "@/lib/auth/session";
import * as repo from "./auth.repo";
import type { LoginInput } from "./auth.schema";
import type { SesionApi, UsuarioLoginRow } from "./auth.types";

/**
 * HU-SIS-04 — Inicio y Cierre de Sesión.
 *
 * Los 5 criterios de aceptación y dónde se cumple cada uno:
 *
 *  1. "Inicia sesión con email y contraseña; si las credenciales son inválidas,
 *     muestra un mensaje de error genérico (sin indicar cuál de los dos datos
 *     falló)"
 *     → `CredencialesInvalidasError`, un solo error para los tres casos
 *       (email inexistente / contraseña mal / usuario sin cuenta de auth).
 *
 *  2. "Tras 3 intentos fallidos consecutivos, la cuenta se bloquea
 *     automáticamente por 15 minutos; se informa al usuario el tiempo restante"
 *     → `MAX_INTENTOS` / `MINUTOS_BLOQUEO` + `CuentaBloqueadaError`, que calcula
 *       los minutos que faltan.
 *
 *  3. "Cierra sesión de forma explícita, invalidando el token de acceso activo"
 *     → `logout()` → `destroySession()`, que revoca el token en Supabase antes
 *       de borrar la cookie.
 *
 *  4. "Los perfiles Administrador y Gerente deben validar un segundo factor
 *     (2FA) antes de completar el inicio de sesión. (para el final)"
 *     → FUERA DE ESTA ENTREGA por el "(para el final)" del propio criterio.
 *       `SesionApi.requiere2FA` ya viaja en la respuesta, en false.
 *
 *  5. "Registra en bitácora de auditoría cada intento de inicio de sesión
 *     (exitoso, fallido o bloqueado) con usuario, fecha, hora e IP de origen"
 *     → `repo.registrarEventoSesion()` en las CUATRO salidas del login.
 */

/** El "3 intentos" del criterio. Coincide con el CHECK 0–3 de la base. */
const MAX_INTENTOS = 3;

/** Los "15 minutos" del criterio. */
const MINUTOS_BLOQUEO = 15;

/**
 * Inicia sesión.
 *
 * ORDEN DE LOS PASOS, Y POR QUÉ ESE
 *
 *   1. Leer al usuario y ver si está bloqueado.   ← transacción corta
 *   2. Preguntarle la contraseña a Supabase.      ← llamada HTTP, sin transacción
 *   3. Contar el resultado y escribir bitácora.   ← transacción corta
 *
 * Son dos transacciones separadas con una llamada de red en el medio, a
 * propósito. Meter todo en una sola sería más simple de leer pero mantendría
 * abierta una transacción —y el lock de la fila del usuario— durante los hasta
 * 8 segundos que puede tardar Supabase. Con dos personas entrando al mismo
 * tiempo eso ya se nota; con el servicio degradado, se cae la aplicación.
 *
 * El riesgo de partirlo es que dos intentos simultáneos se pisen al contar. Se
 * resuelve en el paso 3 con un UPDATE que suma en la base
 * (`intentos_fallidos + 1`, no leer-sumar-escribir): Postgres serializa los dos
 * UPDATE sobre la misma fila y ninguno se pierde. Ver `repo.sumarIntentoFallido`.
 */
export async function login(
  input: LoginInput,
  ip: string | null,
): Promise<SesionApi> {
  // ── Paso 1 · ¿está bloqueado? ────────────────────────────────────────────
  const usuario = await repo.findUsuarioActivoPorEmail(input.email);

  if (usuario) {
    const bloqueo = bloqueoVigente(usuario);

    if (bloqueo) {
      // Un intento durante el bloqueo se registra pero NO suma al contador: si
      // sumara, insistir estiraría el castigo para siempre y la cuenta no se
      // desbloquearía nunca. Tampoco se llama a Supabase: el criterio dice que
      // el bloqueo corta el login antes de validar credenciales.
      await withTransaction((client) =>
        repo.registrarEventoSesion(client, {
          usuarioId: usuario.id,
          evento: "bloqueado",
          ip,
          detalle: { email: input.email, bloqueado_hasta: bloqueo.toISOString() },
        }),
      );
      throw new CuentaBloqueadaError(bloqueo);
    }

    // El bloqueo venció: se limpia el contador ANTES de validar. Si no, el
    // usuario sale del bloqueo con 3 intentos ya gastados y el primer error de
    // tipeo lo vuelve a bloquear 15 minutos.
    if (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta) {
      await withTransaction((client) => repo.limpiarIntentos(client, usuario.id));
      usuario.intentos_fallidos = 0;
      usuario.bloqueado_hasta = null;
    }
  }

  // ── Paso 2 · ¿es la contraseña? ──────────────────────────────────────────
  //
  // Se llama a Supabase SIEMPRE, incluso cuando el email no existe en nuestra
  // tabla y ya sabemos que el login va a fallar.
  //
  // No es un descuido: si para un email inexistente contestáramos al instante y
  // para uno existente tardáramos los ~300 ms de la llamada, la diferencia de
  // tiempo diría cuáles son los emails reales. El mensaje genérico del criterio
  // se cuidaría en el texto y se filtraría por el reloj.
  const resultado = await verificarCredenciales(input.email, input.password);

  if (!resultado.ok && resultado.motivo === "servicio") {
    // Supabase no contestó. Esto NO cuenta como intento fallido: si contara,
    // una caída del servicio de auth bloquearía por 15 minutos a todo el que
    // intente entrar mientras dura. Tampoco se registra en `auditoria_sesion`,
    // que es la bitácora de intentos de personas, no de fallas de
    // infraestructura — eso va al log del server, en gotrue.ts.
    throw new ServicioAuthNoDisponibleError();
  }

  // ── Paso 3 · contar y registrar ──────────────────────────────────────────
  return withTransaction(async (client) => {
    // 3a · Email que no existe en `usuario`.
    //
    // Puede ser un typo o alguien probando direcciones. No hay contador que
    // sumar (no hay fila), pero el intento se registra igual con usuario_id
    // NULL: el criterio pide registrar CADA intento, y este es justamente el
    // que sirve para detectar que alguien está probando.
    if (!usuario) {
      await repo.registrarEventoSesion(client, {
        usuarioId: null,
        evento: "login_fallido",
        ip,
        detalle: { email: input.email, motivo: "usuario_inexistente" },
      });
      throw new CredencialesInvalidasError();
    }

    // 3b · Contraseña incorrecta.
    if (!resultado.ok) {
      const intentos = await repo.sumarIntentoFallido(client, usuario.id);

      if (intentos >= MAX_INTENTOS) {
        const hasta = await repo.bloquear(client, usuario.id, MINUTOS_BLOQUEO);

        // Dos filas de bitácora, no una: el intento fallido y el bloqueo que
        // provocó. Son dos hechos distintos, y el criterio nombra los tres
        // eventos (exitoso, fallido, bloqueado) como cosas separadas.
        await repo.registrarEventoSesion(client, {
          usuarioId: usuario.id,
          evento: "login_fallido",
          ip,
          detalle: { intentos, motivo: "password_incorrecta" },
        });
        await repo.registrarEventoSesion(client, {
          usuarioId: usuario.id,
          evento: "bloqueado",
          ip,
          detalle: { intentos, bloqueado_hasta: hasta.toISOString() },
        });

        throw new CuentaBloqueadaError(hasta);
      }

      await repo.registrarEventoSesion(client, {
        usuarioId: usuario.id,
        evento: "login_fallido",
        ip,
        detalle: {
          intentos,
          intentos_restantes: MAX_INTENTOS - intentos,
          motivo: "password_incorrecta",
        },
      });

      // ⚠️ El error NO dice cuántos intentos quedan.
      //
      // El criterio pide un mensaje genérico, y "te queda 1 intento" ya confirma
      // que el email existe: nadie recibe ese mensaje por una dirección
      // inventada. El número queda en la bitácora, que es donde sirve.
      throw new CredencialesInvalidasError();
    }

    // 3c · Credenciales correctas.
    //
    // Un chequeo más: que el uuid que devolvió Supabase sea el de ESTE usuario.
    // `usuario.auth_id` es la única cosa que ata nuestra tabla con `auth.users`,
    // y podría no coincidir si alguien cambió un email en un lado y no en el
    // otro. Sin este control, la contraseña de una cuenta de auth podría abrir
    // la sesión de otro empleado.
    if (usuario.auth_id && usuario.auth_id !== resultado.tokens.authId) {
      console.error(
        `[auth] el usuario ${usuario.id} (${usuario.email}) tiene auth_id ` +
          `${usuario.auth_id} pero Supabase autenticó ${resultado.tokens.authId}. ` +
          `Hay un email desincronizado entre la tabla usuario y auth.users.`,
      );
      await repo.registrarEventoSesion(client, {
        usuarioId: usuario.id,
        evento: "login_fallido",
        ip,
        detalle: { motivo: "auth_id_no_coincide" },
      });
      throw new CredencialesInvalidasError();
    }

    await repo.limpiarIntentos(client, usuario.id);
    await repo.registrarEventoSesion(client, {
      usuarioId: usuario.id,
      evento: "login",
      ip,
      detalle: { rol: usuario.rol },
    });

    // La cookie se escribe DESPUÉS de la bitácora y dentro del mismo bloque:
    // si el INSERT de bitácora falla, la transacción se cae y no queda una
    // sesión abierta sin registro. Al revés —cookie primero— habría sesiones
    // que no figuran en ninguna parte, que es justo lo que el criterio evita.
    await escribirCookie(usuario.id, resultado.tokens.accessToken);

    return aSesionApi(usuario);
  });
}

/**
 * Cierra la sesión.
 *
 * Registra el evento ANTES de invalidar el token: después de `destroySession()`
 * ya no hay de quién anotar el logout.
 */
export async function logout(session: Session, ip: string | null): Promise<void> {
  await withTransaction((client) =>
    repo.registrarEventoSesion(client, {
      usuarioId: session.usuarioId,
      evento: "logout",
      ip,
    }),
  );

  await destroySession();
}

/** GET /api/auth/sesion — quién está logueado. */
export async function sesionActual(session: Session): Promise<SesionApi> {
  const usuario = await repo.findUsuarioActivoPorId(session.usuarioId);

  // La sesión existe pero el usuario ya no está activo. No debería pasar
  // (getSession() filtra por estado), pero si pasa se responde con lo que dice
  // la cookie en vez de reventar.
  if (!usuario) {
    return {
      usuarioId: session.usuarioId,
      nombre: session.nombre,
      apellido: session.apellido,
      email: session.email,
      rol: session.rol,
      requiere2FA: false,
    };
  }

  return aSesionApi(usuario);
}

/**
 * Devuelve hasta cuándo está bloqueada la cuenta, o null si no lo está.
 *
 * Compara contra la hora de Node, no de Postgres. Es una diferencia de
 * milisegundos y acá no importa: el peor caso es dejar entrar un instante antes
 * o después. Donde sí importa es al ESCRIBIR el vencimiento, y eso lo calcula
 * la base con `now()` (ver `repo.bloquear`).
 */
function bloqueoVigente(usuario: UsuarioLoginRow): Date | null {
  if (!usuario.bloqueado_hasta) return null;
  const hasta = new Date(usuario.bloqueado_hasta);
  return hasta.getTime() > Date.now() ? hasta : null;
}

function aSesionApi(usuario: UsuarioLoginRow): SesionApi {
  return {
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
    requiere2FA: false,
  };
}
