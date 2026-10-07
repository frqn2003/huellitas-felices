import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { editarMascotaSchema } from "@/modules/mascotas/mascota.schema";
import * as service from "@/modules/mascotas/mascota.service";

/**
 * HU-MAS-01 — /api/mascotas/:id
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

/** PUT — modo EDICIÓN. Incluye la baja lógica (`estado: "inactivo"`). */
export const PUT = withRoute<Params>(async ({ req, params, session }) => {
  const { id } = await params;
  const input = await parseBody(req, editarMascotaSchema);
  return ok(await service.editar(parseId(id), input, session.usuarioId));
});

// No hay DELETE a propósito: la baja es LÓGICA y va por el PUT con
// `estado: "inactivo"`, igual que en clientes. La mascota conserva su historial
// de turnos, que es lo que pide la auditoría.
