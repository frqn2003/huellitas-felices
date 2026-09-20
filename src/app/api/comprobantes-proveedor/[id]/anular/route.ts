import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { anularComprobanteSchema } from "@/modules/comprobantes/comprobante.schema";
import * as service from "@/modules/comprobantes/comprobante.service";

type Params = { id: string };

export const POST = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, anularComprobanteSchema);
  const resultado = await service.anular(parseId(id), input, session.usuarioId);
  return ok(resultado);
});
