"use client";

import { PawPrint, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type FiltroEstado = "Activo" | "Inactivo" | "Todos";
export type FiltroEspecie = "Todas" | "Perro" | "Gato" | "Otro";
export type FiltroSexo = "Todos" | "Macho" | "Hembra";

const estadoOpts: { value: FiltroEstado; label: string }[] = [
  { value: "Activo", label: "Activos" },
  { value: "Inactivo", label: "Inactivos" },
  { value: "Todos", label: "Todos los estados" },
];

const especieOpts: { value: FiltroEspecie; label: string }[] = [
  { value: "Todas", label: "Todas las especies" },
  { value: "Perro", label: "Perros" },
  { value: "Gato", label: "Gatos" },
  { value: "Otro", label: "Otras" },
];

const sexoOpts: { value: FiltroSexo; label: string }[] = [
  { value: "Todos", label: "Todos los sexos" },
  { value: "Macho", label: "Machos" },
  { value: "Hembra", label: "Hembras" },
];

interface FiltrosMascotasProps {
  busqueda: string;
  onBusquedaChange: (q: string) => void;
  estado: FiltroEstado;
  onEstadoChange: (e: FiltroEstado) => void;
  especie: FiltroEspecie;
  onEspecieChange: (e: FiltroEspecie) => void;
  sexo: FiltroSexo;
  onSexoChange: (s: FiltroSexo) => void;
  /** Nombre del dueño pre-filtrado desde la patita de ClientesTable (null = sin filtro). */
  duenoNombre: string | null;
  onQuitarDueno: () => void;
}

export function FiltrosMascotas({
  busqueda,
  onBusquedaChange,
  estado,
  onEstadoChange,
  especie,
  onEspecieChange,
  sexo,
  onSexoChange,
  duenoNombre,
  onQuitarDueno,
}: FiltrosMascotasProps) {
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

  // El listado muestra por defecto solo activos (criterio HU-MAS-01): el
  // filtro no cuenta como "aplicado" mientras siga en su valor por defecto.
  const hasFiltroEstado = estado !== "Activo";
  const hasFiltroEspecie = especie !== "Todas";
  const hasFiltroSexo = sexo !== "Todos";
  const filtrosActivos = [hasFiltroEstado, hasFiltroEspecie, hasFiltroSexo].filter(Boolean).length;
  const hasFiltros = filtrosActivos > 0 || duenoNombre !== null;

  const limpiar = () => {
    onEstadoChange("Activo");
    onEspecieChange("Todas");
    onSexoChange("Todos");
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
            placeholder="Buscar por mascota, raza o DNI del dueño..."
            aria-label="Buscar mascotas por nombre, raza o DNI del dueño"
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
            {filtrosActivos > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-500 px-1.5 text-xs font-extrabold text-brand-900">
                {filtrosActivos}
              </span>
            )}
          </Button>
          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-md border border-border bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Estado
                  {/* BACKEND: poblar desde GET /api/estados-mascota (enum estado_activo_inactivo). */}
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
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Especie
                  {/* BACKEND: catálogo fijo del front (especie varchar libre en BD). */}
                  <select
                    value={especie}
                    onChange={(e) => onEspecieChange(e.target.value as FiltroEspecie)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  >
                    {especieOpts.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Sexo
                  {/* BACKEND: catálogo fijo del front (sexo varchar libre en BD). */}
                  <select
                    value={sexo}
                    onChange={(e) => onSexoChange(e.target.value as FiltroSexo)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  >
                    {sexoOpts.map((o) => (
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

      {/* Chips de filtros aplicados (estado + dueño pre-filtrado desde la patita) */}
      {hasFiltros && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
          {duenoNombre && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900 py-1 pl-3 pr-1 text-xs font-bold text-cream-50">
              <PawPrint className="h-3.5 w-3.5" aria-hidden="true" />
              Dueño: {duenoNombre}
              <button
                type="button"
                onClick={onQuitarDueno}
                aria-label={`Quitar filtro Dueño ${duenoNombre}`}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {hasFiltroEstado && (
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
          )}
          {hasFiltroEspecie && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900 py-1 pl-3 pr-1 text-xs font-bold text-cream-50">
              Especie: {especie}
              <button
                type="button"
                onClick={() => onEspecieChange("Todas")}
                aria-label={`Quitar filtro Especie ${especie}`}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {hasFiltroSexo && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900 py-1 pl-3 pr-1 text-xs font-bold text-cream-50">
              Sexo: {sexo}
              <button
                type="button"
                onClick={() => onSexoChange("Todos")}
                aria-label={`Quitar filtro Sexo ${sexo}`}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}