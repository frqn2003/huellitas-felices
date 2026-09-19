"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { estadosTurno } from "@/data/turnos";
import { Button } from "@/components/ui/Button";

export interface FiltrosTurnosValues {
  /** Busca por cliente (nombre/DNI), profesional (nombre) y práctica. */
  busqueda: string;
  /** "" = todos; resto = id del catálogo estado_turno. */
  estadoId: string;
  desde: string;
  hasta: string;
}

export const FILTROS_TURNOS_VACIOS: FiltrosTurnosValues = {
  busqueda: "",
  estadoId: "",
  desde: "",
  hasta: "",
};

// Label del catálogo para el filtro (el select ofrece en plural, como clientes).
const estadoOpciones: { value: string; label: string }[] = estadosTurno.map((e) => ({
  value: String(e.id),
  label:
    e.id === 1
      ? "Pendientes"
      : e.id === 2
        ? "Confirmados"
        : e.id === 3
          ? "Cancelados"
          : e.id === 4
            ? "Atendidos"
            : "No asistieron",
}));

function formatFechaChip(fecha: string) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function buildTagsTurnos(
  filtros: FiltrosTurnosValues,
  onChange: (filtros: FiltrosTurnosValues) => void,
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.estadoId) {
    const estado = estadoOpciones.find((e) => e.value === filtros.estadoId);
    tags.push({
      label: `Estado: ${estado?.label ?? filtros.estadoId}`,
      onRemove: () => onChange({ ...filtros, estadoId: "" }),
    });
  }
  if (filtros.desde) {
    tags.push({
      label: `Desde: ${formatFechaChip(filtros.desde)}`,
      onRemove: () => onChange({ ...filtros, desde: "" }),
    });
  }
  if (filtros.hasta) {
    tags.push({
      label: `Hasta: ${formatFechaChip(filtros.hasta)}`,
      onRemove: () => onChange({ ...filtros, hasta: "" }),
    });
  }
  return tags;
}

export function FiltrosTurnosChips({
  filtros,
  onChange,
}: {
  filtros: FiltrosTurnosValues;
  onChange: (filtros: FiltrosTurnosValues) => void;
}) {
  const tags = buildTagsTurnos(filtros, onChange);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900 py-1 pl-3 pr-1 text-xs font-bold text-cream-50"
        >
          {tag.label}
          <button
            type="button"
            onClick={tag.onRemove}
            aria-label={`Quitar filtro ${tag.label}`}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

interface FiltrosTurnosProps {
  filtros: FiltrosTurnosValues;
  onChange: (filtros: FiltrosTurnosValues) => void;
}

export function FiltrosTurnos({ filtros, onChange }: FiltrosTurnosProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const tags = buildTagsTurnos(filtros, onChange);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => onChange({ ...filtros, busqueda: e.target.value })}
            placeholder="Buscar por cliente, profesional o práctica..."
            aria-label="Buscar turnos por cliente, profesional o práctica"
            className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
          />
        </div>

        <div className="relative" ref={panelRef}>
          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="true"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros
            {tags.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-500 px-1.5 text-xs font-extrabold text-brand-900">
                {tags.length}
              </span>
            )}
          </Button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-md border border-border bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Estado del turno
                  {/* BACKEND: poblar desde GET /api/estados-turno. */}
                  <select
                    value={filtros.estadoId}
                    onChange={(e) => onChange({ ...filtros, estadoId: e.target.value })}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  >
                    <option value="">Todos los estados</option>
                    {estadoOpciones.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                    Desde
                    <input
                      type="date"
                      value={filtros.desde}
                      max={filtros.hasta || undefined}
                      onChange={(e) => onChange({ ...filtros, desde: e.target.value })}
                      className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                    Hasta
                    <input
                      type="date"
                      value={filtros.hasta}
                      min={filtros.desde || undefined}
                      onChange={(e) => onChange({ ...filtros, hasta: e.target.value })}
                      className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                    />
                  </label>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  type="button"
                  onClick={() => onChange({ ...filtros, estadoId: "", desde: "", hasta: "" })}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <FiltrosTurnosChips filtros={filtros} onChange={onChange} />
    </div>
  );
}