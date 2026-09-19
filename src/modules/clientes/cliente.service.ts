import type { Cliente, Mascota } from "@/data/clientes";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./cliente.repo";
import * as mapper from "./cliente.mapper";
import type { ClienteInput, FiltrosCliente } from "./cliente.types";

/**
 * HU-CLI-01 — Reglas de negocio del módulo Clientes.
 */

export async function listar(filtros: FiltrosCliente = {}): Promise<Cliente[]> {
  const rows = await repo.findAll(filtros);
  return mapper.toApiList(rows);
}

export async function obtener(id: number): Promise<Cliente> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("el cliente", id);
  return mapper.toApi(row);
}

export async function buscarDuplicadosInactivos(
  documento: string,
  email: string,
): Promise<Cliente[]> {
  const rows = await repo.findInactivosDuplicados(documento, email);
  return mapper.toApiList(rows);
}

export async function obtenerMascotas(clienteId: number): Promise<Mascota[]> {
  const rows = await repo.findMascotasByClienteId(clienteId);
  return mapper.toApiMascotaList(rows);
}

export async function crear(
  input: ClienteInput,
  usuarioId: number,
): Promise<Cliente> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    // 1. Validar unicidad de documento entre activos
    const dupDoc = await repo.findActivoByDocumento(input.documento);
    if (dupDoc) {
      throw new ConflictError(
        "DOCUMENTO_DUPLICADO",
        `Ya existe un cliente activo con el documento ${input.documento}: ${dupDoc.nombre} ${dupDoc.apellido}.`,
        "documento",
      );
    }

    // 2. Validar unicidad de email entre activos
    const dupEmail = await repo.findActivoByEmail(input.email);
    if (dupEmail) {
      throw new ConflictError(
        "EMAIL_DUPLICADO",
        `Ya existe un cliente activo con el email ${input.email}: ${dupEmail.nombre} ${dupEmail.apellido}.`,
        "email",
      );
    }

    const row = await repo.insert(input, client);
    return mapper.toApi(row);
  });
}

export async function editar(
  id: number,
  input: ClienteInput,
  usuarioId: number,
): Promise<Cliente> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("el cliente", id);

    // 1. Validar unicidad de documento entre activos (excluyendo el propio id)
    const dupDoc = await repo.findActivoByDocumento(input.documento, id);
    if (dupDoc) {
      throw new ConflictError(
        "DOCUMENTO_DUPLICADO",
        `Ya existe un cliente activo con el documento ${input.documento}: ${dupDoc.nombre} ${dupDoc.apellido}.`,
        "documento",
      );
    }

    // 2. Validar unicidad de email entre activos (excluyendo el propio id)
    const dupEmail = await repo.findActivoByEmail(input.email, id);
    if (dupEmail) {
      throw new ConflictError(
        "EMAIL_DUPLICADO",
        `Ya existe un cliente activo con el email ${input.email}: ${dupEmail.nombre} ${dupEmail.apellido}.`,
        "email",
      );
    }

    const row = await repo.update(id, input, client);
    return mapper.toApi(row);
  });
}
