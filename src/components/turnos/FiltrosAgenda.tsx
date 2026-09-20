"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  nombreEstado,
  type EstadoTurno,
  type Practica,
  type Profesional,
} from "@/data/turnos";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

// Filtros de la agenda semanal (HU-TUR-02). Todos los criterios viven tras el
// botón único ⚙️ Filtros (profesional, estado, práctica y rango de fechas); los
// chips de filtros aplicados los compone AgendaSemanal al lado del botón.
export interface FiltrosAgendaValues {
  /** "" = todos los profesionales. */
  profesionalId: string;
  /** "" = todos; resto = id del catálogo estado_turno. */
  estadoId: string;
  /** "" = todas; resto = id del catálogo practica. */
  practicaId: string;
  desde: string;
  hasta: string;
}

export const FILTROS_AGENDA_VACIOS: FiltrosAgendaValues = {
  profesionalId: "",
  estadoId: "",
  practicaId: "",
  desde: "",
  hasta: "",
};

/**
 * `nombreEstado` traduce el nombre crudo de la base ("no_asistio") al que ve el
 * usuario ("No asistió"). Es presentación y vive en el front; la LISTA de
 * estados, en cambio, sale de la tabla.
 */
function opcionesDeEstado(estados: EstadoTurno[]) {
  return estados.map((e) => ({
    value: String(e.id),
    label: nombreEstado[e.id] ?? e.nombre,
  }));
}

/**
 * Catálogos de los selects de Profesional y Práctica.
 *
 * Llegan por prop y NO de las constantes de src/data/turnos.ts: son TABLAS
 * (`usuario` con rol Veterinario, y `practica`). El id elegido viaja como
 * `?profesionalId=` / `?practicaId=` al filtrar, así que tiene que ser un id
 * real — con la lista fija, filtrar por un profesional inexistente devolvía
 * siempre la agenda vacía.
 */
export type CatalogosAgenda = {
  profesionales: Profesional[];
  practicas: Practica[];
  estados: EstadoTurno[];
};

function formatFechaChip(fecha: string) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function buildTagsAgenda(
  filtros: FiltrosAgendaValues,
  onChange: (filtros: FiltrosAgendaValues) => void,
  catalogos: CatalogosAgenda,
) {
  const tags: { label: string; onRemove: () => void }[] = [];
  if (filtros.profesionalId) {
    const pro = catalogos.profesionales.find((p) => String(p.id) === filtros.profesionalId);
    tags.push({
      label: `Profesional: ${pro ? `${pro.nombre} ${pro.apellido}` : filtros.profesionalId}`,
      onRemove: () => onChange({ ...filtros, profesionalId: "" }),
    });
  }
  if (filtros.estadoId) {
    const estado = opcionesDeEstado(catalogos.estados).find((e) => e.value === filtros.estadoId);
    tags.push({
      label: `Estado: ${estado?.label ?? filtros.estadoId}`,
      onRemove: () => onChange({ ...filtros, estadoId: "" }),
    });
  }
  if (filtros.practicaId) {
    const pra = catalogos.practicas.find((p) => String(p.id) === filtros.practicaId);
    tags.push({
      label: `Práctica: ${pra?.nombre ?? filtros.practicaId}`,
      onRemove: () => onChange({ ...filtros, practicaId: "" }),
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
  return tags;
}

export function FiltrosAgendaChips({
  filtros,
  onChange,
  catalogos,
}: {
  filtros: FiltrosAgendaValues;
  onChange: (filtros: FiltrosAgendaValues) => void;
  catalogos: CatalogosAgenda;
}) {
  const tags = buildTagsAgenda(filtros, onChange, catalogos);
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

interface FiltrosAgendaProps {
  filtros: FiltrosAgendaValues;
  onChange: (filtros: FiltrosAgendaValues) => void;
  catalogos: CatalogosAgenda;
}

export function FiltrosAgenda({ filtros, onChange, catalogos }: FiltrosAgendaProps) {
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

  const tags = buildTagsAgenda(filtros, onChange, catalogos);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="outline"
        size="md"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
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
            <Select
              label="Profesional"
              value={filtros.profesionalId}
              onChange={(e) => onChange({ ...filtros, profesionalId: e.target.value })}
            >
              <option value="">Todos los profesionales</option>
              {catalogos.profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.nombre} ${p.apellido}`}
                </option>
              ))}
            </Select>
            <Select
              label="Estado del turno"
              value={filtros.estadoId}
              onChange={(e) => onChange({ ...filtros, estadoId: e.target.value })}
            >
              <option value="">Todos los estados</option>
              {opcionesDeEstado(catalogos.estados).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {/* BACKEND: poblar estado/practica desde GET /api/estados-turno
                y GET /api/practicas. */}
            <Select
              label="Práctica"
              value={filtros.practicaId}
              onChange={(e) => onChange({ ...filtros, practicaId: e.target.value })}
            >
              <option value="">Todas las prácticas</option>
              {catalogos.practicas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Desde
                <input
                  type="date"
                  value={filtros.desde}
                  max={filtros.hasta || undefined}
                  onChange={(e) => onChange({ ...filtros, desde: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">
                Hasta
                <input
                  type="date"
                  value={filtros.hasta}
                  min={filtros.desde || undefined}
                  onChange={(e) => onChange({ ...filtros, hasta: e.target.value })}
                  className="h-11 cursor-pointer rounded-sm border border-border bg-surface px-3 text-base font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                />
              </label>
            </div>
            <Button
              variant="ghost"
              size="md"
              type="button"
              onClick={() => onChange(FILTROS_AGENDA_VACIOS)}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
