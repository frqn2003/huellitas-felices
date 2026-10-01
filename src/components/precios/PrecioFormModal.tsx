"use client";

import { BadgeDollarSign, Eye, Lock, Pencil } from "lucide-react";
import { useState } from "react";
import type { FilaListaPrecio } from "@/data/lista-precios";
import { formatFecha, formatMoney } from "@/data/ordenes-compra";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { FormModo } from "@/components/articulos/ArticuloFormModal";

// No hay campo `motivo`: el esquema de Sprint 4 no define tal columna en
// `lista_precio` ni en `historial_precios` (ver docs/esquema-bd-front.md §1).
// El motivo del cambio de precio no se pide ni se guarda.
export interface PrecioDraft {
  articuloId: string;
  precio: string;
}

interface PrecioFormModalProps {
  open: boolean;
  modo: FormModo;
  /**
   * Fila del artículo. En INSERCION es la preselección (acción ➕ de la tabla)
   * o null si se abrió desde "Nuevo precio" del header; en EDICION y LECTURA
   * es siempre la fila sobre la que se actúa.
   */
  fila: FilaListaPrecio | null;
  /** Catálogo completo: opciones del combobox y validaciones. */
  filas: FilaListaPrecio[];
  onClose: () => void;
  onSave: (draft: PrecioDraft) => void;
  onEditFromRead: () => void;
}

// numeric(12,2) con CHECK >= 0: hasta 10 enteros y 2 decimales, sin signo y
// sin separador de miles. La coma decimal (teclado es-AR) se normaliza a punto.
const RE_PRECIO = /^\d{0,10}(\.\d{0,2})?$/;

function sanitizePrecio(raw: string): string {
  const v = raw.trim().replace(",", ".");
  if (v === "") return "";
  if (RE_PRECIO.test(v)) return v;
  // Carácter inválido: reconstruí descartándolo, sin vaciar lo ya tipeado.
  const [entero, dec] = v.split(".");
  const e = entero.replace(/\D/g, "").slice(0, 10);
  if (dec === undefined) return e;
  return `${e}.${dec.replace(/\D/g, "").slice(0, 2)}`;
}

function initialDraft(fila: FilaListaPrecio | null, modo: FormModo): PrecioDraft {
  if (modo !== "LECTURA" && fila) {
    return { articuloId: String(fila.articuloId), precio: "" };
  }
  return { articuloId: "", precio: "" };
}

function validateDraft(
  d: PrecioDraft,
  modo: FormModo,
  filas: FilaListaPrecio[],
): Partial<Record<keyof PrecioDraft, string>> {
  const next: Partial<Record<keyof PrecioDraft, string>> = {};

  if (modo === "INSERCION") {
    const elegido = filas.find((f) => String(f.articuloId) === d.articuloId);
    if (!elegido) {
      next.articuloId = "Seleccioná un artículo de la lista.";
    } else if (elegido.estado !== "activo") {
      // fn_abm_lista_precio también lo rechaza: la regla vive en la base.
      next.articuloId = "Solo se puede cargar precio a artículos activos.";
    } else if (elegido.precio !== null) {
      next.articuloId = "Ese artículo ya tiene precio cargado: usá Editar precio.";
    }
  }

  const precio = d.precio.trim();
  if (!precio) {
    next.precio = "Ingresá el precio de venta.";
  } else if (!RE_PRECIO.test(precio)) {
    next.precio = "Ingresá un importe válido, ej: 24900";
  }

  return next;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold text-text-primary">{label}</p>
      <div className="flex min-h-11 items-center gap-2 rounded-sm border border-border bg-cream-100 px-4">
        <p className="min-w-0 truncate text-sm text-text-primary">{value}</p>
        <Lock className="ml-auto h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
      </div>
    </div>
  );
}

function PrecioFormFields({
  fila,
  filas,
  modo,
  onValid,
}: {
  fila: FilaListaPrecio | null;
  filas: FilaListaPrecio[];
  modo: FormModo;
  onValid: (draft: PrecioDraft) => void;
}) {
  const isLectura = modo === "LECTURA";

  const [draft, setDraft] = useState<PrecioDraft>(() => initialDraft(fila, modo));
  const [errors, setErrors] = useState<Partial<Record<keyof PrecioDraft, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PrecioDraft, boolean>>>({});

  const showError = (field: keyof PrecioDraft) => (touched[field] ? errors[field] : undefined);

  const setField = <K extends keyof PrecioDraft>(field: K, value: PrecioDraft[K]) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next, modo, filas));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateDraft(draft, modo, filas);
    setErrors(nextErrors);
    setTouched({ articuloId: true, precio: true });
    if (Object.keys(nextErrors).length > 0) return;
    onValid(draft);
  };

  // Solo artículos ACTIVOS sin precio cargado (regla esquema l.308 + HF047).
  const opciones: ComboboxOption[] = filas
    .filter((f) => f.estado === "activo" && f.precio === null)
    .map((f) => ({ value: String(f.articuloId), label: `${f.codigo} • ${f.nombre}` }));

  const elegido =
    filas.find((f) => String(f.articuloId) === draft.articuloId) ?? fila ?? null;
  const costoRef = modo === "INSERCION" ? elegido?.costoRefOc ?? null : fila?.costoRefOc ?? null;

  return (
    <form id="precio-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      {modo === "INSERCION" ? (
        <Combobox
          id="precio-articulo"
          label="Artículo"
          requiredMark
          value={draft.articuloId}
          options={opciones}
          onChange={(v) => setField("articuloId", v)}
          onBlur={() => {
            setTouched((t) => ({ ...t, articuloId: true }));
            setErrors(validateDraft(draft, modo, filas));
          }}
          placeholder="Buscar por código o nombre..."
          noResultsText="No hay artículos activos sin precio cargado"
          error={showError("articuloId")}
        />
      ) : (
        fila && (
          <ReadOnlyField label="Artículo" value={`${fila.codigo} • ${fila.nombre}`} />
        )
      )}

      {modo === "EDICION" && fila && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="Precio vigente"
            value={fila.precio !== null ? formatMoney(fila.precio) : "—"}
          />
          <Input
            id="precio-nuevo"
            label="Nuevo precio"
            requiredMark
            inputMode="decimal"
            autoComplete="off"
            value={draft.precio}
            onChange={(e) => setField("precio", sanitizePrecio(e.target.value))}
            onBlur={() => {
              setTouched((t) => ({ ...t, precio: true }));
              setErrors(validateDraft(draft, modo, filas));
            }}
            error={showError("precio")}
            placeholder="Precio venta (ej. 24900)"
          />
        </div>
      )}

      {modo === "INSERCION" && (
        <Input
          id="precio-venta"
          label="Precio de venta"
          requiredMark
          inputMode="decimal"
          autoComplete="off"
          value={draft.precio}
          onChange={(e) => setField("precio", sanitizePrecio(e.target.value))}
          onBlur={() => {
            setTouched((t) => ({ ...t, precio: true }));
            setErrors(validateDraft(draft, modo, filas));
          }}
          error={showError("precio")}
          placeholder="Precio venta (ej. 24900)"
        />
      )}

      {modo === "LECTURA" && fila && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="Precio vigente"
            value={fila.precio !== null ? formatMoney(fila.precio) : "Sin precio"}
          />
          <ReadOnlyField
            label="Vigente desde"
            value={formatFecha(fila.vigenciaDesde)}
          />
          <ReadOnlyField label="Categoría" value={fila.categoria} />
          <ReadOnlyField label="U. medida" value={fila.unidadMedida} />
          <ReadOnlyField label="Fabricante" value={fila.fabricante} />
          <ReadOnlyField label="Vencimiento" value={formatFecha(fila.fechaVencimiento)} />
          <ReadOnlyField
            label="Último cambio por"
            value={
              // `updated_at`, no `fecha_registro`: este último es el INSERT y
              // nunca cambia, así que acá mentiría sobre el último cambio.
              fila.usuarioNombre && fila.updatedAt
                ? `${fila.usuarioNombre} — ${formatFecha(fila.updatedAt)}`
                : "Todavía no hay cambios registrados"
            }
          />
        </div>
      )}

      <Input
        id="precio-costo"
        label="Costo de referencia OC"
        readOnly
        disabled
        aria-readonly="true"
        value={costoRef !== null ? formatMoney(costoRef) : "—"}
        hint="Dato informativo: lo fija la recepción de la Orden de Compra y no se edita en esta pantalla."
      />

      {isLectura && fila?.precio === null && (
        <p className="rounded-sm bg-status-warning/10 px-4 py-3 text-sm text-text-primary">
          Este artículo todavía no tiene precio de venta: la venta se rechazaría con HF047.
        </p>
      )}
    </form>
  );
}

export function PrecioFormModal({
  open,
  modo,
  fila,
  filas,
  onClose,
  onSave,
  onEditFromRead,
}: PrecioFormModalProps) {
  const isLectura = modo === "LECTURA";
  const isEdicion = modo === "EDICION";
  const formKey = `${modo}-${fila?.articuloId ?? "nuevo"}`;
  const [porConfirmar, setPorConfirmar] = useState<PrecioDraft | null>(null);

  const handleValid = (draft: PrecioDraft) => {
    // Cambiar el precio afecta todas las ventas siguientes: se confirma con el
    // antes/después a la vista (ConfirmarDialog, tono neutral).
    if (isEdicion) {
      setPorConfirmar(draft);
      return;
    }
    onSave(draft);
  };

  const precioNuevo = porConfirmar ? Number(porConfirmar.precio.replace(",", ".")) : 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isLectura ? "Ver precio" : isEdicion ? "Modificar precio" : "Nuevo precio"}
        icon={
          isLectura ? (
            <Eye className="h-5 w-5 text-brand-900" aria-hidden="true" />
          ) : isEdicion ? (
            <Pencil className="h-5 w-5 text-brand-900" aria-hidden="true" />
          ) : (
            <BadgeDollarSign className="h-5 w-5 text-brand-900" aria-hidden="true" />
          )
        }
        maxWidth="max-w-xl"
        footer={
          isLectura ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={onEditFromRead}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Editar precio
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" form="precio-form">
                Guardar
              </Button>
            </>
          )
        }
      >
        <PrecioFormFields
          key={formKey}
          fila={fila}
          filas={filas}
          modo={modo}
          onValid={handleValid}
        />
      </Modal>

      <ConfirmarDialog
        open={porConfirmar !== null}
        title="Confirmar cambio de precio"
        description={
          fila && porConfirmar
            ? `El precio de ${fila.nombre} pasará de ${
                fila.precio !== null ? formatMoney(fila.precio) : "—"
              } a ${formatMoney(precioNuevo)}. Quedará registrado en el historial con tu usuario y la fecha/hora del cambio.`
            : ""
        }
        confirmLabel="Actualizar precio"
        cancelLabel="Volver"
        tone="neutral"
        onClose={() => setPorConfirmar(null)}
        onConfirm={() => {
          if (porConfirmar) onSave(porConfirmar);
          setPorConfirmar(null);
        }}
      />
    </>
  );
}
