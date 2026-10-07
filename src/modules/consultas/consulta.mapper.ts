import type { Consulta, ConsultaInsumo, NotaConsulta } from "@/data/consultas";
import type { ConsultaRow, InsumoRow, NotaRow } from "./consulta.types";

/**
 * HU-CLIN-01 — filas de Postgres → `Consulta` de src/data/consultas.ts.
 *
 * `numeric` llega como string desde `pg` → number; `Date` → ISO; el booleano
 * `cerrada` se expone como `estado: "abierta" | "cerrada"`.
 */

const num = (v: string | null): number | null => (v === null ? null : Number(v));

export function toInsumo(r: InsumoRow): ConsultaInsumo {
  return {
    id: r.id,
    consultaId: r.consulta_id,
    articuloId: r.articulo_id,
    codigo: r.codigo,
    nombre: r.nombre,
    unidadMedida: r.unidad_medida,
    cantidad: r.cantidad,
  };
}

export function toNota(r: NotaRow): NotaConsulta {
  return {
    id: r.id,
    consultaId: r.consulta_id,
    profesionalId: r.usuario_id,
    profesional: r.profesional,
    nota: r.nota,
    fechaHora: r.fecha_hora.toISOString(),
  };
}

export function toApi(r: ConsultaRow, insumos: InsumoRow[], notas: NotaRow[]): Consulta {
  return {
    id: r.id,
    turnoId: r.turno_id,
    profesionalId: r.profesional_id,
    turnoFecha: r.turno_fecha,
    turnoHoraInicio: r.turno_hora_inicio,
    turnoHoraFin: r.turno_hora_fin,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre,
    clienteDni: r.cliente_dni,
    mascotaId: r.mascota_id,
    mascotaNombre: r.mascota_nombre,
    mascotaEspecie: r.mascota_especie,
    mascotaRaza: r.mascota_raza,
    mascotaSexo: r.mascota_sexo,
    mascotaPesoAnterior: num(r.mascota_peso_anterior),
    profesionalNombre: r.profesional_nombre,
    practicaNombre: r.practica_nombre,
    motivoConsulta: r.motivo_consulta,
    // El front espera string (no null) en el diagnóstico; una consulta recién
    // abierta todavía no lo tiene.
    diagnostico: r.diagnostico ?? "",
    tratamiento: r.tratamiento,
    estadoFisicoGeneral: r.estado_fisico_general,
    temperatura: num(r.temperatura),
    frecuenciaCardiaca: r.frecuencia_cardiaca,
    pesoMomento: num(r.peso),
    estado: r.cerrada ? "cerrada" : "abierta",
    fechaHoraApertura: r.fecha_hora.toISOString(),
    fechaHoraCierre: r.fecha_cierre ? r.fecha_cierre.toISOString() : null,
    insumos: insumos.filter((i) => i.consulta_id === r.id).map(toInsumo),
    notas: notas.filter((n) => n.consulta_id === r.id).map(toNota),
  };
}
