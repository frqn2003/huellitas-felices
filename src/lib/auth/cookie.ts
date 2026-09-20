import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Cookie de sesión firmada (HU-SIS-04).
 *
 * QUÉ GUARDA
 *   El id del usuario, cuándo vence, y el access token de Supabase (que hace
 *   falta para poder invalidarlo en el logout).
 *
 * POR QUÉ FIRMADA Y NO SOLO httpOnly
 *   httpOnly evita que el JavaScript de la página la lea. No evita que alguien
 *   la edite: el navegador es del usuario y una cookie es texto que él controla.
 *   Sin firma, cambiar `{"uid":4}` por `{"uid":1}` es hacerse administrador.
 *   El stub del Sprint 1 guardaba el id en texto plano — servía para desarrollo
 *   y no para esto.
 *
 * POR QUÉ HMAC Y NO UN JWT PROPIO
 *   Un JWT tiene sentido cuando el token cruza sistemas que no comparten el
 *   secreto. Acá la firma la pone y la valida el mismo proceso: HMAC-SHA256 con
 *   `node:crypto` hace exactamente lo mismo, sin dependencias y sin la lista de
 *   errores clásicos de JWT (alg=none, confusión HS/RS).
 *
 * FORMATO
 *   <payload en base64url>.<hmac en base64url>
 */

const NOMBRE_COOKIE = "huellitas_sesion";

/** 8 horas: un turno de trabajo. Vencida, hay que volver a entrar. */
const DURACION_MS = 8 * 60 * 60 * 1000;

export type PayloadSesion = {
  /** `usuario.id` — el de NUESTRA tabla, no el uuid de auth.users. */
  uid: number;
  /** Vencimiento, epoch en milisegundos. */
  exp: number;
  /** Access token de Supabase, para poder invalidarlo al cerrar sesión. */
  at: string;
};

function leerSecreto(): string {
  const secreto = process.env.SESSION_SECRET;

  if (!secreto || secreto.length < 16) {
    throw new Error(
      "Falta SESSION_SECRET (o es demasiado corto) y sin eso la cookie de sesión no se puede firmar.\n" +
        "Agregá a .env.local una cadena larga y aleatoria, por ejemplo:\n" +
        '  SESSION_SECRET=' +
        "$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")\n" +
        "Si cambia el secreto, todas las sesiones abiertas dejan de valer (es lo esperado).",
    );
  }

  return secreto;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function firmar(payloadCodificado: string): string {
  return base64url(createHmac("sha256", leerSecreto()).update(payloadCodificado).digest());
}

/** Serializa y firma. */
export function serializar(payload: PayloadSesion): string {
  const codificado = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${codificado}.${firmar(codificado)}`;
}

/**
 * Verifica la firma y el vencimiento. Devuelve null ante cualquier problema:
 * una cookie manipulada, vencida o vieja (firmada con otro secreto) es
 * simplemente "no hay sesión", no un error que valga la pena distinguir.
 */
export function deserializar(valor: string): PayloadSesion | null {
  const punto = valor.lastIndexOf(".");
  if (punto <= 0) return null;

  const codificado = valor.slice(0, punto);
  const firmaRecibida = valor.slice(punto + 1);

  // timingSafeEqual exige el mismo largo, así que la comparación de longitud va
  // primero. Comparar con === filtraría, por el tiempo que tarda en cortar, en
  // qué carácter difiere la firma.
  const firmaEsperada = firmar(codificado);
  if (firmaRecibida.length !== firmaEsperada.length) return null;
  if (!timingSafeEqual(Buffer.from(firmaRecibida), Buffer.from(firmaEsperada))) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(codificado, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as { uid?: unknown; exp?: unknown; at?: unknown };

  if (
    !Number.isInteger(p.uid) ||
    (p.uid as number) <= 0 ||
    typeof p.exp !== "number" ||
    typeof p.at !== "string"
  ) {
    return null;
  }

  if (p.exp <= Date.now()) return null;

  return { uid: p.uid as number, exp: p.exp, at: p.at };
}

/** Escribe la cookie tras un login exitoso. */
export async function escribirCookie(usuarioId: number, accessToken: string): Promise<void> {
  const store = await cookies();

  store.set(NOMBRE_COOKIE, serializar({ uid: usuarioId, exp: Date.now() + DURACION_MS, at: accessToken }), {
    httpOnly: true,
    // `lax` y no `strict`: con `strict` el navegador no manda la cookie cuando
    // se llega al sistema desde un link externo, y el usuario aterriza
    // "deslogueado" aunque su sesión esté viva.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(DURACION_MS / 1000),
  });
}

/** Lee y valida la cookie. null si no hay, está vencida o fue manipulada. */
export async function leerCookie(): Promise<PayloadSesion | null> {
  const store = await cookies();
  const valor = store.get(NOMBRE_COOKIE)?.value;
  return valor ? deserializar(valor) : null;
}

export async function borrarCookie(): Promise<void> {
  const store = await cookies();
  store.delete(NOMBRE_COOKIE);
}
