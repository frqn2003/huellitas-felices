"use client";

import { useState, FormEvent } from "react";
import { Lock, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";

interface CerrarCajaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (montoContado: number) => void;
  montoInicial: number;
  ingresos: number;
  egresos: number;
  /** Empleado responsable de la apertura (caja_apertura.usuario_id). */
  responsable: string;
  loading?: boolean;
}

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

interface Linea {
  label: string;
  valor: string;
  clase?: string;
  separador?: boolean;
}

export function CerrarCajaModal({
  open,
  onClose,
  onConfirm,
  montoInicial,
  ingresos,
  egresos,
  responsable,
  loading,
}: CerrarCajaModalProps) {
  const [montoContado, setMontoContado] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const montoEsperado = montoInicial + ingresos - egresos;
  const diferencia = Number(montoContado) - montoEsperado;
  const tieneDiferencia = montoContado !== "" && diferencia !== 0;

  // Solo el efectivo mueve la caja: los cobros por transferencia o cuenta
  // corriente no generan movimiento_caja (trg_venta_medio_pago_ingreso_caja).
  const lineas: Linea[] = [
    { label: "Monto inicial declarado", valor: formatMonto(montoInicial) },
    { label: "Ingresos en efectivo", valor: `+ ${formatMonto(ingresos)}`, clase: "text-status-success-strong" },
    { label: "Egresos en efectivo", valor: `− ${formatMonto(egresos)}`, clase: "text-status-danger-strong" },
    {
      label: "Efectivo esperado en caja",
      valor: formatMonto(montoEsperado),
      clase: "text-base font-extrabold",
      separador: true,
    },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (montoContado === "" || Number(montoContado) < 0) {
      newErrors.montoContado = "Ingrese el monto contado (mayor o igual a 0)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (tieneDiferencia) {
      setShowConfirm(true);
    } else {
      onConfirm(Number(montoContado));
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Cerrar caja"
        icon={<Lock className="h-5 w-5 text-brand-900" aria-hidden="true" />}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Resumen de la jornada: los 4 renglones del wireframe de la HU. */}
          <div className="rounded-md border border-border bg-cream-50 p-4">
            <dl className="flex flex-col gap-2.5">
              {lineas.map((l) => (
                <div
                  key={l.label}
                  className={`flex items-baseline justify-between gap-4 ${
                    l.separador ? "border-t border-border pt-2.5" : ""
                  }`}
                >
                  <dt
                    className={`text-sm ${
                      l.separador
                        ? "font-bold text-text-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {l.label}
                  </dt>
                  <dd
                    className={`tabular-nums text-sm font-bold text-brand-900 ${l.clase ?? ""}`}
                  >
                    {l.valor}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                Responsable
              </span>
              <span className="text-sm font-bold text-brand-900">{responsable}</span>
            </div>
          </div>

          <div>
            <Input
              label="Conteo final de dinero en efectivo"
              requiredMark
              id="monto-contado"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="$ 0.00"
              value={montoContado}
              onChange={(e) => {
                setMontoContado(e.target.value);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.montoContado;
                  return next;
                });
              }}
              error={errors.montoContado}
              autoFocus
            />
          </div>

          {montoContado !== "" && (
            <div
              className={`rounded-md border p-4 ${
                tieneDiferencia
                  ? diferencia > 0
                    ? "border-status-success bg-status-success/10"
                    : "border-status-danger bg-status-danger/10"
                  : "border-status-success bg-status-success/10"
              }`}
              role="status"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-bold text-text-primary">Diferencia</span>
                <span
                  className={`text-lg font-extrabold tabular-nums ${
                    tieneDiferencia
                      ? diferencia > 0
                        ? "text-status-success-strong"
                        : "text-status-danger-strong"
                      : "text-status-success-strong"
                  }`}
                >
                  {diferencia >= 0 ? "+" : ""}
                  {formatMonto(diferencia)}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {tieneDiferencia
                  ? diferencia > 0
                    ? "Sobrante detectado. Verificá el conteo antes de confirmar."
                    : "Faltante detectado. Verificá el conteo o contá de nuevo."
                  : "Caja cuadrada: el conteo coincide con lo esperado."}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border border-border bg-cream-50 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-text-secondary">
              Solo se cuenta <strong className="font-bold text-text-primary">efectivo</strong>. Los
              cobros por transferencia o cuenta corriente no ingresan a esta caja. La caja cerrada
              no se puede reabrir.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Cerrando..." : "Contar y cerrar caja"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmarDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          onConfirm(Number(montoContado));
          setShowConfirm(false);
        }}
        title={diferencia > 0 ? "Sobrante en el cierre" : "Faltante en el cierre"}
        description={
          <>
            <p>
              El conteo en efectivo difiere del esperado en{" "}
              <strong>{formatMonto(Math.abs(diferencia))}</strong>.
            </p>
            <p className="mt-2">
              {diferencia > 0 ? "Se detectó un sobrante." : "Se detectó un faltante."} Verificá el
              conteo antes de confirmar el cierre.
            </p>
          </>
        }
        confirmLabel="Confirmar y cerrar"
        cancelLabel="Volver a contar"
        tone="success"
        loading={loading}
      />
    </>
  );
}