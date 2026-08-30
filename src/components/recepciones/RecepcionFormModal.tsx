"use client";

import { PackageOpen, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ObservacionRecepcion,
  OrdenDisponible,
  Recepcion,
  TipoRecepcion,
} from "@/data/recepciones";
import {
  DEPOSITOS,
  TIPOS_RECEPCION,
  OBSERVACIONES_RECEPCION,
  numeroRecepcion,
} from "@/data/recepciones";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export interface RecepcionDraft {
  ordenCompraId: string;
  depositoId: string;
  tipoRecepcion: TipoRecepcion;
  observacionGeneral: string;
  items: RecepcionItemDraft[];
}

export interface RecepcionItemDraft {
  key: string;
  articuloId: number;
  articuloNombre: string;
  cantidadSolicitada: number;
  cantidadRecibida: string;
  observacion: ObservacionRecepcion | "";
  observacionDetalle: string;
  ordenCompraDetalleId: number;
}

const EMPTY_DRAFT: RecepcionDraft = {
  ordenCompraId: "",
  depositoId: "",
  tipoRecepcion: "total",
  observacionGeneral: "",
  items: [],
};

interface RecepcionFormModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (recepcion: Recepcion) => void;
  ordenes: OrdenDisponible[];
  numeroSiguiente: number;
}

function parseCantidad(raw: string): number {
  const normalized = raw.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function RecepcionFormModal({
  open,
  onClose,
  onConfirm,
  ordenes,
  numeroSiguiente,
}: RecepcionFormModalProps) {
  // formKey fuerza remontaje del contenido cuando se abre el modal
  const formKey = open ? "open" : "closed";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva Recepción de Mercadería"
      icon={
        <PackageOpen className="h-5 w-5 text-brand-900" aria-hidden="true" />
      }
      maxWidth="max-w-3xl"
    >
      {open && (
        <RecepcionFormContent
          key={formKey}
          onClose={onClose}
          onConfirm={onConfirm}
          ordenes={ordenes}
          numeroSiguiente={numeroSiguiente}
        />
      )}
    </Modal>
  );
}

function RecepcionFormContent({
  onClose,
  onConfirm,
  ordenes,
  numeroSiguiente,
}: Omit<RecepcionFormModalProps, "open">) {
  const [draft, setDraft] = useState<RecepcionDraft>(EMPTY_DRAFT);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const ordenSeleccionada = useMemo(
    () => ordenes.find((o) => o.id === Number(draft.ordenCompraId)),
    [ordenes, draft.ordenCompraId],
  );

  const handleOrdenChange = (ordenId: string) => {
    const orden = ordenes.find((o) => o.id === Number(ordenId));
    setDraft((prev) => ({
      ...prev,
      ordenCompraId: ordenId,
      depositoId: orden ? String(orden.deposito.id) : "",
      items: orden
        ? orden.articulos.map((a) => ({
            key: `item-${a.articuloId}`,
            articuloId: a.articuloId,
            articuloNombre: a.articuloNombre,
            cantidadSolicitada: a.cantidad,
            cantidadRecibida: String(a.cantidad),
            observacion: "" as ObservacionRecepcion | "",
            observacionDetalle: "",
            ordenCompraDetalleId: a.ordenCompraDetalleId,
          }))
        : [],
    }));
  };

  const validacion = useMemo(() => {
    const errores: string[] = [];
    if (!draft.ordenCompraId) errores.push("Seleccioná una orden de compra.");
    if (!draft.depositoId) errores.push("Seleccioná el depósito destino.");

    const items = draft.items;
    if (items.length === 0) {
      errores.push("La orden no tiene artículos para recibir.");
    }

    const allZero = items.every(
      (it) => parseCantidad(it.cantidadRecibida) === 0,
    );
    if (items.length > 0 && allZero) {
      errores.push("Al menos un artículo debe recibir cantidad > 0.");
    }

    for (const it of items) {
      const recibida = parseCantidad(it.cantidadRecibida);
      if (recibida < 0) {
        errores.push(
          `${it.articuloNombre}: la cantidad recibida no puede ser negativa.`,
        );
      }
      if (recibida > it.cantidadSolicitada) {
        errores.push(
          `${it.articuloNombre}: recibido (${recibida}) supera solicitado (${it.cantidadSolicitada}).`,
        );
      }
    }

    if (draft.tipoRecepcion === "total") {
      const incomplete = items.filter(
        (it) => parseCantidad(it.cantidadRecibida) !== it.cantidadSolicitada,
      );
      if (incomplete.length > 0) {
        errores.push(
          `Recepción completa: todos los artículos deben recibirse en su totalidad (${incomplete.map((i) => i.articuloNombre).join(", ")}).`,
        );
      }
    }

    if (draft.tipoRecepcion === "parcial") {
      const allExact = items.every(
        (it) => parseCantidad(it.cantidadRecibida) === it.cantidadSolicitada,
      );
      if (allExact && items.length > 0) {
        errores.push(
          "Recepción parcial: al menos un artículo debe tener diferencia respecto a lo solicitado.",
        );
      }
    }

    return errores;
  }, [draft]);

  const diferencias = useMemo(() => {
    return draft.items.filter(
      (it) =>
        parseCantidad(it.cantidadRecibida) !== it.cantidadSolicitada &&
        parseCantidad(it.cantidadRecibida) > 0,
    );
  }, [draft.items]);

  const showErrors = submitAttempted;

  function handleItemChange(
    key: string,
    field: keyof RecepcionItemDraft,
    value: string | number,
  ) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.key === key ? { ...it, [field]: value } : it,
      ),
    }));
  }

  function handleConfirm() {
    setSubmitAttempted(true);
    if (validacion.length > 0) return;

    // BACKEND: reemplazar por el usuario autenticado actual (session/token)
    const receptor = "Carlos López";
    const now = new Date().toISOString();

    const nuevaRecepcion: Recepcion = {
      id: numeroSiguiente,
      numero: numeroRecepcion(numeroSiguiente),
      orden_compra_id: Number(draft.ordenCompraId),
      ordenCompra: ordenSeleccionada
        ? {
            numero: ordenSeleccionada.numero,
            proveedor: ordenSeleccionada.proveedor,
          }
        : { numero: "", proveedor: { id: 0, razonSocial: "" } },
      deposito_id: Number(draft.depositoId),
      deposito:
        DEPOSITOS.find((d) => d.id === Number(draft.depositoId)) ??
        DEPOSITOS[0],
      tipo_recepcion: draft.tipoRecepcion,
      usuario_id: 3,
      usuario: { nombre: receptor },
      fecha_hora: now,
      observacion_general: draft.observacionGeneral || null,
      _detalles: draft.items.map((it, idx) => ({
        id: idx + 1,
        recepcion_id: numeroSiguiente,
        orden_compra_detalle_id: it.ordenCompraDetalleId,
        articulo_id: it.articuloId,
        articuloNombre: it.articuloNombre,
        cantidadSolicitada: it.cantidadSolicitada,
        cantidadRecibida: parseCantidad(it.cantidadRecibida),
        observacion: (it.observacion || null) as ObservacionRecepcion | null,
        observacionDetalle: it.observacionDetalle || null,
      })),
    };

    onConfirm(nuevaRecepcion);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Número automático */}
        <div
          role="note"
          className="rounded-md border border-border bg-cream-50 px-4 py-3 text-sm text-text-secondary"
        >
          Número de recepción:{" "}
          <span className="font-mono font-bold text-brand-900">
            {numeroRecepcion(numeroSiguiente)}
          </span>{" "}
          (se asigna automáticamente)
        </div>

        {/* Campos de cabecera */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="OC vinculada"
            requiredMark
            value={draft.ordenCompraId}
            onChange={(e) => handleOrdenChange(e.target.value)}
            error={
              showErrors && !draft.ordenCompraId
                ? "Seleccioná una orden de compra"
                : undefined
            }
          >
            <option value="">Seleccionar OC pendiente</option>
            {ordenes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero} — {o.proveedor.razonSocial} ({o.estado})
              </option>
            ))}
          </Select>

          <Select
            label="Depósito destino"
            requiredMark
            value={draft.depositoId}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, depositoId: e.target.value }))
            }
            error={
              showErrors && !draft.depositoId
                ? "Seleccioná el depósito"
                : undefined
            }
          >
            <option value="">Seleccionar depósito</option>
            {DEPOSITOS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>

          <Select
            label="Tipo de recepción"
            requiredMark
            value={draft.tipoRecepcion}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                tipoRecepcion: e.target.value as TipoRecepcion,
              }))
            }
            hint={
              draft.tipoRecepcion === "total"
                ? "Todos los artículos deben recibirse en su totalidad"
                : "Se reciben solo los artículos que llegaron"
            }
          >
            {TIPOS_RECEPCION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>

          <Input
            label="Observaciones"
            placeholder="Opcional: observaciones generales de la recepción"
            value={draft.observacionGeneral}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                observacionGeneral: e.target.value,
              }))
            }
          />
        </div>

        {/* Detalle por artículo */}
        {draft.items.length > 0 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-extrabold uppercase tracking-wide text-text-secondary">
              Detalle por artículo
            </legend>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-cream-50">
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      Artículo
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      Solicitado
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      Recibido *
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      Diferencia
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      Observación
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((item) => {
                    const recibida = parseCantidad(item.cantidadRecibida);
                    const diferencia = item.cantidadSolicitada - recibida;
                    const hasDiff = diferencia !== 0 && recibida > 0;

                    return (
                      <tr
                        key={item.key}
                        className="border-b border-border/60 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-text-primary">
                          {item.articuloNombre}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-text-secondary">
                          {item.cantidadSolicitada}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={item.cantidadSolicitada}
                            step={1}
                            value={item.cantidadRecibida}
                            onChange={(e) =>
                              handleItemChange(
                                item.key,
                                "cantidadRecibida",
                                e.target.value,
                              )
                            }
                            className="h-9 w-20 rounded-sm border border-border bg-surface px-2 text-center text-sm font-medium text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                            aria-label={`Cantidad recibida de ${item.articuloNombre}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-sm font-bold ${
                              diferencia === 0
                                ? "text-text-secondary"
                                : "text-destructive"
                            }`}
                          >
                            {diferencia === 0 ? "0" : diferencia}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {hasDiff ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={item.observacion}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.key,
                                    "observacion",
                                    e.target.value,
                                  )
                                }
                                className="h-9 cursor-pointer rounded-sm border border-border bg-surface px-2 text-xs font-medium text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                                aria-label={`Observación de ${item.articuloNombre}`}
                              >
                                <option value="">Seleccionar...</option>
                                {OBSERVACIONES_RECEPCION.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              {item.observacion && (
                                <input
                                  type="text"
                                  placeholder="Detalle (opcional)"
                                  value={item.observacionDetalle}
                                  onChange={(e) =>
                                    handleItemChange(
                                      item.key,
                                      "observacionDetalle",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8 rounded-sm border border-border bg-surface px-2 text-xs text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                                  aria-label={`Detalle de observación de ${item.articuloNombre}`}
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-text-secondary">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </fieldset>
        )}

        {/* Resumen de diferencias */}
        {diferencias.length > 0 && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-md border border-accent-500/40 bg-accent-500/10 px-4 py-3"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-600"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-text-primary">
              Diferencias detectadas: {diferencias.length}{" "}
              {diferencias.length === 1
                ? "artículo con diferencia"
                : "artículos con diferencia"}{" "}
              (
              {diferencias
                .map(
                  (d) =>
                    `${d.articuloNombre}: ${d.cantidadSolicitada - parseCantidad(d.cantidadRecibida)}`,
                )
                .join(", ")}
              )
            </p>
          </div>
        )}

        {/* Errores de validación */}
        {showErrors && validacion.length > 0 && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
          >
            <p className="mb-1 text-sm font-bold text-destructive">
              Corregí los siguientes errores:
            </p>
            <ul className="list-inside list-disc text-sm text-text-primary">
              {validacion.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer del modal */}
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button variant="outline" size="md" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={showErrors && validacion.length > 0}
        >
          Confirmar Recepción
        </Button>
      </div>
    </>
  );
}
