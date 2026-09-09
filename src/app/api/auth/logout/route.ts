import { withRoute } from "@/lib/http/handler";
import { noContent } from "@/lib/http/responses";
import { ipDelRequest } from "@/lib/http/ip";
import * as service from "@/modules/auth/auth.service";

/**
 * POST /api/auth/logout — HU-SIS-04
 *
 * Sí lleva `withRoute`: para cerrar una sesión hay que tener una. Sin sesión
 * devuelve 401, que es correcto — no hay nada que cerrar ni a quién anotarle el
 * evento en la bitácora.
 *
 * POST y no GET porque tiene efecto: un GET lo podría disparar un prefetch del
 * navegador o una imagen, y el usuario quedaría deslogueado sin haber pedido nada.
 */
export const POST = withRoute(async ({ req, session }) => {
  await service.logout(session, ipDelRequest(req));
  return noContent();
});
