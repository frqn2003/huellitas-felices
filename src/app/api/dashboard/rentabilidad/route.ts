import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerFecha } from "@/lib/http/query";
import { ValidationError } from "@/lib/http/errors";
import { obtenerRentabilidadPorSucursal } from "@/modules/rentabilidad/rentabilidad.service";

/**
 * GET /api/dashboard/rentabilidad
 *
 * Query params:
 *  - desde: string (YYYY-MM-DD, obligatorio)
 *  - hasta: string (YYYY-MM-DD, obligatorio)
 *  - sucursales: string (IDs separados por coma, ej: "1,2")
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const desde = leerFecha(sp, "desde");
  const hasta = leerFecha(sp, "hasta");

  if (!desde || !hasta) {
    throw new ValidationError(
      "PARAMETROS_INVALIDOS",
      "Las fechas 'desde' y 'hasta' son requeridas.",
      "periodo",
    );
  }

  if (desde > hasta) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha de inicio no puede ser posterior a la fecha de fin.",
      "periodo",
    );
  }

  const sucursalesRaw = sp.get("sucursales");
  let sucursalesIds: number[] | undefined;
  if (sucursalesRaw) {
    const parsed = sucursalesRaw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (parsed.length > 0) {
      sucursalesIds = parsed;
    }
  }

  const resultado = await obtenerRentabilidadPorSucursal({
    desde,
    hasta,
    sucursalesIds,
  });

  return ok(resultado);
});
