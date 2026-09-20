import type { Profesional, Turno } from "@/data/turnos";
import type { FranjaRow, ProfesionalRow, TurnoRow } from "./turno.types";

/**
 * HU-TUR-01 — traduce filas de Postgres → shape que el front espera.
 *
 * Tres conversiones que no son opcionales:
 *
 *  1. NOMBRES: el contrato de este módulo es camelCase (`clienteId`,
 *     `horaInicio`). Cada mapper copia el estilo de SU módulo.
 *
 *  2. `time` → "HH:mm". Postgres devuelve "10:00:00" y el front muestra
 *     "10:00". Sin recortar, los `<option>` del select de horarios no matchean
 *     con el valor guardado y el turno abre con el horario vacío.
 *
 *  3. `date` → "YYYY-MM-DD" y `timestamp` → ISO.
 */

/**
 * `date` de Postgres → "YYYY-MM-DD".
 *
 * ⚠️ NO usa `toISOString()`: esa función pasa a UTC. El driver devuelve la
 *    medianoche LOCAL del server, así que en Argentina (UTC-3) un 2026-09-23
 *    llega como 2026-09-23T03:00Z — que en ISO todavía da el 23, pero en un
 *    server al oeste de UTC daría el 22. Se arma con las partes locales, que
 *    es lo que la columna `date` realmente guarda.
 */
function aFechaISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** "10:00:00" → "10:00". El front trabaja siempre con HH:mm. */
function aHoraCorta(hora: string): string {
  return hora.slice(0, 5);
}

export function toApi(row: TurnoRow): Turno {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    mascotaId: row.mascota_id,
    sucursalId: row.sucursal_id,
    agendaProfesionalId: row.agenda_profesional_id,
    practicaId: row.practica_id,
    estadoId: row.estado_id,
    fecha: aFechaISO(row.fecha),
    horaInicio: aHoraCorta(row.hora_inicio),
    horaFin: aHoraCorta(row.hora_fin),
    notas: row.notas,
    usuarioId: row.usuario_id,
    fechaCreacion: row.fecha_creacion.toISOString(),
  };

  // NOTA: los nombres de cliente, mascota, profesional, práctica y sucursal
  // vienen en la fila (los usa la BÚSQUEDA, que se resuelve en SQL) pero NO se
  // exponen: el contrato `Turno` solo declara ids, y la pantalla resuelve los
  // nombres contra sus propios directorios. Es la decisión que ya tomó el front
  // ("los ids de FK viajan con comentario; el front los junta con los
  // directorios para display, no se duplica texto en el modelo" —
  // src/data/turnos.ts). Si algún día conviene mandarlos, se agregan acá y a la
  // interfaz del front a la vez.
}

export function toApiList(rows: TurnoRow[]): Turno[] {
  return rows.map(toApi);
}

/**
 * Arma el catálogo de profesionales con sus franjas.
 *
 * Recibe las dos listas por separado —los veterinarios y TODAS las franjas— y
 * las junta acá, en una pasada. La alternativa sería pedir las franjas de cada
 * profesional por separado: con 8 veterinarios son 9 consultas en vez de 2.
 */
export function toApiProfesionales(
  profesionales: ProfesionalRow[],
  franjas: FranjaRow[],
): Profesional[] {
  const porUsuario = new Map<number, FranjaRow[]>();
  for (const f of franjas) {
    const actuales = porUsuario.get(f.usuario_id) ?? [];
    actuales.push(f);
    porUsuario.set(f.usuario_id, actuales);
  }

  return profesionales.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    dni: p.dni,
    franjas: (porUsuario.get(p.id) ?? []).map((f) => ({
      id: f.id,
      diaSemana: f.dia_semana,
      horaInicio: aHoraCorta(f.hora_inicio),
      horaFin: aHoraCorta(f.hora_fin),
    })),
  }));
}
