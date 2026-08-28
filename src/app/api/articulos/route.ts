import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerEstado } from "@/lib/http/query";
import { crearArticuloSchema } from "@/modules/articulos/articulo.schema";
import * as service from "@/modules/articulos/articulo.service";

/**
 * HU-STK-01 — /api/articulos
 *
 * Mirá el tamaño de los handlers: leer, validar, delegar, responder. Toda la
 * lógica está en el service, que se puede testear sin levantar el servidor.
 */

/** GET /api/articulos — reemplaza `articulosIniciales`. */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      categoriaId: leerEntero(sp, "categoriaId"),
      unidadMedidaId: leerEntero(sp, "unidadMedidaId"),
      proveedorId: leerEntero(sp, "proveedorId"),
      estado: leerEstado(sp),
    }),
  );
});

/**
 * POST /api/articulos — alta.
 *
 * El body NO lleva `codigo`: lo genera el trigger de la base con el prefijo de
 * la categoría. La respuesta sí lo trae, ya generado.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearArticuloSchema);
  return created(await service.crear(input, session.usuarioId));
});
