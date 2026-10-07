import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/ventas/venta.service";

/** HU-VTA-01 — GET /api/ventas/:id */
type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});
