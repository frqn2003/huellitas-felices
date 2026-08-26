/**
 * Cliente HTTP para las pantallas.
 *
 * Existe para no repetir en cada pantalla el mismo `fetch` con su `headers`,
 * su chequeo de `res.ok` y su parseo del error.
 *
 * El backend devuelve SIEMPRE el mismo shape de error (ver lib/http/errors.ts):
 *
 *   { "error": { "codigo": "NOMBRE_DUPLICADO", "mensaje": "...", "campo": "nombre" } }
 *
 * Estas funciones lo convierten en un `ApiError` que el componente puede
 * mostrar tal cual, con el mensaje que escribió el service — no un genérico
 * "algo salió mal".
 */

export class ApiError extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    readonly campo: string | undefined,
    readonly status: number,
  ) {
    super(mensaje);
    this.name = "ApiError";
  }
}

type CuerpoError = {
  error?: { codigo?: string; mensaje?: string; campo?: string };
};

async function parsear<T>(res: Response): Promise<T> {
  if (res.ok) {
    // 204 No Content no trae body: intentar parsearlo tira error.
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  let cuerpo: CuerpoError = {};
  try {
    cuerpo = (await res.json()) as CuerpoError;
  } catch {
    // Un 500 puede devolver HTML en vez de JSON; no es motivo para romper acá.
  }

  throw new ApiError(
    cuerpo.error?.codigo ?? "ERROR_DESCONOCIDO",
    cuerpo.error?.mensaje ?? `La petición falló (${res.status}).`,
    cuerpo.error?.campo,
    res.status,
  );
}

export async function apiGet<T>(url: string): Promise<T> {
  // `cache: "no-store"` para que Next no sirva una respuesta vieja: son datos
  // que cambian todo el tiempo y siempre queremos el estado actual de la base.
  const res = await fetch(url, { cache: "no-store" });
  return parsear<T>(res);
}

export async function apiSend<T>(
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parsear<T>(res);
}

/** Mensaje listo para mostrarle al usuario en un toast. */
export function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  // Falla de red: el fetch ni siquiera llegó al servidor.
  return "No se pudo conectar con el servidor. Revisá tu conexión.";
}
