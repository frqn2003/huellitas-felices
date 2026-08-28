import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarProveedorSchema } from "@/modules/proveedores/proveedor.schema";
import * as service from "@/modules/proveedores/proveedor.service";

/**
 * HU-PROV-01 — /api/proveedores/:id
 *
 * En Next 16 los `params` de un route handler son una Promise: hay que
 * await-earlos antes de leer el id.
 */

type Params = { id: string };

/** GET — modo LECTURA del formulario paramétrico (el ícono 👁 del listado). */
export const GET = withRoute<Params>(async ({ params }) => {
  const { id } = await params;
  return ok(await service.obtener(parseId(id)));
});

/** PUT — modo EDICIÓN (src/app/proveedores/page.tsx:133). */
export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, editarProveedorSchema);
  return ok(await service.editar(parseId(id), input, session.usuarioId));
});

// No hay DELETE a propósito: la baja es LÓGICA y va por
// PATCH /api/proveedores/:id/inactivar (criterio HU-PROV-01).
