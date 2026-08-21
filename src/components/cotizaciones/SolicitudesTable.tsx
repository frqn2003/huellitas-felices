"use client";

import { Ban, GitCompareArrows, Plus, SearchX } from "lucide-react";
import type { SolicitudCotizacion } from "@/data/cotizaciones";
import { codigoSolicitud } from "@/data/cotizaciones";
import { articulosIniciales } from "@/data/articulos";
import { formatFecha } from "@/data/ordenes-compra";
import { EstadoSolicitudBadge } from "./EstadoSolicitudBadge";

interface SolicitudesTableProps {
  solicitudes: SolicitudCotizacion[];
  loading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNueva: () => void;
  onComparar: (solicitud: SolicitudCotizacion) => void;
  onRegistrarCotizacion: (solicitud: SolicitudCotizacion) => void;
  onCancelar: (solicitud: SolicitudCotizacion) => void;
}

const HEADERS = ["N°", "Artículos", "Cotizaciones", "Fecha", "Estado", "Acciones"];

// BACKEND: el nombre del artículo llega resuelto por el JOIN del detalle.
function nombreArticulo(articuloId: number): string {
  return (
    articulosIniciales.find((a) => a.id === articuloId)?.nombre ?? `Artículo #${articuloId}`
  );
}

function resumenArticulos(solicitud: SolicitudCotizacion): string {
  const nombres = solicitud._articulos_solicitados.map((a) => nombreArticulo(a.articulo_id));
  const visibles = nombres.slice(0, 2).join(", ");
  const restantes = nombres.length - 2;
  return restantes > 0 ? `${visibles} +${restantes} más` : visibles;
}

export function SolicitudesTable({
  solicitudes,
  loading,
  hasActiveFilters,
  onClearFilters,
  onNueva,
  onComparar,
  onRegistrarCotizacion,
  onCancelar,
}: SolicitudesTableProps) {
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-6 w-20 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-52 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-cream-100" />
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

  if (solicitudes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay solicitudes de cotización"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay solicitudes que coincidan con la búsqueda o los filtros aplicados."
              : "Creá la primera solicitud para pedir precios a los proveedores antes de emitir una orden."}
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
            Crear primera solicitud
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
            Listado de solicitudes de cotización con acciones de comparar, registrar cotización y cancelar
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
            {solicitudes.map((solicitud) => {
              const abierta = solicitud.estado === "Abierta";
              const comparables = solicitud._cotizaciones.length >= 2;
              return (
                <tr
                  key={solicitud.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                      {codigoSolicitud(solicitud.id)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="max-w-64 truncate text-sm font-bold text-text-primary">
                        {resumenArticulos(solicitud)}
                      </span>
                      <span className="max-w-56 truncate text-xs text-text-secondary">
                        Creada por {solicitud._usuario.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {solicitud._cotizaciones.length}{" "}
                    {solicitud._cotizaciones.length === 1 ? "proveedor" : "proveedores"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {formatFecha(solicitud.fecha)}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoSolicitudBadge estado={solicitud.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onComparar(solicitud)}
                        disabled={!comparables}
                        aria-label={`Comparar cotizaciones de ${codigoSolicitud(solicitud.id)}`}
                        aria-disabled={!comparables}
                        title={
                          comparables
                            ? "Comparar cotizaciones"
                            : "Necesita al menos 2 cotizaciones para comparar"
                        }
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                      >
                        <GitCompareArrows className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {abierta && (
                        <>
                          <button
                            type="button"
                            onClick={() => onRegistrarCotizacion(solicitud)}
                            aria-label={`Registrar cotización para ${codigoSolicitud(solicitud.id)}`}
                            title="Registrar cotización recibida"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                          >
                            <Plus className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelar(solicitud)}
                            aria-label={`Cancelar ${codigoSolicitud(solicitud.id)}`}
                            title="Cancelar solicitud"
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                          >
                            <Ban className="h-5 w-5" aria-hidden="true" />
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
