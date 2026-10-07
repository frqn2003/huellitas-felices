import { withRoute, parseBody } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { calcularVentaSchema } from "@/modules/ventas/venta.schema";
import * as service from "@/modules/ventas/venta.service";

/**
 * HU-VTA-01 — POST /api/ventas/calcular   (no escribe nada)
 *
 * Body: `{ consultaId?, lineas?: [{ articuloId | practicaId, cantidad }] }`
 *
 * Devuelve las líneas con el precio de la lista vigente y el total. Con solo `consultaId` es la PRECARGA del cobro de una
 * atención finalizada: el servicio tabulado + los insumos aplicados, sin
 * reingreso manual.
 */
export const POST = withRoute(async ({ req }) => {
  const input = await parseBody(req, calcularVentaSchema);
  return ok(await service.calcular(input));
});
