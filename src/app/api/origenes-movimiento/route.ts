import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as repo from "@/modules/movimientos/movimiento.repo";

/**
 * GET /api/origenes-movimiento — catálogo `origen_movimiento`.
 *
 * Lo pide el select "Origen" del formulario de movimientos de stock, que hasta
 * ahora usaba una lista fija de src/data/movimientos.ts con ids corridos
 * respecto de la tabla (ver el comentario de `listarOrigenes` en el repo: el
 * resultado era que las ventas se guardaban como recepciones de compra).
 *
 * El id elegido viaja en el POST de /api/movimientos-stock y se usa tal cual,
 * así que tiene que salir de la tabla, no de una copia.
 */
export const GET = withRoute(async () => {
  return ok(await repo.listarOrigenes());
});
