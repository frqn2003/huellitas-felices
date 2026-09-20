import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/turnos/turno.service";

/**
 * GET /api/estados-turno — catálogo `estado_turno`.
 *
 * Es una TABLA, no un enum: los badges y el filtro de estado se poblan desde
 * acá. `es_final` dice si el estado admite transiciones (lo usa HU-TUR-02).
 */
export const GET = withRoute(async () => {
  return ok(await service.catalogoEstados());
});
