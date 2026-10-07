import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
  ConsultaRow,
  DatosCierre,
  InsumoRow,
  NotaRow,
  TurnoParaConsultaRow,
} from "./consulta.types";

/**
 * HU-CLIN-01 — capa de acceso a datos de Consulta Médica.
 *
 * ACÁ VA: SQL parametrizado y nada más. Las reglas (no editar una consulta
 * cerrada, insumos solo de artículos activos, etc.) viven en el service y, como
 * red de seguridad, en los triggers de la base (HF041, HF058).
 */

export type Ejecutor = { query: PoolClient["query"] };

const SELECT_BASE = `
  SELECT
    c.id,
    c.turno_id,
    c.usuario_id                          AS profesional_id,
    to_char(t.fecha, 'YYYY-MM-DD')        AS turno_fecha,
    to_char(t.hora_inicio, 'HH24:MI')     AS turno_hora_inicio,
    to_char(t.hora_fin, 'HH24:MI')        AS turno_hora_fin,
    cl.id                                 AS cliente_id,
    cl.nombre || ' ' || cl.apellido       AS cliente_nombre,
    cl.documento                          AS cliente_dni,
    m.id                                  AS mascota_id,
    m.nombre                              AS mascota_nombre,
    m.especie                             AS mascota_especie,
    m.raza                                AS mascota_raza,
    m.sexo                                AS mascota_sexo,
    -- Peso ANTES de esta consulta: el de la consulta previa de la mascota. Si
    -- la consulta sigue abierta y no hay previa, el de la ficha de la mascota
    -- (al cerrar, ese peso se pisa con el de la consulta, así que en una
    -- cerrada ya no sirve de referencia).
    COALESCE(prev.peso, CASE WHEN NOT c.cerrada THEN m.peso END) AS mascota_peso_anterior,
    u.nombre || ' ' || u.apellido         AS profesional_nombre,
    pr.nombre                             AS practica_nombre,
    c.motivo_consulta,
    c.diagnostico,
    c.tratamiento,
    c.estado_fisico_general,
    c.temperatura,
    c.frecuencia_cardiaca,
    c.peso,
    c.cerrada,
    c.fecha_hora,
    c.fecha_cierre
  FROM consulta_medica c
  JOIN turno    t  ON t.id  = c.turno_id
  JOIN cliente  cl ON cl.id = c.cliente_id
  JOIN mascota  m  ON m.id  = c.mascota_id
  JOIN usuario  u  ON u.id  = c.usuario_id
  JOIN practica pr ON pr.id = t.practica_id
  LEFT JOIN LATERAL (
    SELECT p.peso
    FROM consulta_medica p
    WHERE p.mascota_id = c.mascota_id
      AND p.id <> c.id
      AND p.peso IS NOT NULL
      AND p.fecha_hora < c.fecha_hora
    ORDER BY p.fecha_hora DESC
    LIMIT 1
  ) prev ON true
`;

async function ejecutar<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  ejecutor?: Ejecutor,
): Promise<T[]> {
  if (ejecutor) return (await ejecutor.query<T>(sql, params)).rows;
  return query<T>(sql, params);
}

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findById(id: number, ej?: Ejecutor): Promise<ConsultaRow | null> {
  const filas = await ejecutar<ConsultaRow>(`${SELECT_BASE} WHERE c.id = $1`, [id], ej);
  return filas[0] ?? null;
}

export async function findByTurno(turnoId: number, ej?: Ejecutor): Promise<ConsultaRow | null> {
  const filas = await ejecutar<ConsultaRow>(`${SELECT_BASE} WHERE c.turno_id = $1`, [turnoId], ej);
  return filas[0] ?? null;
}

/** Historia clínica de una mascota: sus consultas, la más reciente primero. */
export async function findByMascota(mascotaId: number): Promise<ConsultaRow[]> {
  return query<ConsultaRow>(
    `${SELECT_BASE} WHERE c.mascota_id = $1 ORDER BY c.fecha_hora DESC, c.id DESC`,
    [mascotaId],
  );
}

export async function findInsumos(consultaIds: number[], ej?: Ejecutor): Promise<InsumoRow[]> {
  if (consultaIds.length === 0) return [];
  return ejecutar<InsumoRow>(
    `SELECT i.id, i.consulta_id, i.articulo_id, a.codigo, a.nombre,
            um.nombre AS unidad_medida, i.cantidad
     FROM consulta_medica_insumo i
     JOIN articulo a       ON a.id  = i.articulo_id
     JOIN unidad_medida um ON um.id = a.unidad_medida_id
     WHERE i.consulta_id = ANY($1::int[])
     ORDER BY i.id`,
    [consultaIds],
    ej,
  );
}

export async function findNotas(consultaIds: number[], ej?: Ejecutor): Promise<NotaRow[]> {
  if (consultaIds.length === 0) return [];
  return ejecutar<NotaRow>(
    `SELECT n.id, n.consulta_id, n.usuario_id,
            u.nombre || ' ' || u.apellido AS profesional,
            n.nota, n.fecha_hora
     FROM consulta_medica_nota n
     JOIN usuario u ON u.id = n.usuario_id
     WHERE n.consulta_id = ANY($1::int[])
     ORDER BY n.fecha_hora, n.id`,
    [consultaIds],
    ej,
  );
}

/** Turno + su estado + el usuario de la franja de agenda (el profesional). */
export async function findTurno(turnoId: number, ej?: Ejecutor): Promise<TurnoParaConsultaRow | null> {
  const filas = await ejecutar<TurnoParaConsultaRow>(
    `SELECT t.id, t.cliente_id, t.mascota_id, t.notas, e.nombre AS estado_nombre, e.es_final AS estado_es_final,
            t.usuario_id, ap.usuario_id AS profesional_usuario_id
     FROM turno t
     JOIN estado_turno e        ON e.id  = t.estado_id
     JOIN agenda_profesional ap ON ap.id = t.agenda_profesional_id
     WHERE t.id = $1`,
    [turnoId],
    ej,
  );
  return filas[0] ?? null;
}

/** Artículos pedidos que están ACTIVOS (el resto no puede indicarse como insumo). */
export async function findArticulosActivos(ids: number[], ej: Ejecutor): Promise<number[]> {
  if (ids.length === 0) return [];
  const { rows } = await ej.query<{ id: number }>(
    `SELECT id FROM articulo WHERE id = ANY($1::int[]) AND estado = 'activo'`,
    [ids],
  );
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

/** Abre la consulta de un turno. Idempotente por el UNIQUE de turno_id. */
export async function insert(
  turno: { id: number; clienteId: number; mascotaId: number; usuarioId: number; motivo: string },
  client: PoolClient,
): Promise<number | null> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO consulta_medica (turno_id, cliente_id, mascota_id, usuario_id, motivo_consulta)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (turno_id) DO NOTHING
     RETURNING id`,
    [turno.id, turno.clienteId, turno.mascotaId, turno.usuarioId, turno.motivo],
  );
  return rows[0]?.id ?? null;
}

/** Reemplaza el detalle de insumos de una consulta ABIERTA. */
export async function reemplazarInsumos(
  consultaId: number,
  insumos: { articuloId: number; cantidad: number }[],
  usuarioId: number,
  client: PoolClient,
): Promise<void> {
  await client.query("DELETE FROM consulta_medica_insumo WHERE consulta_id = $1", [consultaId]);
  for (const i of insumos) {
    await client.query(
      `INSERT INTO consulta_medica_insumo (consulta_id, articulo_id, cantidad, usuario_id)
       VALUES ($1, $2, $3, $4)`,
      [consultaId, i.articuloId, i.cantidad, usuarioId],
    );
  }
}

/**
 * Carga los datos clínicos y CIERRA la consulta en un único UPDATE.
 *
 * `fecha_cierre` lo completa trg_bloquea_update_consulta_medica. Una vez
 * cerrada, ese mismo trigger rechaza cualquier UPDATE posterior (HF041).
 */
export async function cerrar(id: number, d: DatosCierre, client: PoolClient): Promise<void> {
  await client.query(
    `UPDATE consulta_medica
     SET motivo_consulta       = $2,
         diagnostico           = $3,
         tratamiento           = $4,
         medicacion_indicada   = $5,
         estado_fisico_general = $6,
         temperatura           = $7,
         frecuencia_cardiaca   = $8,
         peso                  = $9,
         cerrada               = true
     WHERE id = $1`,
    [
      id,
      d.motivoConsulta,
      d.diagnostico,
      d.tratamiento,
      d.medicacionIndicada,
      d.estadoFisicoGeneral,
      d.temperatura,
      d.frecuenciaCardiaca,
      d.pesoMomento,
    ],
  );
}

/**
 * Pasa el turno a 'atendido' (queda habilitado para cobrarse en mostrador).
 * Si ya lo estaba no hace nada, así el trigger de la base no se dispara de más.
 */
export async function marcarTurnoAtendido(turnoId: number, client: PoolClient): Promise<void> {
  await client.query(
    `UPDATE turno
     SET estado_id = (SELECT id FROM estado_turno WHERE nombre = 'atendido')
     WHERE id = $1
       AND estado_id IS DISTINCT FROM (SELECT id FROM estado_turno WHERE nombre = 'atendido')`,
    [turnoId],
  );
}

/** Actualiza el peso de la ficha de la mascota con el medido en la consulta. */
export async function actualizarPesoMascota(
  mascotaId: number,
  peso: number,
  client: PoolClient,
): Promise<void> {
  await client.query("UPDATE mascota SET peso = $2 WHERE id = $1", [mascotaId, peso]);
}

export async function insertNota(
  consultaId: number,
  usuarioId: number,
  nota: string,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO consulta_medica_nota (consulta_id, usuario_id, nota)
     VALUES ($1, $2, $3) RETURNING id`,
    [consultaId, usuarioId, nota],
  );
  return rows[0].id;
}
