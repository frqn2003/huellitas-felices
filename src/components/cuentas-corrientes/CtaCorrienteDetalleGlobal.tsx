"use client";

import { ArrowLeft, Landmark, ReceiptText, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EstadoCtaCteBadge } from "@/components/proveedores/EstadoCtaCteBadge";
import type { ComprobantePendiente, CuentaCorriente, Pago } from "@/data/cuentas-corrientes";
import { formatARS, formatFecha, infoSaldo } from "@/data/cuentas-corrientes";

type SubTab = "comprobantes" | "pagos";

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
  const [subTab, setSubTab] = useState<SubTab>("comprobantes");
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

      {/* Tabs Comprobantes / Pagos */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Tablas de la cuenta corriente" className="flex items-center gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "comprobantes"}
            onClick={() => setSubTab("comprobantes")}
            className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill px-5 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
              subTab === "comprobantes"
                ? "bg-brand-900 text-cream-50"
                : "border border-brand-900 bg-transparent text-brand-900 hover:bg-brand-900/5"
            }`}
          >
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Comprobantes pendientes ({comprobantes.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "pagos"}
            onClick={() => setSubTab("pagos")}
            className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill px-5 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
              subTab === "pagos"
                ? "bg-brand-900 text-cream-50"
                : "border border-brand-900 bg-transparent text-brand-900 hover:bg-brand-900/5"
            }`}
          >
            <Landmark className="h-4 w-4" aria-hidden="true" />
            {cuenta.tipo === "proveedor" ? "Pagos registrados" : "Cobranzas registradas"} ({pagos.length})
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={onRegistrar}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar {verbo}
          </Button>
        </div>
      </div>

      {subTab === "comprobantes" ? (
        <CtaComprobantesGlobal comprobantes={comprobantes} />
      ) : (
        <CtaPagosGlobal pagos={pagos} cuentaTipo={cuenta.tipo} />
      )}
    </div>
  );
}

function CtaComprobantesGlobal({ comprobantes }: { comprobantes: ComprobantePendiente[] }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(comprobantes.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = comprobantes.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = comprobantes.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, comprobantes.length);

  if (comprobantes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
          <ReceiptText className="h-6 w-6 text-brand-900" aria-hidden="true" />
        </span>
        <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">Sin comprobantes pendientes</h4>
        <p className="max-w-sm text-sm text-text-secondary">Todos los comprobantes de esta entidad están saldados.</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">Comprobantes pendientes de la entidad</caption>
            <thead>
              <tr className="border-b border-border bg-cream-50">
                {["N° comprobante", "Vencimiento", "Saldo pendiente", "Estado"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => {
                const s = infoSaldo(c.saldoPendiente);
                return (
                  <tr key={c.id} className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-brand-900">{c.numero}</span>
                        <span className="text-xs font-medium text-text-secondary">{c.tipo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{formatFecha(c.fechaVencimiento)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-extrabold ${s.tone}`}>
                        {s.sign}{formatARS(Math.abs(c.saldoPendiente))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EstadoCtaCteBadge estado={c.estadoCta} />
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
          totalItems={comprobantes.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="comprobantes"
        />
      )}
    </section>
  );
}

function CtaPagosGlobal({ pagos, cuentaTipo }: { pagos: Pago[]; cuentaTipo: "proveedor" | "cliente" }) {
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(pagos.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = pagos.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = pagos.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, pagos.length);
  const sustantivo = cuentaTipo === "proveedor" ? "pagos" : "cobranzas";

  if (pagos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
          <Landmark className="h-6 w-6 text-brand-900" aria-hidden="true" />
        </span>
        <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
          Sin {sustantivo} registrados
        </h4>
        <p className="max-w-sm text-sm text-text-secondary">
          Los {sustantivo} de esta entidad aparecerán acá cuando registres el primero.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">{sustantivo} registrados a la entidad</caption>
            <thead>
              <tr className="border-b border-border bg-cream-50">
                {["N° comprobante", "Fecha", "Forma", "Importe", "Comprobantes imputados", "Estado"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p.id} className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60">
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand-900">{p.numero}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">{formatFecha(p.fecha)}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{p.formaPago}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-text-primary">{formatARS(p.monto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.imputaciones.map((i) => (
                        <span key={`${p.id}-${i.comprobanteId}`} className="rounded-pill bg-cream-100 px-2 py-0.5 text-xs font-bold text-text-secondary">
                          {i.numero} · {formatARS(i.monto)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.estado === "Anulado" ? (
                      <span className="text-xs font-bold text-destructive">Anulado</span>
                    ) : (
                      <span className="text-xs font-bold text-status-success-strong">Vigente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {pageItems.length > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={pagos.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel={sustantivo}
        />
      )}
    </section>
  );
}
