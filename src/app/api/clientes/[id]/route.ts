import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarClienteSchema } from "@/modules/clientes/cliente.schema";
import * as service from "@/modules/clientes/cliente.service";

/**
 * HU-CLI-01 — /api/clientes/:id
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});

export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, editarClienteSchema);
  return ok(await service.editar(parseId(id), input, session.usuarioId));
});
