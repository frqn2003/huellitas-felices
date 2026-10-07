/**
 * HU-CLIN-01 — tipos del módulo Consulta Médica.
 */

/** Fila de consulta_medica con el turno, cliente, mascota y profesional ya resueltos por JOIN. */
export type ConsultaRow = {
  id: number;
  turno_id: number;
  profesional_id: number;
  turno_fecha: string; // 'YYYY-MM-DD' (to_char en el SQL)
  turno_hora_inicio: string; // 'HH24:MI'
  turno_hora_fin: string;
  cliente_id: number;
  cliente_nombre: string;
  cliente_dni: string;
  mascota_id: number;
  mascota_nombre: string;
  mascota_especie: string;
  mascota_raza: string | null;
  mascota_sexo: string;
  /** numeric → string desde `pg`. */
  mascota_peso_anterior: string | null;
  profesional_nombre: string;
  practica_nombre: string;
  motivo_consulta: string;
  diagnostico: string | null;
  tratamiento: string | null;
  estado_fisico_general: string | null;
  temperatura: string | null;
  frecuencia_cardiaca: number | null;
  peso: string | null;
  cerrada: boolean;
  fecha_hora: Date;
  fecha_cierre: Date | null;
};

export type InsumoRow = {
  id: number;
  consulta_id: number;
  articulo_id: number;
  codigo: string;
  nombre: string;
  unidad_medida: string;
  cantidad: number;
};

export type NotaRow = {
  id: number;
  consulta_id: number;
  usuario_id: number;
  profesional: string;
  nota: string;
  fecha_hora: Date;
};

/** Turno mínimo que necesita "abrir consulta". */
export type TurnoParaConsultaRow = {
  id: number;
  cliente_id: number;
  mascota_id: number;
  notas: string | null;
  estado_nombre: string;
  estado_es_final: boolean;
  usuario_id: number;
  profesional_usuario_id: number | null;
};

export type DatosCierre = {
  motivoConsulta: string;
  diagnostico: string;
  tratamiento: string | null;
  estadoFisicoGeneral: string | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  pesoMomento: number | null;
  medicacionIndicada: string | null;
};
