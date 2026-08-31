"use client";

import { Wallet } from "lucide-react";
import { EstadoCtaCteBadge } from "./EstadoCtaCteBadge";
import {
  formatARS,
  formatFecha,
  infoSaldo,
  type ProveedorCtaCte,
} from "@/data/cuentas-corrientes";

const HEADERS = ["Proveedor", "CUIT", "Deuda total", "Próx. vencimiento", "Estado", "Acciones"];

interface CtaCorrienteListProps {
  proveedores: ProveedorCtaCte[];
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onVer: (proveedor: ProveedorCtaCte) => void;
}

export function CtaCorrienteList({
  proveedores,
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onVer,
}: CtaCorrienteListProps) {
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
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
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
          <Wallet className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay cuentas corrientes"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay proveedores que coincidan con la búsqueda o los filtros aplicados."
              : "Las cuentas corrientes de tus proveedores aparecerán acá cuando registres comprobantes o pagos."}
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
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">
            Resumen de cuentas corrientes de proveedores, con acceso al detalle de cada cuenta
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
            {proveedores.map((p) => {
              const saldo = infoSaldo(p.saldoActual);
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand-900">{p.razonSocial}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">{p.cuit}</td>
                  <td className="px-4 py-3">
                    {/* Redundancia: el signo y la etiqueta complementan el color, nunca se
                        depende solo de él (heurística de accesibilidad, a11y). */}
                    <span className={`text-sm font-extrabold ${saldo.tone}`}>
                      {saldo.sign}
                      {formatARS(Math.abs(p.saldoActual))}
                    </span>
                    <span className="ml-2 text-xs font-medium text-text-secondary">{saldo.label}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">
                    {formatFecha(p.proximoVencimiento)}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoCtaCteBadge estado={p.estadoCta} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onVer(p)}
                      aria-label={`Ver cuenta corriente de ${p.razonSocial}`}
                      title="Ver cuenta corriente"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Wallet className="h-5 w-5" aria-hidden="true" />
                    </button>
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
