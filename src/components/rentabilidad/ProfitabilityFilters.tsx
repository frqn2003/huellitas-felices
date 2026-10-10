"use client";

import { AlertCircle, Building2, Calendar, Check, RotateCcw, Search } from "lucide-react";

export interface SucursalOpcion {
  id: number;
  nombre: string;
}

interface ProfitabilityFiltersProps {
  desde: string;
  hasta: string;
  sucursalesIds: number[];
  sucursalesDisponibles: SucursalOpcion[];
  isLoading: boolean;
  errorPeriodo: string | null;
  onDesdeChange: (v: string) => void;
  onHastaChange: (v: string) => void;
  onToggleSucursal: (id: number) => void;
  onSelectAllSucursales: () => void;
  onClearSucursales: () => void;
  onConsultar: () => void;
  onResetFiltros: () => void;
}

export function ProfitabilityFilters({
  desde,
  hasta,
  sucursalesIds,
  sucursalesDisponibles,
  isLoading,
  errorPeriodo,
  onDesdeChange,
  onHastaChange,
  onToggleSucursal,
  onSelectAllSucursales,
  onClearSucursales,
  onConsultar,
  onResetFiltros,
}: ProfitabilityFiltersProps) {
  const todasSeleccionadas =
    sucursalesDisponibles.length > 0 &&
    sucursalesDisponibles.every((s) => sucursalesIds.includes(s.id));

  return (
    <div className="bg-surface-card rounded-card border border-border-card shadow-card p-5 mb-6">
      <div className="flex flex-col gap-5">
        {/* Fila superior: Selector de Período y Botón de Consulta */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Período Desde */}
          <div className="md:col-span-4">
            <label
              htmlFor="filtro-rentabilidad-desde"
              className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1 text-brand-700" aria-hidden />
              Fecha Desde
            </label>
            <input
              id="filtro-rentabilidad-desde"
              type="date"
              value={desde}
              onChange={(e) => onDesdeChange(e.target.value)}
              disabled={isLoading}
              className={`w-full h-11 px-3 text-sm rounded-md border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors ${
                errorPeriodo
                  ? "border-status-danger focus:ring-status-danger bg-red-50/20"
                  : "border-border-card hover:border-brand-700/50"
              }`}
            />
          </div>

          {/* Período Hasta */}
          <div className="md:col-span-4">
            <label
              htmlFor="filtro-rentabilidad-hasta"
              className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1 text-brand-700" aria-hidden />
              Fecha Hasta
            </label>
            <input
              id="filtro-rentabilidad-hasta"
              type="date"
              value={hasta}
              onChange={(e) => onHastaChange(e.target.value)}
              disabled={isLoading}
              className={`w-full h-11 px-3 text-sm rounded-md border bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors ${
                errorPeriodo
                  ? "border-status-danger focus:ring-status-danger bg-red-50/20"
                  : "border-border-card hover:border-brand-700/50"
              }`}
            />
          </div>

          {/* Acciones: Consultar y Reset */}
          <div className="md:col-span-4 flex items-center gap-2">
            <button
              type="button"
              id="btn-consultar-rentabilidad"
              onClick={onConsultar}
              disabled={isLoading}
              className="flex-1 h-11 px-5 rounded-pill bg-accent-500 hover:bg-accent-600 active:scale-[0.98] text-brand-900 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" aria-hidden />
                  <span>Consultar Rentabilidad</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-limpiar-filtros-rentabilidad"
              onClick={onResetFiltros}
              disabled={isLoading}
              title="Restablecer filtros"
              className="h-11 w-11 rounded-md border border-border-card bg-white hover:bg-cream-100 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" aria-hidden />
              <span className="sr-only">Restablecer filtros</span>
            </button>
          </div>
        </div>

        {/* Mensaje de Error en Rojo del Filtro de Período (VALIDACIÓN CRÍTICA) */}
        {errorPeriodo && (
          <div
            role="alert"
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-status-danger/30 text-status-danger text-sm font-semibold animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
            <span>{errorPeriodo}</span>
          </div>
        )}

        {/* Selector de Sucursales (Múltiple) */}
        <div className="pt-2 border-t border-border-card/60">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary">
              <Building2 className="w-3.5 h-3.5 text-brand-700" aria-hidden />
              <span>Sucursales a consultar (selección múltiple):</span>
              <span className="text-text-tertiary font-normal lowercase">
                ({sucursalesIds.length === 0 ? "todas seleccionadas" : `${sucursalesIds.length} de ${sucursalesDisponibles.length}`})
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onSelectAllSucursales}
                disabled={isLoading || todasSeleccionadas}
                className="text-brand-700 hover:text-brand-900 font-semibold underline underline-offset-2 disabled:opacity-40 disabled:no-underline cursor-pointer"
              >
                Seleccionar todas
              </button>
              <span className="text-text-tertiary">|</span>
              <button
                type="button"
                onClick={onClearSucursales}
                disabled={isLoading || sucursalesIds.length === 0}
                className="text-text-secondary hover:text-status-danger font-medium cursor-pointer disabled:opacity-40"
              >
                Limpiar selección
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sucursalesDisponibles.map((sucursal) => {
              const isSelected =
                sucursalesIds.length === 0 || sucursalesIds.includes(sucursal.id);
              return (
                <button
                  key={sucursal.id}
                  type="button"
                  onClick={() => onToggleSucursal(sucursal.id)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-brand-900 text-white border-brand-900 shadow-xs"
                      : "bg-white text-text-secondary border-border-card hover:border-brand-700/40 hover:bg-cream-50"
                  }`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[10px] ${
                      isSelected
                        ? "bg-accent-500 border-accent-500 text-brand-900"
                        : "border-border-card bg-cream-50"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span>{sucursal.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
