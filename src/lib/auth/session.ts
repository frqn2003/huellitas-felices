import { query } from "@/lib/db/client";
import { UnauthorizedError } from "@/lib/http/errors";
import { leerCookie, borrarCookie } from "./cookie";
import { invalidarToken } from "./gotrue";

/**
 * Sesión — HU-SIS-04 (login real).
 *
 * Reemplaza al stub del Sprint 1, que resolvía el usuario sin verificar nada.
 * La firma de `requireSession()` no cambió, así que los ~30 endpoints y sus
 * services siguen igual: el único archivo que sabe cómo se autentica alguien es
 * este.
 *
 * ORDEN DE RESOLUCIÓN
 *   1. Cookie firmada, escrita por POST /api/auth/login. Es el camino real.
 *   2. Fallback de desarrollo, SOLO si `SESSION_USUARIO_DNI` está en el .env.
 *
 * SOBRE EL FALLBACK (leer antes de borrarlo o antes de dejarlo)
 *   Existe para que el resto del sistema se pueda probar sin pasar por el
 *   login, y porque quitarlo de golpe rompía las 8 pantallas ya conectadas.
 *   Está atado a que la variable esté presente: es una decisión explícita de
 *   quien configura el entorno, no un comportamiento por defecto.
 *
 *   ⚠️ EL DÍA QUE EL LOGIN SE PRUEBE DE VERDAD, HAY QUE SACAR ESA LÍNEA DEL
 *      .env.local. Mientras esté, `requireSession()` nunca devuelve 401 y por
 *      lo tanto el front nunca redirige a /login: parece que el login "no hace
 *      nada". No es un bug, es esta variable.
 *
 *   El paso 3 del stub anterior —"el primer usuario activo que haya"— se
 *   eliminó. Con un login real, adivinar el usuario no es tolerancia: es un
 *   agujero que hace que cualquier request sin cookie opere como alguien.
 */

export type Session = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  /** Access token de Supabase. Solo lo usa el logout, para invalidarlo. */
  accessToken?: string;
};

let avisoFallbackImpreso = false;

type UsuarioSesionRow = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
};

const SQL_USUARIO = `
  SELECT u.id, u.nombre, u.apellido, u.email, r.nombre AS rol
  FROM usuario u
  JOIN rol r ON r.id = u.rol_id
  WHERE u.estado = 'activo'
`;

/** Devuelve la sesión, o null si no hay ninguna válida. */
export async function getSession(): Promise<Session | null> {
  // 1. Cookie firmada.
  const payload = await leerCookie();
  if (payload) {
    const [u] = await query<UsuarioSesionRow>(`${SQL_USUARIO} AND u.id = $1`, [payload.uid]);

    // La cookie es válida pero el usuario ya no: lo inactivaron o lo borraron
    // mientras tenía la sesión abierta. Se cae la sesión, que es lo correcto:
    // dar de baja a alguien tiene que echarlo, no esperar a que venza su cookie.
    if (u) return { ...aSession(u), accessToken: payload.at };
  }

  // 2. Fallback de desarrollo, solo si está declarado.
  const dni = process.env.SESSION_USUARIO_DNI;
  if (dni) {
    const [u] = await query<UsuarioSesionRow>(`${SQL_USUARIO} AND u.dni = $1`, [dni]);

    if (!avisoFallbackImpreso) {
      avisoFallbackImpreso = true;
      console.warn(
        u
          ? `[sesion] SESSION_USUARIO_DNI está puesto: TODAS las requests operan como ` +
              `${u.nombre} ${u.apellido} sin pasar por el login. Para probar HU-SIS-04, ` +
              `saca esa línea del .env.local. (Este aviso se muestra una sola vez.)`
          : `[sesion] SESSION_USUARIO_DNI="${dni}" no coincide con ningún usuario activo. ` +
              `El fallback queda sin efecto: hace falta iniciar sesión. ` +
              `(Este aviso se muestra una sola vez.)`,
      );
    }

    if (u) return aSession(u);
  }

  return null;
}

function aSession(u: UsuarioSesionRow): Session {
  return {
    usuarioId: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    rol: u.rol,
  };
}

/**
 * Igual que getSession() pero tira 401 si no hay sesión.
 *
 * El 401 ya no es "algo está mal configurado" como en el Sprint 1: ahora es la
 * respuesta normal para alguien que no inició sesión, y el front la usa para
 * redirigir a /login.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/**
 * Cierra la sesión: invalida el token en Supabase y borra la cookie.
 *
 * Los dos pasos importan y en ese orden. El criterio dice "invalidando el token
 * de acceso activo": borrar solo la cookie deja el token vivo hasta que expire.
 *
 * Si Supabase no contesta, la cookie se borra igual — que el usuario no pueda
 * salir del sistema es peor que un token que sobrevive una hora.
 */
export async function destroySession(): Promise<void> {
  const payload = await leerCookie();
  if (payload?.at) await invalidarToken(payload.at);
  await borrarCookie();
}
