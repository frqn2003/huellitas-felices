import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/proveedores/proveedor.service";

/**
 * HU-PROV-01 — baja lógica (src/app/proveedores/page.tsx:148).
 *
 * Endpoint aparte y no un PATCH genérico sobre /:id con `{ estado: "inactivo" }`
 * por dos razones:
 *
 *  1. La baja tiene reglas propias que la edición no tiene (no se puede dar de
 *     baja un proveedor con órdenes abiertas). Con un PATCH genérico habría que
 *     adivinar la intención mirando qué campos vinieron.
 *  2. Queda explícito en el log de acceso qué operación se hizo.
 *
 * PATCH y no DELETE: el registro no se borra, cambia de estado y conserva su
 * historial.
 */

type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ params, session }) => {
  const { id } = await params;
  return ok(await service.inactivar(parseId(id), session.usuarioId));
});
