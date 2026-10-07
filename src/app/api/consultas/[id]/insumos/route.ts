import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/consultas/consulta.service";

/**
 * HU-CLIN-01 — GET /api/consultas/:id/insumos
 *
 * Detalle de insumos y medicamentos aplicados. Es lo que lee el módulo Caja
 * (HU-VTA-01) para liquidar la atención.
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.insumos(parseId(id)));
});
