import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { adjudicarSchema } from "@/modules/compras/cotizacion.schema";
import * as service from "@/modules/compras/cotizacion.service";

/**
 * HU-COMP-02 — PATCH /api/solicitudes-cotizacion/:id/adjudicar
 *
 * El endpoint más importante de la HU: "al adjudicar, selecciona el proveedor y
 * genera la orden con número único secuencial".
 *
 * Recibe las asignaciones artículo → cotización que armó el usuario en la
 * pantalla de comparación, y en UNA transacción:
 *   1. valida que toda la solicitud quede adjudicada,
 *   2. crea una orden de compra por proveedor ganador (agrupando sus artículos),
 *   3. deja cada orden apuntando a la cotización que la originó,
 *   4. marca la solicitud como Adjudicada.
 *
 * Devuelve `{ solicitud, ordenes }`: el front necesita las dos cosas — refrescar
 * la solicitud y mostrar las órdenes recién emitidas (hoy las simula en
 * src/app/ordenes-compra/page.tsx:452).
 */

type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, adjudicarSchema);
  return ok(await service.adjudicar(parseId(id), input, session.usuarioId));
});
