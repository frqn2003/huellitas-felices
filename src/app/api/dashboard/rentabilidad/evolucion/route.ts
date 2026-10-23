import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerEntero, leerFecha } from "@/lib/http/query";
import { ValidationError } from "@/lib/http/errors";
import { obtenerEvolucionTemporalRentabilidad } from "@/modules/rentabilidad/rentabilidad.service";

/**
 * GET /api/dashboard/rentabilidad/evolucion
 *
 * Query params:
 *  - sucursalId: number (obligatorio)
 *  - desde: string (YYYY-MM-DD, obligatorio)
 *  - hasta: string (YYYY-MM-DD, obligatorio)
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const sucursalId = leerEntero(sp, "sucursalId");
  const desde = leerFecha(sp, "desde");
  const hasta = leerFecha(sp, "hasta");

  if (!sucursalId) {
    throw new ValidationError(
      "PARAMETROS_INVALIDOS",
      "El parámetro 'sucursalId' es requerido y debe ser un número entero válido.",
      "sucursalId",
    );
  }

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

  const resultado = await obtenerEvolucionTemporalRentabilidad({
    sucursalId,
    desde,
    hasta,
  });

  return ok(resultado);
});
