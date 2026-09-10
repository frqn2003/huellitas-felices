import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/finanzas/ctacte.service";

/**
 * GET /api/cuentas-corrientes/:proveedorId — HU-FIN-02, Pantalla B
 *
 * Devuelve `{ cuenta, comprobantes, pagos }` juntos: la pantalla necesita las
 * tres cosas para dibujarse, y `POST /api/pagos` responde con esta misma forma,
 * así el front puede hacer un `setState` con lo que le vuelve del alta.
 *
 * ⚠️ El parámetro se llama `proveedorId` y no `id` a propósito. No existe una
 *    entidad "cuenta corriente" con id propio: la cuenta corriente ES la lectura
 *    de los comprobantes de un proveedor. Un `[id]` genérico invita a que
 *    alguien pase el `comprobante_id` que trae la vista.
 *
 * Los comprobantes vienen TODOS los vigentes, incluidos los saldados: el
 * criterio pide poder ver los pagos imputados a un comprobante, y filtrando los
 * saldados uno recién pagado desaparecería de la pantalla justo después de la
 * operación que el usuario acaba de hacer.
 */

type Params = { proveedorId: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { proveedorId } = await params;
  return ok(await service.obtenerDetalle(parseId(proveedorId)));
});
