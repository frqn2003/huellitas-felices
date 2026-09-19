import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEstado } from "@/lib/http/query";
import { crearClienteSchema } from "@/modules/clientes/cliente.schema";
import * as service from "@/modules/clientes/cliente.service";

/**
 * HU-CLI-01 — /api/clientes
 */

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      estado: leerEstado(sp),
    }),
  );
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearClienteSchema);
  return created(await service.crear(input, session.usuarioId));
});
