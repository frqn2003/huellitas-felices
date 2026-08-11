"use client";

import { PackagePlus, Pencil } from "lucide-react";
import { useState } from "react";
import type { Articulo, Categoria, Proveedor, UnidadMedida } from "@/data/articulos";
import { CATEGORIAS, PROVEEDORES, UNIDADES } from "@/data/articulos";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

export type FormModo = "INSERCION" | "EDICION" | "LECTURA";

export interface ArticuloDraft {
  codigo: string;
  nombre: string;
  descripcion: string;
  unidadMedida: UnidadMedida;
  categoria: Categoria;
  proveedorId: string;
  activo: boolean;
}

interface ArticuloFormModalProps {
  open: boolean;
  modo: FormModo;
  articulo: Articulo | null;
  articulos: Articulo[];
  onClose: () => void;
  onSave: (draft: ArticuloDraft) => void;
  onEditFromRead: () => void;
}

function nextCodigo(articulos: Articulo[]): string {
  const nums = articulos
    .map((a) => Number.parseInt(a.codigo.replace(/\D+/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `ART${String(max + 1).padStart(3, "0")}`;
}

function initialDraft(articulo: Articulo | null, articulos: Articulo[]): ArticuloDraft {
  if (articulo) {
    return {
      codigo: articulo.codigo,
      nombre: articulo.nombre,
      descripcion: articulo.descripcion,
      unidadMedida: articulo.unidadMedida,
      categoria: articulo.categoria,
      proveedorId: articulo.proveedorPreferido ? String(articulo.proveedorPreferido.id) : "",
      activo: articulo.activo,
    };
  }
  return {
    codigo: nextCodigo(articulos),
    nombre: "",
    descripcion: "",
    unidadMedida: "Unidad",
    categoria: "Medicamentos",
    proveedorId: "",
    activo: true,
  };
}

function validateDraft(
  d: ArticuloDraft,
  articulos: Articulo[],
  propioId: number | undefined,
): Partial<Record<keyof ArticuloDraft, string>> {
  const next: Partial<Record<keyof ArticuloDraft, string>> = {};
  if (!d.codigo.trim()) {
    next.codigo = "El código es obligatorio.";
  } else if (
    articulos.some(
      (a) => a.codigo.toLowerCase() === d.codigo.trim().toLowerCase() && a.id !== propioId,
    )
  ) {
    next.codigo = "Ya existe un artículo con ese código.";
  }
  if (!d.nombre.trim()) {
    next.nombre = "El nombre es obligatorio.";
  } else if (
    articulos.some(
      (a) => a.activo && a.nombre.toLowerCase() === d.nombre.trim().toLowerCase() && a.id !== propioId,
    )
  ) {
    next.nombre = "Ya existe un artículo activo con ese nombre.";
  }
  if (!d.unidadMedida) next.unidadMedida = "Seleccioná una unidad de medida.";
  if (!d.categoria) next.categoria = "Seleccioná una categoría.";
  return next;
}

function ArticuloFormFields({
  articulo,
  articulos,
  modo,
  onSave,
}: {
  articulo: Articulo | null;
  articulos: Articulo[];
  modo: FormModo;
  onSave: (draft: ArticuloDraft) => void;
}) {
  const isLectura = modo === "LECTURA";
  const isEdicion = modo === "EDICION";

  const [draft, setDraft] = useState<ArticuloDraft>(() => initialDraft(articulo, articulos));
  const [errors, setErrors] = useState<Partial<Record<keyof ArticuloDraft, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ArticuloDraft, boolean>>>({});

  const showError = (field: keyof ArticuloDraft) => (touched[field] ? errors[field] : undefined);

  const setField = <K extends keyof ArticuloDraft>(field: K, value: ArticuloDraft[K]) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next, articulos, articulo?.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateDraft(draft, articulos, articulo?.id);
    setErrors(nextErrors);
    setTouched({ codigo: true, nombre: true, unidadMedida: true, categoria: true });
    if (Object.keys(nextErrors).length > 0) return;
    onSave(draft);
  };

  const proveedorActual = articulo?.proveedorPreferido?.nombre ?? "";

  return (
    <form id="articulo-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            id="codigo"
            label="Código único"
            requiredMark
            value={draft.codigo}
            onChange={(e) => setField("codigo", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, codigo: true }))}
            error={showError("codigo")}
            readOnly={isLectura || isEdicion}
            hint={isEdicion ? "El código no se puede modificar en edición." : undefined}
          />
        </div>
        <div className="flex-1">
          <Input
            id="nombre"
            label="Nombre"
            requiredMark
            value={draft.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
            error={showError("nombre")}
            hint="Ej: Amoxicilina 500mg"
            readOnly={isLectura}
          />
        </div>
      </div>
      <Input
        id="descripcion"
        label="Descripción"
        value={draft.descripcion}
        onChange={(e) => setField("descripcion", e.target.value)}
        hint="Ej: Para infecciones bacterianas"
        readOnly={isLectura}
      />
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Select
            id="unidad"
            label="Unidad de medida"
            requiredMark
            value={draft.unidadMedida}
            onChange={(e) => setField("unidadMedida", e.target.value as UnidadMedida)}
            error={showError("unidadMedida")}
            disabled={isLectura}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Select
            id="categoria"
            label="Categoría"
            requiredMark
            value={draft.categoria}
            onChange={(e) => setField("categoria", e.target.value as Categoria)}
            error={showError("categoria")}
            disabled={isLectura}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Select
        id="proveedor"
        label="Proveedor preferido"
        value={draft.proveedorId}
        onChange={(e) => setField("proveedorId", e.target.value)}
        disabled={isLectura}
      >
        <option value="">[ Seleccionar ]</option>
        {PROVEEDORES.map((p: Proveedor) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>
      {isLectura && (
        <p className="rounded-sm bg-cream-50 px-4 py-3 text-sm text-text-secondary">
          {articulo
            ? `Proveedor preferido: ${proveedorActual || "Sin proveedor"} · Estado: ${articulo.estado}`
            : "Sin proveedor"}
        </p>
      )}
      {isEdicion && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border bg-surface px-4 text-sm font-bold text-text-primary">
          <input
            type="checkbox"
            checked={draft.activo}
            onChange={(e) => setField("activo", e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          />
          Artículo activo
        </label>
      )}
      {isEdicion && !draft.activo && (
        <p className="rounded-sm bg-accent-500/15 px-4 py-3 text-sm font-semibold text-brand-900" role="status">
          Al guardar, el artículo quedará inactivo: no podrá usarse en nuevos movimientos, listas de precios ni
          órdenes de compra.
        </p>
      )}
    </form>
  );
}

export function ArticuloFormModal({
  open,
  modo,
  articulo,
  articulos,
  onClose,
  onSave,
  onEditFromRead,
}: ArticuloFormModalProps) {
  const isLectura = modo === "LECTURA";
  const isEdicion = modo === "EDICION";
  const formKey = `${modo}-${articulo?.id ?? "nuevo"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isLectura ? "Ver artículo" : isEdicion ? "Editar artículo" : "Nuevo artículo"}
      icon={
        isLectura ? (
          <Pencil className="h-5 w-5 text-brand-900" aria-hidden="true" />
        ) : (
          <PackagePlus className="h-5 w-5 text-brand-900" aria-hidden="true" />
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
              Editar artículo
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="articulo-form">
              Guardar
            </Button>
          </>
        )
      }
    >
      <ArticuloFormFields
        key={formKey}
        articulo={articulo}
        articulos={articulos}
        modo={modo}
        onSave={onSave}
      />
    </Modal>
  );
}
