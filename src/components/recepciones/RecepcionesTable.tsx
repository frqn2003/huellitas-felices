"use client";

import { Eye, SearchX } from "lucide-react";
import type { Recepcion } from "@/data/recepciones";
import { formatFecha, numeroRecepcion } from "@/data/recepciones";
import { EstadoRecepcionBadge } from "./EstadoRecepcionBadge";

interface RecepcionesTableProps {
  recepciones: Recepcion[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onView: (recepcion: Recepcion) => void;
  onNueva: () => void;
}

const HEADERS = [
  "N° Recepción",
  "OC",
  "Proveedor",
  "Tipo",
  "Fecha",
  "Acciones",
];

export function RecepcionesTable({
  recepciones,
  loading,
  hasActiveFilters,
  onClearFilters,
  onView,
  onNueva,
}: RecepcionesTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-6 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
          {HEADERS.map((h) => (
            <span
              key={h}
              className="text-xs font-extrabold uppercase tracking-wide text-text-secondary"
            >
              {h}
            </span>
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-6 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-6 w-20 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-40 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-16 animate-pulse rounded-pill bg-cream-100" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-16 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recepciones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters
              ? "Sin resultados"
              : "No hay recepciones registradas"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay recepciones que coincidan con la búsqueda o los filtros aplicados."
              : "Registrá la primera recepción de mercadería contra una orden de compra."}
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
            onClick={onNueva}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Registrar primera recepción
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <caption className="sr-only">
            Listado de recepciones de mercadería con acción de ver detalle
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
            {recepciones.map((recepcion) => (
              <tr
                key={recepcion.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3">
                  <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                    {numeroRecepcion(recepcion.id)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                    {recepcion.ordenCompra.numero}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text-primary">
                      {recepcion.ordenCompra.proveedor.razonSocial}
                    </span>
                    <span className="max-w-56 truncate text-xs text-text-secondary">
                      {recepcion.deposito.nombre}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <EstadoRecepcionBadge tipo={recepcion.tipo_recepcion} />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {formatFecha(recepcion.fecha_hora)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onView(recepcion)}
                      aria-label={`Ver ${numeroRecepcion(recepcion.id)}`}
                      title="Ver detalle"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Eye className="h-5 w-5" aria-hidden="true" />
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
