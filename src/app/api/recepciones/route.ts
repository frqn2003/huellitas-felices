import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerFecha } from "@/lib/http/query";
import type { TipoRecepcion } from "@/data/recepciones";
import { crearRecepcionSchema } from "@/modules/compras/recepcion.schema";
import * as service from "@/modules/compras/recepcion.service";

/**
 * HU-COMP-03 — /api/recepciones
 *
 * Leer, validar, delegar, responder. Ni SQL ni reglas de negocio acá.
 * Los errores no se capturan: withRoute() los traduce a HTTP.
 * El `usuario_id` tampoco se lee del body: sale de la sesión (regla dura §7.5).
 */

/** Un `?tipoRecepcion=` fuera del enum se ignora, en vez de llegar al SQL. */
function leerTipoRecepcion(sp: URLSearchParams): TipoRecepcion | undefined {
  const v = leerTexto(sp, "tipoRecepcion")?.toLowerCase();
  return v === "parcial" || v === "total" ? v : undefined;
}

/**
 * GET /api/recepciones — el historial con filtros.
 *
 * Criterio: "Lista el historial de recepciones con filtros por proveedor,
 * número de OC y período".
 *
 * Los filtros se resuelven en SQL y no en el front: hoy son tres recepciones de
 * demo, pero un año de entregas no se manda entero al navegador para filtrarlo
 * ahí. Por lo mismo la respuesta viene paginada.
 *
 * Devuelve `{ items, total, pagina, porPagina }` — un objeto, no un array
 * pelado: sin `total` el front no puede dibujar el paginador.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  // El filtro del front arranca en "Todos", que significa "sin filtrar". Si se
  // dejara pasar, el WHERE buscaría un tipo llamado "Todos" y la lista saldría
  // vacía. `leerTipoRecepcion` ya lo descarta por no estar en el enum.
  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      proveedorId: leerEntero(sp, "proveedorId"),
      ordenCompraId: leerEntero(sp, "ordenCompraId"),
      tipoRecepcion: leerTipoRecepcion(sp),
      fechaDesde: leerFecha(sp, "fechaDesde"),
      fechaHasta: leerFecha(sp, "fechaHasta"),
      pagina: leerEntero(sp, "pagina"),
      porPagina: leerEntero(sp, "porPagina"),
    }),
  );
});

/**
 * POST /api/recepciones — registra la recepción.
 *
 * NO recibe `tipoRecepcion` (lo deriva el backend, D-1) ni `cantidadSolicitada`
 * (la calcula el service con la OC bloqueada, D-4). Si vienen en el body, zod
 * los ignora en silencio.
 *
 * La respuesta lleva cuatro cosas además de la recepción:
 *  · `estadoOrdenResultante` — cómo quedó la OC, sin que el front lo adivine
 *  · `movimientoStock`       — el ingreso que se generó (criterio HU-STK-04)
 *  · `fichasCreadas`         — dispara el aviso "configurá los umbrales" (D-2)
 *  · `notificaciones`        — alimenta el toast de diferencias
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearRecepcionSchema);
  return created(await service.registrar(input, session.usuarioId));
});
