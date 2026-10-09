// Contrato y helpers del módulo Turnos (HU-TUR-01, HU-TUR-02). Los datos salen
// de la API (/api/turnos, /api/profesionales, /api/practicas).
// Contrato real del esquema (docs/esquema-bd-front.md, sección 8 "Clientes,
// Mascotas y Turnos" — DD Sprint 3). Cada `id` es la PK que mandará la base.
// El estado proviene del catálogo `estado_turno` (NO es enum). `dia_semana`
// usa ISO 8601: 1=lunes … 7=domingo (convención fijada con el equipo).

// Banderas de demo para simular los estados de la pantalla (ver TurnosContent).
export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// ─── Catálogo estado_turno (id → nombre, es_final) ──────────────────────────
// BACKEND: poblar desde GET /api/estados-turno.
export interface EstadoTurno {
  id: number;
  nombre: string;
  es_final: boolean;
}

export const estadosTurno: EstadoTurno[] = [
  { id: 1, nombre: "pendiente", es_final: false },
  { id: 2, nombre: "confirmado", es_final: false },
  { id: 3, nombre: "cancelado", es_final: true },
  { id: 4, nombre: "atendido", es_final: true },
  { id: 5, nombre: "no_asistio", es_final: true },
];

// ─── Regla de transición de estados (HU-TUR-02, confirmada con el equipo) ────
// Nunca se retrocede: pendiente → solo confirmado → solo atendido | cancelado |
// no_asistio. Los finales (3, 4, 5) no admiten cambio.
// BACKEND: validar en PATCH /turnos/:id que la transición sea permitida.
export const transicionesEstado: Record<number, number[]> = {
  1: [2], // pendiente → confirmado
  2: [3, 4, 5], // confirmado → cancelado | atendido | no_asistio
  3: [], // final
  4: [], // final
  5: [], // final
};

// Etiqueta humana del catálogo para selects y confirmaciones (la BD guarda
// el nombre crudo: "no_asistio"). // BACKEND: poblar desde GET /api/estados-turno.
export const nombreEstado: Record<number, string> = {
  1: "Pendiente",
  2: "Confirmado",
  3: "Cancelado",
  4: "Atendido",
  5: "No asistió",
};

// ─── Catálogo practica (la duración determina hora_fin = hora_inicio + duración) ──
/** GET /api/practicas. */
export interface Practica {
  id: number;
  nombre: string;
  /** dict: practica.duracion_estimada_minutos int NOT NULL. */
  duracionMinutos: number;
  /** Precio vigente en lista_precio_practica. */
  precio?: number | null;
}

// ─── Profesionales (usuario con rol Veterinario) ─────────────────────────────
// GET /api/profesionales (usuarios con rol Veterinario + sus franjas).
export interface FranjaProfesional {
  /** dict: agenda_profesional.id (PK). */
  id: number;
  /** dict: agenda_profesional.agenda_semanal.dia_semana — ISO 8601, 1=lunes…7=domingo. */
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface Profesional {
  /** usuario.id (rol Veterinario). */
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  /** Franjas semanales del profesional (agenda_profesional, dentro de agenda_semanal). */
  franjas: FranjaProfesional[];
}

// Directorio de display (tab Turnos, Agenda y Clínica): resuelve el nombre del
// profesional y de la práctica desde las FK del turno. Se arma con los
// catálogos que devuelven GET /api/profesionales y GET /api/practicas.
export interface DirectorioTurnos {
  profesionalPorFranja: Record<number, { nombre: string; apellido: string }>;
  profesionalIdPorFranja: Record<number, number>;
  practicaPorId: Record<number, Practica>;
}

export function armarDirectorio(profesionales: Profesional[], practicas: Practica[]): DirectorioTurnos {
  const profesionalPorFranja: DirectorioTurnos["profesionalPorFranja"] = {};
  const profesionalIdPorFranja: DirectorioTurnos["profesionalIdPorFranja"] = {};
  for (const p of profesionales) {
    for (const f of p.franjas) {
      profesionalPorFranja[f.id] = { nombre: p.nombre, apellido: p.apellido };
      profesionalIdPorFranja[f.id] = p.id;
    }
  }
  return {
    profesionalPorFranja,
    profesionalIdPorFranja,
    practicaPorId: Object.fromEntries(practicas.map((pr) => [pr.id, pr])),
  };
}

// ─── Turno ───────────────────────────────────────────────────────────────────
export interface Turno {
  /** dict: turno.id (PK, la genera la base). */
  id: number;
  /** FK → cliente.id. */
  clienteId: number;
  /** FK → mascota.id. */
  mascotaId: number;
  /** dict: turno.sucursal_id FK → sucursal.id — la deriva el backend desde agenda_profesional. */
  sucursalId: number;
  /** FK → agenda_profesional.id (franja elegida del profesional). */
  agendaProfesionalId: number;
  /** FK → practica.id. */
  practicaId: number;
  /** FK → estado_turno.id (1 pendiente, 2 confirmado, 3 cancelado, 4 atendido, 5 no_asistio). */
  estadoId: number;
  /** dict: turno.fecha date → ISO "YYYY-MM-DD". */
  fecha: string;
  /** dict: turno.hora_inicio time → "HH:mm". */
  horaInicio: string;
  /** dict: turno.hora_fin time → "HH:mm" (CHECK hora_fin > hora_inicio). */
  horaFin: string;
  /** dict: turno.notas text (nullable). */
  notas: string | null;
  /** dict: turno.usuario_id FK → usuario.id (quien cargó = recepcionista). */
  usuarioId: number;
  /** dict: turno.fecha_creacion timestamptz → ISO. */
  fechaCreacion: string;
  /** dict: turno.pagado — true cuando la atención ya fue cobrada (HU-VTA-01). */
  pagado: boolean;
  /** Precio vigente de la práctica asociada (desde lista_precio_practica). */
  practicaPrecio?: number | null;
}

/** Lo que POST /turnos manda; sucursal_id, estado_id y fecha_creacion las completa el backend. */
export type TurnoDraft = Pick<
  Turno,
  | "clienteId"
  | "mascotaId"
  | "agendaProfesionalId"
  | "practicaId"
  | "fecha"
  | "horaInicio"
  | "horaFin"
  | "notas"
>;

// ─── Helpers de horarios (agenda) ────────────────────────────────────────────
// Junto al EXCLUDE USING gist de BD, el front valida disponibilidad antes de
// confirmar (regla anti-solapamiento: solo se solapan estados <> cancelado).

const DIAS_NOMBRE = [
  "",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minutosAString(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function aISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sumarMinutos(hora: string, minutos: number): string {
  return minutosAString(aMinutos(hora) + minutos);
}

/**
 * Normaliza texto para búsqueda: sin mayúsculas ni acentos.
 * El buscador de turnos la usa para que "cirugia" encuentre "Cirugía" (práctica)
 * y "perez" encuentre "Pérez" (cliente o profesional).
 */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Convierte una fecha ISO a día ISO 8601 (1=lunes … 7=domingo), como agenda_semanal.dia_semana. */
export function diaSemanaDeFecha(fechaISO: string): number {
  const jsDia = new Date(`${fechaISO}T00:00:00`).getDay(); // 0=domingo…6=sábado
  return jsDia === 0 ? 7 : jsDia;
}

/** Fecha "2026-09-23" → "23 sept 2026" (es-AR). */
export function formatearFecha(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** Timestamp ISO → "20/09/2026 · 14:35" (detalle, fecha/hora de creación). */
export function formatearFechaHora(fechaISO: string): string {
  const date = new Date(fechaISO);
  const fecha = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const hora = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${fecha} · ${hora}`;
}

// ─── Helpers de la agenda semanal (HU-TUR-02) ────────────────────────────────
/** Suma `dias` a una fecha ISO "YYYY-MM-DD" (puede atravesar años). */
export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  cursor.setDate(cursor.getDate() + dias);
  return aISO(cursor);
}

/** Lunes (ISO) de la semana que contiene la fecha. "2026-09-16" → "2026-09-14". */
export function lunesDeFecha(fechaISO: string): string {
  return sumarDias(fechaISO, 1 - diaSemanaDeFecha(fechaISO));
}

/** Las 7 fechas (lunes → domingo) de la semana cuyo lunes se pasa. */
export function fechasDeSemana(lunesISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunesISO, i));
}

/** "2026-09-14" → "14/09". */
function fechaCorta(fechaISO: string): string {
  const [, m, d] = fechaISO.split("-");
  return `${d}/${m}`;
}

/** "del 14/09 al 20/09/2026" (rango de la semana, encabezado de la agenda). */
export function formatearSemana(lunesISO: string): string {
  const dias = fechasDeSemana(lunesISO);
  return `del ${fechaCorta(dias[0])} al ${fechaCorta(dias[6])}/${dias[6].split("-")[0]}`;
}

/**
 * Próximos `cantidad` días (desde mañana) en los que el profesional atiende
 * (su franja semanal agenda_profesional tiene cubierto ese día).
 */
export function proximosDiasLaborables(
  franjas: FranjaProfesional[],
  cantidad = 5,
): { fecha: string; label: string }[] {
  const diasConFranja = new Set(franjas.map((f) => f.diaSemana));
  const result: { fecha: string; label: string }[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  let guard = 0;
  while (result.length < cantidad && guard < 40) {
    guard++;
    const iso = aISO(cursor);
    const dia = diaSemanaDeFecha(iso);
    if (diasConFranja.has(dia)) {
      result.push({
        fecha: iso,
        label: `${DIAS_NOMBRE[dia]} ${formatearFecha(iso)}`,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Horarios de inicio discretos (cada 15 min) dentro de una franja del
 * profesional, recortados por la duración de la práctica (hora_fin = inicio +
 * duración debe caer dentro de la franja). `ocupados` marca los slots que ya
 * cubre otro turno del profesional en la fecha (anti-solapamiento).
 */
export function generarSlots(
  franja: FranjaProfesional,
  duracionMinutos: number,
  ocupados: string[] = [],
): { hora: string; ocupado: boolean }[] {
  const inicio = aMinutos(franja.horaInicio);
  const fin = aMinutos(franja.horaFin);
  const slots: { hora: string; ocupado: boolean }[] = [];
  const ultimo = fin - duracionMinutos;
  for (let t = inicio; t <= ultimo; t += 15) {
    const hora = minutosAString(t);
    slots.push({ hora, ocupado: ocupados.includes(hora) });
  }
  return slots;
}

/** True si la hora cae dentro del rango del turno dado (a.hora >= b.inicio && a.hora < b.fin). */
export function horaDentroDeTurno(turno: Turno, horaInicio: string): boolean {
  return horaInicio >= turno.horaInicio && horaInicio < turno.horaFin;
}

/**
 * Regla anti-solapamiento (mismo profesional · misma fecha · estados <> 3):
 * dos turnos se solapan si cada uno empieza antes de que termine el otro.
 * Es espejo del EXCLUDE USING gist de BD; el backend también valida con OVERLAPS.
 */
/**
 * Igual que `haySuperposicion` pero para un turno que TODAVÍA NO EXISTE.
 *
 * El draft no tiene `id`, así que no hay nada que excluir de la comparación:
 * antes se pasaba `id: 0`, que funcionaba de casualidad (ningún turno guardado
 * tiene id 0) y escondía que el caso era distinto.
 *
 * ⚠️ Es feedback de UI, no la garantía. El backend revalida contra la base y,
 *    bajo concurrencia, el constraint `turno_sin_superposicion_excl` es lo
 *    único que impide el turno duplicado.
 */
export function haySuperposicionDraft(
  draft: Pick<Turno, "agendaProfesionalId" | "fecha" | "horaInicio" | "horaFin">,
  existentes: Turno[],
): boolean {
  return existentes.some(
    (t) =>
      t.agendaProfesionalId === draft.agendaProfesionalId &&
      t.fecha === draft.fecha &&
      t.estadoId !== 3 && // cancelado liberó el hueco
      draft.horaInicio < t.horaFin &&
      t.horaInicio < draft.horaFin,
  );
}

export function haySuperposicion(turno: Pick<Turno, "id" | "agendaProfesionalId" | "fecha" | "horaInicio" | "horaFin">, existentes: Turno[]): boolean {
  return existentes.some(
    (t) =>
      t.id !== turno.id &&
      t.agendaProfesionalId === turno.agendaProfesionalId &&
      t.fecha === turno.fecha &&
      t.estadoId !== 3 && // cancelado liberó el hueco
      turno.horaInicio < t.horaFin &&
      t.horaInicio < turno.horaFin,
  );
}

/** Horas ocupadas de un profesional en una fecha (turnos no cancelados), para deshabilitar slots. */
export function horasOcupadas(turnos: Turno[], agendaProfesionalId: number, fecha: string): string[] {
  const ocupadas: string[] = [];
  const turnosDelDia = turnos.filter(
    (t) => t.agendaProfesionalId === agendaProfesionalId && t.fecha === fecha && t.estadoId !== 3,
  );
  for (const t of turnosDelDia) {
    let h = t.horaInicio;
    while (h < t.horaFin) {
      ocupadas.push(h);
      h = sumarMinutos(h, 15);
    }
  }
  return ocupadas;
}