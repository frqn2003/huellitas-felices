"use client";

import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Cliente } from "@/data/clientes";
import type { Mascota } from "@/data/mascotas";
import {
  diaSemanaDeFecha,
  fechasDeSemana,
  formatearSemana,
  lunesDeFecha,
  profesionalIdPorFranja,
  profesionalPorFranja,
  practicaPorId,
  profesionales,
  SIMULAR_ERROR,
  SIMULAR_VACIO,
  sumarDias,
  sumarMinutos,
  type Turno,
} from "@/data/turnos";
import { Button } from "@/components/ui/Button";
import { EstadoTurnoBadge } from "./EstadoTurnoBadge";
import {
  FILTROS_AGENDA_VACIOS,
  FiltrosAgenda,
  FiltrosAgendaChips,
  type FiltrosAgendaValues,
} from "./FiltrosAgenda";
import { TurnoDetalleModal } from "./TurnoDetalleModal";
import { construirFilaTurno } from "./turnoRow";
import type { TurnoRow } from "./TurnosTable";

const DIAS_CORTOS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function aISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minutosAString(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Eje horario de la grilla: bandas de 1h que van del inicio más temprano al fin
// más tardío de las franjas de los profesionales en vista (ej: 08..18 → 10 filas).
function bandasDeFranjas(franjas: { horaInicio: string; horaFin: string }[]): string[] {
  if (franjas.length === 0) return [];
  let min = Infinity;
  let max = 0;
  for (const f of franjas) {
    min = Math.min(min, aMinutos(f.horaInicio));
    max = Math.max(max, aMinutos(f.horaFin));
  }
  const bandas: string[] = [];
  for (let t = min; t < max; t += 60) bandas.push(minutosAString(t));
  return bandas;
}

interface AgendaSemanalProps {
  clientes: Cliente[];
  mascotas: Mascota[];
  turnos: Turno[];
  /** HU-TUR-02: aplica el cambio de estado (PATCH). Devuelve si fue OK. */
  onCambiarEstado: (turnoId: number, estadoId: number) => boolean;
}

export function AgendaSemanal({
  clientes,
  mascotas,
  turnos,
  onCambiarEstado,
}: AgendaSemanalProps) {
  const hoyISO = useMemo(() => aISO(new Date()), []);
  const [lunes, setLunes] = useState(() => lunesDeFecha(hoyISO));
  const [filtros, setFiltros] = useState<FiltrosAgendaValues>(FILTROS_AGENDA_VACIOS);
  const [error, setError] = useState(SIMULAR_ERROR);
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState<TurnoRow | null>(null);

  const clientePorId = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])) as Record<number, Cliente>,
    [clientes],
  );
  const mascotaPorId = useMemo(
    () => Object.fromEntries(mascotas.map((m) => [m.id, m])) as Record<number, Mascota>,
    [mascotas],
  );

  const perfiles =
    filtros.profesionalId === ""
      ? profesionales
      : profesionales.filter((p) => String(p.id) === filtros.profesionalId);
  const franjas = perfiles.flatMap((p) => p.franjas);
  const diasConFranja = useMemo(
    () => new Set(franjas.map((f) => f.diaSemana)),
    [franjas],
  );
  const bandas = useMemo(() => bandasDeFranjas(franjas), [franjas]);

  // Los turnos de la semana visible, ya filtrados (profesional/estado/practica/ rango).
  const dias = useMemo(() => fechasDeSemana(lunes), [lunes]);
  const primero = dias[0];
  const ultimo = dias[6];
  const semanaTurnos = useMemo(() => {
    if (SIMULAR_VACIO) return [];
    return turnos.filter((t) => {
      if (filtros.profesionalId && profesionalIdPorFranja[t.agendaProfesionalId] !== Number(filtros.profesionalId)) return false;
      if (filtros.estadoId && t.estadoId !== Number(filtros.estadoId)) return false;
      if (filtros.practicaId && t.practicaId !== Number(filtros.practicaId)) return false;
      if (filtros.desde && t.fecha < filtros.desde) return false;
      if (filtros.hasta && t.fecha > filtros.hasta) return false;
      return t.fecha >= primero && t.fecha <= ultimo;
    });
  }, [turnos, filtros, primero, ultimo]);

  const turnosDeCelda = (fecha: string, banda: string) =>
    semanaTurnos
      .filter((t) => t.fecha === fecha && `${t.horaInicio.slice(0, 2)}:00` === banda)
      .sort((a, b) => (a.horaInicio < b.horaInicio ? -1 : 1));

  // Turnos de la semana visible SIN los filtros del usuario: sirve para no
  // marcar "Libre" una celda que tiene turno pero quedó oculto por un filtro
  // (ej: rango desde/hasta). Esa celda muestra "—" como si no estuviera libre.
  const semanaTodos = useMemo(() => {
    if (SIMULAR_VACIO) return [];
    return turnos.filter((t) => t.fecha >= primero && t.fecha <= ultimo);
  }, [turnos, primero, ultimo]);

  const celdaConTurnoOculto = (fecha: string, banda: string) =>
    semanaTodos.some((t) => t.fecha === fecha && `${t.horaInicio.slice(0, 2)}:00` === banda);

  // "—" (sin franja del profesional ese día/hora) vs "Libre" (franja sin turno).
  const franjaCubre = (dia: number, banda: string) =>
    franjas.some((f) => f.diaSemana === dia && f.horaInicio <= banda && banda < f.horaFin);

  const handleReintentar = () => {
    setError(false);
    setCargando(true);
    // BACKEND: acá iría el fetch real (GET /agenda/semana?fecha=&usuario_id=).
    window.setTimeout(() => setCargando(false), 400);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl text-brand-900">
          <CalendarRange className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-extrabold">Semana</span>{" "}
            {formatearSemana(lunes)} ·{" "}
            {semanaTurnos.length} turno{semanaTurnos.length === 1 ? "" : "s"}
          </span>
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <FiltrosAgenda filtros={filtros} onChange={setFiltros} />
          <div className="flex items-center gap-2" role="group" aria-label="Navegación de semanas">
          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={() => setLunes(lunesDeFecha(hoyISO))}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="md"
            type="button"
            aria-label="Semana anterior"
            onClick={() => setLunes((l) => sumarDias(l, -7))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="md"
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setLunes((l) => sumarDias(l, 7))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <FiltrosAgendaChips filtros={filtros} onChange={setFiltros} />
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
              No se pudo cargar la agenda
            </h3>
            <p className="max-w-sm text-sm text-text-secondary">
              Hubo un problema al consultar la agenda semanal. Revisá tu conexión e intentá de nuevo.
            </p>
          </div>
          <Button variant="secondary" onClick={handleReintentar}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!cargando && semanaTurnos.length === 0 && (
            <p className="text-sm font-medium text-text-secondary">
              No hay turnos para esta semana con los filtros actuales.
            </p>
          )}

          <div
            className={`overflow-x-auto rounded-md border border-border bg-surface shadow-card ${cargando ? "opacity-60" : ""}`}
          >
            <table className="w-full min-w-[54rem] border-collapse text-left" aria-label="Agenda semanal de turnos">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="sticky left-0 bg-surface px-3 py-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
                    Hora
                  </th>
                  {dias.map((fecha) => {
                    const dia = diaSemanaDeFecha(fecha);
                    const conFranja = diasConFranja.has(dia);
                    const esHoy = fecha === hoyISO;
                    return (
                      <th
                        key={fecha}
                        scope="col"
                        className={`border-l border-border px-3 py-3 text-center text-xs font-bold uppercase tracking-wide ${
                          esHoy ? "bg-brand-900/10 text-brand-900" : "text-text-secondary"
                        } ${!conFranja ? "opacity-45" : ""}`}
                      >
                        {DIAS_CORTOS[dia]} {fecha.slice(8)}/{fecha.slice(5, 7)}
                        {esHoy && <span className="ml-1 rounded-pill bg-accent-500 px-1.5 text-[10px] font-extrabold text-brand-900">Hoy</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {bandas.map((banda) => (
                  <tr key={banda} className="border-b border-border last:border-b-0">
                    <th
                      scope="row"
                      className="sticky left-0 whitespace-nowrap bg-surface px-3 py-2 text-xs font-bold text-text-secondary"
                    >
                      {banda} – {sumarMinutos(banda, 60)}
                    </th>
                    {dias.map((fecha) => {
                      const dia = diaSemanaDeFecha(fecha);
                      const conFranja = diasConFranja.has(dia);
                      const cubre = franjaCubre(dia, banda);
                      const turnosCelda = turnosDeCelda(fecha, banda);
                      const sinFranja = !conFranja || !cubre;
                      return (
                        <td
                          key={fecha}
                          className={`border-l border-border px-1.5 py-1.5 align-top ${sinFranja ? "bg-cream-50" : ""}`}
                        >
                          {sinFranja ? (
                            <div className="flex min-h-12 items-center justify-center rounded-sm text-xs font-semibold text-text-secondary/40">
                              —
                            </div>
                          ) : turnosCelda.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {turnosCelda.map((t) => {
                                const cli = clientePorId[t.clienteId];
                                const mas = mascotaPorId[t.mascotaId];
                                const pra = practicaPorId[t.practicaId];
                                const pro = profesionalPorFranja[t.agendaProfesionalId];
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setDetalle(construirFilaTurno(t, clientePorId, mascotaPorId))}
                                    className="flex min-h-12 w-full flex-col items-start gap-0.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left transition-colors duration-fast ease-out hover:border-brand-900/50 hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                                  >
                                    <span className="text-[11px] font-bold leading-none text-text-secondary">
                                      #{String(t.id).padStart(5, "0")} · {t.horaInicio}–{t.horaFin} · {pra?.nombre ?? `#${t.practicaId}`}
                                    </span>
                                    <span className="text-sm font-bold leading-tight text-brand-900">
                                      {cli ? `${cli.nombre} ${cli.apellido}` : `Cliente #${t.clienteId}`}
                                      {" · "}
                                      {mas?.nombre ?? `Mascota #${t.mascotaId}`}
                                    </span>
                                    {filtros.profesionalId === "" && pro && (
                                      <span className="text-[11px] leading-none text-text-secondary">
                                        {pro.nombre} {pro.apellido}
                                      </span>
                                    )}
                                    <EstadoTurnoBadge estadoId={t.estadoId} />
                                  </button>
                                );
                              })}
                            </div>
                          ) : celdaConTurnoOculto(fecha, banda) ? (
                            <div className="flex min-h-12 items-center justify-center rounded-sm text-xs font-semibold text-text-secondary/40">
                              —
                            </div>
                          ) : (
                            <div className="flex min-h-12 items-center justify-center rounded-sm text-xs font-semibold text-text-secondary/40">
                              Libre
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TurnoDetalleModal
        key={detalle?.id ?? -1}
        open={detalle !== null}
        turno={detalle}
        onClose={() => setDetalle(null)}
        // BACKEND: PATCH /turnos/:id { estado_id } + auditoria.
        onCambiarEstado={(turnoId, estadoId) => onCambiarEstado(turnoId, estadoId)}
      />
    </div>
  );
}