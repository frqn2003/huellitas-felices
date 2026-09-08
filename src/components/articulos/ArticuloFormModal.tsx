"use client";

import { PackagePlus, Pencil, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { Articulo, CatalogosArticulo } from "@/data/articulos";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";

export type FormModo = "INSERCION" | "EDICION" | "LECTURA";

/**
 * Lo que el formulario le manda al backend.
 *
 * CUATRO CAMBIOS respecto de cómo era con datos hardcodeados:
 *
 *  1. NO lleva `codigo`. Lo genera la base con un trigger, a partir del prefijo
 *     de la categoría (MED-000001). El front no puede ni debe inventarlo: si
 *     dos personas dieran de alta a la vez, generarían el mismo.
 *
 *  2. Categoría, unidad, fabricante y presentación viajan como **id**, no como
 *     texto. En la base son tablas con foreign key, no strings sueltos. Los
 *     ids salen de GET /api/articulos/catalogos (la presentación cae al
 *     placeholder PRESENTACIONES hasta que el back la exponga).
 *
 *  3. NO lleva `proveedorId`. El proveedor preferido lo deriva el back de la
 *     última orden de compra del artículo: se muestra, no se elige.
 *
 *  4. NO lleva `activo` (el dict no tiene esa columna; el estado vive en
 *     `estado`). El alta arranca "Activo" y la baja se hace desde el listado
 *     (DesactivarModal). Falta una acción "Activar" cuando el back se alinee
 *     (sprint 2).
 */
export interface ArticuloDraft {
  nombre: string;
  descripcion: string;
  fabricante_id: string;
  unidadMedidaId: string;
  categoriaId: string;
  presentacion_id: string;
  numero_lote: string;
  fecha_vencimiento: string;
  contenido_neto: string;
  imagen_url: string;
}

interface ArticuloFormModalProps {
  open: boolean;
  modo: FormModo;
  articulo: Articulo | null;
  articulos: Articulo[];
  catalogos: CatalogosArticulo;
  onClose: () => void;
  onSave: (draft: ArticuloDraft) => void;
  onEditFromRead: () => void;
}

// `nextCodigo()` se eliminó: el código lo genera el trigger de la base.

function initialDraft(
  articulo: Articulo | null,
  catalogos: CatalogosArticulo,
): ArticuloDraft {
  if (articulo) {
    return {
      nombre: articulo.nombre,
      descripcion: articulo.descripcion,
      fabricante_id: String(articulo.fabricante_id),
      unidadMedidaId: String(articulo.unidadMedidaId),
      categoriaId: String(articulo.categoriaId),
      presentacion_id: articulo.presentacion_id
        ? String(articulo.presentacion_id)
        : String(catalogos.presentaciones?.[0]?.id ?? ""),
      numero_lote: articulo.numero_lote ?? "",
      fecha_vencimiento: articulo.fecha_vencimiento ?? "",
      contenido_neto: articulo.contenido_neto ?? "",
      imagen_url: articulo.imagen_url,
    };
  }
  // En alta se preselecciona la primera opción de cada catálogo: los tres son
  // obligatorios (NOT NULL en la base), así que un select vacío solo sirve para
  // que el usuario descubra el error al guardar. La presentación también es
  // obligatoria en el dict (misma lógica de preselección).
  return {
    nombre: "",
    descripcion: "",
    fabricante_id: String(catalogos.fabricantes[0]?.id ?? ""),
    unidadMedidaId: String(catalogos.unidadesMedida[0]?.id ?? ""),
    categoriaId: String(catalogos.categorias[0]?.id ?? ""),
    presentacion_id: String(catalogos.presentaciones?.[0]?.id ?? ""),
    numero_lote: "",
    fecha_vencimiento: "",
    contenido_neto: "",
    imagen_url: "",
  };
}

function validateDraft(
  d: ArticuloDraft,
  articulos: Articulo[],
  propioId: number | undefined,
): Partial<Record<keyof ArticuloDraft, string>> {
  const next: Partial<Record<keyof ArticuloDraft, string>> = {};
  // Ya no se valida el código: lo genera la base.
  if (!d.nombre.trim()) {
    next.nombre = "El nombre es obligatorio.";
  } else if (
    articulos.some(
      (a) => a.estado === "activo" && a.nombre.toLowerCase() === d.nombre.trim().toLowerCase() && a.id !== propioId,
    )
  ) {
    next.nombre = "Ya existe un artículo activo con ese nombre.";
  }
  if (!d.unidadMedidaId) next.unidadMedidaId = "Seleccioná una unidad de medida.";
  if (!d.categoriaId) next.categoriaId = "Seleccioná una categoría.";
  if (!d.fabricante_id) next.fabricante_id = "Seleccioná un fabricante.";
  // BACKEND: el dict pide presentacion_id NOT NULL.
  if (!d.presentacion_id) next.presentacion_id = "Seleccioná una presentación.";
  return next;

  // NOTA: la validación de nombre duplicado también corre en el servidor
  // (articulo.service.ts). Acá es solo para dar feedback inmediato: el front
  // puede tener una lista desactualizada, así que la verdad la tiene el back —
  // si el POST devuelve 409 NOMBRE_DUPLICADO, se muestra ese mensaje.
}

function ArticuloFormFields({
  articulo,
  articulos,
  catalogos,
  modo,
  onSave,
}: {
  articulo: Articulo | null;
  articulos: Articulo[];
  catalogos: CatalogosArticulo;
  modo: FormModo;
  onSave: (draft: ArticuloDraft) => void;
}) {
  const isLectura = modo === "LECTURA";

  const [draft, setDraft] = useState<ArticuloDraft>(() => initialDraft(articulo, catalogos));
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
    // Se manda como data URL base64 en el POST/PUT. El back la escribe en
    // disco (src/lib/uploads.ts) y devuelve la ruta pública en `imagen_url`.
    const reader = new FileReader();
    reader.onload = () => {
      setImagenError(null);
      setField("imagen_url", String(reader.result ?? ""));
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
    setTouched({ nombre: true, unidadMedidaId: true, categoriaId: true, fabricante_id: true, presentacion_id: true });
    if (Object.keys(nextErrors).length > 0) return;
    onSave(draft);
  };

  const proveedorActual = articulo?.proveedorPreferido?.nombre ?? "";

  return (
    <form id="articulo-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          {/* El código lo genera la base al guardar (trigger fn_generar_cod_articulo,
              con el prefijo de la categoría: MED-000001). Nunca es editable. */}
          <Input
            id="codigo"
            label="Código"
            value={articulo?.codigo ?? ""}
            readOnly
            hint={articulo ? undefined : "Se genera automáticamente al guardar."}
            onChange={() => {}}
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
      {/* Antes era texto libre. Ahora `fabricante` es una TABLA con foreign key:
          escribir "Nipro" y "nipro medical" creaba dos fabricantes distintos y
          rompía el agrupado. Las opciones salen de GET /api/articulos/catalogos. */}
      <Select
        id="fabricante"
        label="Fabricante"
        requiredMark
        value={draft.fabricante_id}
        onChange={(e) => setField("fabricante_id", e.target.value)}
        error={showError("fabricante_id")}
        disabled={isLectura}
      >
        {catalogos.fabricantes.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nombre}
          </option>
        ))}
      </Select>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          {/* BACKEND: el dict pide presentacion_id NOT NULL; la API aún no
              expone el catálogo (cae al placeholder PRESENTACIONES). */}
          <Select
            id="presentacion"
            label="Presentación"
            requiredMark
            value={draft.presentacion_id}
            onChange={(e) => setField("presentacion_id", e.target.value)}
            error={showError("presentacion_id")}
            disabled={isLectura}
          >
            {(catalogos.presentaciones ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Input
            id="contenido-neto"
            label="Contenido neto"
            value={draft.contenido_neto}
            onChange={(e) => setField("contenido_neto", e.target.value)}
            hint="Opcional · ej: 500 (mg) o 15 (kg)"
            readOnly={isLectura}
          />
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <Input
            id="numero-lote"
            label="Nro. de lote"
            value={draft.numero_lote}
            onChange={(e) => setField("numero_lote", e.target.value)}
            hint="Opcional"
            readOnly={isLectura}
          />
        </div>
        <div className="flex-1">
          <Input
            id="fecha-vencimiento"
            label="Fecha de vencimiento"
            type="date"
            value={draft.fecha_vencimiento}
            onChange={(e) => setField("fecha_vencimiento", e.target.value)}
            hint="Opcional (YYYY-MM-DD)"
            readOnly={isLectura}
          />
        </div>
      </div>
      <p className="text-sm font-bold text-text-primary">Imagen</p>
      {isLectura ? (
        <div className="flex flex-col gap-3 rounded-sm border border-border bg-surface p-4">
          {draft.imagen_url ? (
            <div className="flex items-center gap-4">
              <img
                src={draft.imagen_url}
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
            {draft.imagen_url ? (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <img
                  src={draft.imagen_url}
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
            {draft.imagen_url && (
              <button
                type="button"
                onClick={() => setField("imagen_url", "")}
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
            value={draft.unidadMedidaId}
            onChange={(e) => setField("unidadMedidaId", e.target.value)}
            error={showError("unidadMedidaId")}
            disabled={isLectura}
          >
            {catalogos.unidadesMedida.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <Select
            id="categoria"
            label="Categoría"
            requiredMark
            value={draft.categoriaId}
            onChange={(e) => setField("categoriaId", e.target.value)}
            error={showError("categoriaId")}
            disabled={isLectura}
          >
            {catalogos.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {/* Criterio de HU-STK-01: "proveedor preferido (opcional)".
          NO se elige a mano: es el último proveedor al que se le compró este
          artículo, derivado de las órdenes de compra no canceladas. Guardarlo
          como un campo editable crearía un dato que se desincroniza del
          historial real de compras. */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-text-primary">Proveedor preferido</p>
        <div className="flex min-h-11 items-center rounded-sm border border-border bg-cream-50 px-4">
          <p className="text-sm text-text-secondary">
            {proveedorActual || "Todavía no se le compró a ningún proveedor"}
          </p>
        </div>
        <p className="text-xs text-text-secondary">
          Se calcula solo: es el proveedor de la última orden de compra de este
          artículo.
        </p>
      </div>
      {isLectura && (
        <p className="rounded-sm bg-cream-50 px-4 py-3 text-sm text-text-secondary">
          {articulo
            ? `Proveedor preferido: ${proveedorActual || "Sin proveedor"} · Estado: ${articulo.estado === "activo" ? "Activo" : "Inactivo"}`
            : "Sin proveedor"}
        </p>
      )}
      {/* El checkbox "Artículo activo" se eliminó: el dict no tiene la columna
          `activo` (el estado vive en `estado`). La baja se hace desde el
          listado (DesactivarModal); la re-activación queda para cuando el back
          se alinee (sprint 2). */}
    </form>
  );
}

export function ArticuloFormModal({
  open,
  modo,
  articulo,
  articulos,
  catalogos,
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
          <Button onClick={onEditFromRead}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar artículo
          </Button>
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
        catalogos={catalogos}
        modo={modo}
        onSave={onSave}
      />
    </Modal>
  );
}
