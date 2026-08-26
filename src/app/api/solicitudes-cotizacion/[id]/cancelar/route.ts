import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/cotizacion.service";

/**
 * HU-COMP-02 — PATCH /api/solicitudes-cotizacion/:id/cancelar
 *
 * Baja lógica: la solicitud queda Cancelada y conserva las cotizaciones que
 * llegaron. Sirve como registro de que se pidieron precios y se decidió no
 * comprar, que es información de compras tan válida como la compra misma.
 *
 * El service no deja cancelar una solicitud ya adjudicada: eso se hace
 * cancelando las órdenes que generó.
 */

type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ params, session }) => {
  const { id } = await params;
  return ok(await service.cancelar(parseId(id), session.usuarioId));
});
