"use client";

import { ClipboardList, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import type { Articulo } from "@/data/articulos";
import type { Deposito, FichaStock, SucursalOpcion } from "@/data/stock";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export type FichaFormModo = "INSERCION" | "EDICION";

export interface FichaDraft {
  depositoId: string;
  articuloId: string;
  stockMinimo: string;
  stockCritico: string;
}

interface FichaFormModalProps {
  open: boolean;
  modo: FichaFormModo;
  ficha: FichaStock | null;
  depositos: Deposito[];
  /** Catálogo real: GET /api/sucursales. Filtra los depósitos en cascada. */
  sucursales: SucursalOpcion[];
  articulos: Articulo[];
  fichas: FichaStock[];
  onClose: () => void;
  onSave: (draft: FichaDraft) => void;
}

function initialDraft(ficha: FichaStock | null): FichaDraft {
  if (ficha) {
    return {
      depositoId: String(ficha.depositoId),
      articuloId: String(ficha.articuloId),
      stockMinimo: ficha.stockMinimo.toFixed(2),
      stockCritico: ficha.stockCritico !== null ? ficha.stockCritico.toFixed(2) : "",
    };
  }
  return { depositoId: "", articuloId: "", stockMinimo: "", stockCritico: "" };
}

function validateDraft(
  d: FichaDraft,
  fichas: FichaStock[],
  propioId: number | undefined,
): Partial<Record<keyof FichaDraft, string>> {
  const next: Partial<Record<keyof FichaDraft, string>> = {};
  const depositoId = Number(d.depositoId);
  const articuloId = Number(d.articuloId);
  const minimo = Number.parseFloat(d.stockMinimo);
  const criticoRaw = d.stockCritico.trim();

  if (!d.depositoId) {
    next.depositoId = "Seleccioná un depósito.";
  }
  if (!d.articuloId) {
    next.articuloId = "Seleccioná un artículo.";
  } else if (
    fichas.some(
      (f) => f.articuloId === articuloId && f.depositoId === depositoId && f.id !== propioId,
    )
  ) {
    next.articuloId = "Ya existe una ficha para ese artículo en el depósito elegido.";
  }
  if (d.stockMinimo.trim() === "") {
    next.stockMinimo = "El umbral mínimo es obligatorio.";
  } else if (Number.isNaN(minimo) || minimo <= 0) {
    next.stockMinimo = "Debe ser un número positivo.";
  }
  if (criticoRaw !== "") {
    const critico = Number.parseFloat(criticoRaw);
    if (Number.isNaN(critico) || critico <= 0) {
      next.stockCritico = "Debe ser un número positivo.";
    } else if (!Number.isNaN(minimo) && minimo > 0 && critico >= minimo) {
      next.stockCritico = "Debe ser menor al umbral mínimo.";
    }
  }
  return next;
}

function FichaFormFields({
  ficha,
  depositos,
  sucursales,
  articulos,
  fichas,
  modo,
  onSave,
}: {
  ficha: FichaStock | null;
  depositos: Deposito[];
  sucursales: SucursalOpcion[];
  articulos: Articulo[];
  fichas: FichaStock[];
  modo: FichaFormModo;
  onSave: (draft: FichaDraft) => void;
}) {
  const isEdicion = modo === "EDICION";

  const [draft, setDraft] = useState<FichaDraft>(() => initialDraft(ficha));
  const [errors, setErrors] = useState<Partial<Record<keyof FichaDraft, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FichaDraft, boolean>>>({});

  const sucursalId = depositos.find((d) => d.id === Number(draft.depositoId))?.sucursalId ?? "";
  const depositosSucursal = sucursalId
    ? depositos.filter((d) => d.sucursalId === sucursalId)
    : depositos;

  // En EDICION el artículo puede estar inactivo (fuera del catálogo de opciones):
  // se agrega igual para que el select readonly muestre el valor actual.
  const opcionesArticulo = useMemo(() => {
    const lista = [...articulos];
    if (ficha && !lista.some((a) => a.id === ficha.articuloId)) {
      lista.unshift({
        id: ficha.articuloId,
        codigo: ficha.articulo.codigo,
        nombre: ficha.articulo.nombre,
        descripcion: "",
        fabricanteId: 0,
        fabricante: "",
        unidadMedidaId: 0,
        unidadMedida: ficha.articulo.unidadMedida as Articulo["unidadMedida"],
        categoriaId: 0,
        categoria: "Medicamentos",
        proveedorPreferido: null,
        estado: "Inactivo",
        imagen: "",
        createdAt: "",
        updatedAt: "",
        activo: false,
      });
    }
    return lista;
  }, [articulos, ficha]);

  const articuloSel = opcionesArticulo.find((a) => a.id === Number(draft.articuloId)) ?? null;
  const stockActual = ficha?.stockActual ?? 0;

  const showError = (field: keyof FichaDraft) => (touched[field] ? errors[field] : undefined);

  const setField = (field: keyof FichaDraft, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next, fichas, ficha?.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateDraft(draft, fichas, ficha?.id);
    setErrors(nextErrors);
    setTouched({ depositoId: true, articuloId: true, stockMinimo: true, stockCritico: true });
    if (Object.keys(nextErrors).length > 0) return;
    onSave(draft);
  };

  return (
    <form id="ficha-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* BACKEND: poblar sucursales desde GET /api/sucursales y depósitos desde GET /api/depositos. */}
      <Select
        id="sucursal-filtro"
        label="Sucursal"
        requiredMark
        value={sucursalId}
        onChange={(e) => {
          const sucursal = Number(e.target.value);
          const primerDeposito = depositos.find((d) => d.sucursalId === sucursal);
          setField("depositoId", primerDeposito ? String(primerDeposito.id) : "");
        }}
        hint="Solo se usa para filtrar los depósitos; no se guarda en la ficha."
      >
        <option value="">[ Seleccionar ]</option>
        {sucursales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </Select>
      <Select
        id="deposito"
        label="Depósito"
        requiredMark
        value={draft.depositoId}
        onChange={(e) => setField("depositoId", e.target.value)}
        error={showError("depositoId")}
        disabled={!sucursalId}
      >
        <option value="">[ Seleccionar ]</option>
        {depositosSucursal.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nombre} — {d.ubicacion}
          </option>
        ))}
      </Select>
      {/* BACKEND: poblar opciones desde GET /api/articulos (id, codigo, nombre). */}
      <Combobox
        id="articulo"
        label="Artículo"
        requiredMark
        value={draft.articuloId}
        options={opcionesArticulo.map((a) => ({
          value: String(a.id),
          label: `${a.codigo} — ${a.nombre}`,
        }))}
        onChange={(v) => setField("articuloId", v)}
        onBlur={() => setTouched((t) => ({ ...t, articuloId: true }))}
        error={showError("articuloId")}
        disabled={isEdicion}
        placeholder="Buscar por código o nombre..."
        noResultsText="No se encontraron artículos que coincidan."
        hint={isEdicion ? "Solo lectura en edición: la combinación artículo + depósito es única." : undefined}
      />
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            id="stockMinimo"
            label="Umbral mínimo"
            requiredMark
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={draft.stockMinimo}
            onChange={(e) => setField("stockMinimo", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, stockMinimo: true }))}
            error={showError("stockMinimo")}
            hint="Cantidad mínima antes de la alerta."
          />
        </div>
        <div className="flex-1">
          <Input
            id="stockCritico"
            label="Umbral crítico"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={draft.stockCritico}
            onChange={(e) => setField("stockCritico", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, stockCritico: true }))}
            error={showError("stockCritico")}
            hint="Opcional · debe ser menor al mínimo · notificación automática."
          />
        </div>
      </div>
      <div
        role="group"
        aria-label="Datos de solo lectura"
        className="flex flex-col gap-1 rounded-sm border border-border bg-cream-50 px-4 py-3 text-sm"
      >
        <p className="font-bold text-text-primary">
          Stock actual:{" "}
          <span className="font-extrabold">
            {(isEdicion ? stockActual : 0).toFixed(2)} {articuloSel?.unidadMedida ?? ""}
          </span>
        </p>
        <p className="font-bold text-text-primary">
          Unidad de medida:{" "}
          <span className="font-extrabold">{articuloSel?.unidadMedida ?? "—"}</span>
        </p>
        <p className="text-xs font-medium text-text-secondary">
          El stock se actualiza con los movimientos (HU-STK-04); no se edita acá. La unidad viene del
          artículo; no se almacena en la ficha.
        </p>
      </div>
    </form>
  );
}

export function FichaFormModal({
  open,
  modo,
  ficha,
  depositos,
  sucursales,
  articulos,
  fichas,
  onClose,
  onSave,
}: FichaFormModalProps) {
  const formKey = `${modo}-${ficha?.id ?? "nuevo"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modo === "EDICION" ? "Editar ficha de stock" : "Nueva ficha de stock"}
      icon={
        modo === "EDICION" ? (
          <Pencil className="h-5 w-5 text-brand-900" aria-hidden="true" />
        ) : (
          <ClipboardList className="h-5 w-5 text-brand-900" aria-hidden="true" />
        )
      }
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="ficha-form">
            Guardar
          </Button>
        </>
      }
    >
      <FichaFormFields
        key={formKey}
        sucursales={sucursales}
        ficha={ficha}
        depositos={depositos}
        articulos={articulos}
        fichas={fichas}
        modo={modo}
        onSave={onSave}
      />
    </Modal>
  );
}