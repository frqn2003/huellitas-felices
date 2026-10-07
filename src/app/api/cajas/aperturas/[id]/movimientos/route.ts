import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { movimientoCajaSchema } from "@/modules/cajas/caja.schema";
import * as service from "@/modules/cajas/caja.service";

/** HU-VTA-03 — /api/cajas/aperturas/:id/movimientos */
type Params = { id: string };

/** GET — todos los movimientos de la apertura (incluye los cobros en efectivo, con `ventaId`). */
export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.listarMovimientos(parseId(id)));
});

/**
 * POST — ingreso/egreso manual. Body: `{ tipo: "ingreso"|"egreso", monto, motivo }`.
 * El usuario responsable es el de la sesión. 409 si la caja está cerrada.
 */
export const POST = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, movimientoCajaSchema);
  return created(await service.registrarMovimiento(parseId(id), input, session.usuarioId));
});
