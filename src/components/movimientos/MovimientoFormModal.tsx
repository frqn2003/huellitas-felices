"use client";

import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Deposito, FichaStock } from "@/data/stock";
import {
  codigoFicha,
  origenesMovimiento,
  origenesPorTipo,
  parseCantidad,
  tiposMovimiento,
} from "@/data/movimientos";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export interface MovimientoItemDraft {
  articuloId: string;
  cantidad: string;
}

// Prefill opcional para el atajo "Transferir" desde una ficha: abre el modal
// con tipo Transferencia, depósito origen y artículo ya cargados.
export interface MovimientoInicial {
  articuloId: number;
  depositoId: number;
}

export interface MovimientoDraft {
  numero: string;
  fechaHora: string;
  tipoId: string;
  origenId: string;
  origenEntidadId: string;
  motivo: string;
  depositoId: string;
  depositoDestinoId: string;
  items: MovimientoItemDraft[];
}

interface MovimientoFormErrors {
  fechaHora?: string;
  tipoId?: string;
  origenEntidadId?: string;
  depositoId?: string;
  depositoDestinoId?: string;
  general?: string;
  items?: Record<number, { articuloId?: string; cantidad?: string }>;
}

interface MovimientoFormModalProps {
  open: boolean;
  depositos: Deposito[];
  fichas: FichaStock[];
  numeroSiguiente: string;
  inicial?: MovimientoInicial | null;
  onClose: () => void;
  onConfirm: (draft: MovimientoDraft) => void;
}

function ahoraLocal() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}T${hh}:${mi}`;
}

const draftVacio = (numero: string): MovimientoDraft => ({
  numero,
  fechaHora: ahoraLocal(),
  tipoId: "",
  origenId: "",
  origenEntidadId: "",
  motivo: "",
  depositoId: "",
  depositoDestinoId: "",
  items: [{ articuloId: "", cantidad: "" }],
});

const errorsVacios: MovimientoFormErrors = {};

// El formulario vive en un componente hijo que se monta/desmonta con el modal:
// al abrir siempre arranca con estado limpio (sin effects de reset).
function MovimientoFormFields({
  depositos,
  fichas,
  numeroSiguiente,
  inicial,
  onConfirm,
}: {
  depositos: Deposito[];
  fichas: FichaStock[];
  numeroSiguiente: string;
  inicial?: MovimientoInicial | null;
  onConfirm: (draft: MovimientoDraft) => void;
}) {
  const [draft, setDraft] = useState<MovimientoDraft>(() => {
    const base = draftVacio(numeroSiguiente);
    if (!inicial) return base;
    // Prefill desde el atajo "Transferir" de una ficha: tipo Transferencia,
    // depósito origen y artículo ya cargados (el destino lo elige el usuario).
    const tipoTransferencia = tiposMovimiento.find((t) => t.nombre === "Transferencia");
    return {
      ...base,
      tipoId: tipoTransferencia ? String(tipoTransferencia.id) : "",
      depositoId: String(inicial.depositoId),
      items: [{ articuloId: String(inicial.articuloId), cantidad: "" }],
    };
  });
  const [errors, setErrors] = useState<MovimientoFormErrors>(errorsVacios);

  const tipo = tiposMovimiento.find((t) => t.id === Number(draft.tipoId))?.nombre;
  const esTransferencia = tipo === "Transferencia";

  // Origen filtrado según el tipo (combos inválidos no se ofrecen).
  const origenesValidos = tipo ? origenesPorTipo[tipo] : origenesMovimiento.map((o) => o.id);
  const opcionesOrigen = origenesMovimiento.filter((o) => origenesValidos.includes(o.id));
  const esNroOC = opcionesOrigen[0]?.nombre === "Orden de Compra";

  const depositoOrigenId = Number(draft.depositoId);
  const depositoDestinoId = Number(draft.depositoDestinoId);

  const fichasDeposito = useMemo(
    () => (depositoOrigenId ? fichas.filter((f) => f.depositoId === depositoOrigenId) : []),
    [fichas, depositoOrigenId],
  );
  const fichasDestino = useMemo(
    () =>
      esTransferencia && depositoDestinoId
        ? fichas.filter((f) => f.depositoId === depositoDestinoId)
        : [],
    [fichas, esTransferencia, depositoDestinoId],
  );

  const opcionesArticulo = fichasDeposito.map((f) => ({
    value: String(f.articuloId),
    label: f.articulo.nombre,
  }));

  const setField = <K extends keyof MovimientoDraft>(field: K, value: MovimientoDraft[K]) => {
    const next = { ...draft, [field]: value };
    if (field === "tipoId") {
      // Al cambiar el tipo se corrige el origen con el NUEVO tipo: fijado
      // (Ingreso -> OC, Egreso -> Venta) o vacío (Transferencia / Ajuste).
      // Se calcula desde `value`, no desde el closure (tipo anterior).
      const nuevoTipo = tiposMovimiento.find((t) => t.id === Number(value))?.nombre;
      const validos = nuevoTipo ? origenesPorTipo[nuevoTipo] : [];
      next.origenId = validos.length === 1 ? String(validos[0]) : "";
      if (validos.length === 0) next.origenEntidadId = "";
    }
    if (field === "depositoId") {
      // Si el depósito de origen cambia, los artículos sin ficha se limpian.
      const nuevoDepositoId = Number(value);
      const fichasNuevoDeposito = fichas.filter((f) => f.depositoId === nuevoDepositoId);
      next.items = next.items.map((item) => ({
        ...item,
        articuloId: fichasNuevoDeposito.some((f) => f.articuloId === Number(item.articuloId))
          ? item.articuloId
          : "",
      }));
    }
    setDraft(next);
    setErrors(errorsVacios);
  };

  const setItem = (index: number, field: keyof MovimientoItemDraft, value: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
    setErrors(errorsVacios);
  };

  const agregarItem = () => {
    setDraft((prev) => ({ ...prev, items: [...prev.items, { articuloId: "", cantidad: "" }] }));
  };

  const quitarItem = (index: number) => {
    setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const validar = (): MovimientoFormErrors => {
    const next: MovimientoFormErrors = {};
    if (!draft.fechaHora) next.fechaHora = "La fecha y hora son obligatorias.";
    if (!draft.tipoId) next.tipoId = "Seleccioná un tipo de movimiento.";

    // El nro. de documento (OC/venta) es opcional, pero si se completa debe ser
    // un entero positivo (id de la entidad referenciada).
    if (
      opcionesOrigen.length === 1 &&
      draft.origenEntidadId.trim() !== "" &&
      (!Number.isInteger(Number(draft.origenEntidadId)) || Number(draft.origenEntidadId) < 1)
    ) {
      next.origenEntidadId = esNroOC
        ? "El nro. de OC debe ser un entero positivo."
        : "El nro. de venta debe ser un entero positivo.";
    }
    if (esTransferencia) {
      if (!draft.depositoId) next.depositoId = "Seleccioná el depósito de origen.";
      if (!draft.depositoDestinoId) next.depositoDestinoId = "Seleccioná el depósito de destino.";
      if (draft.depositoId && draft.depositoDestinoId && depositoOrigenId === depositoDestinoId) {
        next.depositoDestinoId = "El depósito de destino debe ser distinto del de origen.";
      }
    } else if (!draft.depositoId) {
      next.depositoId = "Seleccioná el depósito.";
    }

    if (draft.items.length === 0) {
      next.general = "Agregá al menos un artículo.";
    }

    const itemErrors: MovimientoFormErrors["items"] = {};
    draft.items.forEach((item, index) => {
      const err: { articuloId?: string; cantidad?: string } = {};
      const articuloId = Number(item.articuloId);
      const ficha = fichasDeposito.find((f) => f.articuloId === articuloId);
      const cant = parseCantidad(item.cantidad);

      if (!item.articuloId) {
        err.articuloId = "Seleccioná un artículo.";
      } else if (!ficha) {
        // BACKEND: el back valida la existencia de ficha_stock activa por
        // artículo + depósito (GET /api/fichas-stock?articulo_id&deposito_id).
        err.articuloId = "No existe ficha activa para este artículo en el depósito elegido.";
      } else if (esTransferencia && !fichasDestino.some((f) => f.articuloId === articuloId)) {
        err.articuloId = "El artículo no tiene ficha en el depósito de destino.";
      }

      if (item.cantidad.trim() === "") {
        err.cantidad = "Cantidad obligatoria.";
      } else if (Number.isNaN(cant) || cant === 0) {
        err.cantidad =
          tipo === "Ajuste"
            ? "Debe ser distinto de 0 (positivo suma, negativo resta)."
            : "Debe ser mayor a 0.";
      } else if (ficha) {
        if (tipo === "Egreso" || tipo === "Transferencia") {
          const disponible = ficha.stockActual;
          if (cant < 0 || disponible - cant < 0) {
            err.cantidad = `Stock insuficiente: hay ${disponible.toFixed(2)} ${ficha.articulo.unidadMedida}.`;
          }
        } else if (tipo === "Ajuste" && cant < 0 && ficha.stockActual + cant < 0) {
          err.cantidad = `Stock insuficiente: hay ${ficha.stockActual.toFixed(2)} ${ficha.articulo.unidadMedida}.`;
        }
      }

      const duplicado = draft.items.findIndex(
        (otro, j) => j < index && otro.articuloId !== "" && otro.articuloId === item.articuloId,
      );
      if (duplicado !== -1) {
        err.articuloId = "Este artículo ya está en la lista.";
      }

      if (Object.keys(err).length > 0) itemErrors[index] = err;
    });
    if (Object.keys(itemErrors).length > 0) next.items = itemErrors;

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validar();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    // BACKEND: enviar el draft por POST /api/movimientos-stock. El back genera
    // UN registro por artículo (mismo `numero`), actualiza stock_actual de cada
    // ficha (atómico), vincula el par de transferencias y registra la bitácora.
    onConfirm(draft);
  };

  const fichaDe = (articuloId: string) =>
    fichasDeposito.find((f) => f.articuloId === Number(articuloId));

  return (
    <form id="form-nuevo-movimiento" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {errors.general && (
        <p
          role="alert"
          className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive"
        >
          {errors.general}
        </p>
      )}

      <div
        className="flex flex-col gap-1 rounded-sm border border-border/60 bg-cream-50 px-4 py-3"
        role="note"
      >
        <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
          Número de movimiento
        </p>
        <p className="font-mono text-base font-bold text-brand-900">{draft.numero}</p>
        <p className="text-xs font-medium text-text-secondary">
          {/* BACKEND: el número lo genera el back (secuencia MOV-XXXX) al confirmar. */}
          Se asigna automáticamente al confirmar; no se puede modificar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="mov-fecha"
          label="Fecha y hora"
          requiredMark
          type="datetime-local"
          value={draft.fechaHora}
          onChange={(e) => setField("fechaHora", e.target.value)}
          error={errors.fechaHora}
        />
        {/* BACKEND: poblar desde GET /api/tipos-movimiento. */}
        <Select
          id="mov-tipo"
          label="Tipo de movimiento"
          requiredMark
          value={draft.tipoId}
          onChange={(e) => setField("tipoId", e.target.value)}
          error={errors.tipoId}
        >
          <option value="">Seleccionar...</option>
          {tiposMovimiento.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Select>
        {/* BACKEND: poblar desde GET /api/depositos. */}
        <Select
          id="mov-deposito"
          label={esTransferencia ? "Depósito origen" : "Depósito"}
          requiredMark
          value={draft.depositoId}
          onChange={(e) => setField("depositoId", e.target.value)}
          error={errors.depositoId}
        >
          <option value="">Seleccionar...</option>
          {depositos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </Select>
        {esTransferencia && (
          <Select
            id="mov-deposito-destino"
            label="Depósito destino"
            requiredMark
            value={draft.depositoDestinoId}
            onChange={(e) => setField("depositoDestinoId", e.target.value)}
            error={errors.depositoDestinoId}
            hint="Debe ser distinto del depósito de origen"
          >
            <option value="">Seleccionar...</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        )}
        {/* El origen queda auto-fijado según el tipo (Ingreso -> Orden de
        Compra, Egreso -> Venta); acá va el nro. del documento.
        BACKEND: poblar el catálogo desde GET /api/origenes-movimiento. */}
        {opcionesOrigen.length === 1 && (
          <Input
            id="mov-origen-entidad"
            label={esNroOC ? "Nro. de OC" : "Nro. de venta"}
            type="number"
            min={1}
            value={draft.origenEntidadId}
            onChange={(e) => setField("origenEntidadId", e.target.value)}
            error={errors.origenEntidadId}
            hint={
              esNroOC
                ? "Opcional: nro. de la orden de compra"
                : "Opcional: nro. de la venta"
            }
          />
        )}
        </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mov-motivo" className="text-sm font-bold text-text-primary">
          Motivo
        </label>
        <textarea
          id="mov-motivo"
          value={draft.motivo}
          onChange={(e) => setField("motivo", e.target.value)}
          maxLength={255}
          rows={3}
          placeholder="Describí el motivo del movimiento..."
          className="min-h-24 w-full rounded-sm border border-border bg-surface px-4 py-3 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
        />
        <p className="text-xs font-medium text-text-secondary">
          Opcional: texto libre (máx. 255 caracteres)
        </p>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-cream-50 p-4">
        <legend className="px-2 font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
          Artículos
        </legend>
        <div className="flex flex-col gap-4">
          {draft.items.map((item, index) => {
            const ficha = fichaDe(item.articuloId);
            const itemError = errors.items?.[index];
            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-sm border border-border bg-surface p-3 sm:grid-cols-[1fr_120px_110px_120px_44px]"
              >
                <Combobox
                  id={`mov-item-articulo-${index}`}
                  label="Artículo"
                  requiredMark
                  value={item.articuloId}
                  options={opcionesArticulo}
                  onChange={(value) => setItem(index, "articuloId", value)}
                  placeholder="Buscar artículo..."
                  noResultsText="Sin artículos con ficha en este depósito"
                  error={itemError?.articuloId}
                />
                <Input
                  id={`mov-item-cantidad-${index}`}
                  label="Cantidad"
                  requiredMark
                  type="number"
                  min={tipo === "Ajuste" ? undefined : 0.01}
                  step={0.01}
                  value={item.cantidad}
                  onChange={(e) => setItem(index, "cantidad", e.target.value)}
                  error={itemError?.cantidad}
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-text-primary">Ficha</span>
                  <p className="flex h-11 items-center rounded-sm border border-dashed border-border bg-cream-50 px-3 text-sm font-bold text-text-secondary">
                    {ficha ? codigoFicha(ficha.id) : "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-text-primary">Stock actual</span>
                  <p className="flex h-11 items-center rounded-sm border border-dashed border-border bg-cream-50 px-3 text-sm font-bold text-text-secondary">
                    {ficha ? `${ficha.stockActual.toFixed(2)} ${ficha.articulo.unidadMedida}` : "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 sm:justify-self-end">
                  {/* Spacer con la altura de un label: mantiene el botón
                  alineado con los inputs aunque una celda muestre error. */}
                  <span aria-hidden="true" className="block h-5" />
                  <button
                    type="button"
                    onClick={() => quitarItem(index)}
                    disabled={draft.items.length === 1}
                    aria-label={`Quitar artículo de la fila ${index + 1}`}
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
        <Button variant="ghost" size="md" type="button" onClick={agregarItem}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar artículo
        </Button>
      </fieldset>

      <div className="flex flex-col gap-2 rounded-sm border border-border/60 bg-cream-50 px-4 py-3" role="note">
        <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">Validaciones</p>
        <ul className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
          <li>Si es Egreso o Transferencia: el stock resultante no puede ser negativo.</li>
          <li>En Ajuste la cantidad puede ser negativa (resta) o positiva (suma).</li>
          <li>Cada artículo necesita una ficha de stock activa en el depósito (y en el destino, para transferencias).</li>
          <li>Al confirmar se genera un registro por artículo; las transferencias se vinculan (egreso + ingreso).</li>
        </ul>
      </div>
    </form>
  );
}

export function MovimientoFormModal({
  open,
  depositos,
  fichas,
  numeroSiguiente,
  inicial = null,
  onClose,
  onConfirm,
}: MovimientoFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo movimiento de stock"
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent-500">
          <ClipboardList className="h-6 w-6 text-brand-900" aria-hidden="true" />
        </span>
      }
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="outline" size="lg" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="lg" type="submit" form="form-nuevo-movimiento">
            Confirmar movimiento
          </Button>
        </>
      }
    >
      <MovimientoFormFields
        depositos={depositos}
        fichas={fichas}
        numeroSiguiente={numeroSiguiente}
        inicial={inicial}
        onConfirm={onConfirm}
      />
    </Modal>
  );
}