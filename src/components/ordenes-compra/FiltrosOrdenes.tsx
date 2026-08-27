"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROVEEDORES } from "@/data/articulos";
import { Button } from "@/components/ui/Button";
import { OrdenamientoSelect, type OrdenFecha } from "@/components/ui/OrdenamientoSelect";
import { RangoNumerico } from "@/components/ui/RangoNumerico";
import type { EstadoOrden } from "@/data/ordenes-compra";

export type EstadoFiltroOrden = EstadoOrden | "Todas";

export interface FiltrosOrden {
  estado: EstadoFiltroOrden;
  proveedorId: string;
  ordenFecha: OrdenFecha;
  totalMin: string;
  totalMax: string;
}

interface FiltrosOrdenesProps {
  filtros: FiltrosOrden;
  onChange: (filtros: FiltrosOrden) => void;
  disabled?: boolean;
  hideChips?: boolean;
}

interface FiltrosChipsProps {
  filtros: FiltrosOrden;
  onChange: (filtros: FiltrosOrden) => void;
}

// Los estados del filtro replican la tabla fija de estados de orden_compra.
const ESTADOS_FILTRO: EstadoFiltroOrden[] = [
  "pendiente",
  "enviada",
  "recibida_parcial",
  "recibida_total",
  "cancelada",
  "Todas",
];

export const FILTROS_ORDEN_VACIOS: FiltrosOrden = {
  estado: "Todas",
  proveedorId: "",
  ordenFecha: "recientes",
  totalMin: "",
  totalMax: "",
};

function etiquetaRango(min: string, max: string): string {
  if (min.trim() !== "" && max.trim() !== "") return `${min} – ${max}`;
  if (min.trim() !== "") return `desde ${min}`;
  return `hasta ${max}`;
}

function buildTags(filtros: FiltrosOrden, onChange: (filtros: FiltrosOrden) => void) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.estado !== "Todas") {
    tags.push({
      label: `Estado: ${filtros.estado}`,
      onRemove: () => onChange({ ...filtros, estado: "Todas" }),
    });
  }
  if (filtros.proveedorId) {
    const proveedor = PROVEEDORES.find((p) => p.id === Number(filtros.proveedorId));
    tags.push({
      label: `Proveedor: ${proveedor?.nombre ?? filtros.proveedorId}`,
      onRemove: () => onChange({ ...filtros, proveedorId: "" }),
    });
  }
  if (filtros.totalMin.trim() !== "" || filtros.totalMax.trim() !== "") {
    tags.push({
      label: `Total ($): ${etiquetaRango(filtros.totalMin, filtros.totalMax)}`,
      onRemove: () => onChange({ ...filtros, totalMin: "", totalMax: "" }),
    });
  }
  return tags;
}

export function FiltrosChips({ filtros, onChange }: FiltrosChipsProps) {
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

export function FiltrosOrdenes({ filtros, onChange, disabled = false, hideChips = false }: FiltrosOrdenesProps) {
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
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Estado
                <select
                  value={filtros.estado}
                  onChange={(e) => onChange({ ...filtros, estado: e.target.value as EstadoFiltroOrden })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {ESTADOS_FILTRO.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
              {/* BACKEND: poblar desde GET /api/proveedores (id + nombre). */}
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Proveedor
                <select
                  value={filtros.proveedorId}
                  onChange={(e) => onChange({ ...filtros, proveedorId: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos</option>
                  {PROVEEDORES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <OrdenamientoSelect
                value={filtros.ordenFecha}
                onChange={(ordenFecha) => onChange({ ...filtros, ordenFecha })}
                disabled={disabled}
              />
              {/* BACKEND: el rango de total se traduce a WHERE total BETWEEN
                  en la consulta SQL; acá filtra la demo en el front. */}
              <RangoNumerico
                label="Total ($)"
                valor={{ min: filtros.totalMin, max: filtros.totalMax }}
                onChange={({ min, max }) =>
                  onChange({ ...filtros, totalMin: min, totalMax: max })
                }
                disabled={disabled}
              />
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onChange(FILTROS_ORDEN_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      {!hideChips && tags.length > 0 && (
        <FiltrosChips filtros={filtros} onChange={onChange} />
      )}
    </div>
  );
}
