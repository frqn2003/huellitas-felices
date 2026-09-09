import { getSession } from "@/lib/auth/session";
import { withPublicRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/auth/auth.service";

/**
 * GET /api/auth/sesion — HU-SIS-04
 *
 * Lo llama el front al cargar, para saber si ya hay alguien logueado (la cookie
 * es httpOnly: el JavaScript de la página no puede leerla, tiene que preguntar).
 *
 * Va con `withPublicRoute` y llama a `getSession()` a mano en vez de usar
 * `withRoute`. La diferencia importa: acá "no hay sesión" NO es un error, es la
 * respuesta. Si usara `withRoute`, cada carga de la pantalla de login dejaría un
 * 401 en la consola del navegador y en los logs del server, y el equipo se
 * pasaría la tarde buscando un problema de permisos que no existe.
 *
 * Devuelve `{ sesion: null }` en vez de un 401 o un 204: el front distingue
 * "todavía no cargué" de "cargué y no hay nadie" sin mirar el status.
 */
export const GET = withPublicRoute(async () => {
  const session = await getSession();
  if (!session) return ok({ sesion: null });
  return ok({ sesion: await service.sesionActual(session) });
});
