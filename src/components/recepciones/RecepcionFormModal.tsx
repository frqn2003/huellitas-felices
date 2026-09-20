"use client";

// DESBLOQUEADO (2026-09-08). Antes decía "BLOQUEADO-DBA (D1)" porque el modal
// modelaba `recepcion_mercaderia*`, tablas que la base no tiene.
//
// Se resolvió como pidió el Product Owner: una recepción es un movimiento de
// stock con origen `recepcion_compra`. Este formulario ya no fabrica la
// recepción en el navegador — arma el body y lo manda a POST /api/recepciones.
//
// Tres cosas dejaron de decidirse acá porque las decide el backend o la base:
//   · el NÚMERO (lo genera un trigger; ya no se muestra un "REC-0004" de mentira
//     que el servidor iba a ignorar)
//   · el TIPO de recepción (parcial/total): se deriva de si quedó algo
//     pendiente, ver abajo
//   · el PENDIENTE de cada línea: se pide a la API al elegir la OC

import { PackageOpen, AlertTriangle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ObservacionRecepcion, OrdenDisponible } from "@/data/recepciones";
import { OBSERVACIONES_RECEPCION } from "@/data/recepciones";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export interface RecepcionDraft {
  ordenCompraId: string;
  depositoId: string;
  sucursalId: string;
  observacionGeneral: string;
  items: RecepcionItemDraft[];
}

/** Depósito real, traído de GET /api/depositos. */
export interface DepositoOpcion {
  id: number;
  nombre: string;
  ubicacion: string | null;
  sucursalId: number;
  sucursal: string;
}

/** Una línea pendiente, de GET /api/ordenes-compra/:id/pendiente-recepcion. */
export interface LineaPendiente {
  ordenCompraDetalleId: number;
  articuloId: number;
  articuloNombre: string;
  cantidadPendiente: number;
}

/** El body de POST /api/recepciones. */
export interface CrearRecepcionPayload {
  ordenCompraId: number;
  depositoId: number;
  observacionGeneral: string | null;
  items: {
    ordenCompraDetalleId: number;
    cantidadRecibida: number;
    observacion: ObservacionRecepcion | null;
    observacionDetalle: string | null;
  }[];
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
  sucursalId: "",
  observacionGeneral: "",
  items: [],
};

interface RecepcionFormModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Manda la recepción al backend.
   *
   * Devuelve el mensaje de error si el servidor la rechazó, o `null` si salió
   * bien. Se resuelve así y no con un `throw` para que el modal pueda mostrar
   * el mensaje del backend —"solo quedaban 15 pendientes"— sin cerrarse y
   * perder lo que la persona ya cargó.
   */
  onConfirm: (payload: CrearRecepcionPayload) => Promise<string | null>;
  /** OCs que admiten recepción: cualquiera con `es_final = false`. */
  ordenes: OrdenDisponible[];
  depositos: DepositoOpcion[];
  /** Pide a la API qué falta recibir de esa OC. */
  cargarPendiente: (ordenCompraId: number) => Promise<LineaPendiente[]>;
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
  depositos,
  cargarPendiente,
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
          depositos={depositos}
          cargarPendiente={cargarPendiente}
        />
      )}
    </Modal>
  );
}

function RecepcionFormContent({
  onClose,
  onConfirm,
  ordenes,
  depositos,
  cargarPendiente,
}: Omit<RecepcionFormModalProps, "open">) {
  const [draft, setDraft] = useState<RecepcionDraft>(EMPTY_DRAFT);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [cargandoLineas, setCargandoLineas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  /** Mensaje que devolvió el backend al rechazar la recepción. */
  const [errorServidor, setErrorServidor] = useState<string | null>(null);



  /**
   * Al elegir la OC, se le pregunta al backend QUÉ FALTA RECIBIR.
   *
   * Antes las filas salían de `orden.articulos`, o sea de la cantidad original
   * de la OC. Eso rompía el caso central de la HU: en una segunda entrega
   * parcial, el formulario ofrecía recibir de nuevo lo que ya había llegado.
   *
   * `/pendiente-recepcion` devuelve solo las líneas con pendiente > 0, así que
   * una OC ya completa muestra la lista vacía en vez de invitar a duplicar el
   * stock.
   */
  const handleOrdenChange = useCallback(
    async (ordenId: string) => {
      const orden = ordenes.find((o) => o.id === Number(ordenId));
      const depositoOrden = depositos.find((d) => d.id === orden?.deposito.id);

      setErrorServidor(null);
      setDraft((prev) => ({
        ...prev,
        ordenCompraId: ordenId,
        // El depósito pactado en la OC viene precargado, pero se puede cambiar:
        // la entrega puede terminar descargándose en otro depósito, y eso lo
        // decide quien recibe.
        sucursalId: depositoOrden ? String(depositoOrden.sucursalId) : "",
        depositoId: depositoOrden ? String(depositoOrden.id) : "",
        items: [],
      }));

      if (!orden) return;

      setCargandoLineas(true);
      try {
        const lineas = await cargarPendiente(orden.id);
        setDraft((prev) => ({
          ...prev,
          items: lineas.map((l) => ({
            key: `item-${l.ordenCompraDetalleId}`,
            articuloId: l.articuloId,
            articuloNombre: l.articuloNombre,
            // "Solicitado" es el PENDIENTE, no la cantidad de la OC (D-4).
            cantidadSolicitada: l.cantidadPendiente,
            cantidadRecibida: String(l.cantidadPendiente),
            observacion: "" as ObservacionRecepcion | "",
            observacionDetalle: "",
            ordenCompraDetalleId: l.ordenCompraDetalleId,
          })),
        }));
      } catch {
        setErrorServidor("No se pudo cargar lo que falta recibir de esa orden.");
      } finally {
        setCargandoLineas(false);
      }
    },
    [ordenes, depositos, cargarPendiente],
  );

  const validacion = useMemo(() => {
    const errores: string[] = [];
    if (!draft.ordenCompraId) errores.push("Seleccioná una orden de compra.");
    if (!draft.sucursalId) errores.push("Seleccioná la sucursal destino.");
    if (!draft.depositoId) errores.push("Seleccioná el depósito destino.");

    const items = draft.items;
    if (items.length === 0 && draft.ordenCompraId && !cargandoLineas) {
      // No es un error de carga: la orden ya se recibió entera. El mensaje lo
      // dice, en vez del "la orden no tiene artículos" anterior, que sonaba a
      // que la OC estaba mal armada.
      errores.push("Esa orden ya fue recibida por completo: no queda nada pendiente.");
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

    // Acá había dos reglas más, atadas al select "Tipo de recepción":
    // "si es total, todos los artículos completos" y "si es parcial, alguno
    // tiene que diferir". Se fueron con el select.
    //
    // La segunda además era falsa: una segunda entrega que completa lo que
    // faltaba es parcial en el sentido de que la OC ya venía a medias, y sin
    // embargo cada línea llega exacta. La regla obligaba a inventar una
    // diferencia para poder guardar.

    return errores;
  }, [draft, cargandoLineas]);

  const diferencias = useMemo(() => {
    return draft.items.filter(
      (it) =>
        parseCantidad(it.cantidadRecibida) !== it.cantidadSolicitada &&
        parseCantidad(it.cantidadRecibida) > 0,
    );
  }, [draft.items]);

  // Filtrar depósitos por sucursal seleccionada (patrón FichaFormModal)
  const sucursalId = draft.sucursalId ? Number(draft.sucursalId) : 0;
  const depositosSucursal = useMemo(() => {
    if (!sucursalId) return depositos;
    return depositos.filter((d) => d.sucursalId === sucursalId);
  }, [sucursalId, depositos]);

  // Las sucursales salen de los depósitos que devolvió la API, no de una lista
  // aparte: si un depósito existe, su sucursal existe. Evita que el select
  // ofrezca una sucursal sin depósitos donde descargar.
  const sucursales = useMemo(() => {
    const porId = new Map<number, string>();
    for (const d of depositos) porId.set(d.sucursalId, d.sucursal);
    return [...porId].map(([id, nombre]) => ({ id, nombre }));
  }, [depositos]);

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

  async function handleConfirm() {
    setSubmitAttempted(true);
    setErrorServidor(null);
    if (validacion.length > 0) return;

    // El body lleva SOLO lo que el backend no puede saber solo. Quedaron fuera,
    // a propósito, cuatro cosas que la versión anterior fabricaba acá:
    //
    //   · `numero`         lo genera un trigger de la base
    //   · `tipoRecepcion`  lo deriva el backend de lo que quede pendiente
    //   · `usuario_id`     sale de la sesión, nunca del navegador
    //   · `fecha_hora`     la pone la base con su reloj, no el del cliente
    //
    // Las líneas con 0 recibido igual se mandan: el backend valida el conjunto
    // y es él quien decide que "no llegó nada" es RECEPCION_VACIA.
    const payload: CrearRecepcionPayload = {
      ordenCompraId: Number(draft.ordenCompraId),
      depositoId: Number(draft.depositoId),
      observacionGeneral: draft.observacionGeneral.trim() || null,
      items: draft.items.map((it) => ({
        ordenCompraDetalleId: it.ordenCompraDetalleId,
        cantidadRecibida: parseCantidad(it.cantidadRecibida),
        observacion: it.observacion || null,
        observacionDetalle: it.observacionDetalle.trim() || null,
      })),
    };

    setGuardando(true);
    const error = await onConfirm(payload);
    setGuardando(false);

    // Si falló, el modal queda abierto con todo cargado: rehacer una recepción
    // de doce artículos porque el servidor devolvió un error sería peor que el
    // error.
    if (error) setErrorServidor(error);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/*
          Acá iba un "Número de recepción: REC-0004 (se asigna automáticamente)".
          Se sacó porque era un número inventado en el navegador que el servidor
          después ignoraba: el real lo genera un trigger al insertar, y encima
          con otro formato (MOV-000123, porque la recepción es un movimiento de
          stock). Mostrar el de mentira solo servía para que no coincidiera con
          el del comprobante.
        */}

        {/* Campos de cabecera */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="OC vinculada"
            requiredMark
            value={draft.ordenCompraId}
            onChange={(e) => void handleOrdenChange(e.target.value)}
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
            label="Sucursal"
            requiredMark
            value={draft.sucursalId}
            onChange={(e) => setDraft((prev) => ({
              ...prev,
              sucursalId: e.target.value,
              depositoId: "", // Resetear depósito al cambiar sucursal
            }))}
            error={
              showErrors && !draft.sucursalId
                ? "Seleccioná una sucursal"
                : undefined
            }
            hint="Selecciona la sucursal para ver sus depósitos disponibles"
          >
            <option value="">[ Seleccionar sucursal ]</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
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
            disabled={!draft.sucursalId} // Deshabilitado hasta que se seleccione sucursal
            error={
              showErrors && !draft.depositoId
                ? "Seleccioná el depósito"
                : undefined
            }
          >
            <option value="">[ Seleccionar sucursal primero ]</option>
            {depositosSucursal.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}{d.ubicacion ? ` — ${d.ubicacion}` : ""}
              </option>
            ))}
          </Select>

          {/*
            Acá iba el select "Tipo de recepción (Completa/Parcial)".
            Se eliminó (decisión D-1, docs/backend/HU-COMP-03.md §8.1).

            Que el usuario lo eligiera permitía marcar "Completa" con artículos
            faltando, y eso CIERRA la orden de compra: la mercadería que no
            llegó dejaba de estar pendiente y nadie se enteraba.

            Ahora lo deriva el backend de un hecho, no de una opinión: si
            después de esta entrega alguna línea sigue incompleta, es parcial.
          */}

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

        {cargandoLineas && (
          <p role="status" className="text-sm text-text-secondary">
            Cargando lo que falta recibir de esta orden…
          </p>
        )}

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

        {/*
          El error del backend va SEPARADO de los de validación del formulario.
          Son cosas distintas: los de arriba los podés arreglar mirando la
          pantalla; este te dice algo que solo la base sabía — que otro ya
          recibió esa mercadería, o que la orden se cerró mientras cargabas.
        */}
        {errorServidor && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
          >
            <p className="text-sm font-bold text-destructive">{errorServidor}</p>
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
        <Button variant="outline" size="md" onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => void handleConfirm()}
          // También mientras guarda: un doble clic mandaría dos recepciones, y
          // la segunda sumaría stock de nuevo.
          disabled={guardando || cargandoLineas || (showErrors && validacion.length > 0)}
        >
          {guardando ? "Guardando…" : "Confirmar Recepción"}
        </Button>
      </div>
    </>
  );
}
