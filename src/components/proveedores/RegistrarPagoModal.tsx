"use client";

import { Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import {
  FORMAS_PAGO,
  formatARS,
  formatFecha,
  type ComprobantePendiente,
  type FormaPago,
  type PagoProveedor,
  type ProveedorCtaCte,
} from "@/data/cuentas-corrientes";

export interface PagoNuevo {
  numero: string;
  formaPago: FormaPago;
  fecha: string;
  monto: number;
  imputaciones: { comprobanteId: number; monto: number }[];
}

interface RegistroImputacion {
  comprobanteId: number;
  numero: string;
  saldoPendiente: number;
  seleccionado: boolean;
  monto: string;
}

interface RegistrarPagoModalProps {
  open: boolean;
  proveedor: ProveedorCtaCte | null;
  comprobantes: ComprobantePendiente[];
  pagosExistentes: PagoProveedor[];
  onClose: () => void;
  onConfirm: (pago: PagoNuevo) => void;
}

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function RegistrarPagoModal({
  open,
  proveedor,
  comprobantes,
  pagosExistentes,
  onClose,
  onConfirm,
}: RegistrarPagoModalProps) {
  // Solo se imputan comprobantes con saldo pendiente positivo (deuda a cubrir). Las
  // Notas de Crédito (crédito a favor) se aplican en un flujo aparte.
  const imputables = useMemo(
    () => comprobantes.filter((c) => c.saldoPendiente > 0),
    [comprobantes],
  );

  const [numero, setNumero] = useState("");
  const [formaPago, setFormaPago] = useState<FormaPago | "">("");
  const [fecha, setFecha] = useState(hoyISO());
  const [montoTotal, setMontoTotal] = useState("");
  const [imputaciones, setImputaciones] = useState<RegistroImputacion[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const reset = () => {
    setNumero("");
    setFormaPago("");
    setFecha(hoyISO());
    setMontoTotal("");
    setImputaciones(
      imputables.map((c) => ({
        comprobanteId: c.id,
        numero: c.numero,
        saldoPendiente: c.saldoPendiente,
        seleccionado: false,
        monto: "",
      })),
    );
    setErrores({});
  };

  const toggleComprobante = (id: number) => {
    setImputaciones((prev) =>
      prev.map((i) =>
        i.comprobanteId === id
          ? { ...i, seleccionado: !i.seleccionado, monto: !i.seleccionado ? String(i.saldoPendiente) : "" }
          : i,
      ),
    );
  };

  const setImputacion = (id: number, monto: string) => {
    setImputaciones((prev) =>
      prev.map((i) => (i.comprobanteId === id ? { ...i, monto } : i)),
    );
  };

  const totalIngresado = imputaciones
    .filter((i) => i.seleccionado)
    .reduce((acc, i) => acc + (Number(i.monto) || 0), 0);

  const montoTotalNum = Number(montoTotal) || 0;

  const validar = () => {
    const errs: Record<string, string> = {};
    const numeroLimpio = numero.trim();

    if (!numeroLimpio) errs.numero = "Ingresá el número del comprobante de pago.";
    else if (pagosExistentes.some((p) => p.numero === numeroLimpio))
      errs.numero = "Ese número de comprobante de pago ya fue registrado.";

    if (!formaPago) errs.formaPago = "Seleccioná la forma de pago.";
    if (!fecha) errs.fecha = "Ingresá la fecha del pago.";
    else if (fecha > hoyISO()) errs.fecha = "La fecha no puede ser futura.";

    if (!montoTotal || montoTotalNum <= 0) errs.montoTotal = "Ingresá un monto total mayor a cero.";

    const seleccionadas = imputaciones.filter((i) => i.seleccionado);
    if (seleccionadas.length === 0) errs.imputaciones = "Seleccioná al menos un comprobante a imputar.";

    const erroresImputacion: Record<string, string> = {};
    for (const i of imputaciones) {
      if (!i.seleccionado) continue;
      const m = Number(i.monto);
      if (!i.monto || isNaN(m) || m <= 0)
        erroresImputacion[String(i.comprobanteId)] = "Ingresá un monto mayor a cero.";
      else if (m > i.saldoPendiente)
        erroresImputacion[String(i.comprobanteId)] = `No puede superar el saldo (${formatARS(i.saldoPendiente)}).`;
    }
    if (Object.keys(erroresImputacion).length) errs.imputaciones = "Hay montos de imputación inválidos.";

    if (totalIngresado <= 0)
      errs.totalIngresado = "El total ingresado debe ser mayor a cero.";
    else if (montoTotalNum > 0 && totalIngresado > montoTotalNum)
      errs.totalIngresado = "El total ingresado supera el monto total del pago.";

    return { errs, erroresImputacion };
  };

  const handleGuardar = () => {
    const { errs, erroresImputacion } = validar();
    setErrores({ ...errs, ...erroresImputacion });
    if (Object.keys(errs).length > 0 || Object.keys(erroresImputacion).length > 0) return;

    const pago: PagoNuevo = {
      numero: numero.trim(),
      formaPago: formaPago as FormaPago,
      fecha,
      monto: montoTotalNum,
      imputaciones: imputaciones
        .filter((i) => i.seleccionado)
        .map((i) => ({ comprobanteId: i.comprobanteId, monto: Number(i.monto) })),
    };
    onConfirm(pago);
    reset();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={() => setConfirmarCancelar(true)}
        title={`Registrar pago — ${proveedor?.razonSocial ?? ""}`}
        icon={<Landmark className="h-5 w-5 text-brand-900" aria-hidden="true" />}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirmarCancelar(true)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={handleGuardar}>
              Registrar pago
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="pago-numero"
              label="N° comprobante de pago"
              requiredMark
              value={numero}
              onChange={(e) => { setNumero(e.target.value); setErrores((p) => ({ ...p, numero: "" })); }}
              placeholder="0001-00000458"
              error={errores.numero}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pago-forma" className="text-sm font-bold text-text-primary">
                Forma de pago<span className="text-destructive"> *</span>
              </label>
              <select
                id="pago-forma"
                value={formaPago}
                onChange={(e) => { setFormaPago(e.target.value as FormaPago); setErrores((p) => ({ ...p, formaPago: "" })); }}
                aria-invalid={errores.formaPago ? true : undefined}
                className={`h-11 cursor-pointer rounded-sm border bg-surface px-4 text-base text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 ${errores.formaPago ? "border-destructive" : "border-border"}`}
              >
                <option value="">Seleccioná la forma…</option>
                {FORMAS_PAGO.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {errores.formaPago && (
                <p role="alert" className="text-sm font-semibold text-destructive">{errores.formaPago}</p>
              )}
            </div>
            <Input
              id="pago-fecha"
              label="Fecha"
              requiredMark
              type="date"
              value={fecha}
              onChange={(e) => { setFecha(e.target.value); setErrores((p) => ({ ...p, fecha: "" })); }}
              error={errores.fecha}
            />
            <Input
              id="pago-monto"
              label="Monto total del pago"
              requiredMark
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={montoTotal}
              onChange={(e) => { setMontoTotal(e.target.value); setErrores((p) => ({ ...p, montoTotal: "" })); }}
              placeholder="200.000,00"
              error={errores.montoTotal}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-primary">Imputar a comprobantes pendientes</h4>
              <span className="text-xs font-medium text-text-secondary">
                Se muestra solo la deuda a cubrir (las Notas de Crédito se aplican aparte)
              </span>
            </div>
            {errores.imputaciones && (
              <p role="alert" className="text-sm font-semibold text-destructive">{errores.imputaciones}</p>
            )}
            {imputables.length === 0 ? (
              <p className="rounded-sm border border-border bg-cream-50 px-4 py-3 text-sm text-text-secondary">
                No hay comprobantes pendientes con saldo a imputar.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border rounded-sm border border-border">
                {imputables.map((c) => (
                  <label key={c.id} className="flex flex-col gap-2 bg-surface px-4 py-3 sm:flex-row sm:items-center">
                    <input
                      type="checkbox"
                      checked={imputaciones.find((i) => i.comprobanteId === c.id)?.seleccionado ?? false}
                      onChange={() => toggleComprobante(c.id)}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-brand-900"
                    />
                    <span className="flex-1 text-sm">
                      <span className="font-bold text-brand-900">{c.numero}</span>
                      <span className="text-text-secondary"> · {c.tipo} · Vto. {formatFecha(c.fechaVencimiento)} · Saldo {formatARS(c.saldoPendiente)}</span>
                    </span>
                    <span className="flex w-full items-center gap-2 sm:w-44">
                      <span className="text-xs font-bold text-text-secondary">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        disabled={!imputaciones.find((i) => i.comprobanteId === c.id)?.seleccionado}
                        value={imputaciones.find((i) => i.comprobanteId === c.id)?.monto ?? ""}
                        onChange={(e) => setImputacion(c.id, e.target.value)}
                        aria-label={`Monto a imputar al comprobante ${c.numero}`}
                        className={`h-11 w-full rounded-sm border bg-surface px-3 text-sm text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 ${errores[String(c.id)] ? "border-destructive" : "border-border"}`}
                      />
                    </span>
                    {errores[String(c.id)] && (
                      <span role="alert" className="w-full text-xs font-semibold text-destructive sm:w-auto">
                        {errores[String(c.id)]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-sm border border-border bg-cream-50 px-4 py-3">
            <span className="text-sm font-bold text-text-primary">Total ingresado</span>
            <span
              role="status"
              className={`font-display text-lg font-extrabold ${
                errores.totalIngresado ? "text-destructive" : "text-brand-900"
              }`}
            >
              {formatARS(totalIngresado)}
            </span>
          </div>
          {errores.totalIngresado && (
            <p role="alert" className="-mt-3 text-sm font-semibold text-destructive">
              {errores.totalIngresado}
            </p>
          )}
          <p className="text-xs font-medium text-text-secondary">
            Si el total ingresado es menor al monto total, el pago queda imputado parcialmente.
          </p>
        </div>
      </Modal>

      <ConfirmarDialog
        open={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        title="Cancelar registro de pago"
        description="Se descartarán los datos imputados y el monto cargado. Esta acción no se puede deshacer."
        confirmLabel="Descartar pago"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          setConfirmarCancelar(false);
          reset();
          onClose();
        }}
      />
    </>
  );
}
