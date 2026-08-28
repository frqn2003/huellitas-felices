import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { query } from "@/lib/db/client";

/**
 * Catálogo de formas de pago (decisión D-A).
 *
 * Lo necesita el select múltiple de ProveedorFormModal: el front tiene que
 * mandar `formaPagoIds`, así que primero necesita los ids del catálogo.
 *
 * Un catálogo de solo lectura no justifica repo + service + mapper: son 4 filas
 * y no hay ninguna regla. Cuando un módulo es realmente así de fino, la query
 * puede vivir en el handler. La capa de service se agrega el día que aparezca
 * la primera regla, no antes.
 */

export const GET = withRoute(async () => {
  const filas = await query<{ id: number; nombre: string }>(
    "SELECT id, nombre FROM forma_pago ORDER BY nombre",
  );
  return ok(filas);
});
