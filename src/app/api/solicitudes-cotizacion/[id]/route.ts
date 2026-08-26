import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/cotizacion.service";

/**
 * HU-COMP-02 - GET /api/solicitudes-cotizacion/:id
 *
 * La solicitud completa: articulos pedidos + todas las cotizaciones recibidas
 * con sus precios. Es lo que abre la pantalla de comparacion.
 *
 * No hay PUT ni DELETE: una solicitud no se edita despues de pedirle precios a
 * los proveedores (cambiar los articulos invalidaria las cotizaciones ya
 * recibidas) y no se borra, se cancela.
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});
