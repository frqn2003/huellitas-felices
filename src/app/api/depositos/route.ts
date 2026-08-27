import { withRoute, parseBody } from "@/lib/http/handler";
import { created, ok } from "@/lib/http/responses";
import { leerEntero, leerTexto } from "@/lib/http/query";
import { guardarDepositoSchema } from "@/modules/stock/stock.schema";
import * as service from "@/modules/stock/stock.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  return ok(await service.listarDepositos({
    busqueda: leerTexto(sp, "busqueda"),
    sucursalId: leerEntero(sp, "sucursalId"),
  }));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, guardarDepositoSchema);
  return created(await service.crearDeposito(input, session.usuarioId));
});
