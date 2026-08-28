import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEstado, leerEntero } from "@/lib/http/query";
import { crearProveedorSchema } from "@/modules/proveedores/proveedor.schema";
import * as service from "@/modules/proveedores/proveedor.service";

/**
 * HU-PROV-01 — /api/proveedores
 *
 * Fijate el tamaño de cada handler: leer, validar, delegar, responder. Cuatro
 * líneas. No hay SQL ni una sola regla de negocio acá — todo eso vive en el
 * service, que se puede testear sin levantar el servidor.
 *
 * Los errores no se capturan: withRoute() los agarra y los traduce a HTTP.
 * El usuario tampoco se lee del body: sale de la sesión.
 */

/** GET /api/proveedores — reemplaza `proveedoresIniciales` (src/data/proveedores.ts:23). */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      estado: leerEstado(sp),
      formaPagoId: leerEntero(sp, "formaPagoId"),
    }),
  );
});

/** POST /api/proveedores — alta (src/app/proveedores/page.tsx:133). */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearProveedorSchema);
  return created(await service.crear(input, session.usuarioId));
});
