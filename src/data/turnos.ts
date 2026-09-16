// Datos placeholder del módulo Turnos (HU-TUR-01).
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

// ─── Catálogo practica (la duración determina hora_fin = hora_inicio + duración) ──
// BACKEND: poblar desde GET /api/practicas.
export interface Practica {
  id: number;
  nombre: string;
  /** dict: practica.duracion_estimada_minutos int NOT NULL. */
  duracionMinutos: number;
}

export const practicas: Practica[] = [
  { id: 1, nombre: "Consulta", duracionMinutos: 30 },
  { id: 2, nombre: "Cirugía", duracionMinutos: 90 },
  { id: 3, nombre: "Control", duracionMinutos: 15 },
];

// ─── Profesionales (usuario con rol Veterinario) ─────────────────────────────
// PENDIENTE DBA: `usuario` no modela la especialidad (el wireframe muestra
// "Médico/Cirujano"). El front la muestra como dato de demo hasta que la DBA
// agregue la columna o la tabla `especialidad`.
// BACKEND: reemplazar por GET /api/profesionales (JOIN usuario_rol =
// Veterinario + agenda_profesional).
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
  /** PENDIENTE DBA — no está en `usuario` del esquema. */
  especialidad: string;
  /** Prácticas que puede realizar (médico → consulta/control; cirujano → cirugía).
      BACKEND: GET /api/profesionales/:id/practicas — PENDIENTE DBA: tabla
      profesional_practica o columna `profesion_habilitada` en practica. */
  practicasPermitidas: number[];
  /** Franjas semanales del profesional (agenda_profesional, dentro de agenda_semanal). */
  franjas: FranjaProfesional[];
}

export const profesionales: Profesional[] = [
  {
    id: 3, // usuario.id (rol Veterinario) del directorio src/data/usuarios.ts
    nombre: "Dr. Juan",
    apellido: "Pérez",
    dni: "32456789",
    especialidad: "Médico",
    practicasPermitidas: [1, 3], // consulta + control
    franjas: [
      { id: 1, diaSemana: 1, horaInicio: "08:00", horaFin: "12:00" },
      { id: 2, diaSemana: 1, horaInicio: "14:00", horaFin: "18:00" },
      { id: 3, diaSemana: 2, horaInicio: "08:00", horaFin: "12:00" },
      { id: 4, diaSemana: 2, horaInicio: "14:00", horaFin: "18:00" },
      { id: 5, diaSemana: 3, horaInicio: "08:00", horaFin: "12:00" },
      { id: 6, diaSemana: 3, horaInicio: "14:00", horaFin: "18:00" },
      { id: 7, diaSemana: 4, horaInicio: "08:00", horaFin: "12:00" },
      { id: 8, diaSemana: 4, horaInicio: "14:00", horaFin: "18:00" },
      { id: 9, diaSemana: 5, horaInicio: "08:00", horaFin: "12:00" },
      { id: 10, diaSemana: 5, horaInicio: "14:00", horaFin: "18:00" },
    ],
  },
  {
    id: 5, // usuario.id (rol Veterinario) del directorio src/data/usuarios.ts
    nombre: "Dra. Laura",
    apellido: "Gómez",
    dni: "29876123",
    especialidad: "Cirujana",
    practicasPermitidas: [2], // cirugía
    franjas: [
      { id: 11, diaSemana: 2, horaInicio: "08:00", horaFin: "12:00" },
      { id: 12, diaSemana: 2, horaInicio: "14:00", horaFin: "18:00" },
      { id: 13, diaSemana: 4, horaInicio: "08:00", horaFin: "12:00" },
      { id: 14, diaSemana: 4, horaInicio: "14:00", horaFin: "18:00" },
    ],
  },
];

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

export const RECEPCIONISTA_ID = 4; // usuario.id "Ana Martínez" (rol Recepcionista) de src/data/usuarios.ts

// BACKEND: reemplazar por GET /turnos?fecha=&estado_id=&q= ... los ids de FK
// viajan con comentario (turno.cliente_id → cliente.id, etc.); el front los
// junta con los directorios para display (no se duplica texto en el modelo).
export const turnosIniciales: Turno[] = [
  {
    id: 1,
    clienteId: 1, // Pablo Celaya
    mascotaId: 3, // Poppi
    sucursalId: 1,
    agendaProfesionalId: 1, // Dr. Juan Pérez · lunes mañana
    practicaId: 1, // consulta 30'
    estadoId: 2, // confirmado
    fecha: "2026-09-14",
    horaInicio: "10:00",
    horaFin: "10:30",
    notas: null,
    usuarioId: RECEPCIONISTA_ID,
    fechaCreacion: "2026-09-12T09:20:00.000Z",
  },
  {
    id: 2,
    clienteId: 3, // Nicolas Celaya
    mascotaId: 1, // Azul
    sucursalId: 1,
    agendaProfesionalId: 3, // Dr. Juan Pérez · martes mañana
    practicaId: 3, // control 15'
    estadoId: 1, // pendiente
    fecha: "2026-09-15",
    horaInicio: "09:00",
    horaFin: "09:15",
    notas: "Control anual",
    usuarioId: RECEPCIONISTA_ID,
    fechaCreacion: "2026-09-14T15:05:00.000Z",
  },
  {
    id: 3,
    clienteId: 1, // Pablo Celaya
    mascotaId: 3, // Poppi
    sucursalId: 1,
    agendaProfesionalId: 12, // Dra. Laura Gómez · martes tarde (cirujana)
    practicaId: 2, // cirugía 90'
    estadoId: 4, // atendido
    fecha: "2026-09-08",
    horaInicio: "15:00",
    horaFin: "16:30",
    notas: "Castración programada",
    usuarioId: RECEPCIONISTA_ID,
    fechaCreacion: "2026-09-09T11:40:00.000Z",
  },
  {
    id: 4,
    clienteId: 3, // Nicolas Celaya
    mascotaId: 1, // Azul
    sucursalId: 1,
    agendaProfesionalId: 7, // Dr. Juan Pérez · jueves mañana
    practicaId: 3, // control 15'
    estadoId: 5, // no_asistio
    fecha: "2026-09-10",
    horaInicio: "11:00",
    horaFin: "11:15",
    notas: null,
    usuarioId: RECEPCIONISTA_ID,
    fechaCreacion: "2026-09-08T14:12:00.000Z",
  },
  {
    id: 5,
    clienteId: 1, // Pablo Celaya
    mascotaId: 3, // Poppi
    sucursalId: 1,
    agendaProfesionalId: 4, // Dr. Juan Pérez · martes tarde
    practicaId: 1, // consulta 30'
    estadoId: 3, // cancelado (liberó el hueco de agenda)
    fecha: "2026-09-08",
    horaInicio: "16:00",
    horaFin: "16:30",
    notas: "Cliente canceló",
    usuarioId: RECEPCIONISTA_ID,
    fechaCreacion: "2026-09-05T10:31:00.000Z",
  },
];

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
 * Normaliza texto para búsqueda: sin mayúsculas ni acentos ("Médico" → "medico").
 * El buscador de turnos la usa para que "medico" encuentre "Médico" y
 * "cirugia" encuentre "Cirugía".
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