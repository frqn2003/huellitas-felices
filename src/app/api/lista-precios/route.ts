import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerEstado, leerBooleano } from "@/lib/http/query";
import { crearPrecioSchema, leerSujeto } from "@/modules/precios/precio.schema";
import * as service from "@/modules/precios/precio.service";

/**
 * HU-STK-03 — /api/lista-precios
 *
 * `?tipo=practica` opera sobre servicios/prácticas (p. ej. consulta médica) en
 * vez de artículos. Sin `tipo` = artículos.
 */

/** GET — modo LECTURA. Lista TODOS los artículos, con o sin precio cargado. */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  return ok(
    await service.listar(leerSujeto(sp), {
      busqueda: leerTexto(sp, "busqueda"),
      categoriaId: leerEntero(sp, "categoriaId"),
      estado: leerEstado(sp),
      conPrecio: leerBooleano(sp, "conPrecio"),
    }),
  );
});

/**
 * POST — modo INSERCIÓN. Body: `{ articuloId | practicaId, precio }`.
 * El usuario responsable es el de la sesión.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearPrecioSchema);
  if (input.practicaId !== undefined) {
    return created(await service.crear("practica", input.practicaId, input.precio, session.usuarioId));
  }
  return created(await service.crear("articulo", input.articuloId as number, input.precio, session.usuarioId));
});
