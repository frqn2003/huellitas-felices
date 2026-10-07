import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/turnos/turno.service";

/**
 * GET /api/practicas — catálogo `practica` (solo las activas).
 *
 * La `duracionMinutos` no es decorativa: el wizard calcula con ella la hora de
 * fin del turno (hora_fin = hora_inicio + duración) y el tamaño de los huecos
 * que ofrece.
 */
export const GET = withRoute(async () => {
  return ok(await service.catalogoPracticas());
});
