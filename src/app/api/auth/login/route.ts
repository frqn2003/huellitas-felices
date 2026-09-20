import { withPublicRoute, parseBody } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ipDelRequest } from "@/lib/http/ip";
import { loginSchema } from "@/modules/auth/auth.schema";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/login — HU-SIS-04
 *
 * Va con `withPublicRoute` y no con `withRoute`: `withRoute` resuelve la sesión
 * antes de ejecutar el handler, o sea que pediría estar logueado para poder
 * loguearse.
 *
 * La IP se lee acá y se pasa al service. El service no recibe el `Request`
 * entero a propósito: si lo recibiera, tendría una excusa para leer headers y
 * tomar decisiones con ellos, y los headers de IP los puede poner el cliente.
 * Así el service solo ve un dato de contexto para la bitácora.
 *
 * La cookie la escribe el service (con `cookies()` de Next, que en un Route
 * Handler puede escribir en la respuesta). Devolvemos 200 con la sesión, no un
 * 201: no se creó un recurso.
 */
export const POST = withPublicRoute(async ({ req }) => {
  const input = await parseBody(req, loginSchema);
  return ok(await service.login(input, ipDelRequest(req)));
});
