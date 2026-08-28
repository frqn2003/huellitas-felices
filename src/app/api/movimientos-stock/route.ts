import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerFecha } from "@/lib/http/query";
import type { TipoMovimiento } from "@/data/movimientos";

const TIPOS: TipoMovimiento[] = ["Ingreso", "Egreso", "Transferencia", "Ajuste"];

/** Un `?tipo=` que no sea de la lista se ignora, en vez de llegar al SQL. */
function leerTipo(sp: URLSearchParams): TipoMovimiento | undefined {
  const v = leerTexto(sp, "tipo");
  return TIPOS.find((t) => t === v);
}
import { registrarMovimientoSchema } from "@/modules/movimientos/movimiento.schema";
import * as service from "@/modules/movimientos/movimiento.service";

/**
 * GET /api/movimientos-stock
 * Filtros soportados: busqueda, tipo, depositoId, articuloId, desde, hasta
 */
export const GET = withRoute(async ({ req }) => {
    const sp = new URL(req.url).searchParams;

    const movimientos = await service.listar({
        busqueda: leerTexto(sp, "busqueda"),
        tipo: leerTipo(sp),
        depositoId: leerEntero(sp, "depositoId"),
        articuloId: leerEntero(sp, "articuloId"),
        desde: leerFecha(sp, "desde"),
        hasta: leerFecha(sp, "hasta"),
    });

    return ok(movimientos);
});

/**
 * POST /api/movimientos-stock
 * Registra movimiento(s), actualiza stock de forma atómica y devuelve alertas.
 */
export const POST = withRoute(async ({ req, session }) => {
    const input = await parseBody(req, registrarMovimientoSchema);
    const resultado = await service.registrar(input, session.usuarioId);
    return created(resultado);
});
