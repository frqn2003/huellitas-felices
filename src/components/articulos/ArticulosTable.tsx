"use client";

import { Eye, Pencil, Trash2, SearchX } from "lucide-react";
import type { Articulo } from "@/data/articulos";
import { ArticuloThumb } from "./ArticuloThumb";
import { EstadoBadge } from "./EstadoBadge";

interface ArticulosTableProps {
  articulos: Articulo[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onView: (articulo: Articulo) => void;
  onEdit: (articulo: Articulo) => void;
  onDeactivate: (articulo: Articulo) => void;
}

const HEADERS = ["Imagen", "Código", "Nombre", "Categoría", "U. Medida", "Estado", "Acciones"];

export function ArticulosTable({
  articulos,
  loading,
  hasActiveFilters,
  onClearFilters,
  onView,
  onEdit,
  onDeactivate,
}: ArticulosTableProps) {
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
            <div className="h-16 w-16 animate-pulse rounded-sm bg-cream-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-16 animate-pulse rounded bg-cream-100 lg:block" />
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

  if (articulos.length === 0) {
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
              : "Comenzá a cargar el catálogo de productos para la venta y el uso interno."}
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
        <table className="w-full min-w-[860px] border-collapse text-left">
          <caption className="sr-only">
            Listado de artículos del catálogo con acciones de ver, editar y desactivar
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
            {articulos.map((articulo) => (
              <tr
                key={articulo.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3">
                  <ArticuloThumb imagen={articulo.imagen} nombre={articulo.nombre} />
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                    {articulo.codigo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text-primary">{articulo.nombre}</span>
                    <span className="max-w-56 truncate text-xs text-text-secondary">
                      {articulo.descripcion}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {articulo.categoria}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {articulo.unidadMedida}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge articulo={articulo} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onView(articulo)}
                      aria-label={`Ver ${articulo.nombre}`}
                      title="Ver"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(articulo)}
                      aria-label={`Editar ${articulo.nombre}`}
                      title="Editar"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Pencil className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeactivate(articulo)}
                      aria-label={`Desactivar ${articulo.nombre}`}
                      title="Desactivar"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
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
