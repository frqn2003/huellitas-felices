import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/orden.service";

/**
 * HU-COMP-02 — cancelación (src/app/ordenes-compra/page.tsx:345).
 *
 * PATCH y no DELETE: la orden no se borra, pasa a estado Cancelada y conserva
 * su historial y su número. Es lo que pide el criterio de auditoría, y evita
 * huecos en la numeración secuencial.
 *
 * El service rechaza cancelar desde un estado final (`es_final` de
 * estado_orden_compra).
 */

type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ params, session }) => {
  const { id } = await params;
  return ok(await service.cancelar(parseId(id), session.usuarioId));
});
