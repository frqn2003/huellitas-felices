"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROVEEDORES_RECEPCIONES } from "@/data/recepciones";
import { Button } from "@/components/ui/Button";
import { OrdenamientoSelect, type OrdenFecha } from "@/components/ui/OrdenamientoSelect";
import type { TipoRecepcion } from "@/data/recepciones";

export type EstadoFiltroRecepcion = TipoRecepcion | "Todas";

export interface FiltrosRecepcion {
  tipo: EstadoFiltroRecepcion;
  proveedorId: string;
  ordenFecha: OrdenFecha;
}

interface FiltrosRecepcionesProps {
  filtros: FiltrosRecepcion;
  onChange: (filtros: FiltrosRecepcion) => void;
  disabled?: boolean;
  hideChips?: boolean;
}

interface FiltrosChipsProps {
  filtros: FiltrosRecepcion;
  onChange: (filtros: FiltrosRecepcion) => void;
}

const TIPOS_FILTRO: { value: EstadoFiltroRecepcion; label: string }[] = [
  { value: "Todas", label: "Todas" },
  { value: "total", label: "Completa" },
  { value: "parcial", label: "Parcial" },
];

export const FILTROS_RECEPCION_VACIOS: FiltrosRecepcion = {
  tipo: "Todas",
  proveedorId: "",
  ordenFecha: "recientes",
};

function buildTags(
  filtros: FiltrosRecepcion,
  onChange: (filtros: FiltrosRecepcion) => void,
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.tipo !== "Todas") {
    const label =
      filtros.tipo === "total" ? "Completa" : "Parcial";
    tags.push({
      label: `Tipo: ${label}`,
      onRemove: () => onChange({ ...filtros, tipo: "Todas" }),
    });
  }
  if (filtros.proveedorId) {
    const proveedor = PROVEEDORES_RECEPCIONES.find(
      (p) => p.id === Number(filtros.proveedorId),
    );
    tags.push({
      label: `Proveedor: ${proveedor?.nombre ?? filtros.proveedorId}`,
      onRemove: () => onChange({ ...filtros, proveedorId: "" }),
    });
  }
  return tags;
}

export function FiltrosChipsRecepciones({
  filtros,
  onChange,
}: FiltrosChipsProps) {
  const tags = buildTags(filtros, onChange);
  if (tags.length === 0) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Filtros aplicados"
    >
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

export function FiltrosRecepciones({
  filtros,
  onChange,
  disabled = false,
  hideChips = false,
}: FiltrosRecepcionesProps) {
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
                Tipo de recepción
                <select
                  value={filtros.tipo}
                  onChange={(e) =>
                    onChange({
                      ...filtros,
                      tipo: e.target.value as EstadoFiltroRecepcion,
                    })
                  }
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {TIPOS_FILTRO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {/* BACKEND: poblar desde GET /api/proveedores (id + nombre). */}
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Proveedor
                <select
                  value={filtros.proveedorId}
                  onChange={(e) =>
                    onChange({ ...filtros, proveedorId: e.target.value })
                  }
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos</option>
                  {PROVEEDORES_RECEPCIONES.map((p) => (
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
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onChange(FILTROS_RECEPCION_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      {!hideChips && tags.length > 0 && (
        <FiltrosChipsRecepciones filtros={filtros} onChange={onChange} />
      )}
    </div>
  );
}
