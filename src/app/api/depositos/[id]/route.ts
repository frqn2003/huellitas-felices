import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { guardarDepositoSchema } from "@/modules/stock/stock.schema";
import * as service from "@/modules/stock/stock.service";

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtenerDeposito(parseId(id)));
});

export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, guardarDepositoSchema);
  return ok(await service.editarDeposito(parseId(id), input, session.usuarioId));
});
