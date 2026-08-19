"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SUCURSALES, type EstadoStock } from "@/data/stock";
import { Button } from "@/components/ui/Button";

export type EstadoStockFiltro = EstadoStock | "todos";

export interface FiltrosStock {
  sucursalId: string;
  estadoStock: EstadoStockFiltro;
}

const ESTADOS: { value: EstadoStockFiltro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "normal", label: "Normal" },
  { value: "bajo", label: "Bajo" },
  { value: "critico", label: "Crítico" },
];

export const FILTROS_STOCK_VACIOS: FiltrosStock = { sucursalId: "", estadoStock: "todos" };

function buildTags(filtros: FiltrosStock, onChange: (filtros: FiltrosStock) => void) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.sucursalId) {
    const sucursal = SUCURSALES.find((s) => s.id === Number(filtros.sucursalId));
    tags.push({
      label: `Sucursal: ${sucursal?.nombre ?? filtros.sucursalId}`,
      onRemove: () => onChange({ ...filtros, sucursalId: "" }),
    });
  }
  if (filtros.estadoStock !== "todos") {
    const estado = ESTADOS.find((e) => e.value === filtros.estadoStock);
    tags.push({
      label: `Estado: ${estado?.label ?? filtros.estadoStock}`,
      onRemove: () => onChange({ ...filtros, estadoStock: "todos" }),
    });
  }
  return tags;
}

export function FiltrosStockChips({ filtros, onChange }: { filtros: FiltrosStock; onChange: (filtros: FiltrosStock) => void }) {
  const tags = buildTags(filtros, onChange);
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

interface FiltrosStockProps {
  filtros: FiltrosStock;
  onChange: (filtros: FiltrosStock) => void;
  disabled?: boolean;
  hideChips?: boolean;
}

export function FiltrosStock({ filtros, onChange, disabled = false, hideChips = false }: FiltrosStockProps) {
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

  const tags = buildTags(filtros, onChange);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={panelRef}>
        <Button
          variant="outline"
          size="md"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          disabled={disabled}
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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-64 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              {/* BACKEND: poblar desde GET /api/sucursales (id + nombre). */}
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Sucursal
                <select
                  value={filtros.sucursalId}
                  onChange={(e) => onChange({ ...filtros, sucursalId: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todas</option>
                  {SUCURSALES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Estado de stock
                <select
                  value={filtros.estadoStock}
                  onChange={(e) => onChange({ ...filtros, estadoStock: e.target.value as EstadoStockFiltro })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="ghost" size="sm" type="button" onClick={() => onChange(FILTROS_STOCK_VACIOS)}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      {!hideChips && <FiltrosStockChips filtros={filtros} onChange={onChange} />}
    </div>
  );
}