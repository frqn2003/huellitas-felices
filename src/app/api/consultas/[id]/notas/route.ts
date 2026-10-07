import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { created } from "@/lib/http/responses";
import { notaConsultaSchema } from "@/modules/consultas/consulta.schema";
import * as service from "@/modules/consultas/consulta.service";

/**
 * HU-CLIN-01 — POST /api/consultas/:id/notas  { nota }
 *
 * Nota aclaratoria sobre una consulta CERRADA. El profesional es el de la
 * sesión (no viaja en el body).
 */

type Params = { id: string };

export const POST = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const { nota } = await parseBody(req, notaConsultaSchema);
  return created(await service.agregarNota(parseId(id), nota, session.usuarioId));
});
