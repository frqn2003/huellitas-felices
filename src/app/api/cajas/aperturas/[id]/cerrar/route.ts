import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { cerrarCajaSchema } from "@/modules/cajas/caja.schema";
import * as service from "@/modules/cajas/caja.service";

/**
 * HU-VTA-03 — PATCH /api/cajas/aperturas/:id/cerrar  { montoContado }
 *
 * Devuelve la apertura cerrada con `montoEsperado` (inicial + ingresos −
 * egresos) y `diferencia` (contado − esperado) ya calculados.
 */
type Params = { id: string };

export const PATCH = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const { montoContado } = await parseBody(req, cerrarCajaSchema);
  return ok(await service.cerrar(parseId(id), montoContado, session.usuarioId));
});
