import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarOrdenSchema } from "@/modules/compras/orden.schema";
import * as service from "@/modules/compras/orden.service";

/**
 * HU-COMP-02 — /api/ordenes-compra/:id
 *
 * No hay DELETE: una orden emitida no se borra, se cancela (PATCH
 * /:id/cancelar). Borrarla haría desaparecer un documento que ya salió al
 * proveedor y dejaría un hueco en la numeración.
 */

type Params = { id: string };

/** GET — la orden con proveedor, usuario y detalle resueltos. */
export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});

/**
 * PUT — edición (modo EDICIÓN del formulario).
 *
 * El service rechaza la edición si la orden ya no está Pendiente. La validación
 * está en el server y no solo en la UI porque la API es alcanzable sin pasar
 * por el front.
 */
export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, editarOrdenSchema);
  return ok(await service.editar(parseId(id), input, session.usuarioId));
});
