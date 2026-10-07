import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/turnos/turno.service";

/**
 * GET /api/profesionales — veterinarios activos con sus franjas de trabajo.
 *
 * Es el catálogo del Paso 3 del wizard de turnos. Devuelve cada profesional con
 * su lista de `franjas` (agenda_profesional), y cada franja trae el `diaSemana`
 * en ISO 8601 (1=lunes … 7=domingo), que es lo que el wizard usa para saber qué
 * fechas ofrecer.
 *
 * Reemplaza la constante `profesionales` de src/data/turnos.ts, que traía
 * franjas inventadas: elegir una de esas habría mandado un `agendaProfesionalId`
 * inexistente y el INSERT habría fallado con un 23503.
 */
export const GET = withRoute(async () => {
  return ok(await service.catalogoProfesionales());
});
