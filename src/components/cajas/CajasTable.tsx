"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, FileCheck2 } from "lucide-react";
import type { ReactNode } from "react";
import type { CajaApertura } from "@/data/cajas";
import { EstadoCajaBadge } from "./EstadoCajaBadge";

// Fila de la tabla con los campos de display ya resueltos (el front los junta
// con los directorios; el backend los devuelve con JOIN). `saldoActual` NO
// está en `caja_apertura`: es `caja.saldo_actual`, un valor vivo por caja
// física (ver la nota de `cajas` en src/data/cajas.ts).
export type CajaRow = CajaApertura & { saldoActual: number };

interface CajasTableProps {
  aperturas: CajaRow[];
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onAbrir?: () => void;
  onVer?: (apertura: CajaRow) => void;
  onVerCierre?: (apertura: CajaRow) => void;
  renderActions?: (apertura: CajaRow) => ReactNode;
}

const HEADERS = [
  "Id",
  "Fecha",
  "Hora",
  "Sucursal",
  "Cajero",
  "Monto inicial",
  "Saldo actual",
  "Estado",
  "Acciones",
];

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

// Una caja cerrada no tiene saldo vivo: el balance de esa jornada es el
// `monto_esperado` que calculó el trigger al cerrarla.
const saldoDeFila = (a: CajaRow) => (a.estado ? a.saldoActual : a.montoEsperado ?? a.saldoActual);

export function CajasTable({
  aperturas,
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onAbrir,
  onVer,
  onVerCierre,
  renderActions,
}: CajasTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-9 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
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
            <div className="h-4 w-8 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-6 w-24 animate-pulse rounded-pill bg-cream-100 lg:block" />
            <div className="flex gap-1">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (aperturas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <FileCheck2 className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay aperturas de caja"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay aperturas que coincidan con la búsqueda o los filtros aplicados."
              : "Abrí la caja del turno para empezar a registrar ingresos y egresos."}
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
        ) : onAbrir ? (
          <button
            type="button"
            onClick={onAbrir}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Abrir caja
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <caption className="sr-only">
            Listado de aperturas de caja con su estado y la acción para ver el detalle
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
            {aperturas.map((a) => (
              <tr
                key={a.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {String(a.id).padStart(4, "0")}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {format(new Date(a.fechaApertura), "dd/MM/yyyy", { locale: es })}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-brand-900">
                  {format(new Date(a.fechaApertura), "HH:mm", { locale: es })}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">{a.sucursal}</td>
                <td className="px-4 py-3">
                  <span className="font-bold text-brand-900">
                    {a.cajero.nombre} {a.cajero.apellido}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-brand-900">
                  {formatMonto(a.montoInicial)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-brand-900">
                  {formatMonto(saldoDeFila(a))}
                </td>
                <td className="px-4 py-3">
                  <EstadoCajaBadge abierto={a.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {renderActions ? (
                      renderActions(a)
                    ) : onVer ? (
                      <button
                        type="button"
                        onClick={() => onVer(a)}
                        aria-label={`Entrar a la caja de ${a.cajero.nombre} ${a.cajero.apellido}`}
                        title="Entrar a la caja"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : null}
                    {!a.estado && onVerCierre && (
                      <button
                        type="button"
                        onClick={() => onVerCierre(a)}
                        aria-label={`Ver cierre de la caja de ${a.cajero.nombre} ${a.cajero.apellido}`}
                        title="Ver cierre"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
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