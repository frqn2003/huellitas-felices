"use client";

import { Edit2, Eye, PawPrint, Users } from "lucide-react";
import type { Cliente, Mascota } from "@/data/clientes";
import { EstadoClienteBadge } from "./EstadoClienteBadge";

interface ClientesTableProps {
  clientes: Cliente[];
  /** Mascotas vinculadas por cliente (clave = cliente.id); tabla `mascota`. */
  mascotasPorCliente?: Record<number, Mascota[]>;
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNuevo: () => void;
  onVer: (cliente: Cliente) => void;
  onEditar: (cliente: Cliente) => void;
}

const HEADERS = ["DNI", "Nombre y apellido", "Teléfono", "Mascotas", "Estado", "Acciones"];

export function ClientesTable({
  clientes,
  mascotasPorCliente,
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onNuevo,
  onVer,
  onEditar,
}: ClientesTableProps) {
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
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-44 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-32 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <Users className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay clientes registrados"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay clientes que coincidan con la búsqueda o los filtros aplicados."
              : "Registrá tu primer cliente para poder asociarlo a sus mascotas y turnos."}
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
            onClick={onNuevo}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Nuevo cliente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <caption className="sr-only">
            Listado de clientes con sus mascotas y acciones para ver y editar
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
            {clientes.map((cli) => {
              const activo = cli.estado === "activo";
              const nombreCompleto = `${cli.nombre} ${cli.apellido}`;
              return (
                <tr
                  key={cli.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {cli.documento}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand-900">{nombreCompleto}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {cli.telefono}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const mascotas = mascotasPorCliente?.[cli.id] ?? [];
                      if (mascotas.length === 0) {
                        return (
                          <span className="text-sm text-text-secondary">Sin mascotas</span>
                        );
                      }
                      const primeras = mascotas.slice(0, 2).map((m) => m.nombre);
                      const resto = mascotas.length - primeras.length;
                      return (
                        <span className="text-sm text-text-primary">
                          {primeras.join(", ")}
                          {resto > 0 && (
                            <span className="font-bold text-text-secondary">+{resto}</span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoClienteBadge estado={cli.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onVer(cli)}
                        aria-label={`Ver detalles de ${nombreCompleto}`}
                        title="Ver detalles"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {/* HU-MAS: en el futuro lleva a la sección de mascotas del
                          cliente (tabla `mascota`). Por ahora no hace nada. */}
                      <button
                        type="button"
                        onClick={() => {}}
                        aria-label={`Ver mascotas de ${nombreCompleto}`}
                        title="Ver mascotas"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <PawPrint className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {activo && (
                        <button
                          type="button"
                          onClick={() => onEditar(cli)}
                          aria-label={`Editar cliente ${nombreCompleto}`}
                          title="Editar cliente"
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                        >
                          <Edit2 className="h-5 w-5" aria-hidden="true" />
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