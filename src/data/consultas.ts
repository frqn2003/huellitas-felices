// Contrato del módulo Clínica (HU-CLIN-01): la forma EXACTA que devuelve
// GET /api/consultas (src/modules/consultas/consulta.mapper.ts). Los datos salen
// de `consulta_medica`, `consulta_medica_insumo` y `consulta_medica_nota`.

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
