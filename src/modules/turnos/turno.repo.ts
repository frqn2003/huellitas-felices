import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
  FiltrosTurno,
  FranjaRow,
  ProfesionalRow,
  TurnoInput,
  TurnoRow,
} from "./turno.types";

/**
 * HU-TUR-01 — capa de acceso a datos de Turnos.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 * ACÁ NO VA: validaciones, reglas de negocio, transacciones (las abre el service).
 */

// El turno cuelga de seis tablas. Todos los JOIN son INNER porque las seis FK
// son NOT NULL: no hay turno sin cliente, sin mascota ni sin franja.
const FROM = `
  FROM turno t
  JOIN cliente             cli ON cli.id = t.cliente_id
  JOIN mascota             mas ON mas.id = t.mascota_id
  JOIN practica            pra ON pra.id = t.practica_id
  JOIN estado_turno        est ON est.id = t.estado_id
  JOIN agenda_profesional  ap  ON ap.id  = t.agenda_profesional_id
  JOIN usuario             pro ON pro.id = ap.usuario_id
  JOIN sucursal            suc ON suc.id = t.sucursal_id
`;

const COLUMNAS = `
  t.id, t.cliente_id, t.mascota_id, t.sucursal_id, t.agenda_profesional_id,
  t.practica_id, t.estado_id, t.fecha, t.hora_inicio, t.hora_fin, t.notas,
  t.usuario_id, t.fecha_creacion,
  cli.nombre    AS cliente_nombre,
  cli.apellido  AS cliente_apellido,
  cli.documento AS cliente_documento,
  mas.nombre    AS mascota_nombre,
  mas.especie   AS mascota_especie,
  pra.nombre    AS practica_nombre,
  est.nombre    AS estado_nombre,
  est.es_final  AS estado_es_final,
  pro.id        AS profesional_id,
  pro.nombre    AS profesional_nombre,
  pro.apellido  AS profesional_apellido,
  suc.nombre    AS sucursal_nombre
`;

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findAll(f: FiltrosTurno = {}): Promise<TurnoRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    const p = `$${params.length}`;
    // Lo que pide el brief: cliente (nombre/documento), profesional y práctica.
    condiciones.push(`(
      cli.nombre ILIKE ${p} OR
      cli.apellido ILIKE ${p} OR
      (cli.nombre || ' ' || cli.apellido) ILIKE ${p} OR
      cli.documento ILIKE ${p} OR
      mas.nombre ILIKE ${p} OR
      pro.nombre ILIKE ${p} OR
      pro.apellido ILIKE ${p} OR
      (pro.nombre || ' ' || pro.apellido) ILIKE ${p} OR
      pra.nombre ILIKE ${p}
    )`);
  }

  if (f.estadoId) {
    params.push(f.estadoId);
    condiciones.push(`t.estado_id = $${params.length}`);
  }

  if (f.desde) {
    params.push(f.desde);
    condiciones.push(`t.fecha >= $${params.length}::date`);
  }

  if (f.hasta) {
    // `fecha` es `date` (no timestamp), así que acá sí vale el `<=`: no hay
    // parte horaria que deje afuera lo del último día.
    params.push(f.hasta);
    condiciones.push(`t.fecha <= $${params.length}::date`);
  }

  if (f.profesionalId) {
    params.push(f.profesionalId);
    condiciones.push(`pro.id = $${params.length}`);
  }

  // Criterio de HU-TUR-02: "un turno 'no asistió' queda registrado en el
  // historial del cliente". No hay tabla de historial — el historial ES la
  // lista de turnos del cliente, y se consulta con este filtro combinado con
  // `estadoId` (ver docs/briefs/HU-TUR-02.md:125).
  if (f.clienteId) {
    params.push(f.clienteId);
    condiciones.push(`t.cliente_id = $${params.length}`);
  }

  if (f.mascotaId) {
    params.push(f.mascotaId);
    condiciones.push(`t.mascota_id = $${params.length}`);
  }

  if (f.sucursalId) {
    params.push(f.sucursalId);
    condiciones.push(`t.sucursal_id = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  return query<TurnoRow>(
    // El desempate por id importa: sin él, dos turnos a la misma hora pueden
    // salir en orden distinto en cada consulta.
    `SELECT ${COLUMNAS} ${FROM} ${where}
     ORDER BY t.fecha DESC, t.hora_inicio DESC, t.id DESC`,
    params,
  );
}

export async function findById(id: number): Promise<TurnoRow | null> {
  const filas = await query<TurnoRow>(`SELECT ${COLUMNAS} ${FROM} WHERE t.id = $1`, [id]);
  return filas[0] ?? null;
}

/** Igual que findById pero dentro de una transacción abierta. */
export async function findByIdEnTransaccion(
  id: number,
  client: PoolClient,
): Promise<TurnoRow | null> {
  const { rows } = await client.query<TurnoRow>(
    `SELECT ${COLUMNAS} ${FROM} WHERE t.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------
// Catálogos del wizard
// ---------------------------------------------------------

/**
 * Los veterinarios activos.
 *
 * El rol se filtra por NOMBRE y no por id: `rol.id = 2` funcionaría hoy pero
 * se rompe en silencio si alguien reordena el catálogo.
 */
export async function listarProfesionales(): Promise<ProfesionalRow[]> {
  return query<ProfesionalRow>(
    `SELECT u.id, u.nombre, u.apellido, u.dni
     FROM usuario u
     JOIN rol r ON r.id = u.rol_id
     WHERE u.estado = 'activo' AND r.nombre = 'Veterinario'
     ORDER BY u.apellido, u.nombre`,
  );
}

/**
 * Las franjas de trabajo de los veterinarios.
 *
 * Solo las ACTIVAS y cuya franja general de sucursal también lo esté: una
 * franja dada de baja no puede ofrecerse para un turno nuevo (es lo mismo que
 * valida el trigger `fn_turno_validar_horario`).
 *
 * Se traen todas juntas y el service las agrupa por profesional, para no hacer
 * una consulta por veterinario (N+1).
 */
export async function listarFranjas(usuarioId?: number): Promise<FranjaRow[]> {
  const params: unknown[] = [];
  let filtroUsuario = "";
  if (usuarioId) {
    params.push(usuarioId);
    filtroUsuario = `AND ap.usuario_id = $${params.length}`;
  }

  return query<FranjaRow>(
    `SELECT ap.id, ap.usuario_id, ap.hora_inicio, ap.hora_fin, ap.estado,
            ags.dia_semana,
            ags.estado AS agenda_semanal_estado,
            a.sucursal_id
     FROM agenda_profesional ap
     JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
     JOIN agenda a           ON a.id  = ags.agenda_id
     WHERE ap.estado = 'activo' AND ags.estado = 'activo' ${filtroUsuario}
     ORDER BY ags.dia_semana, ap.hora_inicio`,
    params,
  );
}

/** Una franja puntual, para validar el alta. Trae también las inactivas. */
export async function findFranja(id: number): Promise<FranjaRow | null> {
  const filas = await query<FranjaRow>(
    `SELECT ap.id, ap.usuario_id, ap.hora_inicio, ap.hora_fin, ap.estado,
            ags.dia_semana,
            ags.estado AS agenda_semanal_estado,
            a.sucursal_id
     FROM agenda_profesional ap
     JOIN agenda_semanal ags ON ags.id = ap.agenda_semanal_id
     JOIN agenda a           ON a.id  = ags.agenda_id
     WHERE ap.id = $1`,
    [id],
  );
  return filas[0] ?? null;
}

export async function listarPracticas(): Promise<
  { id: number; nombre: string; duracion_estimada_minutos: number | null }[]
> {
  return query(
    `SELECT id, nombre, duracion_estimada_minutos
     FROM practica WHERE estado = 'activo' ORDER BY nombre`,
  );
}

export async function listarEstados(): Promise<
  { id: number; nombre: string; es_final: boolean }[]
> {
  return query(`SELECT id, nombre, es_final FROM estado_turno ORDER BY id`);
}

// ---------------------------------------------------------
// Disponibilidad
// ---------------------------------------------------------

/**
 * ¿Hay algún turno que pise este horario? — criterio "rechaza la superposición".
 *
 * `estado_id <> 3` (cancelado): un turno cancelado LIBERA el hueco. Es la misma
 * condición que el constraint `turno_sin_superposicion_excl`, y tienen que
 * coincidir: si el service fuera más permisivo, el INSERT reventaría contra el
 * índice; si fuera más estricto, rechazaría huecos que en realidad están libres.
 *
 * `OVERLAPS` compara los dos rangos y es media-abierto: un turno que termina
 * 10:30 NO se superpone con uno que arranca 10:30. Es lo que corresponde —
 * turnos consecutivos son válidos.
 *
 * ⚠️ Esto NO alcanza por sí solo. Dos requests simultáneas pasan las dos este
 *    chequeo y las dos insertan; lo único que las separa es el EXCLUDE de la
 *    base (que sale como 23P01 → "Ese horario se acaba de ocupar").
 *    Este chequeo existe para dar el mensaje bueno en el caso normal.
 */
export async function findSuperpuesto(
  agendaProfesionalId: number,
  fecha: string,
  horaInicio: string,
  horaFin: string,
): Promise<{ id: number; hora_inicio: string; hora_fin: string } | null> {
  const filas = await query<{ id: number; hora_inicio: string; hora_fin: string }>(
    `SELECT t.id, t.hora_inicio, t.hora_fin
     FROM turno t
     WHERE t.agenda_profesional_id = $1
       AND t.fecha = $2::date
       AND t.estado_id <> 3
       AND (t.hora_inicio, t.hora_fin) OVERLAPS ($3::time, $4::time)
     LIMIT 1`,
    [agendaProfesionalId, fecha, horaInicio, horaFin],
  );
  return filas[0] ?? null;
}

/** Los turnos ya tomados de una franja en una fecha, para pintar los huecos. */
export async function findOcupados(
  agendaProfesionalId: number,
  fecha: string,
): Promise<{ hora_inicio: string; hora_fin: string }[]> {
  return query<{ hora_inicio: string; hora_fin: string }>(
    `SELECT hora_inicio, hora_fin
     FROM turno
     WHERE agenda_profesional_id = $1 AND fecha = $2::date AND estado_id <> 3
     ORDER BY hora_inicio`,
    [agendaProfesionalId, fecha],
  );
}

// ---------------------------------------------------------
// Validaciones que necesitan la base
// ---------------------------------------------------------

export async function findClienteActivo(
  id: number,
): Promise<{ id: number; nombre: string; apellido: string; estado: string } | null> {
  const filas = await query<{ id: number; nombre: string; apellido: string; estado: string }>(
    `SELECT id, nombre, apellido, estado FROM cliente WHERE id = $1`,
    [id],
  );
  return filas[0] ?? null;
}

export async function findMascota(
  id: number,
): Promise<{ id: number; cliente_id: number; nombre: string; estado: string } | null> {
  const filas = await query<{ id: number; cliente_id: number; nombre: string; estado: string }>(
    `SELECT id, cliente_id, nombre, estado FROM mascota WHERE id = $1`,
    [id],
  );
  return filas[0] ?? null;
}

export async function findPractica(
  id: number,
): Promise<{ id: number; nombre: string; estado: string; duracion_estimada_minutos: number | null } | null> {
  const filas = await query<{
    id: number;
    nombre: string;
    estado: string;
    duracion_estimada_minutos: number | null;
  }>(`SELECT id, nombre, estado, duracion_estimada_minutos FROM practica WHERE id = $1`, [id]);
  return filas[0] ?? null;
}

/** Un estado del catálogo, para validar la transición pedida. */
export async function findEstado(
  id: number,
): Promise<{ id: number; nombre: string; es_final: boolean } | null> {
  const filas = await query<{ id: number; nombre: string; es_final: boolean }>(
    `SELECT id, nombre, es_final FROM estado_turno WHERE id = $1`,
    [id],
  );
  return filas[0] ?? null;
}

/**
 * Bloquea el turno y devuelve su estado actual.
 *
 * `FOR UPDATE` importa acá: sin el lock, dos recepcionistas cambiando el mismo
 * turno a la vez leen las dos el estado "confirmado", las dos consideran válida
 * su transición y la última escribe. Con el lock, la segunda espera, relee
 * "atendido" y su cambio se rechaza por transición inválida — que es lo
 * correcto: desde un estado final no se sale.
 */
export async function lockTurnoParaEstado(
  id: number,
  client: PoolClient,
): Promise<{ id: number; estado_id: number; estado_nombre: string; es_final: boolean } | null> {
  const { rows } = await client.query<{
    id: number;
    estado_id: number;
    estado_nombre: string;
    es_final: boolean;
  }>(
    `SELECT t.id, t.estado_id, e.nombre AS estado_nombre, e.es_final
     FROM turno t
     JOIN estado_turno e ON e.id = t.estado_id
     WHERE t.id = $1
     FOR UPDATE OF t`,
    [id],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

/**
 * Cambia el estado del turno.
 *
 * Es un UPDATE de UNA columna a propósito: el resto del turno no se toca. El
 * trigger `trg_auditoria_turno_estado` dispara solo cuando `estado_id` cambia
 * (AFTER UPDATE ... WHEN old.estado_id IS DISTINCT FROM new.estado_id), así que
 * la bitácora registra exactamente los cambios de estado y nada más.
 */
export async function updateEstado(
  id: number,
  estadoId: number,
  client: PoolClient,
): Promise<boolean> {
  const { rowCount } = await client.query(`UPDATE turno SET estado_id = $2 WHERE id = $1`, [
    id,
    estadoId,
  ]);
  return (rowCount ?? 0) > 0;
}

/**
 * Inserta el turno y devuelve su id.
 *
 * Lo que NO se manda y por qué:
 *  · `id` — la columna es GENERATED BY DEFAULT AS IDENTITY.
 *  · `sucursal_id` — lo completa el trigger `fn_turno_sincronizar_sucursal`
 *    desde la agenda del profesional. Es NOT NULL, así que sin ese trigger
 *    esto fallaría; con él, mandarlo desde acá sería una segunda fuente de
 *    verdad que puede contradecirlo.
 *  · `fecha_creacion` — tiene DEFAULT now().
 */
export async function insert(
  data: TurnoInput,
  estadoId: number,
  usuarioId: number,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO turno
       (cliente_id, mascota_id, agenda_profesional_id, practica_id, estado_id,
        fecha, hora_inicio, hora_fin, notas, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7::time, $8::time, $9, $10)
     RETURNING id`,
    [
      data.clienteId,
      data.mascotaId,
      data.agendaProfesionalId,
      data.practicaId,
      estadoId,
      data.fecha,
      data.horaInicio,
      data.horaFin,
      data.notas,
      usuarioId,
    ],
  );
  return rows[0].id;
}
