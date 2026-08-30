"use client";

import { Eye, Pencil, SearchX, Trash2 } from "lucide-react";
import type { OrdenCompra } from "@/data/ordenes-compra";
import { formatFecha, formatMoney, numeroOrden } from "@/data/ordenes-compra";
import { EstadoOrdenBadge } from "./EstadoOrdenBadge";

interface OrdenesTableProps {
  ordenes: OrdenCompra[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onView: (orden: OrdenCompra) => void;
  onEdit: (orden: OrdenCompra) => void;
  onCancel: (orden: OrdenCompra) => void;
  onNueva: () => void;
}

const HEADERS = ["N° Orden", "Proveedor", "Fecha", "Entrega", "Total", "Estado", "Acciones"];

export function OrdenesTable({
  ordenes,
  loading,
  hasActiveFilters,
  onClearFilters,
  onView,
  onEdit,
  onCancel,
  onNueva,
}: OrdenesTableProps) {
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-6 w-20 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-44 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
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

  if (ordenes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay órdenes de compra registradas"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay órdenes que coincidan con la búsqueda o los filtros aplicados."
              : "Creá la primera orden para reponer los artículos que alcanzaron su stock mínimo."}
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
            Crear primera orden
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
            Listado de órdenes de compra con acciones de ver, editar y cancelar
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
            {ordenes.map((orden) => {
              const editable = orden.estado === "Pendiente";
              // Cancelar solo antes de recibir mercadería (criterio HU-COMP-02).
              const cancelable = orden.estado === "Pendiente" || orden.estado === "Enviada";
              return (
                <tr
                  key={orden.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                      {numeroOrden(orden.id)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-primary">
                        {orden._proveedor.razon_social}
                      </span>
                      <span className="max-w-56 truncate text-xs text-text-secondary">
                        Creada por {orden._usuario.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {formatFecha(orden.fecha)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {formatFecha(orden.fecha_entrega)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-text-primary">
                    {formatMoney(orden.total)}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoOrdenBadge estado={orden.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onView(orden)}
                        aria-label={`Ver ${numeroOrden(orden.id)}`}
                        title="Ver detalle"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => onEdit(orden)}
                          aria-label={`Editar ${numeroOrden(orden.id)}`}
                          title="Editar (solo órdenes pendientes)"
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                        >
                          <Pencil className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                      {cancelable && (
                        <button
                          type="button"
                          onClick={() => onCancel(orden)}
                          aria-label={`Cancelar ${numeroOrden(orden.id)}`}
                          title="Cancelar orden"
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
