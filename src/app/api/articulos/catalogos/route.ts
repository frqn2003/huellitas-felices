import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/articulos/articulo.service";

/**
 * GET /api/articulos/catalogos
 *
 * Devuelve las cuatro listas que el formulario de artículo necesita para sus
 * selects: categorías, unidades de medida, fabricantes y proveedores activos.
 *
 * POR QUÉ UN SOLO ENDPOINT Y NO CUATRO
 *   El formulario los necesita a los cuatro a la vez, siempre. Cuatro endpoints
 *   serían cuatro round-trips para abrir un modal, y cuatro estados de carga
 *   que sincronizar en el front. Acá van juntos porque se consumen juntos.
 *
 *   Del lado de la base igual son cuatro consultas, pero salen en paralelo
 *   (Promise.all en el repo) y viajan en una sola respuesta.
 */
export const GET = withRoute(async () => {
  return ok(await service.catalogos());
});
