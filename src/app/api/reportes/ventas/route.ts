import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerEntero, leerFecha } from "@/lib/http/query";
import { ValidationError } from "@/lib/http/errors";
import * as service from "@/modules/reportes/reportes.service";

/**
 * HU-REP-02 — GET /api/reportes/ventas
 *
 * Query params:
 *   - desde (YYYY-MM-DD, obligatorio)
 *   - hasta (YYYY-MM-DD, obligatorio)
 *   - sucursalId (número opcional)
 *   - categoriaId (número opcional)
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const desde = leerFecha(sp, "desde");
  const hasta = leerFecha(sp, "hasta");

  if (!desde || !hasta) {
    throw new ValidationError(
      "FECHAS_REQUERIDAS",
      "Debe especificar los parámetros 'desde' y 'hasta' con formato válido YYYY-MM-DD.",
    );
  }

  const sucursalId = leerEntero(sp, "sucursalId");
  const categoriaId = leerEntero(sp, "categoriaId");

  const resultado = await service.obtenerReporteVentas({
    desde,
    hasta,
    sucursalId,
    categoriaId,
  });

  return ok(resultado);
});
