import { withRoute, parseBody } from "@/lib/http/handler";
import { created } from "@/lib/http/responses";
import { crearPagoSchema } from "@/modules/finanzas/pago.schema";
import * as service from "@/modules/finanzas/pago.service";

/**
 * POST /api/pagos — HU-FIN-02, Pantalla C
 *
 * Registra un pago a proveedor con sus imputaciones.
 *
 * NO hay GET acá, y es a propósito: los pagos de un proveedor ya los devuelve
 * `GET /api/cuentas-corrientes/:proveedorId`. Dos caminos al mismo dato son dos
 * respuestas que tarde o temprano se separan.
 *
 * `usuarioId` sale de la sesión, nunca del body.
 *
 * Responde con el DETALLE COMPLETO de la cuenta corriente, no con el pago
 * creado: es lo que hace que el saldo quede actualizado en la pantalla sin un
 * segundo viaje ni aritmética en el navegador (criterio 2).
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearPagoSchema);
  return created(await service.registrar(input, session.usuarioId));
});
