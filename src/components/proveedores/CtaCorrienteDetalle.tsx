"use client";

import { ArrowLeft, Eye, EyeOff, Landmark, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EstadoCtaCteBadge } from "./EstadoCtaCteBadge";
import {
  FILTROS_CTA_COMPROBANTE_VACIOS,
  FILTROS_CTA_PAGO_VACIOS,
  FiltrosCtaComprobantes,
  FiltrosCtaPagos,
  type FiltrosCtaComprobanteValues,
  type FiltrosCtaPagoValues,
} from "./FiltrosCtaCorriente";
import {
  formatARS,
  formatFecha,
  infoSaldo,
  type ComprobantePendiente,
  type PagoProveedor,
  type ProveedorCtaCte,
} from "@/data/cuentas-corrientes";

export type SubTabCtaCte = "comprobantes" | "pagos";

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
  comprobantes,
  pagos,
  comprobanteResaltado = null,
  onVolver,
}: CtaCorrienteDetalleProps) {
  const [subTab, setSubTab] = useState<SubTabCtaCte>("comprobantes");
  const [filtrosComprobante, setFiltrosComprobante] = useState<FiltrosCtaComprobanteValues>(
    FILTROS_CTA_COMPROBANTE_VACIOS,
  );
  const [filtrosPago, setFiltrosPago] = useState<FiltrosCtaPagoValues>(FILTROS_CTA_PAGO_VACIOS);
  const [comprobanteExpandido, setComprobanteExpandido] = useState<number | null>(null);

  // Paginación para Comprobantes
  const [pageSizeComprobantes, setPageSizeComprobantes] = useState(10);
  const [pageComprobantes, setPageComprobantes] = useState(1);

  // Paginación para Pagos
  const [pageSizePagos, setPageSizePagos] = useState(10);
  const [pagePagos, setPagePagos] = useState(1);

  const comprobantesFiltrados = useMemo(() => {
    return comprobantes.filter((c) => {
      if (filtrosComprobante.estado && c.estadoCta !== filtrosComprobante.estado) return false;
      if (filtrosComprobante.tipo && c.tipo !== filtrosComprobante.tipo) return false;
      if (filtrosComprobante.vencimientoDesde && c.fechaVencimiento < filtrosComprobante.vencimientoDesde) return false;
      if (filtrosComprobante.vencimientoHasta && c.fechaVencimiento > filtrosComprobante.vencimientoHasta) return false;
      if (filtrosComprobante.montoMin && c.saldoPendiente < Number(filtrosComprobante.montoMin)) return false;
      if (filtrosComprobante.montoMax && c.saldoPendiente > Number(filtrosComprobante.montoMax)) return false;
      return true;
    });
  }, [comprobantes, filtrosComprobante]);

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      if (filtrosPago.formaPago && p.formaPago !== filtrosPago.formaPago) return false;
      if (filtrosPago.fechaDesde && p.fecha < filtrosPago.fechaDesde) return false;
      if (filtrosPago.fechaHasta && p.fecha > filtrosPago.fechaHasta) return false;
      if (filtrosPago.montoMin && p.monto < Number(filtrosPago.montoMin)) return false;
      if (filtrosPago.montoMax && p.monto > Number(filtrosPago.montoMax)) return false;
      return true;
    });
  }, [pagos, filtrosPago]);

  const pagosDeComprobante = (comprobanteId: number) =>
    pagos.filter((p) => p.imputaciones.some((i) => i.comprobanteId === comprobanteId));

  // Cálculos de paginación comprobantes
  const totalPagesComprobantes = Math.max(1, Math.ceil(comprobantesFiltrados.length / pageSizeComprobantes));
  const safePageComprobantes = Math.min(pageComprobantes, totalPagesComprobantes);
  const pageItemsComprobantes = comprobantesFiltrados.slice(
    (safePageComprobantes - 1) * pageSizeComprobantes,
    safePageComprobantes * pageSizeComprobantes,
  );
  const pageStartComprobantes = comprobantesFiltrados.length === 0 ? 0 : (safePageComprobantes - 1) * pageSizeComprobantes + 1;
  const pageEndComprobantes = Math.min(safePageComprobantes * pageSizeComprobantes, comprobantesFiltrados.length);

  // Cálculos de paginación pagos
  const totalPagesPagos = Math.max(1, Math.ceil(pagosFiltrados.length / pageSizePagos));
  const safePagePagos = Math.min(pagePagos, totalPagesPagos);
  const pageItemsPagos = pagosFiltrados.slice(
    (safePagePagos - 1) * pageSizePagos,
    safePagePagos * pageSizePagos,
  );
  const pageStartPagos = pagosFiltrados.length === 0 ? 0 : (safePagePagos - 1) * pageSizePagos + 1;
  const pageEndPagos = Math.min(safePagePagos * pageSizePagos, pagosFiltrados.length);

  const hasActiveFiltersComprobantes = Object.values(filtrosComprobante).some((v) => v !== "");
  const hasActiveFiltersPagos = Object.values(filtrosPago).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-5">
      {/* Navegación superior: Volver + Selector de tablas + Filtro emergente dinámico */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onVolver}
            className="px-0 text-text-secondary hover:text-brand-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Button>

          <div role="tablist" aria-label="Tablas de cuenta corriente" className="flex items-center gap-2">
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
              Comprobantes pendientes ({comprobantesFiltrados.length})
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
              Pagos registrados ({pagosFiltrados.length})
            </button>
          </div>
        </div>

        {/* Filtro correspondiente a la pestaña activa */}
        <div className="flex items-center gap-2">
          {subTab === "comprobantes" ? (
            <FiltrosCtaComprobantes
              values={filtrosComprobante}
              onChange={(f) => {
                setFiltrosComprobante(f);
                setPageComprobantes(1);
              }}
            />
          ) : (
            <FiltrosCtaPagos
              values={filtrosPago}
              onChange={(f) => {
                setFiltrosPago(f);
                setPagePagos(1);
              }}
            />
          )}
        </div>
      </div>

      {/* Contenido según pestaña activa */}
      {subTab === "comprobantes" ? (
        <section className="flex flex-col gap-4">
          {comprobantesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
                <ReceiptText className="h-6 w-6 text-brand-900" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
                  {hasActiveFiltersComprobantes ? "Sin resultados" : "Sin comprobantes pendientes"}
                </h4>
                <p className="max-w-sm text-sm text-text-secondary">
                  {hasActiveFiltersComprobantes
                    ? "No hay comprobantes que coincidan con los filtros aplicados."
                    : "Todos los comprobantes de este proveedor están saldados."}
                </p>
              </div>
            </div>
          ) : (
            <>
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
                      {pageItemsComprobantes.map((c) => {
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

              {pageItemsComprobantes.length > 0 && (
                <Pagination
                  page={safePageComprobantes}
                  totalPages={totalPagesComprobantes}
                  totalItems={comprobantesFiltrados.length}
                  pageStart={pageStartComprobantes}
                  pageEnd={pageEndComprobantes}
                  pageSize={pageSizeComprobantes}
                  onPageChange={setPageComprobantes}
                  onPageSizeChange={setPageSizeComprobantes}
                  itemLabel="comprobantes"
                />
              )}
            </>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {pagosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
                <Landmark className="h-6 w-6 text-brand-900" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
                  {hasActiveFiltersPagos ? "Sin resultados" : "Sin pagos registrados"}
                </h4>
                <p className="max-w-sm text-sm text-text-secondary">
                  {hasActiveFiltersPagos
                    ? "No hay pagos que coincidan con los filtros aplicados."
                    : "Los pagos a este proveedor aparecerán acá cuando registres el primero."}
                </p>
              </div>
            </div>
          ) : (
            <>
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
                      {pageItemsPagos.map((p) => (
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

              {pageItemsPagos.length > 0 && (
                <Pagination
                  page={safePagePagos}
                  totalPages={totalPagesPagos}
                  totalItems={pagosFiltrados.length}
                  pageStart={pageStartPagos}
                  pageEnd={pageEndPagos}
                  pageSize={pageSizePagos}
                  onPageChange={setPagePagos}
                  onPageSizeChange={setPageSizePagos}
                  itemLabel="pagos"
                />
              )}
            </>
          )}
        </section>
      )}
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
