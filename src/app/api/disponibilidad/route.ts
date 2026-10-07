import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerEntero, leerFecha } from "@/lib/http/query";
import { ValidationError } from "@/lib/http/errors";
import * as service from "@/modules/turnos/turno.service";

/**
 * GET /api/disponibilidad?agendaProfesionalId=3&fecha=2026-09-23
 *
 * Los horarios YA OCUPADOS de una franja en una fecha. El wizard resta esto a
 * la franja para pintar los huecos libres.
 *
 * Devuelve los ocupados y no los libres a propósito: los huecos dependen de la
 * duración de la práctica elegida, que el usuario puede cambiar sin volver a
 * pedir nada. Mandando los ocupados, el front recalcula solo.
 *
 * Excluye los turnos cancelados: un turno cancelado libera el hueco (es la
 * misma condición del constraint `turno_sin_superposicion_excl`).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  const agendaProfesionalId = leerEntero(sp, "agendaProfesionalId");
  const fecha = leerFecha(sp, "fecha");

  // Sin los dos no hay pregunta que responder: devolver "todo libre" sería
  // mentir, y devolver todos los turnos de la base sería otra cosa.
  if (!agendaProfesionalId) {
    throw new ValidationError(
      "FALTA_AGENDA",
      "Falta el parámetro agendaProfesionalId.",
      "agendaProfesionalId",
    );
  }
  if (!fecha) {
    throw new ValidationError("FALTA_FECHA", "Falta el parámetro fecha (YYYY-MM-DD).", "fecha");
  }

  return ok(await service.ocupados(agendaProfesionalId, fecha));
});
