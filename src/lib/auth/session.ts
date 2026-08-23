import { cookies } from "next/headers";
import { query } from "@/lib/db/client";
import { UnauthorizedError } from "@/lib/http/errors";

/**
 * Sesión — STUB del Sprint 1.
 *
 * HU-SIS-04 (Inicio y Cierre de Sesión) NO está en el Sprint 1, pero sin
 * usuario_id no se puede auditar nada, y la auditoría es criterio de
 * aceptación de las 5 HU del sprint. Así que hace falta algo.
 *
 * Este stub resuelve el usuario desde una cookie, y si no hay cookie cae al
 * usuario semilla de SESSION_USUARIO_DNI. No valida contraseña.
 *
 * QUÉ CAMBIA EN SPRINT 2 (HU-SIS-04): solo el cuerpo de estas funciones.
 * La firma de requireSession() se mantiene, así que ningún endpoint ni service
 * se toca. Lo que falta para el login real:
 *   · usuario.password_hash y debe_cambiar_password (previstos, comentados en 0002)
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

/** Devuelve la sesión, o null si no hay ninguna resoluble. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const valor = store.get(COOKIE)?.value;

  let filas: UsuarioSesionRow[];

  if (valor && Number.isInteger(Number(valor))) {
    filas = await query<UsuarioSesionRow>(`${SQL_USUARIO} AND u.id = $1`, [Number(valor)]);
  } else {
    // Fallback de desarrollo: el usuario semilla de .env.local
    const dni = process.env.SESSION_USUARIO_DNI;
    if (!dni) return null;
    filas = await query<UsuarioSesionRow>(`${SQL_USUARIO} AND u.dni = $1`, [dni]);
  }

  const u = filas[0];
  if (!u) return null;

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
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Cierra la sesión borrando la cookie (POST /api/auth/logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
