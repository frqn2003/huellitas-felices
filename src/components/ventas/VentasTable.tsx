"use client";

import { Banknote, Eye, Layers, QrCode, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { ComprobanteTurnoModal } from "@/components/turnos/ComprobanteTurnoModal";
import type { ComprobanteTurno } from "@/data/pagos";
import type { Venta } from "@/data/ventas";

interface VentasTableProps {
  ventas: Venta[];
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNuevaVenta?: () => void;
}

const HEADERS = [
  "Comprobante",
  "Fecha y Hora",
  "Cliente",
  "Detalle de Ítems",
  "Medio de Pago",
  "Total",
  "Acciones",
];

export function VentasTable({
  ventas,
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onNuevaVenta,
}: VentasTableProps) {
  const [comprobanteActivo, setComprobanteActivo] = useState<ComprobanteTurno | null>(null);

  const abrirComprobante = (venta: Venta) => {
    // Adaptamos la venta al formato de ComprobanteTurno para abrir el modal y descargar el PDF
    const comp: ComprobanteTurno = {
      numero: venta.numeroComprobante,
      fechaHora: venta.fecha,
      turnoId: venta.turnoId ?? 0,
      clienteNombre: venta.clienteNombre,
      clienteDoc: venta.clienteDoc || "—",
      mascotaNombre: "",
      mascotaEspecie: "",
      profesional: "Atención Mostrador / Recepción",
      practicaNombre: venta.conceptoServicio || "Venta de Mostrador",
      arancel: venta.arancelServicio || 0,
      productos: venta.items.map((it) => ({
        codigo: it.codigo,
        nombre: it.nombre,
        unidad: it.unidad,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
      })),
      subtotalNeto: venta.subtotalNeto,
      impuestosIva: venta.impuestosIva,
      total: venta.total,
      medioPago:
        venta.medioPago === "mixto"
          ? "mixto"
          : venta.medioPago === "efectivo"
            ? "efectivo"
            : "transferencia",
      mediosPago: venta.mediosPago?.map((mp, idx) => ({
        id: `mp-${idx}`,
        medio: mp.medio === "efectivo" ? "efectivo" : "transferencia",
        monto: mp.monto,
        referencia: mp.referencia,
      })),
      referencia: venta.mediosPago?.find((m) => m.referencia)?.referencia,
      observaciones: "Venta de mostrador registrada en recepción",
    };
    setComprobanteActivo(comp);
  };

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
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3.5 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-cream-100" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-cream-100" />
            <div className="ml-auto h-11 w-11 animate-pulse rounded-pill bg-cream-100 lg:ml-0" />
          </div>
        ))}
      </div>
    );
  }

  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <ShoppingBag className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay ventas registradas"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay ventas que coincidan con los filtros aplicados."
              : "Registrá una nueva venta de artículos o insumos en mostrador."}
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
        ) : onNuevaVenta ? (
          <button
            type="button"
            onClick={onNuevaVenta}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Nueva venta
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <caption className="sr-only">
            Listado de ventas registradas en mostrador
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
            {ventas.map((v) => {
              const esCombinado = v.medioPago === "mixto" || (v.mediosPago && v.mediosPago.length > 1);
              const esTransf = v.medioPago === "transferencia";

              return (
                <tr
                  key={v.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  {/* Comprobante */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-brand-900">
                      {v.numeroComprobante}
                    </span>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3.5 text-sm text-text-primary">
                    {v.fecha}
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-brand-900">
                        {v.clienteNombre}
                      </span>
                      {v.clienteDoc && (
                        <span className="text-xs text-text-secondary">
                          DNI: {v.clienteDoc}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Ítems */}
                  <td className="px-4 py-3.5">
                    <div className="flex max-w-xs flex-col gap-0.5">
                      {v.items.slice(0, 2).map((it, idx) => (
                        <span key={idx} className="truncate text-xs text-text-primary">
                          <strong className="font-bold text-brand-900">{it.cantidad}x</strong> {it.nombre}
                        </span>
                      ))}
                      {v.items.length > 2 && (
                        <span className="text-[11px] font-bold text-text-secondary">
                          +{v.items.length - 2} ítem(s) adicional(es)
                        </span>
                      )}
                      {v.items.length === 0 && (
                        <span className="text-xs italic text-text-secondary">
                          {v.conceptoServicio || "Sin ítems especificados"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Medio de Pago Badge */}
                  <td className="px-4 py-3.5">
                    {esCombinado ? (
                      <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900/10 px-2.5 py-1 text-xs font-bold text-brand-900">
                        <Layers className="h-3.5 w-3.5 text-brand-900" aria-hidden="true" />
                        Combinado
                      </span>
                    ) : esTransf ? (
                      <span className="inline-flex items-center gap-1.5 rounded-pill bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
                        <QrCode className="h-3.5 w-3.5 text-sky-800" aria-hidden="true" />
                        Transferencia
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-pill bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <Banknote className="h-3.5 w-3.5 text-emerald-800" aria-hidden="true" />
                        Efectivo
                      </span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3.5 font-mono text-sm font-extrabold text-brand-900">
                    ${v.total.toLocaleString("es-AR")}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => abrirComprobante(v)}
                      aria-label={`Ver comprobante de venta de ${v.clienteNombre}`}
                      title="Ver comprobante y descargar PDF"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comprobanteActivo && (
        <ComprobanteTurnoModal
          open={Boolean(comprobanteActivo)}
          onClose={() => setComprobanteActivo(null)}
          comprobante={comprobanteActivo}
        />
      )}
    </div>
  );
}
