import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { query } from "@/lib/db/client";

/**
 * GET /api/sucursales — catálogo de sucursales.
 *
 * ⚠️ HASTA EL 2026-09-10 ESTE ENDPOINT DEVOLVÍA UN ARRAY HARDCODEADO
 *    (`SUCURSALES` de `src/data/stock.ts`), con este comentario:
 *
 *      "Catálogo temporal: la base DEV conserva deposito.sucursal_id pero
 *       todavía no existe una tabla sucursal."
 *
 *    Eso dejó de ser cierto: la tabla `sucursal` existe, `deposito.sucursal_id`
 *    es una FK real y hay un `uq_sucursal_nombre_activa`.
 *
 *    Y no era inofensivo. El array decía "Centro" / "Norte" / "Sur"; la base
 *    dice "Sucursal Centro" / "Sucursal Norte" / "Sucursal Sur". El filtro de
 *    stock comparaba el nombre real contra el inventado —
 *    `"Sucursal Centro" === "Centro"` — así que **elegir cualquier sucursal
 *    devolvía la lista vacía**.
 *
 * Solo las activas: filtrar stock por una sucursal dada de baja no tiene
 * sentido, y el índice `uq_sucursal_nombre_activa` solo garantiza nombres
 * únicos entre las activas.
 *
 * Es un catálogo de solo lectura, así que va con `query()` directo en el
 * handler, sin repo + service + mapper. Mismo criterio que `/api/formas-pago`.
 */
export const GET = withRoute(async () =>
  ok(
    await query<{ id: number; nombre: string }>(
      `SELECT id, nombre
       FROM sucursal
       WHERE estado = 'activo'
       ORDER BY nombre`,
    ),
  ),
);
