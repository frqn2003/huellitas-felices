"use client";

import { CalendarDays, CalendarRange, PawPrint, Users } from "lucide-react";
import { useRef } from "react";

export type TabRecepcion = "clientes" | "mascotas" | "turnos" | "agenda";

interface RecepcionTabsProps {
  active: TabRecepcion;
  onChange: (tab: TabRecepcion) => void;
  disabled?: boolean;
}

const TABS: {
  id: TabRecepcion;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "mascotas", label: "Mascotas", icon: PawPrint },
  { id: "turnos", label: "Turnos", icon: CalendarDays },
  // HU-TUR-02: la agenda semanal es otra lectura de los turnos (grilla, no
  // listado). Icono distinto al de Turnos para distinguirlas en la tab.
  { id: "agenda", label: "Agenda semanal", icon: CalendarRange },
];

export function RecepcionTabs({ active, onChange, disabled = false }: RecepcionTabsProps) {
  const tabRefs = useRef<Record<TabRecepcion, HTMLButtonElement | null>>({
    clientes: null,
    mascotas: null,
    turnos: null,
    agenda: null,
  });

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const direction = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + TABS.length) % TABS.length;
    tabRefs.current[TABS[nextIndex].id]?.focus();
    onChange(TABS[nextIndex].id);
  };

  return (
    <div
      role="tablist"
      aria-label="Módulos de recepción"
      className="flex flex-wrap items-center gap-2"
    >
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-recepcion-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-recepcion-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-pill px-5 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45 ${
              selected
                ? "bg-brand-900 text-cream-50"
                : "border border-brand-900 bg-transparent text-brand-900 hover:bg-brand-900/5"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden={true} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}