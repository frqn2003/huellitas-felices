import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarArticuloSchema } from "@/modules/articulos/articulo.schema";
import * as service from "@/modules/articulos/articulo.service";

/**
 * HU-STK-01 — /api/articulos/:id
 *
 * En Next 16 los `params` son una Promise: hay que await-earlos.
 */

type Params = { id: string };

/** GET — modo LECTURA del formulario paramétrico. */
export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});

/** PUT — modo EDICIÓN. */
export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, editarArticuloSchema);
  return ok(await service.editar(parseId(id), input, session.usuarioId));
});

/**
 * PATCH — baja lógica.
 *
 * El front manda `{ activo: false }` (ver articulos/page.tsx). No hay DELETE:
 * el criterio dice que los registros históricos se conservan.
 */
export const PATCH = withRoute<Params>(async ({ params, session }) => {
  const { id } = await params;
  return ok(await service.desactivar(parseId(id), session.usuarioId));
});
