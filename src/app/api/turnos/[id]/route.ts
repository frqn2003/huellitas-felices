import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/turnos/turno.service";

/**
 * HU-TUR-01 — /api/turnos/:id — el detalle del turno.
 *
 * No hay PUT ni DELETE: editar y cancelar son HU-TUR-03, y el brief lo deja
 * explícito ("el alta de turno cubre solo crear + detalle").
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});
