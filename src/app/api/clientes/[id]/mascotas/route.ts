import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/clientes/cliente.service";

/**
 * HU-CLI-01 — /api/clientes/:id/mascotas
 * Lista de mascotas de un cliente (para el modo LECTURA / Ver cliente).
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtenerMascotas(parseId(id)));
});
