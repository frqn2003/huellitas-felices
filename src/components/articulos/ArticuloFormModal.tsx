"use client";

import { PackagePlus, Pencil, Upload } from "lucide-react";
import { useRef, useState } from "react";
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
  fabricante: string;
  unidadMedida: UnidadMedida;
  categoria: Categoria;
  proveedorId: string;
  activo: boolean;
  imagen: string;
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
      fabricante: articulo.fabricante,
      unidadMedida: articulo.unidadMedida,
      categoria: articulo.categoria,
      proveedorId: articulo.proveedorPreferido ? String(articulo.proveedorPreferido.id) : "",
      activo: articulo.activo,
      imagen: articulo.imagen,
    };
  }
  return {
    codigo: nextCodigo(articulos),
    nombre: "",
    descripcion: "",
    fabricante: "",
    unidadMedida: "Unidad",
    categoria: "Medicamentos",
    proveedorId: "",
    activo: true,
    imagen: "",
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
  const [imagenError, setImagenError] = useState<string | null>(null);
  const [imagenDragging, setImagenDragging] = useState(false);
  const imagenInputRef = useRef<HTMLInputElement>(null);

  const showError = (field: keyof ArticuloDraft) => (touched[field] ? errors[field] : undefined);

  const setField = <K extends keyof ArticuloDraft>(field: K, value: ArticuloDraft[K]) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next, articulos, articulo?.id));
    }
  };

  const procesarArchivoImagen = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImagenError("El archivo debe ser una imagen (PNG, JPG o WEBP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImagenError("La imagen no puede superar 2 MB.");
      return;
    }
    // BACKEND: el back recibe la imagen (base64 en el POST/PUT o multipart en
    // POST /api/articulos/:id/imagen) y devuelve la URL para el campo `imagen`.
    const reader = new FileReader();
    reader.onload = () => {
      setImagenError(null);
      setField("imagen", String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const handleImagenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    procesarArchivoImagen(file);
  };

  const handleImagenDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImagenDragging(false);
    procesarArchivoImagen(e.dataTransfer.files?.[0]);
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
      <Input
        id="fabricante"
        label="Fabricante"
        value={draft.fabricante}
        onChange={(e) => setField("fabricante", e.target.value)}
        hint="Ej: Laboratorios Pharma S.A."
        readOnly={isLectura}
      />
      <p className="text-sm font-bold text-text-primary">Imagen</p>
      {isLectura ? (
        <div className="flex flex-col gap-3 rounded-sm border border-border bg-surface p-4">
          {draft.imagen ? (
            <div className="flex items-center gap-4">
              <img
                src={draft.imagen}
                alt={draft.nombre || "Imagen del artículo"}
                className="h-24 w-24 shrink-0 rounded-sm object-cover"
              />
              <p className="text-xs text-text-secondary">Imagen actual del artículo.</p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Este artículo no tiene imagen cargada.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            aria-label="Subir o arrastrar imagen del artículo"
            onClick={() => imagenInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                imagenInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setImagenDragging(true);
            }}
            onDragLeave={() => setImagenDragging(false)}
            onDrop={handleImagenDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed px-6 py-6 text-center transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
              imagenDragging
                ? "border-brand-900 bg-brand-900/5"
                : "border-border bg-cream-50 hover:border-brand-900/60"
            }`}
          >
            {draft.imagen ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <img
                  src={draft.imagen}
                  alt={draft.nombre || "Imagen del artículo"}
                  className="h-24 w-24 shrink-0 rounded-sm object-cover"
                />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-text-primary">Arrastrá una imagen para cambiar</p>
                  <p className="text-xs text-text-secondary">o hacé clic para elegir otra</p>
                </div>
              </div>
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-brand-900/10">
                  <Upload className="h-5 w-5 text-brand-900" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-text-primary">Arrastrá y soltá la imagen acá</p>
                  <p className="text-xs text-text-secondary">o hacé clic para subir · PNG, JPG o WEBP · máx. 2 MB</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={imagenInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImagenFile}
            aria-label="Subir imagen del artículo"
          />
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-secondary">
              La imagen se guarda al confirmar. Sin imagen, en el listado se muestra una huella.
            </p>
            {draft.imagen && (
              <button
                type="button"
                onClick={() => setField("imagen", "")}
                className="h-11 cursor-pointer rounded-pill px-4 text-sm font-bold text-destructive transition-colors duration-fast ease-out hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                Quitar imagen
              </button>
            )}
          </div>
        </div>
      )}
      {imagenError && (
        <p className="text-sm font-semibold text-destructive" role="alert">
          {imagenError}
        </p>
      )}
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
      {/* BACKEND: poblar las opciones desde GET /api/proveedores (id + nombre). */}
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
      {!isLectura && (
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sm border border-border bg-surface px-4 text-sm font-bold text-text-primary">
          Artículo activo
          <input
            type="checkbox"
            checked={draft.activo}
            onChange={(e) => setField("activo", e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          />
        </label>
      )}
      {!isLectura && !draft.activo && (
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
