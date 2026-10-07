import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarPrecioSchema, leerSujeto } from "@/modules/precios/precio.schema";
import * as service from "@/modules/precios/precio.service";

/**
 * HU-STK-03 — /api/lista-precios/:id   (:id = PK de lista_precio, no del artículo)
 */

type Params = { id: string };

/** GET — modo LECTURA de un precio. */
export const GET = withRoute<Params>(async ({ req, params }) => {
  const { id } = await params;
  const sujeto = leerSujeto(new URL(req.url).searchParams);
  return ok(await service.obtener(sujeto, parseId(id)));
});

/**
 * PATCH — modo EDICIÓN. Body: `{ precio }`.
 * El trigger de la base archiva el precio anterior en `historial_precios`.
 */
export const PATCH = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const sujeto = leerSujeto(new URL(req.url).searchParams);
  const { precio } = await parseBody(req, editarPrecioSchema);
  return ok(await service.editar(sujeto, parseId(id), precio, session.usuarioId));
});
