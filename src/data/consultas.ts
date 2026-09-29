// Datos placeholder del módulo Clínica (HU-CLIN-01).
// Tablas: `consulta` (1:1 con turno), `consulta_insumo` (detalle de insumos),
// `nota_consulta` (notas aclaratorias post-cierre).
// Cada `id` es la PK que mandará la base de datos.

// BACKEND:
//   GET    /api/consultas/:turnoId          → consulta de ese turno (si existe)
//   POST   /api/consultas                   → abrir nueva consulta (abierta)
//   PATCH  /api/consultas/:id/cerrar        → finalizar consulta
//   POST   /api/consultas/:id/notas         → agregar nota aclaratoria
//   GET    /api/consultas?mascota_id=       → historial clínico de la mascota
// Insumos para cobro:
//   GET    /api/consultas/:id/insumos       → el módulo Caja (HU-VTA-01) lee estos datos

export type EstadoConsulta = "abierta" | "cerrada";

// Refleja `consulta_insumo`: id, consulta_id, articulo_id, cantidad (decimal 10,2).
// Los campos de display (codigo, nombre, unidadMedida) vienen por JOIN con `articulo`.
export interface ConsultaInsumo {
  id: number;
  consultaId: number;
  articuloId: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  cantidad: number; // decimal(10,2), > 0
}

// Refleja `nota_consulta`: id, consulta_id, profesional_id, nota, fecha_hora.
export interface NotaConsulta {
  id: number;
  consultaId: number;
  profesionalId: number;
  profesional: string; // nombre display (join con usuario)
  nota: string;
  fechaHora: string; // ISO 8601
}

// Refleja la tabla `consulta`:
// id, turno_id, profesional_id, motivo_consulta, diagnostico, tratamiento,
// estado_fisico_general, temperatura (decimal 4,1), frecuencia_cardiaca (int),
// peso_momento (decimal 5,2), estado (abierta/cerrada),
// fecha_hora_apertura, fecha_hora_cierre.
// Los campos de display del turno (cliente, mascota, profesional, práctica) vienen por JOIN.
export interface Consulta {
  id: number;
  turnoId: number;
  profesionalId: number;

  // ── Datos del turno (JOIN, solo display — no editables) ──
  turnoFecha: string;          // "YYYY-MM-DD"
  turnoHoraInicio: string;     // "HH:mm"
  turnoHoraFin: string;        // "HH:mm"
  clienteId: number;
  clienteNombre: string;
  clienteDni: string;
  mascotaId: number;
  mascotaNombre: string;
  mascotaEspecie: string;
  mascotaRaza: string | null;
  mascotaSexo: string;
  /** Peso de `mascota.peso` ANTES de esta consulta — referencia. */
  mascotaPesoAnterior: number | null;
  profesionalNombre: string;
  practicaNombre: string;

  // ── Campos clínicos ──
  motivoConsulta: string;
  diagnostico: string;
  tratamiento: string | null;
  estadoFisicoGeneral: string | null;
  temperatura: number | null;        // °C
  frecuenciaCardiaca: number | null; // lpm
  pesoMomento: number | null;        // kg al momento de la consulta
  // BACKEND: al cerrar, si pesoMomento != null → PATCH /api/mascotas/:id { peso: pesoMomento }

  estado: EstadoConsulta;
  fechaHoraApertura: string;         // ISO 8601
  fechaHoraCierre: string | null;    // null si abierta

  insumos: ConsultaInsumo[];
  notas: NotaConsulta[];
}

/** Datos iniciales que la pantalla recibe al abrirse desde la Agenda (turno precargado). */
export interface ConsultaDraft {
  motivoConsulta: string;
  diagnostico: string;
  tratamiento: string;
  estadoFisicoGeneral: string;
  temperatura: string;        // string en el form; se parsea al guardar
  frecuenciaCardiaca: string; // ídem
  pesoMomento: string;        // ídem
}

export const CONSULTA_DRAFT_VACIO: ConsultaDraft = {
  motivoConsulta: "",
  diagnostico: "",
  tratamiento: "",
  estadoFisicoGeneral: "",
  temperatura: "",
  frecuenciaCardiaca: "",
  pesoMomento: "",
};

// ── Datos hardcodeados ────────────────────────────────────────────────────────

// Consulta cerrada (turno #16 — Dra. Laura Gómez · Pablo Celaya · Poppi · 24/09)
// BACKEND: GET /api/consultas/16 devuelve este objeto
const consultaCerrada: Consulta = {
  id: 2,
  turnoId: 16,
  profesionalId: 5,
  turnoFecha: "2026-09-24",
  turnoHoraInicio: "09:00",
  turnoHoraFin: "10:30",
  clienteId: 1,
  clienteNombre: "Pablo Celaya",
  clienteDni: "45115839",
  mascotaId: 3,
  mascotaNombre: "Poppi",
  mascotaEspecie: "Perro",
  mascotaRaza: "Labrador",
  mascotaSexo: "Hembra",
  mascotaPesoAnterior: 28,
  profesionalNombre: "Dra. Laura Gómez",
  practicaNombre: "Cirugía",
  motivoConsulta: "Castración electiva",
  diagnostico: "Indicación de castración. Paciente en buen estado general.",
  tratamiento:
    "Castración bajo anestesia general. Post-op: Amoxicilina 500mg 2 veces/día por 7 días.",
  estadoFisicoGeneral:
    "Buen estado general. Mucosas rosadas. Hidratación normal.",
  temperatura: 38.5,
  frecuenciaCardiaca: 88,
  pesoMomento: 28.2,
  estado: "cerrada",
  fechaHoraApertura: "2026-09-24T09:00:00Z",
  fechaHoraCierre: "2026-09-24T10:25:00Z",
  insumos: [
    {
      id: 1,
      consultaId: 2,
      articuloId: 1,
      codigo: "ART001",
      nombre: "Amoxicilina 500mg",
      unidadMedida: "Unidad",
      cantidad: 2,
    },
    {
      id: 2,
      consultaId: 2,
      articuloId: 2,
      codigo: "ART002",
      nombre: "Jeringa 5ml",
      unidadMedida: "Unidad",
      cantidad: 3,
    },
  ],
  notas: [
    {
      id: 1,
      consultaId: 2,
      profesionalId: 5,
      profesional: "Dra. Laura Gómez",
      nota: "El paciente toleró bien la anestesia. Se recomienda revisión a los 10 días.",
      fechaHora: "2026-09-24T10:30:00Z",
    },
  ],
};

// Catálogo de artículos activos para el Combobox de insumos
// BACKEND: GET /api/articulos?estado=activo
export const articulosActivos = [
  { id: 1, codigo: "ART001", nombre: "Amoxicilina 500mg", unidadMedida: "Unidad" },
  { id: 2, codigo: "ART002", nombre: "Jeringa 5ml", unidadMedida: "Unidad" },
  { id: 3, codigo: "ART003", nombre: "Alimento Premium Perros", unidadMedida: "Kg" },
  { id: 5, codigo: "ART005", nombre: "Clorhexidina 0.5%", unidadMedida: "mL" },
  { id: 6, codigo: "ART006", nombre: "Guantes descartables S", unidadMedida: "Unidad" },
  { id: 7, codigo: "ART007", nombre: "Ketamina 50mg/mL", unidadMedida: "mL" },
  { id: 8, codigo: "ART008", nombre: "Atropina 0.5mg", unidadMedida: "Unidad" },
  { id: 9, codigo: "ART009", nombre: "Suero fisiológico 500mL", unidadMedida: "Unidad" },
];

// Consulta cerrada (turno #3)
const consultaCerrada3: Consulta = {
  id: 3,
  turnoId: 3,
  profesionalId: 5,
  turnoFecha: "2026-09-08",
  turnoHoraInicio: "15:00",
  turnoHoraFin: "16:30",
  clienteId: 1,
  clienteNombre: "Pablo Celaya",
  clienteDni: "45115839",
  mascotaId: 3,
  mascotaNombre: "Poppi",
  mascotaEspecie: "Perro",
  mascotaRaza: "Labrador",
  mascotaSexo: "Hembra",
  mascotaPesoAnterior: 28,
  profesionalNombre: "Dra. Laura Gómez",
  practicaNombre: "Cirugía",
  motivoConsulta: "Castración programada",
  diagnostico: "Cirugía exitosa. Paciente en recuperación.",
  tratamiento: "Reposo. Analgésicos por 3 días.",
  estadoFisicoGeneral: "Estable post-cirugía.",
  temperatura: 38.0,
  frecuenciaCardiaca: 90,
  pesoMomento: 28.0,
  estado: "cerrada",
  fechaHoraApertura: "2026-09-08T15:00:00Z",
  fechaHoraCierre: "2026-09-08T16:20:00Z",
  insumos: [],
  notas: [],
};

// Consulta cerrada (turno #10)
const consultaCerrada10: Consulta = {
  id: 10,
  turnoId: 10,
  profesionalId: 3,
  turnoFecha: "2026-09-21",
  turnoHoraInicio: "08:00",
  turnoHoraFin: "08:30",
  clienteId: 1,
  clienteNombre: "Pablo Celaya",
  clienteDni: "45115839",
  mascotaId: 3,
  mascotaNombre: "Poppi",
  mascotaEspecie: "Perro",
  mascotaRaza: "Labrador",
  mascotaSexo: "Hembra",
  mascotaPesoAnterior: 28,
  profesionalNombre: "Dr. Juan Pérez",
  practicaNombre: "Consulta",
  motivoConsulta: "Control post-quirúrgico",
  diagnostico: "Evolución favorable de la herida.",
  tratamiento: "Alta médica. Continuar con dieta normal.",
  estadoFisicoGeneral: "Excelente estado.",
  temperatura: 38.2,
  frecuenciaCardiaca: 85,
  pesoMomento: 28.5,
  estado: "cerrada",
  fechaHoraApertura: "2026-09-21T08:00:00Z",
  fechaHoraCierre: "2026-09-21T08:25:00Z",
  insumos: [],
  notas: [],
};

// Consultas existentes en el sistema (para búsqueda por turnoId)
export const consultasIniciales: Consulta[] = [consultaCerrada, consultaCerrada3, consultaCerrada10];

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;
