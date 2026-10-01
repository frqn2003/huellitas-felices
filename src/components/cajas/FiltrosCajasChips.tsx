"use client";

import { X } from "lucide-react";
import { format, parseISO } from "date-fns";

export interface FiltrosCajasValues {
  sucursal?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  cajero?: string;
  orden?: "recientes" | "antiguas";
}

export const FILTROS_CAJAS_VACIOS: FiltrosCajasValues = {
  sucursal: "",
  estado: "",
  fechaDesde: "",
  fechaHasta: "",
  cajero: "",
  orden: "recientes",
};

interface SucursalFiltro {
  id: number;
  nombre: string;
}

interface CajeroFiltro {
  id: number;
  nombre: string;
  apellido: string;
}

function formatFecha(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy");
}

function buildTags(
  filtros: FiltrosCajasValues,
  sucursales: SucursalFiltro[],
  cajeros: CajeroFiltro[],
  onChange: (filtros: FiltrosCajasValues) => void
) {
  const tags: { label: string; onRemove: () => void }[] = [];

  if (filtros.sucursal) {
    const sucursal = sucursales.find((s) => String(s.id) === filtros.sucursal);
    tags.push({
      label: `Sucursal: ${sucursal?.nombre ?? filtros.sucursal}`,
      onRemove: () => onChange({ ...filtros, sucursal: "" }),
    });
  }
  if (filtros.estado) {
    tags.push({
      label: `Estado: ${filtros.estado === "true" ? "Abierta" : "Cerrada"}`,
      onRemove: () => onChange({ ...filtros, estado: "" }),
    });
  }
  if (filtros.fechaDesde) {
    tags.push({
      label: `Desde: ${formatFecha(filtros.fechaDesde)}`,
      onRemove: () => onChange({ ...filtros, fechaDesde: "" }),
    });
  }
  if (filtros.fechaHasta) {
    tags.push({
      label: `Hasta: ${formatFecha(filtros.fechaHasta)}`,
      onRemove: () => onChange({ ...filtros, fechaHasta: "" }),
    });
  }
  if (filtros.cajero) {
    const cajero = cajeros.find((c) => String(c.id) === filtros.cajero);
    tags.push({
      label: `Cajero: ${cajero ? `${cajero.nombre} ${cajero.apellido}` : filtros.cajero}`,
      onRemove: () => onChange({ ...filtros, cajero: "" }),
    });
  }

  return tags;
}

interface FiltrosCajasChipsProps {
  filtros: FiltrosCajasValues;
  onChange: (filtros: FiltrosCajasValues) => void;
  sucursales?: SucursalFiltro[];
  cajeros?: CajeroFiltro[];
}

export function FiltrosCajasChips({
  filtros,
  onChange,
  sucursales = [],
  cajeros = [],
}: FiltrosCajasChipsProps) {
  const tags = buildTags(filtros, sucursales, cajeros, onChange);
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