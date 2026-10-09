import type { Caja, CajaApertura, MovimientoCaja } from "@/data/cajas";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./caja.repo";
import * as mapper from "./caja.mapper";
import type { AbrirCajaInput, MovimientoCajaInput } from "./caja.schema";
import type { FiltrosApertura } from "./caja.types";

/**
 * HU-VTA-03 — reglas de negocio de la Caja Diaria.
 *
 * Lo que hace la BASE y por eso NO se recalcula acá:
 *  · `monto_esperado` = inicial + ingresos − egresos y `fecha_cierre`
 *    (trg_caja_calcular_cierre);
 *  · `caja.saldo_actual` en vivo (trg_caja_actualizar_saldo_*);
 *  · no hay dos cajas abiertas en la misma sucursal (HF045) ni movimientos en
 *    una caja cerrada (HF044);
 *  · apertura, movimientos y cierre quedan en `auditoria`, con el usuario que
 *    fija withAuditUser (el de la sesión).
 * El service repite algunas de estas reglas ANTES de escribir solo para
 * contestar con un mensaje preciso en vez de un error genérico de la base.
 */

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listarCajas(sucursalId?: number): Promise<Caja[]> {
  return (await repo.findCajas(sucursalId)).map(mapper.toCaja);
}

/** Cajeros activos (rol Cajero) para el combo de apertura. */
export async function listarCajeros(sucursalId?: number) {
  return (await repo.findCajeros(sucursalId)).map(mapper.toCajero);
}

export async function listarAperturas(filtros: FiltrosApertura = {}): Promise<CajaApertura[]> {
  return (await repo.findAperturas(filtros)).map(mapper.toApertura);
}

export async function obtenerApertura(id: number): Promise<CajaApertura> {
  const row = await repo.findAperturaById(id);
  if (!row) throw new NotFoundError("la apertura de caja", id);
  return mapper.toApertura(row);
}

/** Todos los movimientos de la apertura (sin paginar: el esperado se calcula sobre el total). */
export async function listarMovimientos(aperturaId: number): Promise<MovimientoCaja[]> {
  const existe = await repo.findAperturaById(aperturaId);
  if (!existe) throw new NotFoundError("la apertura de caja", aperturaId);
  return (await repo.findMovimientos(aperturaId)).map(mapper.toMovimiento);
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/** Apertura con monto inicial declarado, por sucursal (la caja) y por cajero. */
export async function abrir(
  input: AbrirCajaInput,
  usuarioId: number,
): Promise<CajaApertura> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const caja = await repo.findCaja(input.cajaId, client);
    if (!caja) throw new NotFoundError("la caja", input.cajaId);
    if (caja.estado !== "activo") {
      throw new BusinessRuleError("CAJA_INACTIVA", "La caja está inactiva: no se puede abrir.", "cajaId");
    }

    // Si no se indica cajero, el responsable es quien opera.
    const cajeroId = input.cajeroId ?? usuarioId;
    const cajero = await repo.findCajero(cajeroId, client);
    if (!cajero) throw new NotFoundError("el cajero", cajeroId);
    const rolesPermitidos = ["Recepcionista", "Administrador", "Cajero"];
    if (!rolesPermitidos.includes(cajero.rol) || cajero.estado !== "activo") {
      throw new BusinessRuleError(
        "CAJERO_INVALIDO",
        "El responsable de la apertura debe ser un usuario activo (Recepcionista, Administrador o Cajero).",
        "cajeroId",
      );
    }
    if (cajero.sucursal_id !== null && cajero.sucursal_id !== caja.sucursal_id) {
      throw new BusinessRuleError(
        "CAJERO_OTRA_SUCURSAL",
        "El cajero pertenece a otra sucursal.",
        "cajeroId",
      );
    }

    // Una sola caja abierta por sucursal. La red de seguridad bajo concurrencia
    // es el índice único + el trigger de la base (HF045).
    const abierta = await repo.findAbiertaEnSucursal(caja.sucursal_id, client);
    if (abierta) {
      throw new ConflictError(
        "CAJA_YA_ABIERTA",
        `Ya hay una caja abierta en ${abierta.sucursal} (cajero ${abierta.cajero_nombre} ${abierta.cajero_apellido}). Cerrala antes de abrir otra.`,
        "cajaId",
      );
    }

    const id = await repo.insertApertura(
      { cajaId: caja.id, cajeroId, montoInicial: input.montoInicial },
      client,
    );
    return mapper.toApertura((await repo.findAperturaById(id, client)) as NonNullable<Awaited<ReturnType<typeof repo.findAperturaById>>>);
  });
}

/** Ingreso o egreso MANUAL con motivo. Solo sobre una caja abierta. */
export async function registrarMovimiento(
  aperturaId: number,
  input: MovimientoCajaInput,
  usuarioId: number,
): Promise<MovimientoCaja> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const apertura = await repo.bloquearApertura(aperturaId, false, client);
    if (!apertura) throw new NotFoundError("la apertura de caja", aperturaId);
    if (!apertura.estado) {
      throw new BusinessRuleError(
        "CAJA_CERRADA",
        "La caja está cerrada: no se pueden registrar movimientos.",
      );
    }

    const id = await repo.insertMovimiento(
      { aperturaId, tipo: input.tipo, monto: input.monto, motivo: input.motivo, usuarioId },
      client,
    );
    return mapper.toMovimiento(
      (await repo.findMovimientoById(id, client)) as NonNullable<Awaited<ReturnType<typeof repo.findMovimientoById>>>,
    );
  });
}

/**
 * Cierre con el conteo final. La base calcula el esperado y acá se calcula la
 * diferencia = contado − esperado (positivo = sobrante, negativo = faltante).
 */
export async function cerrar(
  aperturaId: number,
  montoContado: number,
  usuarioId: number,
): Promise<CajaApertura> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const apertura = await repo.bloquearApertura(aperturaId, true, client);
    if (!apertura) throw new NotFoundError("la apertura de caja", aperturaId);
    // Imprescindible: el trigger de cierre solo corre si el estado CAMBIA, así
    // que cerrar una caja ya cerrada pisaría el conteo en silencio.
    if (!apertura.estado) {
      throw new BusinessRuleError("CAJA_CERRADA", "La caja ya está cerrada.");
    }

    await repo.cerrarApertura(aperturaId, montoContado, client);
    return mapper.toApertura(
      (await repo.findAperturaById(aperturaId, client)) as NonNullable<Awaited<ReturnType<typeof repo.findAperturaById>>>,
    );
  });
}
