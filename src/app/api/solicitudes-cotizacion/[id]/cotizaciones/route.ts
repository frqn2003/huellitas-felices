import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { created } from "@/lib/http/responses";
import { registrarCotizacionSchema } from "@/modules/compras/cotizacion.schema";
import * as service from "@/modules/compras/cotizacion.service";

/**
 * HU-COMP-02 — POST /api/solicitudes-cotizacion/:id/cotizaciones
 *
 * Registra la respuesta de UN proveedor: su precio por cada artículo pedido y
 * su condición de pago. Se llama una vez por proveedor que conteste
 * (CotizacionFormModal → CotizacionesContext.registrarCotizacion).
 *
 * Devuelve la SOLICITUD entera, no solo la cotización creada: la pantalla
 * muestra la comparación entre todas, así que necesita el conjunto actualizado.
 * Es una respuesta en vez de dos round-trips.
 */

type Params = { id: string };

export const POST = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, registrarCotizacionSchema);
  return created(await service.registrarCotizacion(parseId(id), input, session.usuarioId));
});
