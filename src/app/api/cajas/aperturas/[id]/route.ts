import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/cajas/caja.service";

/** HU-VTA-03 — GET /api/cajas/aperturas/:id */
type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtenerApertura(parseId(id)));
});
