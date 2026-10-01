"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { OrdenamientoSelect } from "@/components/ui/OrdenamientoSelect";
import { FiltrosCajasChips, FILTROS_CAJAS_VACIOS, type FiltrosCajasValues } from "./FiltrosCajasChips";

export type { FiltrosCajasValues } from "./FiltrosCajasChips";
export { FiltrosCajasChips, FILTROS_CAJAS_VACIOS } from "./FiltrosCajasChips";

interface SucursalFiltro {
  id: number;
  nombre: string;
}

interface CajeroFiltro {
  id: number;
  nombre: string;
  apellido: string;
}

interface FiltrosCajasProps {
  filtros: FiltrosCajasValues;
  onChange: (filtros: FiltrosCajasValues) => void;
  sucursales: SucursalFiltro[];
  cajeros: CajeroFiltro[];
  disabled?: boolean;
  hideChips?: boolean;
}

export function FiltrosCajas({
  filtros,
  onChange,
  sucursales,
  cajeros,
  disabled = false,
  hideChips = false,
}: FiltrosCajasProps) {
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

  const cantidadFiltros =
    (filtros.sucursal ? 1 : 0) +
    (filtros.estado ? 1 : 0) +
    (filtros.fechaDesde ? 1 : 0) +
    (filtros.fechaHasta ? 1 : 0) +
    (filtros.cajero ? 1 : 0);

  const etiquetaClase = "flex flex-col gap-1.5 text-sm font-bold text-text-primary";

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
          {cantidadFiltros > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-500 px-1.5 text-xs font-extrabold text-brand-900">
              {cantidadFiltros}
            </span>
          )}
        </Button>
        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              {/* BACKEND: poblar desde GET /api/sucursales (id + nombre). */}
              <label className={etiquetaClase}>
                Sucursal
                <Select
                  value={filtros.sucursal ?? ""}
                  onChange={(e) => onChange({ ...filtros, sucursal: e.target.value })}
                  aria-label="Filtrar por sucursal"
                  disabled={disabled}
                >
                  <option value="">Todas</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </label>

              <label className={etiquetaClase}>
                Estado
                <Select
                  value={filtros.estado ?? ""}
                  onChange={(e) => onChange({ ...filtros, estado: e.target.value })}
                  aria-label="Filtrar por estado"
                  disabled={disabled}
                >
                  <option value="">Todos</option>
                  <option value="true">Abierta</option>
                  <option value="false">Cerrada</option>
                </Select>
              </label>

              {/* BACKEND: poblar desde GET /api/usuarios?rol_id=6 (cajeros). */}
              <label className={etiquetaClase}>
                Cajero
                <Select
                  value={filtros.cajero ?? ""}
                  onChange={(e) => onChange({ ...filtros, cajero: e.target.value })}
                  aria-label="Filtrar por cajero"
                  disabled={disabled}
                >
                  <option value="">Todos</option>
                  {cajeros.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </Select>
              </label>

              <label className={etiquetaClase}>
                Fecha desde
                <Input
                  type="date"
                  value={filtros.fechaDesde ?? ""}
                  max={filtros.fechaHasta || undefined}
                  onChange={(e) => onChange({ ...filtros, fechaDesde: e.target.value })}
                  disabled={disabled}
                />
              </label>

              <label className={etiquetaClase}>
                Fecha hasta
                <Input
                  type="date"
                  value={filtros.fechaHasta ?? ""}
                  min={filtros.fechaDesde || undefined}
                  onChange={(e) => onChange({ ...filtros, fechaHasta: e.target.value })}
                  disabled={disabled}
                />
              </label>

              <OrdenamientoSelect
                value={filtros.orden ?? "recientes"}
                onChange={(v) => onChange({ ...filtros, orden: v })}
                disabled={disabled}
              />

              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onChange(FILTROS_CAJAS_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      {!hideChips && (
        <FiltrosCajasChips
          filtros={filtros}
          onChange={onChange}
          sucursales={sucursales}
          cajeros={cajeros}
        />
      )}
    </div>
  );
}