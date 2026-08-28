import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto } from "@/lib/http/query";
import { crearSolicitudSchema } from "@/modules/compras/cotizacion.schema";
import * as service from "@/modules/compras/cotizacion.service";

/**
 * HU-COMP-02 — /api/solicitudes-cotizacion
 *
 * Es el paso previo a la orden: el criterio pide poder "registrar y comparar
 * cotizaciones de más de un proveedor para los mismos artículos" antes de
 * adjudicar.
 */

const ESTADOS = ["Abierta", "Adjudicada", "Cancelada"] as const;
type EstadoSolicitud = (typeof ESTADOS)[number];

function leerEstadoSolicitud(valor: string | undefined): EstadoSolicitud | undefined {
  return ESTADOS.find((e) => e === valor);
}

/**
 * GET /api/solicitudes-cotizacion — reemplaza `solicitudesIniciales`
 * (src/data/cotizaciones.ts:80).
 *
 * Cada solicitud viene con sus artículos pedidos y sus cotizaciones (con
 * precios y proveedor) anidados: es lo que necesita la tabla comparativa de
 * CompararCotizacionesModal, y pedirlo por separado sería una consulta por
 * fila de la lista.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const ordenFecha = sp.get("ordenFecha") === "antiguas" ? "antiguas" : "recientes";

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      estado: leerEstadoSolicitud(leerTexto(sp, "estado")),
      ordenFecha,
    }),
  );
});

/** POST — alta de la solicitud (SolicitudFormModal → CotizacionesContext). */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearSolicitudSchema);
  return created(await service.crear(input, session.usuarioId));
});
