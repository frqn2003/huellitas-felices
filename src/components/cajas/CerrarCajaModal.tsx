"use client";

import { useState, FormEvent } from "react";
import { Lock, Info, Calculator } from "lucide-react";
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

const DENOMINACIONES = [20000, 10000, 2000, 1000, 500, 200, 100];

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
  const [mostrarAsistente, setMostrarAsistente] = useState(false);
  const [cantidadesBilletes, setCantidadesBilletes] = useState<Record<number, number>>({});
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

    setShowConfirm(true);
  };

  const handleCambiarCantidadBillete = (denominacion: number, cantidadStr: string) => {
    const cant = Math.max(0, parseInt(cantidadStr, 10) || 0);
    const nuevas = { ...cantidadesBilletes, [denominacion]: cant };
    setCantidadesBilletes(nuevas);
    const sumaTotal = DENOMINACIONES.reduce((acc, d) => acc + (nuevas[d] ?? 0) * d, 0);
    setMontoContado(String(sumaTotal));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.montoContado;
      return next;
    });
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="monto-contado" className="text-sm font-bold text-text-primary">
                Conteo final de dinero en efectivo <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setMostrarAsistente(!mostrarAsistente)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-brand-900 transition-colors hover:underline"
              >
                <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                {mostrarAsistente ? "Ocultar asistente" : "Contar por billetes"}
              </button>
            </div>

            <Input
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

            {/* Asistente desplegable por billetes */}
            {mostrarAsistente && (
              <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-cream-50/70 p-3 text-xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5 font-bold text-text-secondary">
                  <span>Denominación</span>
                  <span>Cantidad de billetes</span>
                  <span className="w-20 text-right">Subtotal</span>
                </div>
                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {DENOMINACIONES.map((den) => {
                    const cant = cantidadesBilletes[den] ?? 0;
                    return (
                      <div key={den} className="flex items-center justify-between gap-2">
                        <span className="w-20 font-bold text-brand-900">${den.toLocaleString("es-AR")}</span>
                        <input
                          type="number"
                          min="0"
                          value={cant || ""}
                          placeholder="0"
                          onChange={(e) => handleCambiarCantidadBillete(den, e.target.value)}
                          className="h-7 w-20 rounded border border-border bg-surface px-2 text-center text-xs font-mono font-bold focus:border-brand-900 focus:outline-none"
                        />
                        <span className="w-20 text-right font-mono font-bold text-text-primary">
                          ${(cant * den).toLocaleString("es-AR")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
        title={
          tieneDiferencia
            ? diferencia > 0
              ? "Sobrante en el cierre"
              : "Faltante en el cierre"
            : "Confirmar cierre definitivo"
        }
        description={
          tieneDiferencia ? (
            <>
              <p>
                El conteo en efectivo difiere del esperado en{" "}
                <strong>{formatMonto(Math.abs(diferencia))}</strong>.
              </p>
              <p className="mt-2">
                {diferencia > 0 ? "Se detectó un sobrante." : "Se detectó un faltante."} Verificá el
                conteo antes de confirmar el cierre. Esta acción no se puede deshacer.
              </p>
            </>
          ) : (
            <>
              <p>
                El efectivo contado coincide con lo esperado (<strong>{formatMonto(montoEsperado)}</strong>).
              </p>
              <p className="mt-2">
                ¿Confirmar el cierre de la jornada? Una vez cerrada, la caja no se podrá volver a abrir ni modificar sus movimientos.
              </p>
            </>
          )
        }
        confirmLabel="Confirmar y cerrar"
        cancelLabel="Volver a revisar"
        tone={tieneDiferencia ? "danger" : "neutral"}
        loading={loading}
      />
    </>
  );
}