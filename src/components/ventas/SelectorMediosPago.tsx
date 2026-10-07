"use client";

import { Banknote, CheckCircle2, CreditCard, QrCode, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import type { TipoMedioPago } from "@/data/pagos";
import type { MedioCobro, PagoLinea } from "@/lib/use-ventas";

/**
 * HU-VTA-02 — selector de medios de pago de una venta.
 *
 * Uno o varios medios (efectivo, transferencia, tarjeta, billetera virtual),
 * cada uno con su monto. La suma tiene que coincidir con el total para poder
 * confirmar. Es un registro manual: no hay pasarela de pago externa.
 *
 * Es controlado: el estado vive en la pantalla (`usePagos`).
 */

const ICONO: Record<TipoMedioPago, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  efectivo: Banknote,
  transferencia: QrCode,
  tarjeta: CreditCard,
  billetera_virtual: Wallet,
};

const DESCRIPCION: Record<TipoMedioPago, string> = {
  efectivo: "Cobro directo en caja",
  transferencia: "Alias, CBU o QR",
  tarjeta: "Débito o crédito en el posnet",
  billetera_virtual: "MercadoPago, Ualá, etc.",
};

const formatMonto = (n: number) => `$${n.toLocaleString("es-AR")}`;

interface SelectorMediosPagoProps {
  medios: MedioCobro[];
  total: number;
  /** Medios elegidos, ya con el monto efectivo (ver `usePagos`). */
  pagos: PagoLinea[];
  onChange: (pagos: PagoLinea[]) => void;
  asignado: number;
  restante: number;
}

export function SelectorMediosPago({
  medios,
  total,
  pagos,
  onChange,
  asignado,
  restante,
}: SelectorMediosPagoProps) {
  const multiple = pagos.length > 1;

  function alternar(medio: MedioCobro) {
    const ya = pagos.find((p) => p.formaPagoId === medio.id);
    if (ya) {
      onChange(pagos.filter((p) => p.formaPagoId !== medio.id));
      return;
    }
    if (pagos.length === 1) {
      // Pasa de un medio a dos: se reparte el total por la mitad (se puede ajustar).
      const primera = Math.round(total / 2);
      onChange([{ ...pagos[0], monto: primera }, { formaPagoId: medio.id, monto: total - primera, referencia: "" }]);
      return;
    }
    // El medio nuevo arranca con lo que falta cubrir.
    onChange([...pagos, { formaPagoId: medio.id, monto: Math.max(0, total - asignado), referencia: "" }]);
  }

  function actualizar(formaPagoId: number, cambios: Partial<PagoLinea>) {
    onChange(pagos.map((p) => (p.formaPagoId === formaPagoId ? { ...p, ...cambios } : p)));
  }

  function asignarResto(formaPagoId: number) {
    const otros = pagos.filter((p) => p.formaPagoId !== formaPagoId).reduce((a, p) => a + (Number(p.monto) || 0), 0);
    actualizar(formaPagoId, { monto: Math.max(0, total - otros) });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-text-secondary">
          Medios de pago
        </h3>
        <span className="rounded-pill bg-brand-900/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-900">
          {pagos.length === 0 ? "Elegí al menos uno" : multiple ? `${pagos.length} medios (combinado)` : "1 solo medio"}
        </span>
      </div>

      {medios.length === 0 ? (
        <p className="rounded-sm bg-cream-50 px-3 py-2 text-xs text-text-secondary">
          No se pudieron cargar los medios de pago.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Medios de pago">
          {medios.map((m) => {
            const Icon = ICONO[m.tipo];
            const elegido = pagos.some((p) => p.formaPagoId === m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={elegido}
                onClick={() => alternar(m)}
                className={`flex min-h-16 cursor-pointer flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
                  elegido
                    ? "border-brand-900 bg-brand-900/5 text-brand-900"
                    : "border-border bg-surface text-text-secondary hover:border-brand-900/50"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-extrabold">
                  <Icon className="h-4 w-4" aria-hidden={true} />
                  {m.nombre}
                </span>
                <span className="text-[11px] font-semibold">{DESCRIPCION[m.tipo]}</span>
              </button>
            );
          })}
        </div>
      )}

      {pagos.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {pagos.map((p) => {
            const medio = medios.find((m) => m.id === p.formaPagoId);
            if (!medio) return null;
            const idMonto = `monto-medio-${p.formaPagoId}`;
            return (
              <div key={p.formaPagoId} className="rounded-md border border-border bg-cream-50/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={idMonto} className="text-xs font-extrabold uppercase tracking-wide text-brand-900">
                    {medio.nombre}
                  </label>
                  {multiple && restante !== 0 && (
                    <button
                      type="button"
                      onClick={() => asignarResto(p.formaPagoId)}
                      className="cursor-pointer text-[11px] font-bold text-brand-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      {restante > 0 ? `+ Asignar resto (${formatMonto(restante)})` : `− Quitar excedente (${formatMonto(Math.abs(restante))})`}
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-secondary">
                      $
                    </span>
                    <input
                      id={idMonto}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      disabled={!multiple}
                      value={p.monto || ""}
                      onChange={(e) => actualizar(p.formaPagoId, { monto: Number(e.target.value) })}
                      aria-label={`Monto en ${medio.nombre}`}
                      className="h-11 w-full rounded-sm border border-border bg-surface pl-7 pr-3 text-base font-bold text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100"
                    />
                  </div>
                  {medio.tipo !== "efectivo" && (
                    <input
                      type="text"
                      maxLength={60}
                      value={p.referencia}
                      onChange={(e) => actualizar(p.formaPagoId, { referencia: e.target.value })}
                      placeholder="N° de operación (opcional)"
                      aria-label={`Referencia de ${medio.nombre}`}
                      className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="rounded-md border border-border bg-surface p-3 text-xs">
            <div className="flex items-center justify-between text-text-secondary">
              <span>Total asignado</span>
              <span className="font-mono font-bold text-text-primary">{formatMonto(asignado)}</span>
            </div>
            <div className="mt-2 border-t border-border/70 pt-2">
              {restante === 0 ? (
                <div className="flex items-center justify-between rounded bg-status-success/15 px-2.5 py-1.5 font-bold text-status-success-strong">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Total cubierto exactamente
                  </span>
                  <span>$0 restante</span>
                </div>
              ) : restante > 0 ? (
                <div className="flex items-center justify-between rounded bg-status-warning/15 px-2.5 py-1.5 font-bold text-status-warning-strong">
                  <span>Faltan por asignar:</span>
                  <span className="font-mono">{formatMonto(restante)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded bg-status-danger/15 px-2.5 py-1.5 font-bold text-status-danger-strong">
                  <span>Supera el total por:</span>
                  <span className="font-mono">{formatMonto(Math.abs(restante))}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
