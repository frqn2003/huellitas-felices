"use client";

import { Eye, EyeOff, FileDown, Landmark, ReceiptText, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EstadoCtaCteBadge } from "./EstadoCtaCteBadge";
import {
  formatARS,
  formatFecha,
  infoSaldo,
  type ComprobantePendiente,
  type EstadoCtaCte,
  type PagoProveedor,
  type ProveedorCtaCte,
} from "@/data/cuentas-corrientes";

const FILTROS_ESTADO: { value: EstadoCtaCte | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "Vencido", label: "Vencido" },
  { value: "ProximoAVencer", label: "Próximo a vencer" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Credito", label: "Crédito a favor" },
  { value: "Saldado", label: "Saldado" },
];

const FILTROS_FORMA: { value: string; label: string }[] = [
  { value: "", label: "Todas las formas de pago" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
  { value: "Tarjeta", label: "Tarjeta" },
];

interface CtaCorrienteDetalleProps {
  proveedor: ProveedorCtaCte;
  comprobantes: ComprobantePendiente[];
  pagos: PagoProveedor[];
  comprobanteResaltado?: number | null;
  onVolver: () => void;
  onExportar: () => void;
  onRegistrarPago: () => void;
}

export function CtaCorrienteDetalle({
  proveedor,
  comprobantes,
  pagos,
  comprobanteResaltado = null,
  onVolver,
  onExportar,
  onRegistrarPago,
}: CtaCorrienteDetalleProps) {
  const saldo = infoSaldo(proveedor.saldoActual);

  const [filtroEstado, setFiltroEstado] = useState<EstadoCtaCte | "">("");
  const [filtroForma, setFiltroForma] = useState("");
  const [comprobanteExpandido, setComprobanteExpandido] = useState<number | null>(null);

  const comprobantesFiltrados = useMemo(
    () => (filtroEstado ? comprobantes.filter((c) => c.estadoCta === filtroEstado) : comprobantes),
    [comprobantes, filtroEstado],
  );

  const pagosFiltrados = useMemo(
    () => (filtroForma ? pagos.filter((p) => p.formaPago === filtroForma) : pagos),
    [pagos, filtroForma],
  );

  const pagosDeComprobante = (comprobanteId: number) =>
    pagos.filter((p) => p.imputaciones.some((i) => i.comprobanteId === comprobanteId));

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado del detalle */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-900/10">
            <Wallet className="h-6 w-6 text-brand-900" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              Cuenta corriente
            </span>
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-brand-900">
              {proveedor.razonSocial}
            </h2>
            <p className="text-sm font-medium text-text-secondary">CUIT {proveedor.cuit}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <span className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              Saldo actual
            </span>
            <p className={`font-display text-2xl font-extrabold ${saldo.tone}`}>
              {saldo.sign}
              {formatARS(Math.abs(proveedor.saldoActual))}
            </p>
            <p className="text-xs font-medium text-text-secondary">{saldo.label}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="md" type="button" onClick={onExportar}>
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Exportar PDF
            </Button>
            <Button size="md" type="button" onClick={onRegistrarPago}>
              <Landmark className="h-4 w-4" aria-hidden="true" />
              Registrar pago
            </Button>
          </div>
        </div>
      </div>

      {/* Panel Comprobantes pendientes */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Comprobantes pendientes
          </h3>
          <div className="w-52">
            <Select
              aria-label="Filtrar comprobantes por estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoCtaCte | "")}
            >
              {FILTROS_ESTADO.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {comprobantesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
              <ReceiptText className="h-6 w-6 text-brand-900" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
                {filtroEstado ? "Sin resultados" : "Sin comprobantes pendientes"}
              </h4>
              <p className="max-w-sm text-sm text-text-secondary">
                {filtroEstado
                  ? "No hay comprobantes que coincidan con el filtro aplicado."
                  : "Todos los comprobantes de este proveedor están saldados."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <caption className="sr-only">Comprobantes pendientes del proveedor</caption>
                <thead>
                  <tr className="border-b border-border bg-cream-50">
                    {["N° comprobante", "Vencimiento", "Saldo pendiente", "Estado", "Pagos imputados"].map((h) => (
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
                  {comprobantesFiltrados.map((c) => {
                    const imputados = pagosDeComprobante(c.id);
                    const expandido = comprobanteExpandido === c.id;
                    return (
                      <FragmentoFilaComprobante
                        key={c.id}
                        comprobante={c}
                        imputados={imputados}
                        expandido={expandido || comprobanteResaltado === c.id}
                        resaltado={comprobanteResaltado === c.id}
                        onToggle={() =>
                          setComprobanteExpandido(expandido || comprobanteResaltado === c.id ? null : c.id)
                        }
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Panel Pagos registrados */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Pagos registrados
          </h3>
          <div className="w-56">
            <Select
              aria-label="Filtrar pagos por forma de pago"
              value={filtroForma}
              onChange={(e) => setFiltroForma(e.target.value)}
            >
              {FILTROS_FORMA.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {pagosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
              <Landmark className="h-6 w-6 text-brand-900" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
                {filtroForma ? "Sin resultados" : "Sin pagos registrados"}
              </h4>
              <p className="max-w-sm text-sm text-text-secondary">
                {filtroForma
                  ? "No hay pagos que coincidan con el filtro aplicado."
                  : "Los pagos a este proveedor aparecerán acá cuando registres el primero."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <caption className="sr-only">Pagos registrados al proveedor</caption>
                <thead>
                  <tr className="border-b border-border bg-cream-50">
                    {["N° pago", "Fecha", "Forma de pago", "Importe", "Comprobantes imputados"].map((h) => (
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
                  {pagosFiltrados.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-brand-900">{p.numero}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">{formatFecha(p.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{p.formaPago}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                        {formatARS(p.monto)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.imputaciones.map((i) => (
                            <span
                              key={i.comprobanteId}
                              className="rounded-pill bg-cream-100 px-2 py-0.5 text-xs font-bold text-text-secondary"
                            >
                              {i.numero} · {formatARS(i.monto)}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <div className="flex">
        <Button variant="ghost" size="md" type="button" onClick={onVolver} className="self-start">
          ← Volver a cuentas
        </Button>
      </div>
    </div>
  );
}

function FragmentoFilaComprobante({
  comprobante,
  imputados,
  expandido,
  resaltado = false,
  onToggle,
}: {
  comprobante: ComprobantePendiente;
  imputados: PagoProveedor[];
  expandido: boolean;
  resaltado?: boolean;
  onToggle: () => void;
}) {
  const saldo = infoSaldo(comprobante.saldoPendiente);
  return (
    <>
      <tr className={`border-b border-border/60 transition-colors duration-fast ease-out hover:bg-cream-50/60 ${resaltado ? "bg-accent-500/10 ring-2 ring-inset ring-brand-900" : ""}`}>
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-bold text-brand-900">{comprobante.numero}</span>
            <span className="text-xs font-medium text-text-secondary">{comprobante.tipo}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-text-primary">{formatFecha(comprobante.fechaVencimiento)}</td>
        <td className="px-4 py-3">
          <span className={`text-sm font-extrabold ${saldo.tone}`}>
            {saldo.sign}
            {formatARS(Math.abs(comprobante.saldoPendiente))}
          </span>
        </td>
        <td className="px-4 py-3">
          <EstadoCtaCteBadge estado={comprobante.estadoCta} />
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expandido}
            aria-label={`${expandido ? "Ocultar" : "Ver"} pagos imputados al comprobante ${comprobante.numero}`}
            className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-pill px-3 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            {expandido ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {imputados.length}
          </button>
        </td>
      </tr>
      {expandido && (
        <tr className="border-b border-border/60 bg-cream-50/50">
          <td colSpan={5} className="px-6 py-3">
            {imputados.length === 0 ? (
              <p className="text-sm text-text-secondary">Este comprobante no tiene pagos imputados.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {imputados.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-text-primary">
                      Pago {p.numero} · {formatFecha(p.fecha)} · {p.formaPago}
                    </span>
                    <span className="font-bold text-brand-900">
                      {formatARS(p.imputaciones.find((i) => i.comprobanteId === comprobante.id)?.monto ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
