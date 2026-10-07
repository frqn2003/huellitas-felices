import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/ventas/venta.service";

/**
 * HU-VTA-02 — GET /api/ventas/:id/cobro
 *
 * El cobro de una venta: sus medios de pago con el monto de cada uno, y la
 * bitácora de auditoría (usuario, fecha y hora, medio y monto). Solo lectura:
 * el cobro se registra junto con la venta, en POST /api/ventas.
 */
type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtenerCobro(parseId(id)));
});
