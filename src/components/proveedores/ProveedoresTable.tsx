"use client";

import { Edit2, Eye, SearchX, Trash2 } from "lucide-react";
import type { Proveedor } from "@/data/proveedores";
import { EstadoProveedorBadge } from "./EstadoProveedorBadge";

interface ProveedoresTableProps {
  proveedores: Proveedor[];
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNueva: () => void;
  onVer: (proveedor: Proveedor) => void;
  onEditar: (proveedor: Proveedor) => void;
  onBaja: (proveedor: Proveedor) => void;
}

const HEADERS = ["Razón Social", "CUIT", "Teléfono", "Formas de Pago", "Estado", "Acciones"];

export function ProveedoresTable({
  proveedores,
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onNueva,
  onVer,
  onEditar,
  onBaja,
}: ProveedoresTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-6 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
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
            <div className="h-4 w-44 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
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

  if (proveedores.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay proveedores registrados"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay proveedores que coincidan con la búsqueda o los filtros aplicados."
              : "Registrá tu primer proveedor para poder generar solicitudes de cotización u órdenes de compra."}
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
            Nuevo proveedor
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">
            Listado de proveedores con acciones para ver, editar y dar de baja
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
            {proveedores.map((prov) => {
              const activo = prov.estado === "Activo";
              return (
                <tr
                  key={prov.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand-900">
                      {prov.razonSocial}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {prov.cuit}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {prov.telefono}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[240px] flex-wrap gap-1">
                      {prov.formasPago.map((f) => (
                        <span
                          key={f}
                          className="rounded-pill bg-cream-100 px-2 py-0.5 text-xs font-bold text-text-secondary"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <EstadoProveedorBadge estado={prov.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onVer(prov)}
                        aria-label={`Ver detalles de ${prov.razonSocial}`}
                        title="Ver detalles"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {activo && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditar(prov)}
                            aria-label={`Editar proveedor ${prov.razonSocial}`}
                            title="Editar proveedor"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                          >
                            <Edit2 className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onBaja(prov)}
                            aria-label={`Dar de baja a ${prov.razonSocial}`}
                            title="Dar de baja"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-status-danger/10 hover:text-status-danger-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </>
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
