import type { Deposito, FichaStock } from "@/data/stock";
import { withAuditUser } from "@/lib/audit/audit";
import { withTransaction } from "@/lib/db/tx";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as mapper from "./stock.mapper";
import * as repo from "./stock.repo";
import type {
  DepositoInput,
  FichaStockInput,
  FiltrosDeposito,
  FiltrosFichaStock,
} from "./stock.types";

export async function listarDepositos(filtros: FiltrosDeposito = {}): Promise<Deposito[]> {
  return (await repo.findDepositos(filtros)).map(mapper.depositoToApi);
}

export async function obtenerDeposito(id: number): Promise<Deposito> {
  const row = await repo.findDepositoById(id);
  if (!row) throw new NotFoundError("el depósito", id);
  return mapper.depositoToApi(row);
}

export async function crearDeposito(data: DepositoInput, usuarioId: number): Promise<Deposito> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);
    const duplicado = await repo.findDepositoDuplicado(data, undefined, client);
    if (duplicado) {
      throw new ConflictError(
        "DEPOSITO_DUPLICADO",
        "Ya existe un depósito con ese nombre en la sucursal elegida.",
        "nombre",
      );
    }
    const id = await repo.insertDeposito(data, client);
    const row = await repo.findDepositoById(id, client);
    if (!row) throw new NotFoundError("el depósito", id);
    return mapper.depositoToApi(row);
  });
}

export async function editarDeposito(
  id: number,
  data: DepositoInput,
  usuarioId: number,
): Promise<Deposito> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);
    if (!(await repo.findDepositoById(id, client))) throw new NotFoundError("el depósito", id);
    const duplicado = await repo.findDepositoDuplicado(data, id, client);
    if (duplicado) {
      throw new ConflictError(
        "DEPOSITO_DUPLICADO",
        "Ya existe otro depósito con ese nombre en la sucursal elegida.",
        "nombre",
      );
    }
    await repo.updateDeposito(id, data, client);
    const row = await repo.findDepositoById(id, client);
    if (!row) throw new NotFoundError("el depósito", id);
    return mapper.depositoToApi(row);
  });
}

export async function listarFichas(filtros: FiltrosFichaStock = {}): Promise<FichaStock[]> {
  return (await repo.findFichas(filtros)).map(mapper.fichaToApi);
}

export async function obtenerFicha(id: number): Promise<FichaStock> {
  const row = await repo.findFichaById(id);
  if (!row) throw new NotFoundError("la ficha de stock", id);
  return mapper.fichaToApi(row);
}

export async function crearFicha(data: FichaStockInput, usuarioId: number): Promise<FichaStock> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);
    if (await repo.findFichaDuplicada(data.articuloId, data.depositoId, undefined, client)) {
      throw new ConflictError(
        "FICHA_DUPLICADA",
        "Ese artículo ya tiene una ficha de stock en el depósito seleccionado.",
        "articuloId",
      );
    }
    const id = await repo.insertFicha(data, client);
    const row = await repo.findFichaById(id, client);
    if (!row) throw new NotFoundError("la ficha de stock", id);
    return mapper.fichaToApi(row);
  });
}

export async function editarFicha(
  id: number,
  data: FichaStockInput,
  usuarioId: number,
): Promise<FichaStock> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);
    const actual = await repo.findFichaById(id, client);
    if (!actual) throw new NotFoundError("la ficha de stock", id);
    if (data.articuloId !== actual.articulo_id) {
      throw new BusinessRuleError(
        "ARTICULO_NO_EDITABLE",
        "El artículo de una ficha de stock no puede modificarse.",
        "articuloId",
      );
    }
    if (await repo.findFichaDuplicada(actual.articulo_id, data.depositoId, id, client)) {
      throw new ConflictError(
        "FICHA_DUPLICADA",
        "Ese artículo ya tiene una ficha de stock en el depósito seleccionado.",
        "depositoId",
      );
    }
    await repo.updateFicha(id, { ...data, articuloId: actual.articulo_id }, client);
    const row = await repo.findFichaById(id, client);
    if (!row) throw new NotFoundError("la ficha de stock", id);
    return mapper.fichaToApi(row);
  });
}
