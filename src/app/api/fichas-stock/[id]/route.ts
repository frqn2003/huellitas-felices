import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarFichaStockSchema } from "@/modules/stock/stock.schema";
import * as service from "@/modules/stock/stock.service";

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtenerFicha(parseId(id)));
});

export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, editarFichaStockSchema);
  return ok(await service.editarFicha(parseId(id), input, session.usuarioId));
});
