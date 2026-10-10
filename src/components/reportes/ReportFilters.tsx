"use client";

import { Building2, Calendar, Filter, Layers } from "lucide-react";
import { useState } from "react";

export interface ReportFiltersValues {
  desde: string;
  hasta: string;
  sucursalId: string;
  categoriaId: string;
}

interface SucursalOption {
  id: number;
  nombre: string;
}

interface CategoriaOption {
  id: number;
  nombre: string;
}

interface ReportFiltersProps {
  filtros: ReportFiltersValues;
  sucursales: SucursalOption[];
  categorias: CategoriaOption[];
  loading: boolean;
  onChange: (filtros: ReportFiltersValues) => void;
}

export function ReportFilters({
  filtros,
  sucursales,
  categorias,
  loading,
  onChange,
}: ReportFiltersProps) {
  const [errorDesde, setErrorDesde] = useState<string | null>(null);
  const [errorHasta, setErrorHasta] = useState<string | null>(null);

  const validarYEmitir = (
    nuevoDesde: string,
    nuevoHasta: string,
    nuevaSucursal: string,
    nuevaCategoria: string,
  ) => {
    let tieneError = false;
    let errD: string | null = null;
    let errH: string | null = null;

    if (!nuevoDesde) {
      errD = "La fecha desde es requerida.";
      tieneError = true;
    }

    if (!nuevoHasta) {
      errH = "La fecha hasta es requerida.";
      tieneError = true;
    }

    if (nuevoDesde && nuevoHasta && nuevoDesde > nuevoHasta) {
      errD = "La fecha desde no puede ser posterior a la fecha hasta.";
      tieneError = true;
    }

    setErrorDesde(errD);
    setErrorHasta(errH);

    if (!tieneError) {
      onChange({
        desde: nuevoDesde,
        hasta: nuevoHasta,
        sucursalId: nuevaSucursal,
        categoriaId: nuevaCategoria,
      });
    }
  };

  const handleDesdeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoDesde = e.target.value;
    validarYEmitir(nuevoDesde, filtros.hasta, filtros.sucursalId, filtros.categoriaId);
  };

  const handleHastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoHasta = e.target.value;
    validarYEmitir(filtros.desde, nuevoHasta, filtros.sucursalId, filtros.categoriaId);
  };

  const handleSucursalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaSucursal = e.target.value;
    validarYEmitir(filtros.desde, filtros.hasta, nuevaSucursal, filtros.categoriaId);
  };

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaCategoria = e.target.value;
    validarYEmitir(filtros.desde, filtros.hasta, filtros.sucursalId, nuevaCategoria);
  };

  return (
    <div
      className="rounded-md border border-border bg-surface p-5 shadow-card"
      aria-label="Filtros del reporte de ventas"
    >
      <div className="flex items-center justify-between gap-2 mb-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-brand-900" aria-hidden="true" />
          <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
            Filtros del Reporte
          </h2>
        </div>
        <span className="text-xs font-bold text-text-secondary">
          Actualización automática al modificar parámetros
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Fecha Desde */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-desde"
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-text-secondary"
          >
            <Calendar className="h-4 w-4 text-brand-900" aria-hidden="true" />
            Fecha Desde <span className="text-destructive">*</span>
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={filtros.desde}
            onChange={handleDesdeChange}
            disabled={loading}
            aria-invalid={errorDesde ? "true" : undefined}
            aria-describedby={errorDesde ? "error-desde" : undefined}
            className={`h-11 w-full rounded-sm border px-3 text-sm text-text-primary transition-colors focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 ${
              errorDesde ? "border-destructive bg-destructive/5" : "border-border bg-surface"
            }`}
          />
          {errorDesde && (
            <p id="error-desde" role="alert" className="text-xs font-bold text-destructive">
              {errorDesde}
            </p>
          )}
        </div>

        {/* Fecha Hasta */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-hasta"
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-text-secondary"
          >
            <Calendar className="h-4 w-4 text-brand-900" aria-hidden="true" />
            Fecha Hasta <span className="text-destructive">*</span>
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={filtros.hasta}
            onChange={handleHastaChange}
            disabled={loading}
            aria-invalid={errorHasta ? "true" : undefined}
            aria-describedby={errorHasta ? "error-hasta" : undefined}
            className={`h-11 w-full rounded-sm border px-3 text-sm text-text-primary transition-colors focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 ${
              errorHasta ? "border-destructive bg-destructive/5" : "border-border bg-surface"
            }`}
          />
          {errorHasta && (
            <p id="error-hasta" role="alert" className="text-xs font-bold text-destructive">
              {errorHasta}
            </p>
          )}
        </div>

        {/* Sucursal */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-sucursal"
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-text-secondary"
          >
            <Building2 className="h-4 w-4 text-brand-900" aria-hidden="true" />
            Sucursal
          </label>
          <select
            id="filtro-sucursal"
            value={filtros.sucursalId}
            onChange={handleSucursalChange}
            disabled={loading}
            className="h-11 w-full cursor-pointer rounded-sm border border-border bg-surface px-3 text-sm font-semibold text-text-primary transition-colors focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100"
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Categoría */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="filtro-categoria"
            className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-text-secondary"
          >
            <Layers className="h-4 w-4 text-brand-900" aria-hidden="true" />
            Categoría
          </label>
          <select
            id="filtro-categoria"
            value={filtros.categoriaId}
            onChange={handleCategoriaChange}
            disabled={loading}
            className="h-11 w-full cursor-pointer rounded-sm border border-border bg-surface px-3 text-sm font-semibold text-text-primary transition-colors focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
