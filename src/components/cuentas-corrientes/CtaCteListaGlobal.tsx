"use client";

import { Building2, UserRound, ChevronRight, Plus } from "lucide-react";
import { EstadoCtaCteBadge } from "@/components/proveedores/EstadoCtaCteBadge";
import { Button } from "@/components/ui/Button";
import type { CuentaCorriente } from "@/data/cuentas-corrientes";
import { formatARS, formatFecha, infoSaldo } from "@/data/cuentas-corrientes";
interface CtaCteListaGlobalProps {
  cuentas: CuentaCorriente[];
  onVerDetalle: (cuenta: CuentaCorriente) => void;
  onRegistrar: (cuenta: CuentaCorriente) => void;
}

// Listado unificado de cuentas corrientes (proveedores + clientes).
// Tabla de lectura con badge de tipo de entidad y saldo con signo + etiqueta (a11y).
export function CtaCteListaGlobal({ cuentas, onVerDetalle, onRegistrar }: CtaCteListaGlobalProps) {
  const tipoMeta = (tipo: "proveedor" | "cliente") =>
    tipo === "proveedor"
      ? {
          label: "Proveedor",
          icon: Building2,
          chip: "bg-status-info/10 text-status-info-strong",
        }
      : {
          label: "Cliente",
          icon: UserRound,
          chip: "bg-status-success/10 text-status-success-strong",
        };

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <caption className="sr-only">
            Cuentas corrientes de proveedores y clientes con saldo, estado y vencimiento
          </caption>
          <thead>
            <tr className="bg-cream-50">
              <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Entidad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Saldo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Próx. vencimiento
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cuentas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-text-secondary">
                  No hay cuentas corrientes que coincidan con el filtro.
                </td>
              </tr>
            )}
            {cuentas.map((c) => {
              const meta = tipoMeta(c.tipo);
              const TipoIcon = meta.icon;
              const saldo = infoSaldo(c.saldoActual);
              return (
                <tr key={`${c.tipo}-${c.id}`} className="transition-colors duration-fast ease-out hover:bg-cream-50/60">
                  <td className="px-6 py-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => onVerDetalle(c)}
                        className="text-left font-bold text-brand-900 underline-offset-4 transition-colors duration-fast ease-out hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        {c.nombre}
                      </button>
                      <p className="text-xs font-medium text-text-secondary">{c.documento}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${meta.chip}`}>
                      <TipoIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-base font-medium ${saldo.tone}`}>
                      {saldo.sign}{formatARS(Math.abs(c.saldoActual))}
                    </span>
                    <span className="sr-only">, {saldo.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <EstadoCtaCteBadge estado={c.estadoCta} />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-text-secondary">
                    {formatFecha(c.proximoVencimiento)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onRegistrar(c)}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {c.tipo === "proveedor" ? "Pagar" : "Cobrar"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onVerDetalle(c)} aria-label={`Ver detalle de ${c.nombre}`}>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
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
