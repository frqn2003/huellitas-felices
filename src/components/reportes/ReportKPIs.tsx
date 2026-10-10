"use client";

import { BadgeDollarSign, Receipt, ShoppingCart } from "lucide-react";

interface ReportKPIsProps {
  totalVentas: number;
  ticketPromedio: number;
  cantidadOperaciones: number;
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

export function ReportKPIs({
  totalVentas,
  ticketPromedio,
  cantidadOperaciones,
  className,
}: ReportKPIsProps) {
  const kpis = [
    {
      id: "total",
      label: "Total Recaudado",
      valor: formatMoneda(totalVentas),
      subtitulo: "Suma total facturada en el período",
      icono: BadgeDollarSign,
      iconoBg: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "promedio",
      label: "Ticket Promedio",
      valor: formatMoneda(ticketPromedio),
      subtitulo: "Promedio de venta por transacción",
      icono: Receipt,
      iconoBg: "bg-sky-100 text-sky-800",
    },
    {
      id: "operaciones",
      label: "Operaciones",
      valor: formatEntero(cantidadOperaciones),
      subtitulo: `${cantidadOperaciones === 1 ? "Venta registrada" : "Ventas registradas"}`,
      icono: ShoppingCart,
      iconoBg: "bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-3 ${className ?? ""}`}
      role="region"
      aria-label="Métricas resumidas del reporte"
    >
      {kpis.map((kpi) => {
        const Icono = kpi.icono;
        return (
          <article
            key={kpi.id}
            className="flex items-center gap-4 rounded-md border border-border bg-surface p-5 shadow-card"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${kpi.iconoBg}`}
              aria-hidden="true"
            >
              <Icono className="h-6 w-6" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary truncate">
                {kpi.label}
              </span>
              <span className="font-mono text-2xl font-extrabold tracking-tight text-brand-900 tabular-nums truncate">
                {kpi.valor}
              </span>
              <span className="text-xs font-semibold text-text-secondary truncate">
                {kpi.subtitulo}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
