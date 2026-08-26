import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/orden.service";

/**
 * GET /api/articulos/:id/ultimo-precio-compra
 *
 * Criterio del formulario de orden: el precio unitario "se carga
 * automáticamente del último precio de compra". Hoy el front lo calcula
 * recorriendo las órdenes que tiene en memoria (`ultimoPrecioCompra()` en
 * src/data/ordenes-compra.ts:104), lo que solo funciona con las órdenes de la
 * página actual.
 *
 * POR QUÉ LA RUTA CUELGA DE /articulos PERO EL SERVICE ES DE COMPRAS
 *   La ruta es la que pidió el front y es la que tiene sentido leer ("de este
 *   artículo, su último precio"). Pero el dato no está en `articulo` — el
 *   artículo NO tiene precio (criterio de HU-STK-01) — sino en el detalle de
 *   las órdenes. La URL la elige el consumidor; de qué módulo sale el dato lo
 *   decide dónde vive.
 *
 * Devuelve `precio: null` cuando el artículo nunca se compró: no es un error,
 * es un artículo nuevo. Las órdenes canceladas no cuentan.
 */

type Params = { id: string };

export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.ultimoPrecioCompra(parseId(id)));
});
