"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Receipt } from "lucide-react";
import type { MovimientoCaja } from "@/data/cajas";
import { TipoMovimientoCajaBadge } from "./TipoMovimientoCajaBadge";
import { TipoMovimientoOrigenBadge } from "./TipoMovimientoOrigenBadge";

interface MovimientosCajaTableProps {
  movimientos: MovimientoCaja[];
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const HEADERS = ["Id", "Fecha", "Hora", "Tipo", "Motivo / concepto", "Monto", "Origen"];

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function MovimientosCajaTable({
  movimientos,
  loading = false,
  hasActiveFilters,
  onClearFilters,
}: MovimientosCajaTableProps) {
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
            <div className="h-4 w-8 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-6 w-24 animate-pulse rounded-pill bg-cream-100 lg:block" />
            <div className="hidden h-4 w-40 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-6 w-24 animate-pulse rounded-pill bg-cream-100 lg:block" />
          </div>
        ))}
      </div>
    );
  }

  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <Receipt className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "Sin movimientos"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay movimientos que coincidan con la búsqueda aplicada."
              : "Registrá el primer ingreso o egreso de la caja."}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            Limpiar búsqueda
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <caption className="sr-only">
            Movimientos de efectivo de la caja con su tipo, monto y origen. Los cobros por
            transferencia o cuenta corriente no generan movimientos en la caja.
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
            {movimientos.map((m) => (
              <tr
                key={m.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {String(m.id).padStart(4, "0")}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {format(new Date(m.fechaHora), "dd/MM/yyyy", { locale: es })}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-brand-900">
                  {format(new Date(m.fechaHora), "HH:mm", { locale: es })}
                </td>
                <td className="px-4 py-3">
                  <TipoMovimientoCajaBadge tipo={m.tipo} />
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  <span className="block max-w-xs truncate" title={m.motivo}>
                    {m.motivo}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${
                    m.tipo === "Ingreso" ? "text-status-success-strong" : "text-status-danger-strong"
                  }`}
                >
                  {m.tipo === "Ingreso" ? "+" : "−"} {formatMonto(m.monto)}
                </td>
                <td className="px-4 py-3">
                  <TipoMovimientoOrigenBadge ventaId={m.ventaId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}