"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CatalogosArticulo } from "@/data/articulos";
import { Button } from "@/components/ui/Button";

export type EstadoFiltro = "Activo" | "Inactivo" | "Todos";

export interface Filtros {
  categoria: string;
  estado: EstadoFiltro;
  unidadMedida: string;
  proveedorId: string;
}

/**
 * Catálogos de los selects.
 *
 * Llegan por prop y NO de constantes de `src/data/articulos.ts`: los salían de
 * ahí (`PROVEEDORES`, `CATEGORIAS`, `UNIDADES`) eran listas fijas escritas a
 * mano, y las de proveedores traían ids inventados (5, 8, 12, 15) que no
 * existen en la base. Filtrar por cualquiera de esas opciones devolvía SIEMPRE
 * cero resultados, porque `articulo.proveedorPreferido.id` nunca coincidía.
 *
 * Los tres salen de GET /api/articulos/catalogos, que los lee de las tablas
 * `categoria`, `unidad_medida` y `proveedor`. La página ya los pedía para el
 * formulario de alta; el filtro los ignoraba.
 *
 * Es solo la parte del catálogo que estos selects usan: así el componente no
 * pide `fabricantes` ni `presentaciones`, que no muestra.
 */
export type CatalogosFiltroArticulo = Pick<
  CatalogosArticulo,
  "categorias" | "unidadesMedida" | "proveedores"
>;

interface FiltrosArticulosProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  catalogos: CatalogosFiltroArticulo;
  disabled?: boolean;
  hideChips?: boolean;
}

interface FiltrosChipsProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  catalogos: CatalogosFiltroArticulo;
}

const ESTADOS: EstadoFiltro[] = ["Activo", "Inactivo", "Todos"];

const FILTROS_VACIOS: Filtros = { categoria: "", estado: "Todos", unidadMedida: "", proveedorId: "" };

function buildTags(
  filtros: Filtros,
  onChange: (filtros: Filtros) => void,
  catalogos: CatalogosFiltroArticulo,
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.categoria) {
    tags.push({
      label: `Categoría: ${filtros.categoria}`,
      onRemove: () => onChange({ ...filtros, categoria: "" }),
    });
  }
  if (filtros.estado !== "Todos") {
    tags.push({
      label: `Estado: ${filtros.estado}`,
      onRemove: () => onChange({ ...filtros, estado: "Todos" }),
    });
  }
  if (filtros.unidadMedida) {
    tags.push({
      label: `Unidad: ${filtros.unidadMedida}`,
      onRemove: () => onChange({ ...filtros, unidadMedida: "" }),
    });
  }
  if (filtros.proveedorId) {
    const proveedor = catalogos.proveedores.find((p) => p.id === Number(filtros.proveedorId));
    tags.push({
      label: `Proveedor: ${proveedor?.nombre ?? filtros.proveedorId}`,
      onRemove: () => onChange({ ...filtros, proveedorId: "" }),
    });
  }
  return tags;
}

export function FiltrosChips({ filtros, onChange, catalogos }: FiltrosChipsProps) {
  const tags = buildTags(filtros, onChange, catalogos);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="inline-flex items-center gap-1.5 rounded-pill bg-brand-900 py-1 pl-3 pr-1 text-xs font-bold text-cream-50"
        >
          {tag.label}
          <button
            type="button"
            onClick={tag.onRemove}
            aria-label={`Quitar filtro ${tag.label}`}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function FiltrosArticulos({
  filtros,
  onChange,
  catalogos,
  disabled = false,
  hideChips = false,
}: FiltrosArticulosProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const tags = buildTags(filtros, onChange, catalogos);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={panelRef}>
        <Button
          variant="outline"
          size="md"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          disabled={disabled}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtros
          {tags.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-500 px-1.5 text-xs font-extrabold text-brand-900">
              {tags.length}
            </span>
          )}
        </Button>
        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-64 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Categoría
                <select
                  value={filtros.categoria}
                  onChange={(e) => onChange({ ...filtros, categoria: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todas</option>
                  {/* `value` es el NOMBRE y no el id: el filtro se aplica en la
                      página comparando `articulo.categoria`, que es el nombre
                      ya resuelto por el JOIN del back. */}
                  {catalogos.categorias.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Estado
                <select
                  value={filtros.estado}
                  onChange={(e) => onChange({ ...filtros, estado: e.target.value as EstadoFiltro })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e === "Todos" ? "Todos" : e}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Unidad de medida
                <select
                  value={filtros.unidadMedida}
                  onChange={(e) => onChange({ ...filtros, unidadMedida: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todas</option>
                  {/* Igual que categoría: se compara por nombre. */}
                  {catalogos.unidadesMedida.map((u) => (
                    <option key={u.id} value={u.nombre}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Proveedor
                <select
                  value={filtros.proveedorId}
                  onChange={(e) => onChange({ ...filtros, proveedorId: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos</option>
                  {/* Acá sí va el id: el filtro compara contra
                      `articulo.proveedorPreferido.id`. */}
                  {catalogos.proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onChange(FILTROS_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      {!hideChips && tags.length > 0 && (
        <FiltrosChips filtros={filtros} onChange={onChange} catalogos={catalogos} />
      )}
    </div>
  );
}