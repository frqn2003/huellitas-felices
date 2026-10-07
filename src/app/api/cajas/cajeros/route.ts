import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerEntero } from "@/lib/http/query";
import * as service from "@/modules/cajas/caja.service";

/**
 * HU-VTA-03 — GET /api/cajas/cajeros?sucursalId=
 * Usuarios activos con rol Cajero (los de esa sucursal y los sin sucursal fija).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  return ok(await service.listarCajeros(leerEntero(sp, "sucursalId")));
});
