import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { cerrarConsultaSchema } from "@/modules/consultas/consulta.schema";
import * as service from "@/modules/consultas/consulta.service";

/**
 * HU-CLIN-01 — PATCH /api/consultas/:id/cerrar
 *
 * Body: campos clínicos + `insumos: [{ articuloId, cantidad }]`. Guarda todo y
 * cierra la consulta en una transacción; desde ahí es inmutable (solo notas).
 * El profesional actuante queda en la auditoría (sesión).
 */

type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, cerrarConsultaSchema);
  return ok(await service.cerrar(parseId(id), input, session.usuarioId));
});
