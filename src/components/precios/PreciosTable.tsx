"use client";

import { Eye, History, Pencil, Plus, SearchX } from "lucide-react";
import type { FilaListaPrecio } from "@/data/lista-precios";
import { formatMoney } from "@/data/ordenes-compra";
import { EstadoBadge } from "@/components/articulos/EstadoBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface PreciosTableProps {
  filas: FilaListaPrecio[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onView: (fila: FilaListaPrecio) => void;
  onEdit: (fila: FilaListaPrecio) => void;
  /** Artículo sin precio: alta del primer precio (acción ➕ de la tabla). */
  onAlta: (fila: FilaListaPrecio) => void;
  onHistorial: (fila: FilaListaPrecio) => void;
}

const HEADERS = [
  "Código",
  "Nombre",
  "Categoría",
  "Costo ref. OC",
  "Precio vigente",
  "Estado",
  "Acciones",
];

/**
 * Tabla de Lista de Precios (HU-STK-03). No se reutiliza ArticulosTable: sus
 * columnas están fijas (7) y sus acciones son editar/desactivar, mientras que
 * acá las acciones dependen de si el artículo tiene precio cargado. Sí se
 * reusa EstadoBadge (extendido con la prop `estado`).
 *
 * La columna de imagen queda fuera por ahora: las semillas traen `imagenUrl`
 * vacío, así que solo agregaba una columna de placeholders. `imagenUrl` sigue
 * en `FilaListaPrecio` (viene del artículo); lo que se saca es la columna.
 */
export function PreciosTable({
  filas,
  loading,
  hasActiveFilters,
  onClearFilters,
  onView,
  onEdit,
  onAlta,
  onHistorial,
}: PreciosTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-7 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
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
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-20 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-20 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay artículos cargados"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay artículos que coincidan con la búsqueda o los filtros aplicados."
              : "Cargá artículos para poder asignarles precios de venta."}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <caption className="sr-only">
            Lista de precios de venta por artículo, con costo de referencia, precio vigente y
            acciones de ver, editar, cargar precio e historial
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
            {filas.map((fila) => (
              <tr
                key={fila.articuloId}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3">
                  <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                    {fila.codigo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text-primary">{fila.nombre}</span>
                    <span className="max-w-56 truncate text-xs text-text-secondary">
                      {fila.descripcion}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {fila.categoria}
                </td>
                {/* Costo de compra: dato informativo, nunca editable (HU-COMP-02/03). */}
                <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                  {fila.costoRefOc !== null ? formatMoney(fila.costoRefOc) : "—"}
                </td>
                <td className="px-4 py-3">
                  {fila.precio !== null ? (
                    <span className="text-sm font-extrabold text-brand-900 tabular-nums">
                      {formatMoney(fila.precio)}
                    </span>
                  ) : (
                    <StatusBadge variant="warning" label="Sin precio" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={fila.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onView(fila)}
                      aria-label={`Ver ${fila.nombre}`}
                      title="Ver"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {fila.precio !== null ? (
                      <button
                        type="button"
                        onClick={() => onEdit(fila)}
                        aria-label={`Editar precio de ${fila.nombre}`}
                        title="Editar precio"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Pencil className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAlta(fila)}
                        aria-label={`Cargar primer precio de ${fila.nombre}`}
                        title="Cargar precio"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Plus className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onHistorial(fila)}
                      aria-label={`Historial de precios de ${fila.nombre}`}
                      title="Historial de precios"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <History className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
