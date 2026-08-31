"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { EstadoCtaCte } from "@/data/cuentas-corrientes";

// ─── Interfaces de filtros ───────────────────────────────────────────────────

export interface FiltrosCtaCorrienteListValues {
  estado: EstadoCtaCte | "Todos";
  vencimientoDesde: string;
  vencimientoHasta: string;
  montoMin: string;
  montoMax: string;
}

export const FILTROS_CTA_LISTA_VACIOS: FiltrosCtaCorrienteListValues = {
  estado: "Todos",
  vencimientoDesde: "",
  vencimientoHasta: "",
  montoMin: "",
  montoMax: "",
};

export interface FiltrosCtaComprobanteValues {
  estado: EstadoCtaCte | "";
  tipo: string;
  vencimientoDesde: string;
  vencimientoHasta: string;
  montoMin: string;
  montoMax: string;
}

export const FILTROS_CTA_COMPROBANTE_VACIOS: FiltrosCtaComprobanteValues = {
  estado: "",
  tipo: "",
  vencimientoDesde: "",
  vencimientoHasta: "",
  montoMin: "",
  montoMax: "",
};

export interface FiltrosCtaPagoValues {
  formaPago: string;
  fechaDesde: string;
  fechaHasta: string;
  montoMin: string;
  montoMax: string;
}

export const FILTROS_CTA_PAGO_VACIOS: FiltrosCtaPagoValues = {
  formaPago: "",
  fechaDesde: "",
  fechaHasta: "",
  montoMin: "",
  montoMax: "",
};

// ─── Opciones ────────────────────────────────────────────────────────────────

const ESTADOS_COMPROBANTE: { value: EstadoCtaCte | ""; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "Vencido", label: "Vencido" },
  { value: "ProximoAVencer", label: "Próximo a vencer" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Credito", label: "Crédito a favor" },
  { value: "Saldado", label: "Saldado" },
];

const TIPOS_COMPROBANTE = [
  { value: "", label: "Todos los tipos" },
  { value: "Factura A", label: "Factura A" },
  { value: "Factura B", label: "Factura B" },
  { value: "Factura C", label: "Factura C" },
  { value: "Nota de Crédito A", label: "Nota de Crédito A" },
  { value: "Nota de Crédito B", label: "Nota de Crédito B" },
  { value: "Nota de Débito A", label: "Nota de Débito A" },
  { value: "Nota de Débito B", label: "Nota de Débito B" },
];

const FORMAS_PAGO = [
  { value: "", label: "Todas las formas" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
  { value: "Tarjeta", label: "Tarjeta" },
];

function formatFechaChip(fecha: string) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

// ─── Componente Filtros para Listado Principal de Cuentas Corrientes ─────────

export function buildTagsCtaCorrienteList(
  values: FiltrosCtaCorrienteListValues,
  onChange: (values: FiltrosCtaCorrienteListValues) => void,
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (values.estado !== "Todos") {
    const est = ESTADOS_COMPROBANTE.find((e) => e.value === values.estado);
    tags.push({ label: `Estado: ${est?.label ?? values.estado}`, onRemove: () => onChange({ ...values, estado: "Todos" }) });
  }
  if (values.vencimientoDesde) {
    tags.push({ label: `Vto. desde: ${formatFechaChip(values.vencimientoDesde)}`, onRemove: () => onChange({ ...values, vencimientoDesde: "" }) });
  }
  if (values.vencimientoHasta) {
    tags.push({ label: `Vto. hasta: ${formatFechaChip(values.vencimientoHasta)}`, onRemove: () => onChange({ ...values, vencimientoHasta: "" }) });
  }
  if (values.montoMin) {
    tags.push({ label: `Deuda mín: $${values.montoMin}`, onRemove: () => onChange({ ...values, montoMin: "" }) });
  }
  if (values.montoMax) {
    tags.push({ label: `Deuda máx: $${values.montoMax}`, onRemove: () => onChange({ ...values, montoMax: "" }) });
  }
  return tags;
}

export function FiltrosCtaCorrienteListChips({
  values,
  onChange,
}: {
  values: FiltrosCtaCorrienteListValues;
  onChange: (values: FiltrosCtaCorrienteListValues) => void;
}) {
  const tags = buildTagsCtaCorrienteList(values, onChange);
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

export function FiltrosCtaCorrienteList({
  values,
  onChange,
  disabled = false,
  hideChips = false,
}: {
  values: FiltrosCtaCorrienteListValues;
  onChange: (values: FiltrosCtaCorrienteListValues) => void;
  disabled?: boolean;
  hideChips?: boolean;
}) {
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

  const set = (key: keyof FiltrosCtaCorrienteListValues, v: string) =>
    onChange({ ...values, [key]: v });

  const tags = buildTagsCtaCorrienteList(values, onChange);

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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Estado de cuenta
                <select
                  value={values.estado}
                  onChange={(e) => set("estado", e.target.value as EstadoCtaCte | "Todos")}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="Vencido">Vencido</option>
                  <option value="ProximoAVencer">Próximo a vencer</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Credito">Crédito a favor</option>
                  <option value="Saldado">Saldado</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Próx. vto. desde
                  <input
                    type="date"
                    value={values.vencimientoDesde}
                    max={values.vencimientoHasta || undefined}
                    onChange={(e) => set("vencimientoDesde", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Próx. vto. hasta
                  <input
                    type="date"
                    value={values.vencimientoHasta}
                    min={values.vencimientoDesde || undefined}
                    onChange={(e) => set("vencimientoHasta", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Deuda mín.
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values.montoMin}
                    onChange={(e) => set("montoMin", e.target.value)}
                    className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Deuda máx.
                  <input
                    type="number"
                    min="0"
                    placeholder="500000"
                    value={values.montoMax}
                    onChange={(e) => set("montoMax", e.target.value)}
                    className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>

              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => onChange(FILTROS_CTA_LISTA_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {!hideChips && <FiltrosCtaCorrienteListChips values={values} onChange={onChange} />}
    </div>
  );
}

// ─── Componente Filtros para Comprobantes Pendientes ─────────────────────────

export function FiltrosCtaComprobantes({
  values,
  onChange,
  disabled = false,
}: {
  values: FiltrosCtaComprobanteValues;
  onChange: (values: FiltrosCtaComprobanteValues) => void;
  disabled?: boolean;
}) {
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

  const set = (key: keyof FiltrosCtaComprobanteValues, v: string) =>
    onChange({ ...values, [key]: v });

  const tags: { label: string; onRemove: () => void }[] = [];
  if (values.estado) {
    const est = ESTADOS_COMPROBANTE.find((e) => e.value === values.estado);
    tags.push({ label: `Estado: ${est?.label ?? values.estado}`, onRemove: () => set("estado", "") });
  }
  if (values.tipo) {
    tags.push({ label: `Tipo: ${values.tipo}`, onRemove: () => set("tipo", "") });
  }
  if (values.vencimientoDesde) {
    tags.push({ label: `Vto desde: ${formatFechaChip(values.vencimientoDesde)}`, onRemove: () => set("vencimientoDesde", "") });
  }
  if (values.vencimientoHasta) {
    tags.push({ label: `Vto hasta: ${formatFechaChip(values.vencimientoHasta)}`, onRemove: () => set("vencimientoHasta", "") });
  }
  if (values.montoMin) {
    tags.push({ label: `Mín: $${values.montoMin}`, onRemove: () => set("montoMin", "") });
  }
  if (values.montoMax) {
    tags.push({ label: `Máx: $${values.montoMax}`, onRemove: () => set("montoMax", "") });
  }

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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Estado
                <select
                  value={values.estado}
                  onChange={(e) => set("estado", e.target.value)}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {ESTADOS_COMPROBANTE.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Tipo de comprobante
                <select
                  value={values.tipo}
                  onChange={(e) => set("tipo", e.target.value)}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {TIPOS_COMPROBANTE.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Vto. desde
                  <input
                    type="date"
                    value={values.vencimientoDesde}
                    max={values.vencimientoHasta || undefined}
                    onChange={(e) => set("vencimientoDesde", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Vto. hasta
                  <input
                    type="date"
                    value={values.vencimientoHasta}
                    min={values.vencimientoDesde || undefined}
                    onChange={(e) => set("vencimientoHasta", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Saldo mín.
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values.montoMin}
                    onChange={(e) => set("montoMin", e.target.value)}
                    className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Saldo máx.
                  <input
                    type="number"
                    min="0"
                    placeholder="500000"
                    value={values.montoMax}
                    onChange={(e) => set("montoMax", e.target.value)}
                    className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>

              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => onChange(FILTROS_CTA_COMPROBANTE_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {tags.length > 0 && (
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
      )}
    </div>
  );
}

// ─── Componente Filtros para Pagos Registrados ────────────────────────────────

export function FiltrosCtaPagos({
  values,
  onChange,
  disabled = false,
}: {
  values: FiltrosCtaPagoValues;
  onChange: (values: FiltrosCtaPagoValues) => void;
  disabled?: boolean;
}) {
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

  const set = (key: keyof FiltrosCtaPagoValues, v: string) =>
    onChange({ ...values, [key]: v });

  const tags: { label: string; onRemove: () => void }[] = [];
  if (values.formaPago) {
    tags.push({ label: `Forma: ${values.formaPago}`, onRemove: () => set("formaPago", "") });
  }
  if (values.fechaDesde) {
    tags.push({ label: `Desde: ${formatFechaChip(values.fechaDesde)}`, onRemove: () => set("fechaDesde", "") });
  }
  if (values.fechaHasta) {
    tags.push({ label: `Hasta: ${formatFechaChip(values.fechaHasta)}`, onRemove: () => set("fechaHasta", "") });
  }
  if (values.montoMin) {
    tags.push({ label: `Monto mín: $${values.montoMin}`, onRemove: () => set("montoMin", "") });
  }
  if (values.montoMax) {
    tags.push({ label: `Monto máx: $${values.montoMax}`, onRemove: () => set("montoMax", "") });
  }

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
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Forma de pago
                <select
                  value={values.formaPago}
                  onChange={(e) => set("formaPago", e.target.value)}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  {FORMAS_PAGO.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Fecha desde
                  <input
                    type="date"
                    value={values.fechaDesde}
                    max={values.fechaHasta || undefined}
                    onChange={(e) => set("fechaDesde", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Fecha hasta
                  <input
                    type="date"
                    value={values.fechaHasta}
                    min={values.fechaDesde || undefined}
                    onChange={(e) => set("fechaHasta", e.target.value)}
                    className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Monto mín.
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={values.montoMin}
                    onChange={(e) => set("montoMin", e.target.value)}
                    className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                  Monto máx.
                  <input
                    type="number"
                    min="0"
                    placeholder="500000"
                    value={values.montoMax}
                    onChange={(e) => set("montoMax", e.target.value)}
                    className="h-11 rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>

              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => onChange(FILTROS_CTA_PAGO_VACIOS)}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {tags.length > 0 && (
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
      )}
    </div>
  );
}
