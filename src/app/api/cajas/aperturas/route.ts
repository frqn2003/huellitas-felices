import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerEntero, leerFecha } from "@/lib/http/query";
import { abrirCajaSchema } from "@/modules/cajas/caja.schema";
import * as service from "@/modules/cajas/caja.service";

/** HU-VTA-03 — /api/cajas/aperturas */

/**
 * GET — aperturas, la más reciente primero.
 * Filtros: sucursalId, cajeroId, estado=abierta|cerrada, fechaDesde, fechaHasta (YYYY-MM-DD).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const estado = sp.get("estado")?.toLowerCase();
  return ok(
    await service.listarAperturas({
      sucursalId: leerEntero(sp, "sucursalId"),
      cajeroId: leerEntero(sp, "cajeroId"),
      abierta: estado === "abierta" ? true : estado === "cerrada" ? false : undefined,
      fechaDesde: leerFecha(sp, "fechaDesde"),
      fechaHasta: leerFecha(sp, "fechaHasta"),
    }),
  );
});

/**
 * POST — abre la caja. Body: `{ cajaId, cajeroId?, montoInicial }`.
 * 409 si ya hay una caja abierta en la sucursal.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, abrirCajaSchema);
  return created(await service.abrir(input, session.usuarioId));
});
