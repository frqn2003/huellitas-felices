"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { depositosIniciales } from "@/data/stock";
import { tiposMovimiento } from "@/data/movimientos";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";

export interface FiltrosMovimientos {
  tipoId: string;
  depositoId: string;
  articulo: string;
  desde: string;
  hasta: string;
}

export const FILTROS_MOVIMIENTOS_VACIOS: FiltrosMovimientos = {
  tipoId: "",
  depositoId: "",
  articulo: "",
  desde: "",
  hasta: "",
};

function formatFechaChip(fecha: string) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function buildTagsMovimientos(
  filtros: FiltrosMovimientos,
  articulos: { id: number; nombre: string }[],
  onChange: (filtros: FiltrosMovimientos) => void,
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.tipoId) {
    const tipo = tiposMovimiento.find((t) => t.id === Number(filtros.tipoId));
    tags.push({
      label: `Tipo: ${tipo?.nombre ?? filtros.tipoId}`,
      onRemove: () => onChange({ ...filtros, tipoId: "" }),
    });
  }
  if (filtros.depositoId) {
    const deposito = depositosIniciales.find((d) => d.id === Number(filtros.depositoId));
    tags.push({
      label: `Depósito: ${deposito?.nombre ?? filtros.depositoId}`,
      onRemove: () => onChange({ ...filtros, depositoId: "" }),
    });
  }
  if (filtros.articulo) {
    const articulo = articulos.find((a) => a.id === Number(filtros.articulo));
    tags.push({
      label: `Artículo: ${articulo?.nombre ?? filtros.articulo}`,
      onRemove: () => onChange({ ...filtros, articulo: "" }),
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

export function FiltrosMovimientosChips({
  filtros,
  articulos,
  onChange,
}: {
  filtros: FiltrosMovimientos;
  articulos: { id: number; nombre: string }[];
  onChange: (filtros: FiltrosMovimientos) => void;
}) {
  const tags = buildTagsMovimientos(filtros, articulos, onChange);
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

interface FiltrosMovimientosProps {
  filtros: FiltrosMovimientos;
  articulos: { id: number; nombre: string }[];
  onChange: (filtros: FiltrosMovimientos) => void;
  disabled?: boolean;
}

export function FiltrosMovimientos({
  filtros,
  articulos,
  onChange,
  disabled = false,
}: FiltrosMovimientosProps) {
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

  const tags = buildTagsMovimientos(filtros, articulos, onChange);

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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Tipo de movimiento
                {/* BACKEND: poblar desde GET /api/tipos-movimiento. */}
                <select
                  value={filtros.tipoId}
                  onChange={(e) => onChange({ ...filtros, tipoId: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos</option>
                  {tiposMovimiento.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Depósito
                {/* BACKEND: poblar desde GET /api/depositos. */}
                <select
                  value={filtros.depositoId}
                  onChange={(e) => onChange({ ...filtros, depositoId: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos</option>
                  {depositosIniciales.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {/* BACKEND: poblar desde GET /api/articulos (id + nombre). */}
              <Combobox
                id="filtro-articulo"
                label="Artículo"
                value={filtros.articulo}
                options={articulos.map((a) => ({ value: String(a.id), label: a.nombre }))}
                onChange={(value) => onChange({ ...filtros, articulo: value })}
                placeholder="Todos los artículos"
                noResultsText="Sin artículos que coincidan"
              />
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
              <Button variant="ghost" size="md" type="button" onClick={() => onChange(FILTROS_MOVIMIENTOS_VACIOS)}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      <FiltrosMovimientosChips filtros={filtros} articulos={articulos} onChange={onChange} />
    </div>
  );
}