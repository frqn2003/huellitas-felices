import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerFecha } from "@/lib/http/query";
import { crearTurnoSchema } from "@/modules/turnos/turno.schema";
import * as service from "@/modules/turnos/turno.service";

/**
 * HU-TUR-01 — /api/turnos
 *
 * Leer, validar, delegar, responder. Ni SQL ni reglas de negocio acá.
 * El `usuario_id` (la recepcionista que carga) sale de la sesión, no del body.
 */

/**
 * GET /api/turnos — la lista de la tab Turnos y la agenda.
 *
 * Filtros de FiltrosTurnos.tsx: búsqueda por cliente/profesional/práctica,
 * estado y rango de fechas. Se resuelven en SQL: la agenda de un año no se
 * manda entera al navegador para filtrarla ahí.
 *
 * `profesionalId` y `sucursalId` son para la vista de agenda (criterio 4 de
 * HU-TUR-01); `clienteId` y `mascotaId`, para el historial (criterio 4 de
 * HU-TUR-02).
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      estadoId: leerEntero(sp, "estadoId"),
      desde: leerFecha(sp, "desde"),
      hasta: leerFecha(sp, "hasta"),
      profesionalId: leerEntero(sp, "profesionalId"),
      sucursalId: leerEntero(sp, "sucursalId"),
      // HU-TUR-02, criterio 4: el "historial del cliente" es su lista de
      // turnos. Combinado con `estadoId=5` da las inasistencias:
      //   GET /api/turnos?clienteId=3&estadoId=5
      clienteId: leerEntero(sp, "clienteId"),
      mascotaId: leerEntero(sp, "mascotaId"),
    }),
  );
});

/**
 * POST /api/turnos — alta del turno.
 *
 * Devuelve el turno COMPLETO y ya persistido (con su id y la sucursal que
 * derivó el trigger), no el draft: el criterio 3 pide mostrar el resumen de lo
 * que quedó guardado.
 *
 * El turno nace en estado "pendiente"; el body no lo manda.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearTurnoSchema);
  return created(await service.crear(input, session.usuarioId));
});
