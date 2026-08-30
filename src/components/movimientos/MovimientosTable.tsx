"use client";

import { ClipboardList, PackageSearch, SearchX } from "lucide-react";
import type { MovimientoStock } from "@/data/movimientos";
import { TipoMovimientoBadge } from "./TipoMovimientoBadge";

interface MovimientosTableProps {
  movimientos: MovimientoStock[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNew: () => void;
}

const HEADERS = [
  "Nro. mov.",
  "Fecha / hora",
  "Tipo",
  "Depósito",
  "Artículo",
  "Cantidad",
  "Origen",
  "Empleado",
];

// Las fechas ISO del backend vienen en UTC (sufijo Z): se muestran tal cual en la demo.
function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatCantidad(valor: number, unidad: string) {
  return `${valor.toFixed(2)} ${unidad}`;
}

export function MovimientosTable({
  movimientos,
  loading,
  hasActiveFilters,
  onClearFilters,
  onNew,
}: MovimientosTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-8 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
          {HEADERS.map((h) => (
            <span key={h} className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              {h}
            </span>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-4 w-36 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-16 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 xl:block" />
          </div>
        ))}
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          {hasActiveFilters ? (
            <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
          ) : (
            <PackageSearch className="h-7 w-7 text-brand-900" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay movimientos registrados"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay movimientos que coincidan con la búsqueda o los filtros aplicados."
              : "Registrá el primer movimiento (ingreso, egreso, transferencia o ajuste) para mantener el inventario actualizado y trazable."}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            Limpiar filtros
          </button>
        ) : (
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-sm font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Nuevo movimiento
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <caption className="sr-only">
            Movimientos de stock: número, fecha, tipo, depósito, artículo, cantidad, origen y empleado
          </caption>
          <thead>
            <tr className="border-b border-border bg-cream-50">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movimientos.map((mov) => (
              <tr
                key={mov.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3">
                  <span className="rounded bg-brand-900/10 px-1.5 py-0.5 font-mono text-xs font-bold text-brand-900">
                    {mov.numero}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">
                  {formatFechaHora(mov.fechaHora)}
                </td>
                <td className="px-4 py-3">
                  <TipoMovimientoBadge tipo={mov.tipo} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">
                  {mov.fichaStock.depositoNombre}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-text-primary">
                  {mov.fichaStock.articuloNombre}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-text-primary">
                  {formatCantidad(mov.cantidad, mov.fichaStock.articuloUnidad)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-text-primary">
                      {mov.origen?.nombre ?? mov.tipo}
                    </span>
                    {mov.origenEntidadId !== null && (
                      <span className="text-xs font-medium text-text-secondary">
                        #{mov.origenEntidadId}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-secondary">
                  {mov.empleado.nombre}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}