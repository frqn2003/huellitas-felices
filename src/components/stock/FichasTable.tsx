"use client";

import { ArrowLeftRight, ClipboardList, Pencil, SearchX } from "lucide-react";
import type { FichaStock } from "@/data/stock";
import { EstadoStockBadge } from "./EstadoStockBadge";

interface FichasTableProps {
  fichas: FichaStock[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onEdit: (ficha: FichaStock) => void;
  onTransfer: (ficha: FichaStock) => void;
}

const HEADERS = [
  "Sucursal",
  "Depósito",
  "Artículo",
  "Stock actual",
  "Umbral mínimo",
  "Umbral crítico",
  "Estado",
  "Acciones",
];

function formatCantidad(valor: number, unidad: string) {
  return `${valor.toFixed(2)} ${unidad}`;
}

export function FichasTable({
  fichas,
  loading,
  hasActiveFilters,
  onClearFilters,
  onEdit,
  onTransfer,
}: FichasTableProps) {
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
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-20 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-16 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-16 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-20 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (fichas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          {hasActiveFilters ? (
            <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
          ) : (
            <ClipboardList className="h-7 w-7 text-brand-900" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay fichas de stock cargadas"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay fichas que coincidan con la búsqueda o los filtros aplicados."
              : "Cargá la primera ficha de stock para empezar a controlar el inventario de cada depósito."}
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
        <table className="w-full min-w-[900px] border-collapse text-left">
          <caption className="sr-only">
            Fichas de stock por depósito con umbrales, estado y acciones de editar y transferir
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
            {fichas.map((ficha) => (
              <tr
                key={ficha.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3 text-sm font-bold text-text-primary">
                  {ficha.deposito.sucursal}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">
                  {ficha.deposito.nombre}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text-primary">{ficha.articulo.nombre}</span>
                    <span className="rounded bg-brand-900/10 px-1.5 py-0.5 self-start font-mono text-xs font-bold text-brand-900">
                      {ficha.articulo.codigo}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-text-primary">
                  {formatCantidad(ficha.stockActual, ficha.articulo.unidadMedida)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-secondary">
                  {formatCantidad(ficha.stockMinimo, ficha.articulo.unidadMedida)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-text-secondary">
                  {ficha.stockCritico !== null
                    ? formatCantidad(ficha.stockCritico, ficha.articulo.unidadMedida)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <EstadoStockBadge estado={ficha.estadoCalculado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(ficha)}
                      aria-label={`Editar ficha de ${ficha.articulo.nombre} en ${ficha.deposito.nombre}`}
                      title="Editar ficha"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Pencil className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTransfer(ficha)}
                      aria-label={`Transferir ${ficha.articulo.nombre} desde ${ficha.deposito.nombre}`}
                      title="Transferir stock"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
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