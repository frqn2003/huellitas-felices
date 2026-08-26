import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/orden.service";

/**
 * GET /api/condiciones-pago — catálogo para los selects de órdenes y
 * cotizaciones (`// BACKEND:` en src/data/ordenes-compra.ts:16 y
 * CotizacionFormModal.tsx:185).
 *
 * ES LA MISMA TABLA QUE /api/formas-pago, y no es un descuido:
 *   · para el PROVEEDOR es "qué formas de pago acepta" (N:M, varias),
 *   · para la ORDEN es "qué condición se pactó en esta compra" (una sola).
 * Dos preguntas distintas sobre el mismo catálogo. Se exponen con los dos
 * nombres para que cada pantalla llame al que entiende, en vez de obligar al
 * formulario de compras a pedir "formas de pago".
 *
 * Cuando el front consuma esto, puede borrar su const fija CONDICIONES_PAGO y
 * empezar a mandar `formaPagoId` en vez del nombre.
 */
export const GET = withRoute(async () => {
  return ok(await service.condicionesPago());
});
