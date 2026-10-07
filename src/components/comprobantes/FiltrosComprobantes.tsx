"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Catálogos de los selects de Proveedor y Tipo.
 *
 * Llegan por prop y NO de constantes de este archivo. Las que había acá estaban
 * mal de dos formas distintas:
 *
 *  · proveedores: ids 1/2/3 con nombres inventados. El id SÍ viaja a la API
 *    (ComprobantesContent hace `params.set("proveedorId", ...)`), así que el
 *    filtro traía los comprobantes de OTRO proveedor que el que decía la opción
 *    elegida. Mentía en silencio, que es peor que no devolver nada.
 *
 *  · tipos: decían "Factura A", "Factura B". El filtro se aplica comparando
 *    contra `comprobante.tipo`, que el mapper del back arma con
 *    `tipo_comprobante_nombre` y vale "Factura" a secas, SIN la letra. O sea
 *    que ninguna opción matcheaba nunca.
 *
 * Ahora salen de GET /api/proveedores?estado=activo y GET /api/tipos-comprobante.
 */
export type ProveedorOpcionComprobante = { id: number; razon_social: string };
export type TipoComprobanteOpcionFiltro = { id: number; nombre: string };

const estadosOpts = [
  { value: "", label: "Todos los estados" },
  { value: "Vigente", label: "Vigente" },
  // Lo pone el trigger `fn_actualiza_estado_comprobante_por_pago` cuando el
  // saldo del comprobante llega a cero. Faltaba: filtrar por él era imposible.
  { value: "Pagado", label: "Pagado" },
  { value: "Anulado", label: "Anulado" },
];

export interface FiltrosComprobanteValues {
  proveedor: string;
  tipo: string;
  oc: string;
  desde: string;
  hasta: string;
  estado: string;
}

export const FILTROS_COMPROBANTES_VACIOS: FiltrosComprobanteValues = {
  proveedor: "",
  tipo: "",
  oc: "",
  desde: "",
  hasta: "",
  estado: "",
};

function formatFechaChip(fecha: string) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function buildTagsComprobantes(
  filtros: FiltrosComprobanteValues,
  onChange: (filtros: FiltrosComprobanteValues) => void,
  proveedores: ProveedorOpcionComprobante[],
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.proveedor) {
    const proveedor = proveedores.find((p) => String(p.id) === filtros.proveedor);
    tags.push({
      label: `Proveedor: ${proveedor?.razon_social ?? filtros.proveedor}`,
      onRemove: () => onChange({ ...filtros, proveedor: "" }),
    });
  }
  if (filtros.tipo) {
    tags.push({
      label: `Tipo: ${filtros.tipo}`,
      onRemove: () => onChange({ ...filtros, tipo: "" }),
    });
  }
  if (filtros.oc) {
    tags.push({
      label: `OC: ${filtros.oc}`,
      onRemove: () => onChange({ ...filtros, oc: "" }),
    });
  }
  if (filtros.desde) {
    tags.push({
      label: `Desde: ${formatFechaChip(filtros.desde)}`,
      onRemove: () => onChange({ ...filtros, desde: "" }),
    });
  }
  if (filtros.hasta) {
    tags.push({
      label: `Hasta: ${formatFechaChip(filtros.hasta)}`,
      onRemove: () => onChange({ ...filtros, hasta: "" }),
    });
  }
  if (filtros.estado) {
    tags.push({
      label: `Estado: ${filtros.estado}`,
      onRemove: () => onChange({ ...filtros, estado: "" }),
    });
  }
  return tags;
}

export function FiltrosComprobantesChips({
  filtros,
  onChange,
  proveedores,
}: {
  filtros: FiltrosComprobanteValues;
  onChange: (filtros: FiltrosComprobanteValues) => void;
  proveedores: ProveedorOpcionComprobante[];
}) {
  const tags = buildTagsComprobantes(filtros, onChange, proveedores);
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

interface FiltrosComprobantesProps {
  values: FiltrosComprobanteValues;
  onChange: (values: FiltrosComprobanteValues) => void;
  proveedores: ProveedorOpcionComprobante[];
  tipos: TipoComprobanteOpcionFiltro[];
  disabled?: boolean;
  hideChips?: boolean;
}

export function FiltrosComprobantes({
  values,
  onChange,
  proveedores,
  tipos,
  disabled = false,
  hideChips = false,
}: FiltrosComprobantesProps) {
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

  const set = (key: keyof FiltrosComprobanteValues, v: string) =>
    onChange({ ...values, [key]: v });

  const tags = buildTagsComprobantes(values, onChange, proveedores);

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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-72 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Proveedor
                <select
                  value={values.proveedor}
                  onChange={(e) => set("proveedor", e.target.value)}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos los proveedores</option>
                  {/* El value es el id: viaja como `?proveedorId=` a la API. */}
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.razon_social}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Tipo
                <select
                  value={values.tipo}
                  onChange={(e) => set("tipo", e.target.value)}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="">Todos los tipos</option>
                  {/* El value es el NOMBRE sin la letra ("Factura"), que es lo
                      que trae `comprobante.tipo` desde el mapper del back. */}
                  {tipos.map((t) => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                N° OC
                <input
                  type="text"
                  value={values.oc}
                  placeholder="OC-2026-XXXX"
                  onChange={(e) => set("oc", e.target.value)}
                  className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Desde
                  <input
                    type="date"
                    value={values.desde}
                    max={values.hasta || undefined}
                    onChange={(e) => set("desde", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Hasta
                  <input
                    type="date"
                    value={values.hasta}
                    min={values.desde || undefined}
                    onChange={(e) => set("hasta", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Estado
                {/* BACKEND: poblar desde GET /api/estados-comprobante. */}
                <select
                  value={values.estado}
                  onChange={(e) => set("estado", e.target.value)}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {estadosOpts.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <Button variant="ghost" size="md" type="button" onClick={() => onChange(FILTROS_COMPROBANTES_VACIOS)}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>
      {!hideChips && (
        <FiltrosComprobantesChips
          filtros={values}
          onChange={onChange}
          proveedores={proveedores}
        />
      )}
    </div>
  );
}