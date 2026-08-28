import { cookies } from "next/headers";
import { query } from "@/lib/db/client";
import { UnauthorizedError } from "@/lib/http/errors";

/**
 * Sesión — STUB del Sprint 1.
 *
 * HU-SIS-04 (Inicio y Cierre de Sesión) NO está en el Sprint 1, pero sin
 * `usuario_id` no se puede auditar nada, y la auditoría es criterio de
 * aceptación de las 5 HU del sprint. Así que hace falta algo.
 *
 * Este stub resuelve el usuario en tres pasos, del más específico al más
 * tolerante. NO valida contraseña.
 *
 * QUÉ CAMBIA EN SPRINT 2 (HU-SIS-04): solo el cuerpo de estas funciones. La
 * firma de requireSession() se mantiene, así que ningún endpoint ni service se
 * toca. Lo que falta para el login real:
 *   · usuario.password_hash y debe_cambiar_password
 *   · POST /api/auth/login que verifique el hash y firme la cookie
 *   · firma real de la cookie con SESSION_SECRET (acá va el id en texto plano:
 *     alcanza para desarrollo, NO para producción)
 */

export type Session = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
};

const COOKIE = "huellitas_sesion";

// El aviso del fallback se imprime UNA vez por proceso, no en cada request: es
// información de configuración, no un evento que valga la pena repetir 40 veces
// por carga de pantalla.
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

/** Devuelve la sesión, o null si la base no tiene ningún usuario activo. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const valor = store.get(COOKIE)?.value;

  // 1. Cookie de sesión, si alguien ya "inició sesión".
  if (valor && Number.isInteger(Number(valor))) {
    const [u] = await query<UsuarioSesionRow>(`${SQL_USUARIO} AND u.id = $1`, [
      Number(valor),
    ]);
    if (u) return aSession(u);
  }

  // 2. El usuario semilla de .env.local, si está configurado y existe.
  const dni = process.env.SESSION_USUARIO_DNI;
  if (dni) {
    const [u] = await query<UsuarioSesionRow>(`${SQL_USUARIO} AND u.dni = $1`, [dni]);
    if (u) return aSession(u);

    if (!avisoFallbackImpreso) {
      avisoFallbackImpreso = true;
      console.warn(
        `[sesion] SESSION_USUARIO_DNI="${dni}" no coincide con ningún usuario activo. ` +
          `Usando el primer usuario activo de la base. ` +
          `(Este aviso se muestra una sola vez.)`,
      );
    }
  }

  // 3. Fallback: el primer usuario activo que haya.
  //
  // Sin esto, el stub obliga a que el DNI del .env.local coincida exactamente
  // con un registro de la base — y como cada uno puede tener datos distintos,
  // el resultado era un 401 que parecía un problema de permisos cuando en
  // realidad era de configuración.
  const [u] = await query<UsuarioSesionRow>(`${SQL_USUARIO} ORDER BY u.id LIMIT 1`);
  if (u) return aSession(u);

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
 * No recibe el `Request` porque el stub lee la cookie del store de Next. Si en
 * Sprint 2 el login real necesita headers (Authorization, X-Forwarded-For para
 * el log de accesos), se agrega el parámetro acá y en withRoute() — dos lugares.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    // Llegar acá con el fallback puesto significa una sola cosa: la tabla
    // `usuario` no tiene ni un registro activo. El mensaje lo dice, en vez de
    // dejar un 401 pelado que parece un problema de permisos.
    console.error(
      "[sesion] No hay ningún usuario activo en la base. " +
        "Corré `npm run db:seed` para cargar los usuarios de demo.",
    );
    throw new UnauthorizedError();
  }

  return session;
}

/** Cierra la sesión borrando la cookie (POST /api/auth/logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
