"use client";

import {
  ClipboardList,
  Search,
  Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import {
  FiltrosConsulta,
  FiltrosConsultaChips,
  FILTROS_CONSULTA_VACIOS,
  type FiltrosConsultaValues,
} from "@/components/clinica/FiltrosConsulta";
import { TurnosTable, type TurnoRow } from "@/components/turnos/TurnosTable";
import { construirFilaTurno } from "@/components/turnos/turnoRow";

import {
  turnosIniciales,
  profesionalPorFranja,
  profesionalIdPorFranja,
  practicaPorId,
} from "@/data/turnos";
import { clientesIniciales, type Cliente } from "@/data/clientes";
import { mascotasIniciales, type Mascota } from "@/data/mascotas";
import { consultasIniciales } from "@/data/consultas";

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Prioridad de atención en clínica (confirmado primero, luego pendiente, resto al fondo)
const PRIORIDAD_ESTADO: Record<number, number> = { 2: 0, 1: 1, 4: 2, 3: 3, 5: 3 };

// ── Página principal ────────────────────────────────────────────────────────────

export default function ClinicaPage() {
  const router = useRouter();
  const [filtros, setFiltros] = useState<FiltrosConsultaValues>(FILTROS_CONSULTA_VACIOS);

  const clientePorId = useMemo(
    () => Object.fromEntries(clientesIniciales.map((c) => [c.id, c])) as Record<number, Cliente>,
    [],
  );
  const mascotaPorId = useMemo(
    () => Object.fromEntries(mascotasIniciales.map((m) => [m.id, m])) as Record<number, Mascota>,
    [],
  );

  // BACKEND: GET /api/turnos?fecha=hoy&rol=veterinario
  const turnosFiltrados = useMemo(() => {
    let list = [...turnosIniciales];

    // 1. Filtro de estado
    if (filtros.estadoId !== "") {
      list = list.filter((t) => t.estadoId === Number(filtros.estadoId));
    }

    // 2. Filtro de profesional
    if (filtros.profesionalId !== "") {
      list = list.filter((t) => {
        const profId = profesionalIdPorFranja[t.agendaProfesionalId];
        return profId !== undefined && String(profId) === filtros.profesionalId;
      });
    }

    // 3. Filtro de práctica
    if (filtros.practicaId !== "") {
      list = list.filter((t) => t.practicaId === Number(filtros.practicaId));
    }

    // 4. Búsqueda por texto (paciente, cliente, DNI, profesional, práctica)
    if (filtros.busqueda.trim() !== "") {
      const q = normalizar(filtros.busqueda.trim());
      list = list.filter((t) => {
        const c = clientesIniciales.find((cl) => cl.id === t.clienteId);
        const m = mascotasIniciales.find((ma) => ma.id === t.mascotaId);
        const p = profesionalPorFranja[t.agendaProfesionalId];
        const pr = practicaPorId[t.practicaId];

        const clienteNom = c ? `${c.nombre} ${c.apellido}` : "";
        const dni = c?.documento ?? "";
        const mascotaNom = m?.nombre ?? "";
        const raza = m?.raza ?? "";
        const especie = m?.especie ?? "";
        const profNom = p ? `${p.nombre} ${p.apellido}` : "";
        const pracNom = pr?.nombre ?? "";

        return (
          normalizar(clienteNom).includes(q) ||
          normalizar(dni).includes(q) ||
          normalizar(mascotaNom).includes(q) ||
          normalizar(raza).includes(q) ||
          normalizar(especie).includes(q) ||
          normalizar(profNom).includes(q) ||
          normalizar(pracNom).includes(q)
        );
      });
    }

    // 5. Ordenación
    list.sort((a, b) => {
      if (filtros.orden === "hora_asc") {
        return a.horaInicio.localeCompare(b.horaInicio);
      }
      if (filtros.orden === "hora_desc") {
        return b.horaInicio.localeCompare(a.horaInicio);
      }
      if (filtros.orden === "paciente_asc") {
        const mA = mascotasIniciales.find((m) => m.id === a.mascotaId)?.nombre ?? "";
        const mB = mascotasIniciales.find((m) => m.id === b.mascotaId)?.nombre ?? "";
        return mA.localeCompare(mB);
      }
      if (filtros.orden === "cliente_asc") {
        const cA = clientesIniciales.find((c) => c.id === a.clienteId)?.nombre ?? "";
        const cB = clientesIniciales.find((c) => c.id === b.clienteId)?.nombre ?? "";
        return cA.localeCompare(cB);
      }

      // Default: prioridad de estado (confirmado -> pendiente -> resto) y luego hora
      const pA = PRIORIDAD_ESTADO[a.estadoId] ?? 99;
      const pB = PRIORIDAD_ESTADO[b.estadoId] ?? 99;
      if (pA !== pB) return pA - pB;
      return a.horaInicio.localeCompare(b.horaInicio);
    });

    return list;
  }, [filtros]);

  const turnosRows: TurnoRow[] = useMemo(() => {
    return turnosFiltrados.map((t) => construirFilaTurno(t, clientePorId, mascotaPorId));
  }, [turnosFiltrados, clientePorId, mascotaPorId]);

  // Contadores
  const porAtenderCount = turnosIniciales.filter((t) => t.estadoId === 1 || t.estadoId === 2).length;
  const atendidosCount = turnosIniciales.filter((t) => t.estadoId === 4).length;

  const hasActiveFilters =
    filtros.busqueda !== "" ||
    filtros.estadoId !== "" ||
    filtros.profesionalId !== "" ||
    filtros.practicaId !== "" ||
    filtros.orden !== "prioridad";

  function handleLimpiarTodo() {
    setFiltros(FILTROS_CONSULTA_VACIOS);
  }

  function tieneConsulta(turnoId: number) {
    return consultasIniciales.some((c) => c.turnoId === turnoId);
  }

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera estándar del sistema */}
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            {/* Título y badge */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Atención Clínica
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Turnos del día
                </h1>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900/10 px-3 py-1.5 text-xs font-extrabold text-brand-900">
                  <span className="h-2 w-2 rounded-full bg-status-success" aria-hidden="true" />
                  {porAtenderCount} por atender
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-cream-100 px-3 py-1.5 text-xs font-semibold text-text-secondary">
                  {atendidosCount} atendidos hoy
                </span>
              </div>
            </div>

            {/* Buscador + Filtros y orden */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search input */}
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
                    placeholder="Buscar por paciente, cliente, DNI, profesional o práctica..."
                    aria-label="Buscar turnos por paciente, cliente, DNI, profesional o práctica"
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </div>

                {/* Filtros y ordenación dropdown */}
                <FiltrosConsulta filtros={filtros} onChange={setFiltros} />
              </div>

              {/* Chips de filtros activos */}
              <div className="flex flex-wrap items-center">
                <FiltrosConsultaChips
                  filtros={filtros}
                  onChange={setFiltros}
                  onClearAll={handleLimpiarTodo}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          <TurnosTable
            turnos={turnosRows}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleLimpiarTodo}
            renderActions={(t) => {
              const consultaExiste = tieneConsulta(t.id);
              const esFinal = [3, 4, 5].includes(t.estadoId);
              const puedeResolver = !esFinal;

              if (puedeResolver) {
                return (
                  <button
                    type="button"
                    onClick={() => router.push(`/consulta/${t.id}`)}
                    aria-label={`Atender turno #${t.id}`}
                    title="Atender"
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                  >
                    <Stethoscope className="h-5 w-5 text-brand-900" aria-hidden="true" />
                  </button>
                );
              }

              if (consultaExiste) {
                return (
                  <button
                    type="button"
                    onClick={() => router.push(`/consulta/${t.id}`)}
                    aria-label={`Ver consulta del turno #${t.id}`}
                    title="Ver consulta"
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                  >
                    <ClipboardList className="h-5 w-5 text-brand-900" aria-hidden="true" />
                  </button>
                );
              }

              return null;
            }}
          />
        </div>
      </main>
    </div>
  );
}
