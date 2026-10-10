import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerEntero } from "@/lib/http/query";
import * as service from "@/modules/dashboard/dashboard.service";

/**
 * HU-REP-01 — GET /api/dashboard/kpis
 *
 * Devuelve los 4 KPIs clave consolidados o filtrados por sucursal,
 * con la evaluación de los umbrales configurados para alertas visuales.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const sucursalId = leerEntero(sp, "sucursalId");

  return ok(await service.obtenerKPIs({ sucursalId }));
});
