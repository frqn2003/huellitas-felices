import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerEntero, leerFecha } from "@/lib/http/query";
import { crearVentaSchema } from "@/modules/ventas/venta.schema";
import * as service from "@/modules/ventas/venta.service";

/** HU-VTA-01 — /api/ventas */

/**
 * GET — ventas, la más reciente primero. `?clienteId=` es el historial del cliente
 * (las ventas cobradas desde sus atenciones médicas).
 * Filtros: clienteId, sucursalId, consultaId, desde, hasta (YYYY-MM-DD).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  return ok(
    await service.listar({
      clienteId: leerEntero(sp, "clienteId"),
      sucursalId: leerEntero(sp, "sucursalId"),
      consultaId: leerEntero(sp, "consultaId"),
      desde: leerFecha(sp, "desde"),
      hasta: leerFecha(sp, "hasta"),
    }),
  );
});

/**
 * POST — confirma la venta.
 *
 * Body: `{ sucursalId?, depositoId?, consultaId?, lineas: [{ articuloId | practicaId, cantidad }], mediosPago: [{ formaPagoId, monto }] }`
 *
 * NO lleva precios: se toman de la Lista de Precios vigente. Con `consultaId`
 * se precargan el servicio de la atención y sus insumos; `lineas` son ítems
 * adicionales. Descuenta stock, asienta el efectivo en caja y queda en la
 * bitácora, todo en la misma transacción.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearVentaSchema);
  return created(await service.crear(input, session.usuarioId));
});
