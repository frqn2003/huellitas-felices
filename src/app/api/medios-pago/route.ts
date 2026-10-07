import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/ventas/venta.service";

/**
 * HU-VTA-02 — GET /api/medios-pago
 *
 * Los medios con los que se puede cobrar una venta: efectivo, transferencia,
 * tarjeta y billetera virtual. Salen del catálogo `forma_pago` (el mismo que usan
 * las condiciones de compra), quedándose solo con los que sirven para cobrar.
 *
 * Respuesta: `[{ id, nombre, tipo }]`. El `id` es el `formaPagoId` que se manda
 * en `mediosPago` de POST /api/ventas.
 */
export const GET = withRoute(async () => {
  return ok(await service.listarMediosPago());
});
