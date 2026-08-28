import { withRoute, parseBody } from "@/lib/http/handler";
import { created, ok } from "@/lib/http/responses";
import { leerBooleano, leerEntero, leerTexto } from "@/lib/http/query";
import type { EstadoStock } from "@/data/stock";
import { crearFichaStockSchema } from "@/modules/stock/stock.schema";
import * as service from "@/modules/stock/stock.service";

function leerEstadoStock(sp: URLSearchParams): EstadoStock | undefined {
  const valor = leerTexto(sp, "estadoStock");
  return valor === "normal" || valor === "bajo" || valor === "critico" ? valor : undefined;
}

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  return ok(await service.listarFichas({
    busqueda: leerTexto(sp, "busqueda"),
    sucursalId: leerEntero(sp, "sucursalId"),
    depositoId: leerEntero(sp, "depositoId"),
    estadoStock: leerEstadoStock(sp),
    incluirInactivos: leerBooleano(sp, "incluirInactivos"),
  }));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearFichaStockSchema);
  return created(await service.crearFicha(input, session.usuarioId));
});
