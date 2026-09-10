"use client";

import { Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import {
  formatARS,
  formatFecha,
  type ComprobantePendiente,
  type EntidadCtaCte,
} from "@/data/cuentas-corrientes";
import { FORMAS_PAGO } from "@/data/formas-pago";

export interface PagoImputacionInput {
  comprobanteId: number;
  monto: number;
}

export interface PagoCtaCteNuevo {
  numero_comprobante: string;
  forma_pago_id: number;
  fecha: string;
  monto: number;
  tipo: "pago_proveedor" | "cobranza_cliente";
  imputaciones: PagoImputacionInput[];
}

interface RegistrarPagoCtaCteModalProps {
  open: boolean;
  entidad: { id: number; nombre: string; tipo: EntidadCtaCte } | null;
  comprobantes: ComprobantePendiente[];
  pagosExistentes: { numero_comprobante: string }[];
  onClose: () => void;
  /**
   * Manda el pago al backend.
   *
   * Devuelve el mensaje de error si el servidor lo rechazó, o `null` si salió
   * bien. Se resuelve así y no con un `throw` para que el modal muestre el
   * mensaje del backend —"ese comprobante ya está cancelado por otros pagos"—
   * sin cerrarse y perder las imputaciones que la persona ya cargó.
   */
  onConfirm: (pago: PagoCtaCteNuevo) => Promise<string | null>;
}

function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function RegistrarPagoCtaCteModal({
  open,
  entidad,
  comprobantes,
  pagosExistentes,
  onClose,
  onConfirm,
}: RegistrarPagoCtaCteModalProps) {
  const esProveedor = entidad?.tipo === "proveedor";
  // El verbo y sustantivos cambian según el tipo de entidad: pagar proveedor / cobrar cliente.
  const verbo = esProveedor ? "pago" : "cobranza";
  const verboCTA = esProveedor ? "Registrar pago" : "Registrar cobranza";
  const titulo = `Registrar ${verbo} — ${entidad?.nombre ?? ""}`;

  // Solo se imputan comprobantes con saldo pendiente positivo (deuda a cubrir).
  // Las Notas de Crédito (crédito a favor) se aplican en un flujo aparte.
  const imputables = useMemo(
    () => comprobantes.filter((c) => c.saldoPendiente > 0),
    [comprobantes],
  );

  const [numero, setNumero] = useState("");
  const [formaPagoId, setFormaPagoId] = useState<string>("");
  const [fecha, setFecha] = useState(hoyISO());
  const [montoTotal, setMontoTotal] = useState("");
  const [seleccionados, setSeleccionados] = useState<
    Record<number, { seleccionado: boolean; monto: string }>
  >({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  /** Mensaje que devolvió el backend al rechazar el pago. */
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const imputaciones = useMemo(
    () =>
      imputables.map((c) => {
        const item = seleccionados[c.id];
        return {
          comprobanteId: c.id,
          numero: c.numero,
          saldoPendiente: c.saldoPendiente,
          seleccionado: item?.seleccionado ?? false,
          monto: item?.monto ?? "",
        };
      }),
    [imputables, seleccionados],
  );

  const reset = () => {
    setNumero("");
    setFormaPagoId("");
    setFecha(hoyISO());
    setMontoTotal("");
    setSeleccionados({});
    setErrores({});
    setErrorServidor(null);
  };

  const toggleComprobante = (id: number) => {
    const comp = imputables.find((c) => c.id === id);
    if (!comp) return;
    setSeleccionados((prev) => {
      const actual = prev[id]?.seleccionado ?? false;
      const nuevoSeleccionado = !actual;
      return {
        ...prev,
        [id]: {
          seleccionado: nuevoSeleccionado,
          monto: nuevoSeleccionado ? String(comp.saldoPendiente) : "",
        },
      };
    });
  };

  const setImputacion = (id: number, monto: string) => {
    setSeleccionados((prev) => ({
      ...prev,
      [id]: {
        seleccionado: true,
        monto,
      },
    }));
  };

  const totalIngresado = imputaciones
    .filter((i) => i.seleccionado)
    .reduce((acc, i) => acc + (Number(i.monto) || 0), 0);

  const montoTotalNum = Number(montoTotal) || 0;

  const validar = () => {
    const errs: Record<string, string> = {};
    const numeroLimpio = numero.trim();

    if (!numeroLimpio) errs.numero = `Ingresá el número del comprobante de ${verbo}.`;
    else if (pagosExistentes.some((p) => p.numero_comprobante === numeroLimpio))
      errs.numero = "Ese número de comprobante ya fue registrado.";

    if (!formaPagoId) errs.formaPago = "Seleccioná la forma de pago.";
    if (!fecha) errs.fecha = `Ingresá la fecha del ${verbo}.`;
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

    // IGUALDAD ESTRICTA, no "menor o igual".
    //
    // Antes se permitía imputar de menos y el pago quedaba "parcialmente
    // imputado". Pero esa diferencia es plata que entra al sistema y no queda
    // asociada a ningún comprobante — y no existe el concepto de "pago a
    // cuenta": no hay tabla ni saldo a favor donde verla. El saldo del
    // proveedor no baja por ella y nadie la vuelve a encontrar.
    //
    // La comparación va en CENTAVOS: 0.1 + 0.2 !== 0.3 en punto flotante, así
    // que comparar los decimales directamente rechazaría pagos correctos.
    const centavos = (n: number) => Math.round(n * 100);
    if (totalIngresado <= 0)
      errs.totalIngresado = "El total ingresado debe ser mayor a cero.";
    else if (montoTotalNum > 0 && centavos(totalIngresado) !== centavos(montoTotalNum))
      errs.totalIngresado =
        centavos(totalIngresado) > centavos(montoTotalNum)
          ? "El total ingresado supera el monto total."
          : "Falta imputar: el total ingresado tiene que ser igual al monto total.";

    return { errs, erroresImputacion };
  };

  const handleGuardar = async () => {
    const { errs, erroresImputacion } = validar();
    setErrores({ ...errs, ...erroresImputacion });
    if (Object.keys(errs).length > 0 || Object.keys(erroresImputacion).length > 0) return;

    setErrorServidor(null);

    const pago: PagoCtaCteNuevo = {
      numero_comprobante: numero.trim(),
      forma_pago_id: Number(formaPagoId),
      fecha,
      monto: montoTotalNum,
      tipo: esProveedor ? "pago_proveedor" : "cobranza_cliente",
      imputaciones: imputaciones
        .filter((i) => i.seleccionado)
        .map((i) => ({ comprobanteId: i.comprobanteId, monto: Number(i.monto) })),
    };
    setGuardando(true);
    const error = await onConfirm(pago);
    setGuardando(false);

    // Si el backend lo rechazó, el modal queda abierto con todo cargado:
    // rehacer la imputación de seis comprobantes porque el servidor devolvió un
    // error sería peor que el error.
    if (error) {
      setErrorServidor(error);
      return;
    }

    reset();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={() => setConfirmarCancelar(true)}
        title={titulo}
        icon={<Landmark className="h-5 w-5 text-brand-900" aria-hidden="true" />}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmarCancelar(true)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleGuardar()}
              // También mientras guarda: un doble clic mandaría dos pagos, y el
              // segundo tomaría el saldo que el primero ya bajó.
              disabled={guardando}
            >
              {guardando ? "Guardando…" : verboCTA}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="pago-numero"
              label={`N° comprobante de ${verbo}`}
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
                value={formaPagoId}
                onChange={(e) => { setFormaPagoId(e.target.value); setErrores((p) => ({ ...p, formaPago: "" })); }}
                aria-invalid={errores.formaPago ? true : undefined}
                className={`h-11 cursor-pointer rounded-sm border bg-surface px-4 text-base text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 ${errores.formaPago ? "border-destructive" : "border-border"}`}
              >
                <option value="">Seleccioná la forma…</option>
                {FORMAS_PAGO.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
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
              label="Monto total"
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
          {/*
            El error del backend va SEPARADO de los de validación del formulario.
            Son cosas distintas: los del formulario se arreglan mirando la
            pantalla; este dice algo que solo la base sabía — que otro pago
            canceló ese comprobante mientras vos cargabas, o que el comprobante
            se anuló.
          */}
          {errorServidor && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="text-sm font-bold text-destructive">{errorServidor}</p>
            </div>
          )}
          {errores.totalIngresado && (
            <p role="alert" className="-mt-3 text-sm font-semibold text-destructive">
              {errores.totalIngresado}
            </p>
          )}
          <p className="text-xs font-medium text-text-secondary">
            El total ingresado tiene que ser igual al monto total: no se puede dejar
            plata sin imputar a un comprobante.
          </p>
        </div>
      </Modal>

      <ConfirmarDialog
        open={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        title={`Cancelar registro de ${verbo}`}
        description="Se descartarán los datos imputados y el monto cargado. Esta acción no se puede deshacer."
        confirmLabel="Descartar"
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
