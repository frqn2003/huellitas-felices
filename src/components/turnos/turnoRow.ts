import {
  formatearFechaHora,
  practicaPorId,
  profesionalPorFranja,
  type Turno,
} from "@/data/turnos";
import type { Cliente } from "@/data/clientes";
import type { Mascota } from "@/data/mascotas";
import type { TurnoRow } from "./TurnosTable";

// Convierte un Turno en la fila de display que usan la tabla (HU-TUR-01) y la
// agenda (HU-TUR-02). El front resuelve los nombres con los directorios (los
// traería el backend con JOIN en GET /turnos); la franja elegida
// (agenda_profesional.id) mapea al profesional vía su agenda.
export function construirFilaTurno(
  t: Turno,
  clientePorId: Record<number, Cliente>,
  mascotaPorId: Record<number, Mascota>,
): TurnoRow {
  const cli = clientePorId[t.clienteId];
  const mas = mascotaPorId[t.mascotaId];
  const pro = profesionalPorFranja[t.agendaProfesionalId];
  const pra = practicaPorId[t.practicaId];
  return {
    id: t.id,
    fecha: t.fecha,
    horaInicio: t.horaInicio,
    horaFin: t.horaFin,
    clienteNombre: cli ? `${cli.nombre} ${cli.apellido}` : `Cliente #${t.clienteId}`,
    dni: cli?.documento ?? "",
    mascotaNombre: mas?.nombre ?? `Mascota #${t.mascotaId}`,
    especie: mas?.especie ?? "",
    profesionalNombre: pro ? `${pro.nombre} ${pro.apellido}` : `Profesional #${t.agendaProfesionalId}`,
    practicaNombre: pra?.nombre ?? `Práctica #${t.practicaId}`,
    estadoId: t.estadoId,
    notas: t.notas,
    fechaCreacionHora: formatearFechaHora(t.fechaCreacion),
  };
}