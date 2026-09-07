"use client";

import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EstadoCtaCteBadge } from "@/components/proveedores/EstadoCtaCteBadge";
import type { ComprobantePendiente, CuentaCorriente, EstadoCtaCte, Pago } from "@/data/cuentas-corrientes";
import { formatARS, formatFecha, infoSaldo } from "@/data/cuentas-corrientes";
import { FORMAS_PAGO } from "@/data/formas-pago";

interface CtaCorrienteDetalleGlobalProps {
  cuenta: CuentaCorriente;
  comprobantes: ComprobantePendiente[];
  pagos: Pago[];
  onVolver: () => void;
  onRegistrar: () => void;
}

export function CtaCorrienteDetalleGlobal({
  cuenta,
  comprobantes,
  pagos,
  onVolver,
  onRegistrar,
}: CtaCorrienteDetalleGlobalProps) {
  const saldo = infoSaldo(cuenta.saldoActual);
  const verbo = cuenta.tipo === "proveedor" ? "pago" : "cobranza";

  return (
    <div className="flex flex-col gap-5">
      {/* Header del detalle */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-border bg-surface p-4 shadow-card">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver al listado"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              {cuenta.tipo === "proveedor" ? "Cuenta corriente · Proveedor" : "Cuenta corriente · Cliente"}
            </span>
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-brand-900">
              {cuenta.nombre}
            </h2>
            <p className="text-sm font-medium text-text-secondary">
              {cuenta.tipo === "proveedor" ? "CUIT" : "DNI"} {cuenta.documento}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className={`font-display text-2xl font-extrabold leading-tight ${saldo.tone}`}>
            {saldo.sign}{formatARS(Math.abs(cuenta.saldoActual))}
          </p>
          <span className="text-xs font-bold text-text-secondary">{saldo.label}</span>
          <EstadoCtaCteBadge estado={cuenta.estadoCta} />
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={onRegistrar}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Registrar {verbo}
        </Button>
      </div>

      {/* Tabla unificada de movimientos (comprobantes + pagos) */}
      <CtaMovimientosGlobal comprobantes={comprobantes} pagos={pagos} cuentaTipo={cuenta.tipo} />
    </div>
  );
}

function CtaMovimientosGlobal({
  comprobantes,
  pagos,
  cuentaTipo,
}: {
  comprobantes: ComprobantePendiente[];
  pagos: Pago[];
  cuentaTipo: "proveedor" | "cliente";
}) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const verbo = cuentaTipo === "proveedor" ? "pago" : "cobranza";

  // Unificar comprobantes y pagos como movimientos, ordenados por fecha descendente
  const movimientos: Array<{
    fecha: string; tipo: "Comprobante"; numero: string; concepto: string; importe: number; estado: EstadoCtaCte; _isDebito: true
  } | {
    fecha: string; tipo: "Pago"; numero: string; concepto: string; importe: number; estado: "Vigente" | "Anulado"; _isDebito: false
  }> = [
    ...comprobantes.map((c) => ({
      fecha: c.fechaVencimiento,
      tipo: "Comprobante" as const,
      numero: c.numero,
      concepto: c.tipo,
      importe: c.saldoPendiente,
      estado: c.estadoCta,
      _isDebito: true as const,
    })),
    ...pagos.map((p) => ({
      fecha: p.fecha,
      tipo: "Pago" as const,
      numero: p.numero_comprobante,
      concepto: FORMAS_PAGO.find((f) => f.id === p.forma_pago_id)?.nombre ?? "—",
      importe: p.monto,
      estado: p.estado ?? "Vigente",
      _isDebito: false as const,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalPages = Math.max(1, Math.ceil(movimientos.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = movimientos.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = movimientos.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, movimientos.length);

  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
        <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
          Sin movimientos registrados
        </h4>
        <p className="max-w-sm text-sm text-text-secondary">
          Aún no hay comprobantes ni {verbo}s asociados a esta entidad.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">Listado de movimientos de la cuenta corriente ({comprobantes.length} comprobantes, {pagos.length} pagos)</caption>
            <thead>
              <tr className="border-b border-border bg-cream-50">
                {["Fecha", "Tipo", "N°", "Concepto", "Importe", "Estado"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
{pageItems.map((m, i) => {
                 const key = `${m.tipo}-${m.numero}-${i}`;
                 const esDebito = m._isDebito;
                 return (
                  <tr
                    key={key}
                    className={`border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60 ${
                      esDebito ? "bg-cream-50/40" : "bg-status-success/5"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-text-primary">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-text-secondary">{m.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{m.numero}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{m.concepto}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-extrabold ${esDebito ? "text-destructive" : "text-status-success-strong"}`}>
                        {esDebito ? "+" : "−"}
                        {esDebito ? formatARS(Math.abs(m.importe)) : formatARS(Math.abs(m.importe))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.tipo === "Comprobante" ? (
                        <EstadoCtaCteBadge estado={m.estado} />
                      ) : (
                        <span className={`text-xs font-bold ${m.estado === "Anulado" ? "text-destructive" : "text-status-success-strong"}`}>
                          {m.estado}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {pageItems.length > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={movimientos.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="movimientos"
        />
      )}
    </section>
  );
}
