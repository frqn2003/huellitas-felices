import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerDecimal, leerFecha } from "@/lib/http/query";
import { crearOrdenSchema } from "@/modules/compras/orden.schema";
import * as service from "@/modules/compras/orden.service";

/**
 * HU-COMP-02 — /api/ordenes-compra
 *
 * Leer, validar, delegar, responder. Ni SQL ni reglas de negocio acá: eso vive
 * en el service, que se puede testear sin levantar el servidor.
 *
 * Los errores no se capturan: withRoute() los traduce a HTTP.
 * El `usuario_id` tampoco se lee del body: sale de la sesión (regla dura §7).
 */

/**
 * GET /api/ordenes-compra — reemplaza `ordenesCompraIniciales`
 * (src/app/ordenes-compra/page.tsx:152).
 *
 * Los filtros son los de FiltrosOrdenes.tsx. Se resuelven en SQL y no en el
 * front: hoy son 4 órdenes de demo, pero un año de compras no se manda entero
 * al navegador para filtrarlo ahí.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const ordenFecha = sp.get("ordenFecha") === "antiguas" ? "antiguas" : "recientes";

  // El filtro de estado del front arranca en "Todas", que significa "sin
  // filtrar". Si se dejara pasar, el WHERE buscaría un estado llamado "Todas" y
  // la lista saldría vacía.
  const estado = leerTexto(sp, "estado");

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      proveedorId: leerEntero(sp, "proveedorId"),
      // El front manda el nombre del estado tal cual lo muestra ("Pendiente").
      estado: estado === "Todas" ? undefined : estado,
      desde: leerFecha(sp, "desde"),
      hasta: leerFecha(sp, "hasta"),
      totalMin: leerDecimal(sp, "totalMin"),
      totalMax: leerDecimal(sp, "totalMax"),
      ordenFecha,
    }),
  );
});

/**
 * POST /api/ordenes-compra — alta (src/app/ordenes-compra/page.tsx:246).
 *
 * Devuelve la orden con su número (`cod_ord`), los totales recalculados en el
 * server y el detalle resuelto.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearOrdenSchema);
  return created(await service.crear(input, session.usuarioId));
});
