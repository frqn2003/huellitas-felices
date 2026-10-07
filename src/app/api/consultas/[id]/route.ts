import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/consultas/consulta.service";

/** HU-CLIN-01 — GET /api/consultas/:id  (:id = PK de consulta_medica) */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});
