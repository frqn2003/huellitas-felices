import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/recepcion.service";

/**
 * HU-COMP-03 — /api/recepciones/:id
 *
 * Solo GET, y es a propósito: una recepción no se edita ni se borra.
 *
 * Es un hecho físico asentado —"esto llegó al depósito este día"— y además ya
 * movió el stock. Editarla dejaría el inventario mintiendo y el número emitido
 * con un hueco. Si vino de más o de menos, se registra otra recepción o un
 * movimiento de ajuste. Mismo criterio que `movimiento_stock_cab`, que tiene un
 * trigger de inmutabilidad, y que las órdenes de compra, que se cancelan en vez
 * de borrarse.
 */

type Params = { id: string };

/** GET — cabecera + detalle resuelto, para el modal de solo lectura. */
export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});
