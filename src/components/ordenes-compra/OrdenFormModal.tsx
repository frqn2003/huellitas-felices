"use client";

import { Eye, FileWarning, PackagePlus, Pencil, Plus, Receipt, Send, Trash2, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import type { Proveedor } from "@/data/articulos";
import { PROVEEDORES, articulosIniciales } from "@/data/articulos";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  CONDICIONES_PAGO,
  DEPOSITO_ENTREGA_DEFAULT_ID,
  formatMoney,
  importeAInput,
  numeroOrden,
  parseImporte,
  ultimoPrecioCompra,
  type OrdenCompra,
} from "@/data/ordenes-compra";
import { depositosIniciales } from "@/data/stock";

export type OrdenFormModo = "INSERCION" | "EDICION" | "LECTURA";

interface LineaDraft {
  key: string;
  articuloId: string;
  cantidad: string;
  precio: string;
}

export interface OrdenDraft {
  proveedorId: string;
  fecha: string;
  fechaEntrega: string;
  depositoEntregaId: string;
  condicionPago: string;
  notas: string;
  descuento: string;
  gastosEnvio: string;
  lineas: LineaDraft[];
}

interface LineaErrors {
  articuloId?: string;
  cantidad?: string;
  precio?: string;
}

interface DraftErrors {
  proveedorId?: string;
  fecha?: string;
  descuento?: string;
  gastosEnvio?: string;
  lineas: Record<string, LineaErrors>;
}

interface OrdenFormFieldsProps {
  orden: OrdenCompra | null;
  ordenes: OrdenCompra[];
  modo: OrdenFormModo;
  cotizacionCodigo?: string | null;
  onSave: (draft: OrdenDraft) => void;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// El depósito de entrega solo puede ser uno del catálogo: la dirección se
// resuelve desde su `ubicacion` (la BD guarda el varchar, sin FK).
function depositoPorDireccion(direccion: string) {
  return depositosIniciales.find((d) => d.ubicacion === direccion);
}

function calcularSubtotal(lineas: LineaDraft[]): number {
  return round2(
    lineas.reduce((acc, l) => {
      const cantidad = parseImporte(l.cantidad);
      const precio = parseImporte(l.precio);
      if (Number.isNaN(cantidad) || Number.isNaN(precio)) return acc;
      return acc + cantidad * precio;
    }, 0),
  );
}

function validarLinea(linea: LineaDraft, lineas: LineaDraft[]): LineaErrors {
  const errores: LineaErrors = {};
  if (!linea.articuloId) {
    errores.articuloId = "Seleccioná un artículo.";
  } else if (lineas.some((l) => l.key !== linea.key && l.articuloId === linea.articuloId)) {
    errores.articuloId = "Ese artículo ya está en el detalle.";
  }
  const cantidad = parseImporte(linea.cantidad);
  if (linea.cantidad.trim() === "" || Number.isNaN(cantidad)) {
    errores.cantidad = "Ingresá una cantidad.";
  } else if (cantidad <= 0) {
    errores.cantidad = "Debe ser mayor a 0.";
  }
  const precio = parseImporte(linea.precio);
  if (linea.precio.trim() === "" || Number.isNaN(precio)) {
    errores.precio = "Ingresá el precio unitario.";
  } else if (precio <= 0) {
    errores.precio = "Debe ser mayor a 0.";
  }
  return errores;
}

function validarDraft(draft: OrdenDraft): DraftErrors {
  const next: DraftErrors = { lineas: {} };
  if (!draft.proveedorId) next.proveedorId = "Seleccioná un proveedor.";
  if (!draft.fecha) next.fecha = "La fecha de emisión es obligatoria.";

  if (draft.descuento.trim() !== "") {
    const descuento = parseImporte(draft.descuento);
    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) {
      next.descuento = "Ingresá un porcentaje entre 0 y 100.";
    }
  }
  if (draft.gastosEnvio.trim() !== "") {
    const gastos = parseImporte(draft.gastosEnvio);
    if (Number.isNaN(gastos) || gastos < 0) {
      next.gastosEnvio = "Ingresá un número mayor o igual a 0.";
    }
  }

  draft.lineas.forEach((linea) => {
    next.lineas[linea.key] = validarLinea(linea, draft.lineas);
  });
  return next;
}

function initialDraft(orden: OrdenCompra | null): OrdenDraft {
  if (orden) {
    // La orden guarda solo el varchar; el depósito se infiere por match exacto
    // de dirección. Si no coincide con ningún depósito del catálogo, cae al
    // default (solo debería pasar con datos viejos).
    const deposito = depositoPorDireccion(orden.direccion_entrega);
    return {
      proveedorId: String(orden.proveedor_id),
      fecha: orden.fecha.slice(0, 10),
      fechaEntrega: orden.fecha_entrega ? orden.fecha_entrega.slice(0, 10) : "",
      depositoEntregaId: String(deposito?.id ?? DEPOSITO_ENTREGA_DEFAULT_ID),
      condicionPago: orden.condicion_pago,
      notas: orden.notas ?? "",
      descuento: orden.descuento ? importeAInput(orden.descuento) : "",
      gastosEnvio: orden.gastos_envio ? importeAInput(orden.gastos_envio) : "",
      lineas: orden._detalles.map((d) => ({
        key: `l-${d.id}`,
        articuloId: String(d.articulo_id),
        cantidad: importeAInput(d.cantidad),
        precio: importeAInput(d.precio_acordado),
      })),
    };
  }
  return {
    proveedorId: "",
    fecha: new Date().toISOString().slice(0, 10),
    fechaEntrega: "",
    depositoEntregaId: String(DEPOSITO_ENTREGA_DEFAULT_ID),
    condicionPago: CONDICIONES_PAGO[0],
    notas: "",
    descuento: "",
    gastosEnvio: "",
    // Como en movimientos: siempre hay una fila vacía lista para cargar.
    lineas: [{ key: "n-1", articuloId: "", cantidad: "", precio: "" }],
  };
}

// BACKEND: el nombre del artículo llega resuelto por el JOIN del detalle de la orden.
function nombreArticulo(articuloId: number): string {
  return (
    articulosIniciales.find((a) => a.id === articuloId)?.nombre ?? `Artículo #${articuloId}`
  );
}

function OrdenFormFields({
  orden,
  ordenes,
  modo,
  cotizacionCodigo = null,
  onSave,
}: OrdenFormFieldsProps) {
  const isLectura = modo === "LECTURA";
  const editable = !isLectura;

  const [draft, setDraft] = useState<OrdenDraft>(() => initialDraft(orden));
  const [errors, setErrors] = useState<DraftErrors>({ lineas: {} });
  const [touched, setTouched] = useState<Partial<Record<Exclude<keyof OrdenDraft, "lineas">, boolean>>>({});
  const [lineasTouched, setLineasTouched] = useState<Record<string, boolean>>({});
  const contadorLineas = useRef(1);

  const showError = (field: "proveedorId" | "fecha" | "descuento" | "gastosEnvio") =>
    touched[field] ? errors[field] : undefined;

  const showLineaError = (key: string, field: keyof LineaErrors) =>
    lineasTouched[key] ? errors.lineas[key]?.[field] : undefined;

  const touchLinea = (key: string) => {
    setLineasTouched((prev) => ({ ...prev, [key]: true }));
  };

  const setField = <K extends Exclude<keyof OrdenDraft, "lineas">>(
    field: K,
    value: OrdenDraft[K],
  ) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (touched[field]) {
      setErrors(validarDraft(next));
    }
  };

  const actualizarLinea = (key: string, patch: Partial<Omit<LineaDraft, "key">>) => {
    const next = {
      ...draft,
      lineas: draft.lineas.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    };
    setDraft(next);
    if (lineasTouched[key]) {
      setErrors(validarDraft(next));
    }
  };

  const agregarLinea = () => {
    contadorLineas.current += 1;
    const nueva: LineaDraft = {
      key: `n-${contadorLineas.current}`,
      articuloId: "",
      cantidad: "",
      precio: "",
    };
    const next = { ...draft, lineas: [...draft.lineas, nueva] };
    setDraft(next);
    setErrors(validarDraft(next));
  };

  const eliminarLinea = (key: string) => {
    // El botón se deshabilita cuando queda una sola línea, así que nunca
    // llega a cero filas (mismo comportamiento que movimientos).
    const next = { ...draft, lineas: draft.lineas.filter((l) => l.key !== key) };
    setDraft(next);
    setErrors(validarDraft(next));
  };

  // Al elegir artículo se precarga el último precio de compra, si existe.
  const seleccionarArticulo = (key: string, articuloId: string) => {
    const linea = draft.lineas.find((l) => l.key === key);
    if (!linea) return;
    const patch: Partial<Omit<LineaDraft, "key">> = { articuloId };
    if (articuloId && linea.precio.trim() === "") {
      const sugerido = ultimoPrecioCompra(Number(articuloId), ordenes);
      if (sugerido !== null) patch.precio = importeAInput(sugerido);
    }
    actualizarLinea(key, patch);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validarDraft(draft);
    setErrors(nextErrors);
    setTouched({ proveedorId: true, fecha: true, descuento: true, gastosEnvio: true });
    setLineasTouched(Object.fromEntries(draft.lineas.map((l) => [l.key, true])));
    const hayError =
      nextErrors.proveedorId ||
      nextErrors.fecha ||
      nextErrors.descuento ||
      nextErrors.gastosEnvio ||
      draft.lineas.some((l) => Object.values(nextErrors.lineas[l.key] ?? {}).length > 0);
    if (hayError) return;
    onSave(draft);
  };

  // BACKEND: poblar desde GET /api/proveedores?activo=true (id + razón social).
  const proveedorOptions: { value: string; label: string }[] = PROVEEDORES.map((p: Proveedor) => ({
    value: String(p.id),
    label: p.nombre,
  }));

  // BACKEND: poblar desde GET /api/articulos?activo=true.
  const articuloOptions = articulosIniciales
    .filter((a) => a.activo)
    .map((a) => ({ value: String(a.id), label: `${a.codigo} · ${a.nombre}` }));

  // BACKEND: poblar desde GET /api/depositos.
  const depositoOptions = depositosIniciales.map((d) => ({
    value: String(d.id),
    label: `${d.nombre} · ${d.sucursal}`,
  }));

  const subtotal = calcularSubtotal(draft.lineas);
  const descuentoPct =
    draft.descuento.trim() !== "" && !Number.isNaN(parseImporte(draft.descuento))
      ? parseImporte(draft.descuento)
      : 0;
  const descuentoMonto = round2((subtotal * descuentoPct) / 100);
  const gastosNum =
    draft.gastosEnvio.trim() !== "" && !Number.isNaN(parseImporte(draft.gastosEnvio))
      ? parseImporte(draft.gastosEnvio)
      : 0;
  const total = round2(subtotal - descuentoMonto + gastosNum);

  return (
    <form id="orden-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {modo === "INSERCION" && (
        <div
          className="flex flex-col gap-1 rounded-sm border border-border/60 bg-cream-50 px-4 py-3"
          role="note"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Número de orden
          </p>
          <p className="font-mono text-base font-bold text-brand-900">
            Se asigna automáticamente
          </p>
          <p className="text-xs font-medium text-text-secondary">
            {/* BACKEND: el número lo genera el back (secuencia OC-XXXX) al confirmar. */}
            Al confirmar se genera el número OC-XXXX; no se puede modificar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id="deposito-entrega"
          label="Depósito de entrega"
          requiredMark
          value={draft.depositoEntregaId}
          onChange={(e) => setField("depositoEntregaId", e.target.value)}
          hint="La dirección sale de la ubicación del depósito"
        >
          {depositoOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
        {/* BACKEND: catálogo de proveedores activos para el select. */}
        <Combobox
          id="proveedor"
          label="Proveedor"
          requiredMark
          value={draft.proveedorId}
          options={proveedorOptions}
          onChange={(value) => setField("proveedorId", value)}
          onBlur={() => setTouched((t) => ({ ...t, proveedorId: true }))}
          error={showError("proveedorId")}
          placeholder="Seleccionar proveedor"
          disabled={isLectura}
        />
        <Input
          id="fecha-emision"
          label="Fecha de emisión"
          requiredMark
          type="date"
          value={draft.fecha}
          onChange={(e) => setField("fecha", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, fecha: true }))}
          error={showError("fecha")}
          readOnly={isLectura}
        />
        <Input
          id="fecha-entrega"
          label="Fecha de entrega"
          type="date"
          value={draft.fechaEntrega}
          onChange={(e) => setField("fechaEntrega", e.target.value)}
          hint="Opcional · estimada"
          readOnly={isLectura}
        />
        {/* BACKEND: catálogo de condiciones de pago (hoy const fija; puede pasar a tabla). */}
        <Select
          id="condicion-pago"
          label="Condición de pago"
          requiredMark
          value={draft.condicionPago}
          onChange={(e) => setField("condicionPago", e.target.value)}
          disabled={isLectura}
        >
          {CONDICIONES_PAGO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-text-primary">Notas</span>
        <textarea
          id="notas"
          value={draft.notas}
          onChange={(e) => setField("notas", e.target.value)}
          readOnly={isLectura}
          rows={2}
          placeholder="Observaciones para el proveedor..."
          className="rounded-sm border border-border bg-surface px-4 py-2.5 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 disabled:opacity-70 read-only:bg-cream-100/60"
        />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-cream-50 p-4">
        <legend className="px-2 font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
          Artículos
        </legend>

        {isLectura ? (
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Artículos de la orden</caption>
              <thead>
                <tr className="border-b border-border bg-cream-50">
                  {["Artículo", "Cantidad", "Precio unit.", "Subtotal"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orden?._detalles ?? []).map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-3 py-2 text-sm font-semibold text-text-primary">
                      {nombreArticulo(d.articulo_id)}
                    </td>
                    <td className="px-3 py-2 text-sm text-text-primary">{importeAInput(d.cantidad)}</td>
                    <td className="px-3 py-2 text-sm text-text-primary">{formatMoney(d.precio_acordado)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-text-primary">
                      {formatMoney(round2(d.cantidad * d.precio_acordado))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {draft.lineas.map((linea) => {
                const cantidad = parseImporte(linea.cantidad);
                const precio = parseImporte(linea.precio);
                const subtotalLinea =
                  Number.isNaN(cantidad) || Number.isNaN(precio)
                    ? 0
                    : round2(cantidad * precio);
                return (
                  <div
                    key={linea.key}
                    className="grid grid-cols-1 gap-3 rounded-sm border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_100px_130px_130px_44px]"
                  >
                    <Combobox
                      id={`articulo-${linea.key}`}
                      label="Artículo"
                      requiredMark
                      value={linea.articuloId}
                      options={articuloOptions}
                      onChange={(value) => seleccionarArticulo(linea.key, value)}
                      onBlur={() => touchLinea(linea.key)}
                      error={showLineaError(linea.key, "articuloId")}
                      placeholder="Buscar artículo..."
                      noResultsText="Sin resultados"
                    />
                    <Input
                      id={`cantidad-${linea.key}`}
                      label="Cantidad"
                      requiredMark
                      inputMode="decimal"
                      value={linea.cantidad}
                      onChange={(e) => actualizarLinea(linea.key, { cantidad: e.target.value })}
                      onBlur={() => touchLinea(linea.key)}
                      error={showLineaError(linea.key, "cantidad")}
                    />
                    <Input
                      id={`precio-${linea.key}`}
                      label="Precio unit."
                      requiredMark
                      inputMode="decimal"
                      value={linea.precio}
                      onChange={(e) => actualizarLinea(linea.key, { precio: e.target.value })}
                      onBlur={() => touchLinea(linea.key)}
                      error={showLineaError(linea.key, "precio")}
                    />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-bold text-text-primary">Subtotal</span>
                      <p className="flex h-11 items-center rounded-sm border border-dashed border-border bg-cream-50 px-3 text-sm font-bold text-text-secondary">
                        {formatMoney(subtotalLinea)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 sm:justify-self-end">
                      {/* Spacer con la altura de un label: mantiene el botón
                      alineado con los inputs aunque una celda muestre error. */}
                      <span aria-hidden="true" className="block h-5" />
                      <button
                        type="button"
                        onClick={() => eliminarLinea(linea.key)}
                        disabled={draft.lineas.length === 1}
                        aria-label={`Quitar artículo de la fila ${draft.lineas.indexOf(linea) + 1}`}
                        title="Quitar artículo"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button variant="ghost" size="md" type="button" onClick={agregarLinea}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar artículo
            </Button>
          </>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 rounded-md border border-border bg-cream-50 px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-text-secondary">Subtotal</span>
          <span className="font-bold text-text-primary">{formatMoney(subtotal)}</span>
        </div>
        {editable ? (
          <div className="flex flex-col gap-3">
            <Input
              id="descuento"
              label="Descuento (%)"
              inputMode="decimal"
              value={draft.descuento}
              onChange={(e) => setField("descuento", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, descuento: true }))}
              error={showError("descuento")}
              hint={
                descuentoPct > 0 && !showError("descuento")
                  ? `Equivale a −${formatMoney(descuentoMonto)}`
                  : undefined
              }
              placeholder="0"
            />
            <Input
              id="gastos-envio"
              label="Gastos de envío"
              inputMode="decimal"
              value={draft.gastosEnvio}
              onChange={(e) => setField("gastosEnvio", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, gastosEnvio: true }))}
              error={showError("gastosEnvio")}
              placeholder="0"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-text-secondary">
                Descuento ({importeAInput(orden?.descuento ?? 0)}%)
              </span>
              <span className="font-bold text-text-primary">
                −{formatMoney(round2(((orden?.subtotal ?? 0) * (orden?.descuento ?? 0)) / 100))}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-text-secondary">Gastos de envío</span>
              <span className="font-bold text-text-primary">{formatMoney(orden?.gastos_envio ?? 0)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
            Total
          </span>
          <span className="font-display text-xl font-extrabold text-brand-900">
            {isLectura ? formatMoney(orden?.total ?? 0) : formatMoney(total)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-sm border border-border/60 bg-cream-50 px-4 py-3" role="note">
        <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">Validaciones</p>
        <ul className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
          <li>El precio unitario se precarga con el último precio de compra del artículo.</li>
          <li>Cada artículo necesita cantidad y precio mayores a 0; no se pueden repetir.</li>
          <li>La condición de pago es obligatoria y sale del catálogo acordado.</li>
          <li>El descuento es un porcentaje entre 0 y 100; se aplica sobre el subtotal.</li>
          <li>Total = subtotal − descuento + gastos de envío.</li>
        </ul>
      </div>

      {isLectura && (
        <p className="rounded-sm bg-cream-50 px-4 py-3 text-sm text-text-secondary">
          Creada por {orden?._usuario.nombre} · Condición: {orden?.condicion_pago ?? "—"} ·
          Entregar en{" "}
          {(() => {
            const dep = orden ? depositoPorDireccion(orden.direccion_entrega) : undefined;
            return dep ? `${dep.nombre} (${dep.ubicacion})` : orden?.direccion_entrega || "—";
          })()}
          {cotizacionCodigo ? ` · Cotización: ${cotizacionCodigo}` : ""}
          {orden?.notas ? ` · Notas: ${orden.notas}` : ""}
        </p>
      )}
    </form>
  );
}

interface OrdenFormModalProps {
  open: boolean;
  modo: OrdenFormModo;
  orden: OrdenCompra | null;
  ordenes: OrdenCompra[];
  /** Código SC-XXXX resuelto cuando la orden nació de una adjudicación. */
  cotizacionCodigo?: string | null;
  onClose: () => void;
  onSave: (draft: OrdenDraft) => void;
  onCancelFromRead: (orden: OrdenCompra) => void;
  onEnviar: (orden: OrdenCompra) => void;
}

export function OrdenFormModal({
  open,
  modo,
  orden,
  ordenes,
  cotizacionCodigo = null,
  onClose,
  onSave,
  onCancelFromRead,
  onEnviar,
}: OrdenFormModalProps) {
  const isLectura = modo === "LECTURA";
  const isEdicion = modo === "EDICION";
  const formKey = `${modo}-${orden?.id ?? "nueva"}`;
  // Cancelar solo antes de recibir mercadería (criterio HU-COMP-02).
  const cancelable = orden?.estado === "Pendiente" || orden?.estado === "Enviada";
  const enviable = orden?.estado === "Pendiente";
  // Con recepción parcial quedan pendientes ítems por recibir: se habilita el
  // acceso al remito y la nota de reclamo al proveedor.
  const recibidaParcial = orden?.estado === "Recibida Parcial";

  const titulo = isLectura
    ? `Orden ${numeroOrden(orden?.id ?? 0)}`
    : isEdicion
      ? `Editar ${numeroOrden(orden?.id ?? 0)}`
      : "Nueva orden de compra";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      icon={
        isLectura ? (
          <Eye className="h-5 w-5 text-brand-900" aria-hidden="true" />
        ) : isEdicion ? (
          <Pencil className="h-5 w-5 text-brand-900" aria-hidden="true" />
        ) : (
          <PackagePlus className="h-5 w-5 text-brand-900" aria-hidden="true" />
        )
      }
      maxWidth="max-w-3xl"
      footer={
        isLectura ? (
          <>
            {cancelable && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (orden) onCancelFromRead(orden);
                }}
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Cancelar orden
              </Button>
            )}
            {enviable && (
              <Button
                onClick={() => {
                  if (orden) onEnviar(orden);
                }}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Enviar al proveedor
              </Button>
            )}
            {recibidaParcial && (
              <>
                {/* BACKEND: GET /api/ordenes-compra/:id/remito — abrir el remito
                    de la recepción parcial asociada a la orden. */}
                <Button variant="outline">
                  <Receipt className="h-4 w-4" aria-hidden="true" />
                  Ver remito
                </Button>
                {/* BACKEND: POST /api/ordenes-compra/:id/notas-reclamo — crear
                    la nota de reclamo al proveedor por los ítems faltantes.
                    Es la acción principal del estado: CTA amarillo para
                    diferenciarlo del acceso secundario al remito. */}
                <Button variant="primary">
                  <FileWarning className="h-4 w-4" aria-hidden="true" />
                  Generar nota de reclamo
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="orden-form">
              Guardar
            </Button>
          </>
        )
      }
    >
      <OrdenFormFields
        key={formKey}
        orden={orden}
        ordenes={ordenes}
        modo={modo}
        cotizacionCodigo={cotizacionCodigo}
        onSave={onSave}
      />
    </Modal>
  );
}
