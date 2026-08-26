import { withRoute, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/compras/orden.service";

/**
 * HU-COMP-02 — Pendiente → Enviada (src/app/ordenes-compra/page.tsx:333).
 *
 * Endpoint propio en vez de un PUT con `{ estado: "Enviada" }` por lo mismo que
 * la baja de proveedor tiene el suyo: la transición tiene reglas que la edición
 * no tiene (solo se puede desde Pendiente), y con un PUT genérico habría que
 * adivinar la intención mirando qué campos vinieron. Además queda explícito en
 * el log de acceso qué operación se hizo.
 *
 * El cambio queda en la bitácora por el trigger tg_auditar_orden_compra, que
 * guarda la fila anterior y la nueva: es el criterio "registra en bitácora cada
 * modificación de estado".
 */

type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ params, session }) => {
  const { id } = await params;
  return ok(await service.enviar(parseId(id), session.usuarioId));
});
