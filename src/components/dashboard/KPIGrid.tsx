"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  HeartPulse,
  PackageX,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DashboardKPIs } from "@/modules/dashboard/dashboard.types";

interface KPIGridProps {
  data: DashboardKPIs | null;
  loading: boolean;
  className?: string;
}

const formatMoneda = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const formatEntero = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(n);

export function KPIGrid({ data, loading, className }: KPIGridProps) {
  if (loading || !data) {
    return (
      <div
        className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 ${
          className ?? ""
        }`}
        aria-busy="true"
        aria-label="Cargando indicadores clave"
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 shadow-card animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded-sm bg-cream-100" />
              <div className="h-10 w-10 rounded-md bg-cream-100" />
            </div>
            <div className="h-8 w-36 rounded-sm bg-cream-100 mt-2" />
            <div className="h-3 w-44 rounded-sm bg-cream-100" />
          </div>
        ))}
      </div>
    );
  }

  const {
    ventasDelDia,
    turnosDelDia,
    pacientesInternacion,
    articulosStockCritico,
  } = data;

  const kpis = [
    {
      id: "ventas",
      titulo: "Ventas del día",
      valorFormateado: formatMoneda(ventasDelDia.valor),
      valorCrudo: ventasDelDia.valor,
      alerta: ventasDelDia.alerta,
      mensajeAlerta: ventasDelDia.mensajeAlerta,
      umbralTexto: `Meta mínima: ${formatMoneda(ventasDelDia.umbral)}`,
      icono: BadgeDollarSign,
      iconoTendencia: TrendingDown,
      colorIconoNormal: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "turnos",
      titulo: "Turnos del día",
      valorFormateado: `${formatEntero(turnosDelDia.valor)} turnos`,
      valorCrudo: turnosDelDia.valor,
      alerta: turnosDelDia.alerta,
      mensajeAlerta: turnosDelDia.mensajeAlerta,
      umbralTexto: `Capacidad normal: hasta ${turnosDelDia.umbral} turnos`,
      icono: CalendarDays,
      iconoTendencia: TrendingUp,
      colorIconoNormal: "bg-sky-100 text-sky-800",
    },
    {
      id: "internacion",
      titulo: "Pacientes en internación",
      valorFormateado: `${formatEntero(pacientesInternacion.valor)} ${
        pacientesInternacion.valor === 1 ? "paciente" : "pacientes"
      }`,
      valorCrudo: pacientesInternacion.valor,
      alerta: pacientesInternacion.alerta,
      mensajeAlerta: pacientesInternacion.mensajeAlerta,
      umbralTexto: `Cupo recomendado: hasta ${pacientesInternacion.umbral}`,
      icono: HeartPulse,
      iconoTendencia: AlertTriangle,
      colorIconoNormal: "bg-violet-100 text-violet-800",
    },
    {
      id: "stock-critico",
      titulo: "Artículos con stock crítico",
      valorFormateado: `${formatEntero(articulosStockCritico.valor)} ${
        articulosStockCritico.valor === 1 ? "artículo" : "artículos"
      }`,
      valorCrudo: articulosStockCritico.valor,
      alerta: articulosStockCritico.alerta,
      mensajeAlerta: articulosStockCritico.mensajeAlerta,
      umbralTexto: "Límite tolerado: 0 quiebres",
      icono: PackageX,
      iconoTendencia: AlertTriangle,
      colorIconoNormal: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div
      className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 ${
        className ?? ""
      }`}
      role="region"
      aria-label="Indicadores del Dashboard Gerencial"
    >
      {kpis.map((kpi) => {
        const Icono = kpi.icono;
        const estaEnAlerta = kpi.alerta;

        return (
          <article
            key={kpi.id}
            className={`relative flex flex-col justify-between rounded-md border p-5 shadow-card transition-all duration-normal ease-out ${
              estaEnAlerta
                ? "border-status-danger/70 bg-status-danger/[0.03] ring-1 ring-status-danger/20"
                : "border-border bg-surface hover:border-brand-900/30"
            }`}
          >
            {/* Header de la tarjeta */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary truncate">
                  {kpi.titulo}
                </span>
                {estaEnAlerta ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-status-danger-strong">
                    <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                    Umbral superado
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-text-secondary">
                    Estado óptimo
                  </span>
                )}
              </div>

              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors ${
                  estaEnAlerta
                    ? "bg-status-danger/15 text-status-danger-strong"
                    : kpi.colorIconoNormal
                }`}
                aria-hidden="true"
              >
                <Icono className="h-5 w-5" />
              </span>
            </div>

            {/* Valor numérico del KPI */}
            <div className="mt-4 mb-2">
              <span
                className={`font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                  estaEnAlerta
                    ? "text-status-danger-strong"
                    : "text-brand-900"
                }`}
              >
                {kpi.valorFormateado}
              </span>
            </div>

            {/* Pie de tarjeta con mensaje de umbral */}
            <div className="mt-2 border-t border-border/60 pt-2.5">
              <p
                className={`text-xs ${
                  estaEnAlerta
                    ? "font-bold text-status-danger-strong"
                    : "text-text-secondary"
                }`}
              >
                {estaEnAlerta && kpi.mensajeAlerta
                  ? kpi.mensajeAlerta
                  : kpi.umbralTexto}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
