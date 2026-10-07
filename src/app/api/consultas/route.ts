import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { ValidationError } from "@/lib/http/errors";
import { abrirConsultaSchema } from "@/modules/consultas/consulta.schema";
import * as service from "@/modules/consultas/consulta.service";

/**
 * HU-CLIN-01 — /api/consultas
 */

/**
 * GET /api/consultas?turnoId=  → la consulta de ese turno (404 si el turno aún no fue atendido).
 * GET /api/consultas?mascotaId= → historia clínica de la mascota (más reciente primero).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const turnoId = sp.get("turnoId");
  const mascotaId = sp.get("mascotaId");

  if (turnoId) return ok(await service.obtenerPorTurno(parseId(turnoId)));
  if (mascotaId) return ok(await service.historialMascota(parseId(mascotaId)));

  throw new ValidationError("FILTRO_OBLIGATORIO", "Indicá turnoId o mascotaId.", "turnoId");
});

/**
 * POST — abre la consulta de un turno confirmado o atendido.
 * Si ya existe (p. ej. la creó el trigger al marcar 'atendido') devuelve la
 * existente (200).
 */
export const POST = withRoute(async ({ req, session }) => {
  const { turnoId } = await parseBody(req, abrirConsultaSchema);
  const { consulta, creada } = await service.abrir(turnoId, session.usuarioId);
  return creada ? created(consulta) : ok(consulta);
});
