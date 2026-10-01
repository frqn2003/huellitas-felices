"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { practicas, profesionales } from "@/data/turnos";

export type OrdenTurnos = "prioridad" | "hora_asc" | "hora_desc" | "paciente_asc" | "cliente_asc";

export interface FiltrosConsultaValues {
  busqueda: string;
  estadoId: string; // "" = todos, o id como string
  profesionalId: string; // "" = todos, o id
  practicaId: string; // "" = todas, o id
  orden: OrdenTurnos;
}

export const FILTROS_CONSULTA_VACIOS: FiltrosConsultaValues = {
  busqueda: "",
  estadoId: "",
  profesionalId: "",
  practicaId: "",
  orden: "prioridad",
};

const OPCIONES_ORDEN: { value: OrdenTurnos; label: string }[] = [
  { value: "prioridad", label: "Prioridad (Confirmados primero)" },
  { value: "hora_asc", label: "Horario: más temprano primero" },
  { value: "hora_desc", label: "Horario: más tarde primero" },
  { value: "paciente_asc", label: "Paciente / Mascota (A - Z)" },
  { value: "cliente_asc", label: "Cliente (A - Z)" },
];

const estadoOpciones: { value: string; label: string }[] = [
  { value: "1", label: "Pendientes" },
  { value: "2", label: "Confirmados" },
  { value: "4", label: "Atendidos" },
  { value: "3", label: "Cancelados" },
  { value: "5", label: "No asistieron" },
];

export function buildTagsConsulta(
  filtros: FiltrosConsultaValues,
  onChange: (filtros: FiltrosConsultaValues) => void,
) {
  const tags: { label: string; onRemove: () => void }[] = [];

  if (filtros.estadoId) {
    const estado = estadoOpciones.find((e) => e.value === filtros.estadoId);
    tags.push({
      label: `Estado: ${estado?.label ?? filtros.estadoId}`,
      onRemove: () => onChange({ ...filtros, estadoId: "" }),
    });
  }

  if (filtros.profesionalId) {
    const prof = profesionales.find((p) => String(p.id) === filtros.profesionalId);
    tags.push({
      label: `Profesional: ${prof ? `${prof.nombre} ${prof.apellido}` : filtros.profesionalId}`,
      onRemove: () => onChange({ ...filtros, profesionalId: "" }),
    });
  }

  if (filtros.practicaId) {
    const prac = practicas.find((p) => String(p.id) === filtros.practicaId);
    tags.push({
      label: `Práctica: ${prac?.nombre ?? filtros.practicaId}`,
      onRemove: () => onChange({ ...filtros, practicaId: "" }),
    });
  }

  if (filtros.orden !== "prioridad") {
    const ord = OPCIONES_ORDEN.find((o) => o.value === filtros.orden);
    tags.push({
      label: `Orden: ${ord?.label ?? filtros.orden}`,
      onRemove: () => onChange({ ...filtros, orden: "prioridad" }),
    });
  }

  return tags;
}

export function FiltrosConsultaChips({
  filtros,
  onChange,
  onClearAll,
}: {
  filtros: FiltrosConsultaValues;
  onChange: (filtros: FiltrosConsultaValues) => void;
  onClearAll?: () => void;
}) {
  const tags = buildTagsConsulta(filtros, onChange);
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className="inline-flex items-center gap-2 rounded-pill bg-brand-900 py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-cream-50"
        >
          {tag.label}
          <button
            type="button"
            onClick={tag.onRemove}
            aria-label={`Quitar filtro ${tag.label}`}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out hover:bg-cream-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && (
        <Button variant="ghost" size="sm" type="button" onClick={onClearAll}>
          Limpiar todos
        </Button>
      )}
    </div>
  );
}

interface FiltrosConsultaProps {
  filtros: FiltrosConsultaValues;
  onChange: (filtros: FiltrosConsultaValues) => void;
  disabled?: boolean;
}

export function FiltrosConsulta({ filtros, onChange, disabled = false }: FiltrosConsultaProps) {
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

  const tags = buildTagsConsulta(filtros, onChange);

  return (
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
        Filtros y orden
        {tags.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-500 px-1.5 text-xs font-extrabold text-brand-900">
            {tags.length}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-80 rounded-md border border-border bg-surface p-4 shadow-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-900">
                Filtros y ordenación
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary"
                aria-label="Cerrar panel de filtros"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Ordenación */}
            <label className="flex flex-col gap-1.5 text-xs font-bold text-text-primary">
              Ordenar por
              <select
                value={filtros.orden}
                onChange={(e) => onChange({ ...filtros, orden: e.target.value as OrdenTurnos })}
                className="h-10 cursor-pointer rounded-sm border border-border bg-surface px-3 text-sm font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
              >
                {OPCIONES_ORDEN.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Estado del turno */}
            <label className="flex flex-col gap-1.5 text-xs font-bold text-text-primary">
              Estado del turno
              {/* BACKEND: poblar desde GET /api/estados-turno. */}
              <select
                value={filtros.estadoId}
                onChange={(e) => onChange({ ...filtros, estadoId: e.target.value })}
                className="h-10 cursor-pointer rounded-sm border border-border bg-surface px-3 text-sm font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
              >
                <option value="">Todos los estados</option>
                {estadoOpciones.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Profesional */}
            <label className="flex flex-col gap-1.5 text-xs font-bold text-text-primary">
              Profesional
              {/* BACKEND: poblar desde GET /api/profesionales. */}
              <select
                value={filtros.profesionalId}
                onChange={(e) => onChange({ ...filtros, profesionalId: e.target.value })}
                className="h-10 cursor-pointer rounded-sm border border-border bg-surface px-3 text-sm font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
              >
                <option value="">Todos los profesionales</option>
                {profesionales.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.nombre} {p.apellido}
                  </option>
                ))}
              </select>
            </label>

            {/* Práctica */}
            <label className="flex flex-col gap-1.5 text-xs font-bold text-text-primary">
              Práctica / Motivo
              {/* BACKEND: poblar desde GET /api/practicas. */}
              <select
                value={filtros.practicaId}
                onChange={(e) => onChange({ ...filtros, practicaId: e.target.value })}
                className="h-10 cursor-pointer rounded-sm border border-border bg-surface px-3 text-sm font-normal text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
              >
                <option value="">Todas las prácticas</option>
                {practicas.map((pr) => (
                  <option key={pr.id} value={String(pr.id)}>
                    {pr.nombre} ({pr.duracionMinutos} min)
                  </option>
                ))}
              </select>
            </label>

            {/* Acciones */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onChange(FILTROS_CONSULTA_VACIOS)}
              >
                Restablecer
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => setOpen(false)}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
