import type { Row } from "@/lib/db/schema.types";

/**
 * HU-TUR-01 — tipos del módulo Turnos.
 *
 * ⚠️ EL TURNO NO GUARDA UN "PROFESIONAL". Guarda `agenda_profesional_id`, que
 *    es una FRANJA de trabajo de un veterinario:
 *
 *      turno → agenda_profesional → agenda_semanal → agenda → sucursal
 *                     ↓                    ↓
 *                  usuario           dia_semana (ISO: 1=lunes … 7=domingo)
 *
 *    De ahí salen dos cosas que la recepcionista NO carga:
 *      · el profesional (agenda_profesional.usuario_id)
 *      · la sucursal (la completa el trigger fn_turno_sincronizar_sucursal)
 */

/** Fila del SELECT del listado, con todos los JOIN de display resueltos. */
export type TurnoRow = Pick<
  Row<"turno">,
  | "id"
  | "cliente_id"
  | "mascota_id"
  | "sucursal_id"
  | "agenda_profesional_id"
  | "practica_id"
  | "estado_id"
  | "fecha"
  | "hora_inicio"
  | "hora_fin"
  | "notas"
  | "usuario_id"
  | "fecha_creacion"
> & {
  // Resuelto por los JOIN. No son columnas de `turno`.
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_documento: string;
  mascota_nombre: string;
  mascota_especie: string;
  practica_nombre: string;
  estado_nombre: string;
  estado_es_final: boolean;
  profesional_id: number;
  profesional_nombre: string;
  profesional_apellido: string;
  sucursal_nombre: string;
};

/** Una franja de trabajo del profesional (`agenda_profesional` + su día). */
export type FranjaRow = Pick<
  Row<"agenda_profesional">,
  "id" | "usuario_id" | "hora_inicio" | "hora_fin" | "estado"
> & {
  /** De `agenda_semanal`: ISO 8601, 1=lunes … 7=domingo. */
  dia_semana: number;
  /** Estado de la franja general de la sucursal, que también puede estar inactiva. */
  agenda_semanal_estado: string;
  sucursal_id: number;
};

/** Un veterinario con sus franjas, para el select del wizard. */
export type ProfesionalRow = Pick<Row<"usuario">, "id" | "nombre" | "apellido" | "dni">;

/** Filtros del listado. Salen de FiltrosTurnos.tsx. */
export type FiltrosTurno = {
  /** Busca por cliente (nombre/documento), profesional o práctica. */
  busqueda?: string;
  estadoId?: number;
  /** Rango de fechas ISO (YYYY-MM-DD). */
  desde?: string;
  hasta?: string;
  /** Para la agenda de un profesional puntual. */
  profesionalId?: number;
  sucursalId?: number;
  /** Historial de turnos de un cliente o de una mascota (HU-TUR-02). */
  clienteId?: number;
  mascotaId?: number;
};

/** Datos para insertar (ya validados por el schema). */
export type TurnoInput = {
  clienteId: number;
  mascotaId: number;
  agendaProfesionalId: number;
  practicaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notas: string | null;
};
