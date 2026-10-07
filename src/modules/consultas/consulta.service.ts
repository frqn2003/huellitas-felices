import type { Consulta, ConsultaInsumo, NotaConsulta } from "@/data/consultas";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./consulta.repo";
import * as mapper from "./consulta.mapper";
import type { CerrarConsultaInput } from "./consulta.schema";
import type { ConsultaRow } from "./consulta.types";

/**
 * HU-CLIN-01 — reglas de negocio de la Consulta Médica.
 *
 * Lo que ya hace la BASE y por eso NO se repite acá:
 *  · la consulta se crea sola cuando el turno pasa a 'atendido'
 *    (trg_turno_abrir_consulta), precargada con cliente, mascota y profesional;
 *  · no se puede modificar una consulta cerrada (trg_bloquea_update_consulta_medica,
 *    HF041) ni agregarle insumos (HF058);
 *  · no se puede facturar una consulta abierta (HF060): cerrarla es lo que
 *    "habilita el cobro en mostrador";
 *  · cada alta/cambio queda en `auditoria` (trg_auditoria_consulta_medica*), con
 *    el usuario que fija withAuditUser.
 */

async function armar(rows: ConsultaRow[], ej?: repo.Ejecutor): Promise<Consulta[]> {
  const ids = rows.map((r) => r.id);
  const [insumos, notas] = await Promise.all([repo.findInsumos(ids, ej), repo.findNotas(ids, ej)]);
  return rows.map((r) => mapper.toApi(r, insumos, notas));
}

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function obtener(id: number): Promise<Consulta> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("la consulta", id);
  return (await armar([row]))[0];
}

/** Consulta de un turno (el front entra por turnoId). 404 si el turno aún no fue atendido. */
export async function obtenerPorTurno(turnoId: number): Promise<Consulta> {
  const row = await repo.findByTurno(turnoId);
  if (!row) throw new NotFoundError("la consulta del turno", turnoId);
  return (await armar([row]))[0];
}

/** Historia clínica de la mascota: todas sus consultas, la más reciente primero. */
export async function historialMascota(mascotaId: number): Promise<Consulta[]> {
  return armar(await repo.findByMascota(mascotaId));
}

/** Detalle de insumos de la consulta: lo lee Caja (HU-VTA-01) para liquidar. */
export async function insumos(consultaId: number): Promise<ConsultaInsumo[]> {
  const existe = await repo.findById(consultaId);
  if (!existe) throw new NotFoundError("la consulta", consultaId);
  return (await repo.findInsumos([consultaId])).map(mapper.toInsumo);
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/**
 * Abre la consulta de un turno. Idempotente: si ya existe (la creó el trigger
 * al marcar 'atendido'), la devuelve. No procede si el turno está cancelado o ausente.
 */
export async function abrir(
  turnoId: number,
  usuarioId: number,
): Promise<{ consulta: Consulta; creada: boolean }> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const existente = await repo.findByTurno(turnoId, client);
    if (existente) return { consulta: (await armar([existente], client))[0], creada: false };

    const turno = await repo.findTurno(turnoId, client);
    if (!turno) throw new NotFoundError("el turno", turnoId);
    // Se puede abrir desde un turno vigente (pendiente/confirmado: el profesional
    // empieza a atender) o ya 'atendido'. Uno cancelado o ausente no.
    if (turno.estado_es_final && turno.estado_nombre !== "atendido") {
      throw new BusinessRuleError(
        "TURNO_NO_ATENDIBLE",
        `El turno está "${turno.estado_nombre}": no se puede registrar una consulta.`,
        "turnoId",
      );
    }

    await repo.insert(
      {
        id: turno.id,
        clienteId: turno.cliente_id,
        mascotaId: turno.mascota_id,
        usuarioId: turno.profesional_usuario_id ?? turno.usuario_id,
        motivo:
          turno.notas?.trim() || "Consulta generada automáticamente al marcar el turno como atendido",
      },
      client,
    );
    const row = await repo.findByTurno(turnoId, client);
    return { consulta: (await armar([row as ConsultaRow], client))[0], creada: true };
  });
}

/**
 * Finaliza la atención: guarda los datos clínicos, el detalle de insumos y
 * cierra la consulta, todo en UNA transacción (o se guarda todo o nada).
 *
 * Al cerrar:
 *  · el peso medido pasa a la ficha de la mascota;
 *  · `medicacion_indicada` se resume desde los insumos aplicados;
 *  · la consulta queda habilitada para cobrarse en mostrador (la venta exige
 *    `cerrada = true`).
 */
export async function cerrar(
  id: number,
  input: CerrarConsultaInput,
  usuarioId: number,
): Promise<Consulta> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) throw new NotFoundError("la consulta", id);
    if (actual.cerrada) {
      throw new BusinessRuleError(
        "CONSULTA_CERRADA",
        "La consulta ya está cerrada y no puede editarse: agregá una nota aclaratoria.",
      );
    }

    // Solo artículos activos (HU-STK-01: un inactivo no se puede seleccionar).
    const pedidos = input.insumos.map((i) => i.articuloId);
    const activos = new Set(await repo.findArticulosActivos(pedidos, client));
    const invalido = pedidos.find((a) => !activos.has(a));
    if (invalido !== undefined) {
      throw new BusinessRuleError(
        "INSUMO_INVALIDO",
        `El artículo ${invalido} no existe o está inactivo: no se puede indicar como insumo.`,
        "insumos",
      );
    }

    await repo.reemplazarInsumos(id, input.insumos, usuarioId, client);

    // Resumen legible para `medicacion_indicada`, armado con lo recién insertado.
    const insertados = await repo.findInsumos([id], client);
    const medicacion = insertados.length
      ? insertados.map((i) => `${i.cantidad} ${i.unidad_medida} · ${i.nombre}`).join("; ")
      : null;

    await repo.cerrar(
      id,
      {
        motivoConsulta: input.motivoConsulta,
        diagnostico: input.diagnostico,
        tratamiento: input.tratamiento,
        estadoFisicoGeneral: input.estadoFisicoGeneral,
        temperatura: input.temperatura,
        frecuenciaCardiaca: input.frecuenciaCardiaca,
        pesoMomento: input.pesoMomento,
        medicacionIndicada: medicacion,
      },
      client,
    );

    // El turno queda 'atendido' = habilitado para cobro en mostrador.
    await repo.marcarTurnoAtendido(actual.turno_id, client);

    if (input.pesoMomento !== null) {
      await repo.actualizarPesoMascota(actual.mascota_id, input.pesoMomento, client);
    }

    const fresca = await repo.findById(id, client);
    return (await armar([fresca as ConsultaRow], client))[0];
  });
}

/** Nota aclaratoria: única modificación permitida DESPUÉS del cierre. */
export async function agregarNota(
  consultaId: number,
  nota: string,
  usuarioId: number,
): Promise<NotaConsulta> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const consulta = await repo.findById(consultaId, client);
    if (!consulta) throw new NotFoundError("la consulta", consultaId);
    if (!consulta.cerrada) {
      throw new BusinessRuleError(
        "CONSULTA_ABIERTA",
        "La consulta sigue abierta: completala y finalizala. Las notas aclaratorias son para consultas cerradas.",
      );
    }

    const notaId = await repo.insertNota(consultaId, usuarioId, nota, client);
    const notas = await repo.findNotas([consultaId], client);
    return mapper.toNota(notas.find((n) => n.id === notaId) as (typeof notas)[number]);
  });
}
