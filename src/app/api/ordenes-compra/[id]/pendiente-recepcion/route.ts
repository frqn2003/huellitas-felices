import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/recepcion.service";

/**
 * HU-COMP-03 — GET /api/ordenes-compra/:id/pendiente-recepcion
 *
 * Lo que el formulario de recepción necesita para armar sus filas: por cada
 * línea de la OC, qué se pidió, qué se recibió acumulado y qué falta.
 *
 * Devuelve SOLO las líneas con `cantidadPendiente > 0`. Es lo que hace que la
 * segunda recepción parcial muestre lo que falta y no lo que ya llegó — el caso
 * de uso central de la HU.
 *
 * ⚠️ DOS COSAS QUE EL BRIEF DEL FRONT TIENE MAL Y ESTE ENDPOINT CORRIGE
 *    (docs/backend/HU-COMP-03.md §8.2 y §8.3):
 *
 *    · La columna "Solicitado" del formulario NO es la cantidad de la OC: es
 *      `cantidadPendiente`, lo que devuelve este endpoint. En una primera
 *      recepción total coinciden; en la segunda parcial, no.
 *
 *    · El select de OC del formulario no puede filtrar por "Pendiente o
 *      Enviada": así una OC en `Recibida Parcial` no aparecería nunca y la
 *      segunda entrega sería imposible de cargar. El filtro correcto es
 *      cualquier OC con `es_final = false`.
 *
 * Cuelga de /ordenes-compra/:id y no de /recepciones porque la pregunta es
 * sobre la orden: "qué le falta recibir a esta OC". La recepción todavía no
 * existe cuando se hace esta consulta.
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.pendienteDeRecepcion(parseId(id)));
});
