import { z } from "zod";
import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as service from "@/modules/turnos/turno.service";

/**
 * HU-TUR-02 — PATCH /api/turnos/:id/estado
 *
 * Endpoint propio y no un PUT genérico sobre /:id con `{ estadoId }`, por lo
 * mismo que la baja de proveedor y el envío de una orden tienen el suyo:
 *
 *  1. El cambio de estado tiene reglas que la edición no tiene (la máquina de
 *     transiciones). Con un PUT genérico habría que adivinar la intención
 *     mirando qué campos vinieron.
 *  2. Queda explícito en el log de acceso qué operación se hizo.
 *
 * PATCH y no PUT: se modifica UNA propiedad, no se reemplaza el turno.
 *
 * Devuelve el turno completo y actualizado para que la agenda pinte el badge
 * nuevo sin volver a pedir la lista.
 */

type Params = { id: string };

const cambiarEstadoSchema = z.object({
  estadoId: z
    .number({ invalid_type_error: "Elegí el nuevo estado." })
    .int()
    .positive("Elegí el nuevo estado."),
});

export const PATCH = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const { estadoId } = await parseBody(req, cambiarEstadoSchema);
  // El usuario responsable sale de la SESIÓN, no del body: es lo que el
  // criterio pide registrar en la bitácora y no puede venir del cliente.
  return ok(await service.cambiarEstado(parseId(id), estadoId, session.usuarioId));
});
