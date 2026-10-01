"use client";

import { Banknote, Download, PawPrint, QrCode, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { ComprobanteTurno } from "@/data/pagos";
import { descargarPdfComprobante } from "@/lib/generarPdfComprobante";

interface ComprobanteTurnoModalProps {
  open: boolean;
  onClose: () => void;
  comprobante: ComprobanteTurno | null;
}

export function ComprobanteTurnoModal({
  open,
  onClose,
  comprobante,
}: ComprobanteTurnoModalProps) {
  const { showToast } = useToast();

  if (!comprobante) return null;

  const handleDescargar = () => {
    descargarPdfComprobante({
      numero: comprobante.numero,
      fechaHora: comprobante.fechaHora,
      turnoId: comprobante.turnoId,
      clienteNombre: comprobante.clienteNombre,
      clienteDoc: comprobante.clienteDoc,
      clienteTel: comprobante.clienteTel,
      mascotaNombre: comprobante.mascotaNombre,
      mascotaEspecie: comprobante.mascotaEspecie,
      mascotaRaza: comprobante.mascotaRaza,
      profesional: comprobante.profesional,
      practicaNombre: comprobante.practicaNombre,
      arancel: comprobante.arancel,
      productos: comprobante.productos,
      subtotalNeto: comprobante.subtotalNeto,
      impuestosIva: comprobante.impuestosIva,
      total: comprobante.total,
      medioPago: comprobante.medioPago,
      mediosPago: comprobante.mediosPago,
      referencia: comprobante.referencia,
      observaciones: comprobante.observaciones,
    });
    showToast("success", "Comprobante PDF descargado exitosamente.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comprobante de Cobro"
      icon={<Receipt className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDescargar}
            className="gap-2 font-bold"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar PDF
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Cabecera del recibo */}
        <div className="rounded-md border border-border bg-cream-50 p-3.5">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-900 text-cream-50">
                <PawPrint className="h-4 w-4 text-cream-50" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-sm font-extrabold uppercase leading-tight text-brand-900">
                  Huellitas Felices
                </h3>
                <p className="text-[10px] text-text-secondary">
                  Centro Veterinario · CUIT 30-71234567-8
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block rounded-pill bg-status-success/15 px-2 py-0.5 text-[11px] font-extrabold text-status-success-strong">
                PAGADO
              </span>
              <p className="mt-0.5 font-mono text-[11px] font-bold text-text-primary">
                {comprobante.numero}
              </p>
              <p className="text-[10px] text-text-secondary">{comprobante.fechaHora}</p>
            </div>
          </div>

          {/* Datos resumidos del cliente y paciente */}
          <div className="grid grid-cols-2 gap-2 pt-2.5">
            <div>
              <span className="font-bold uppercase tracking-wider text-[9px] text-text-secondary block">
                Cliente
              </span>
              <p className="font-bold text-text-primary">{comprobante.clienteNombre}</p>
              <p className="text-text-secondary">DNI: {comprobante.clienteDoc || "—"}</p>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[9px] text-text-secondary block">
                {comprobante.mascotaNombre ? "Paciente & Atención" : "Tipo de Operación"}
              </span>
              <p className="font-bold text-text-primary">
                {comprobante.mascotaNombre
                  ? `${comprobante.mascotaNombre} (${comprobante.mascotaEspecie}${comprobante.mascotaRaza ? ` · ${comprobante.mascotaRaza}` : ""})`
                  : "Venta Directa de Mostrador"}
              </p>
              <p className="text-text-secondary">
                {comprobante.profesional || "Atención Mostrador"}
              </p>
            </div>
          </div>
        </div>

        {/* Detalle de conceptos facturados */}
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <table className="w-full text-left">
            <thead className="border-b border-border bg-cream-50 font-bold uppercase tracking-wider text-[10px] text-text-secondary">
              <tr>
                <th className="px-3 py-2">Concepto</th>
                <th className="px-2 py-2 text-center">Cant.</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {comprobante.arancel > 0 && (
                <tr>
                  <td className="px-3 py-2 font-bold text-text-primary">
                    {comprobante.practicaNombre}
                  </td>
                  <td className="px-2 py-2 text-center text-text-secondary">1</td>
                  <td className="px-3 py-2 text-right font-bold text-text-primary">
                    ${comprobante.arancel.toLocaleString("es-AR")}
                  </td>
                </tr>
              )}
              {comprobante.productos.map((prod, idx) => (
                <tr key={`${prod.codigo}-${idx}`}>
                  <td className="px-3 py-1.5 text-text-primary">
                    <span className="font-medium">{prod.nombre}</span>
                    <span className="ml-1 text-[10px] font-mono text-text-secondary">
                      ({prod.codigo})
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-text-secondary">
                    {prod.cantidad} {prod.unidad}
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-text-primary">
                    ${(prod.cantidad * prod.precioUnitario).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen de cobro con desglose fiscal (HU-VTA-01) */}
        {(() => {
          const subtotalNeto = comprobante.subtotalNeto ?? Math.round(comprobante.total / 1.21);
          const impuestosIva = comprobante.impuestosIva ?? (comprobante.total - subtotalNeto);
          return (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-cream-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase tracking-wider text-[9px] text-text-secondary">
                  {comprobante.mediosPago && comprobante.mediosPago.length > 1
                    ? "Medios de pago (Combinado):"
                    : "Medio de pago:"}
                </span>

                {comprobante.mediosPago && comprobante.mediosPago.length > 1 ? (
                  <div className="flex flex-col gap-1">
                    {comprobante.mediosPago.map((mp, idx) => {
                      const Icon = mp.medio === "efectivo" ? Banknote : QrCode;
                      const nombre = mp.medio === "efectivo" ? "Efectivo" : "Transferencia / QR";
                      return (
                        <div key={`${mp.id}-${idx}`} className="flex items-center gap-1.5 text-xs text-text-primary">
                          <Icon className="h-3.5 w-3.5 text-brand-900 shrink-0" aria-hidden="true" />
                          <span className="font-bold">{nombre}:</span>
                          <span className="font-semibold text-brand-900">${mp.monto.toLocaleString("es-AR")}</span>
                          {mp.referencia && (
                            <span className="text-[10px] text-text-secondary font-mono">({mp.referencia})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 font-bold text-brand-900">
                      {(() => {
                        const single = comprobante.mediosPago?.[0]?.medio || comprobante.medioPago;
                        if (single === "transferencia") {
                          return (
                            <>
                              <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
                              Transferencia / QR
                            </>
                          );
                        }
                        return (
                          <>
                            <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                            Efectivo
                          </>
                        );
                      })()}
                    </span>
                  </div>
                )}

                {comprobante.referencia && (!comprobante.mediosPago || comprobante.mediosPago.length <= 1) && (
                  <p className="text-[10px] text-text-secondary">
                    <span className="font-semibold">Ref:</span> {comprobante.referencia}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-0.5 text-right">
                <div className="flex items-center justify-between gap-4 text-xs text-text-secondary">
                  <span>Subtotal (Neto):</span>
                  <span className="font-semibold text-text-primary">${subtotalNeto.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-text-secondary">
                  <span>IVA (21%):</span>
                  <span className="font-semibold text-text-primary">${impuestosIva.toLocaleString("es-AR")}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border/80 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Total
                  </span>
                  <span className="font-display text-lg font-black text-brand-900">
                    ${comprobante.total.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Modal>
  );
}
