"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type FiltroEstado = "Activo" | "Inactivo" | "Todos";

const estadoOpts: { value: FiltroEstado; label: string }[] = [
  { value: "Activo", label: "Activos" },
  { value: "Inactivo", label: "Inactivos" },
  { value: "Todos", label: "Todos los estados" },
];

interface FiltrosClientesProps {
  busqueda: string;
  onBusquedaChange: (q: string) => void;
  estado: FiltroEstado;
  onEstadoChange: (e: FiltroEstado) => void;
}

export function FiltrosClientes({
  busqueda,
  onBusquedaChange,
  estado,
  onEstadoChange,
}: FiltrosClientesProps) {
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

  // El listado muestra por defecto solo activos (criterio HU-CLI-01): el
  // filtro no cuenta como "activo" mientras siga en su valor por defecto.
  const hasFiltro = estado !== "Activo";

  const limpiar = () => {
    onEstadoChange("Activo");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar por nombre, documento o teléfono..."
            aria-label="Buscar clientes por nombre, documento o teléfono"
            className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
          />
        </div>

        {/* Filtros */}
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
            {hasFiltro && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-500 px-1.5 text-xs font-extrabold text-brand-900">
                1
              </span>
            )}
          </Button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-md border border-border bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Estado
                  {/* BACKEND: poblar desde GET /api/estados-cliente. */}
                  <select
                    value={estado}
                    onChange={(e) => onEstadoChange(e.target.value as FiltroEstado)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  >
                    {estadoOpts.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <Button variant="ghost" size="md" type="button" onClick={limpiar}>
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chips de filtros aplicados */}
      {hasFiltro && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900 py-1 pl-3 pr-1 text-xs font-bold text-cream-50">
            Estado: {estado === "Inactivo" ? "Inactivos" : "Todos los estados"}
            <button
              type="button"
              onClick={limpiar}
              aria-label={`Quitar filtro Estado ${estado}`}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}