import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { ValidationError } from "@/lib/http/errors";
import { leerSujeto } from "@/modules/precios/precio.schema";
import * as service from "@/modules/precios/precio.service";

/**
 * HU-STK-03 — GET /api/lista-precios/historial?articuloId=  (o ?practicaId=)
 *
 * Historial completo de UN artículo/práctica, más reciente primero. Solo
 * consulta: lo escribe el trigger de la base, no hay POST/PUT/DELETE.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const sujeto = leerSujeto(sp);
  const valor = sp.get(sujeto === "articulo" ? "articuloId" : "practicaId");
  if (!valor) {
    throw new ValidationError(
      "FILTRO_OBLIGATORIO",
      sujeto === "articulo" ? "Indicá el artículo (articuloId)." : "Indicá la práctica (practicaId).",
      sujeto === "articulo" ? "articuloId" : "practicaId",
    );
  }
  return ok(await service.historial(sujeto, parseId(valor)));
});
