import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/comprobantes/comprobante.service";

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  const comprobante = await service.obtenerPorId(parseId(id));
  return ok(comprobante);
});
