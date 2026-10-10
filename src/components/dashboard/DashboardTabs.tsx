"use client";

import { FileBarChart, LayoutDashboard, TrendingUp } from "lucide-react";
import { useRef } from "react";

export type TabDashboard = "indicadores" | "rentabilidad" | "reportes";

interface DashboardTabsProps {
  active: TabDashboard;
  onChange: (tab: TabDashboard) => void;
  disabled?: boolean;
}

const TABS: {
  id: TabDashboard;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  { id: "indicadores", label: "Indicadores del Día", icon: LayoutDashboard },
  { id: "rentabilidad", label: "Rentabilidad por Sucursal", icon: TrendingUp },
  { id: "reportes", label: "Reportes de Ventas", icon: FileBarChart },
];

export function DashboardTabs({ active, onChange, disabled = false }: DashboardTabsProps) {
  const tabRefs = useRef<Record<TabDashboard, HTMLButtonElement | null>>({
    indicadores: null,
    rentabilidad: null,
    reportes: null,
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
      aria-label="Secciones del Dashboard Gerencial"
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
            id={`tab-dashboard-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-dashboard-${tab.id}`}
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
