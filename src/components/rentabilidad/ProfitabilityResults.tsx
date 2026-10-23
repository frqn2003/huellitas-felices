"use client";

import {
  DollarSign,
  FileQuestion,
  FileSpreadsheet,
  Printer,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { RentabilidadResumen } from "@/modules/rentabilidad/rentabilidad.types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ProfitabilityKPIs } from "./ProfitabilityKPIs";
import { ProfitabilityBarChart } from "./ProfitabilityBarChart";
import { ProfitabilityRanking } from "./ProfitabilityRanking";
import { ProfitabilityAccumulatedBarChart } from "./ProfitabilityAccumulatedBarChart";

interface ProfitabilityResultsProps {
  resultado: RentabilidadResumen | null;
  desde?: string;
  hasta?: string;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProfitabilityResults({
  resultado,
  desde = "",
  hasta = "",
}: ProfitabilityResultsProps) {
  const { showToast } = useToast();

  if (!resultado) return null;

  // Criterio de verificación de datos:
  // Si no hay sucursales o la suma total de ingresos y egresos es cero, se muestra el estado vacío requerido
  const sinDatos =
    resultado.sucursales.length === 0 ||
    (resultado.totalIngresos === 0 && resultado.totalEgresos === 0);

  const handleExportCSV = () => {
    if (!resultado || resultado.sucursales.length === 0) return;

    try {
      const headers = [
        "Sucursal",
        "Ingresos (Ventas)",
        "Egresos Proveedores",
        "Egresos Caja Chica",
        "Total Egresos",
        "Margen Bruto",
        "Margen %",
      ];

      const lines = resultado.sucursales.map((s) =>
        [
          `"${s.nombre.replace(/"/g, '""')}"`,
          s.ingresos.toFixed(2),
          s.egresosProveedores.toFixed(2),
          s.egresosCaja.toFixed(2),
          s.egresos.toFixed(2),
          s.margenBruto.toFixed(2),
          `${s.margenPorcentaje.toFixed(2)}%`,
        ].join(";"),
      );

      // Fila de resumen total consolidado
      const totalLine = [
        `"TOTAL CONSOLIDADO"`,
        resultado.totalIngresos.toFixed(2),
        resultado.totalEgresosProveedores.toFixed(2),
        resultado.totalEgresosCaja.toFixed(2),
        resultado.totalEgresos.toFixed(2),
        resultado.margenBrutoTotal.toFixed(2),
        `${resultado.margenPorcentajeTotal.toFixed(2)}%`,
      ].join(";");

      const csvContent = [headers.join(";"), ...lines, totalLine].join("\r\n");
      const blob = new Blob([`\uFEFF${csvContent}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-rentabilidad-${desde || "periodo"}-a-${hasta || "actual"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("success", "Notificación de exportación exitosa");
    } catch {
      showToast("error", "Ocurrió un error al generar el archivo CSV.");
    }
  };

  const handleExportPDF = () => {
    try {
      showToast("success", "Notificación de exportación exitosa");
      setTimeout(() => {
        window.print();
      }, 300);
    } catch {
      showToast("error", "Ocurrió un error al preparar el documento imprimible.");
    }
  };

  if (sinDatos) {
    return (
      <div
        id="rentabilidad-empty-state"
        className="bg-surface-card rounded-card border border-border-card p-12 text-center shadow-card flex flex-col items-center justify-center"
      >
        <div className="w-14 h-14 rounded-full bg-cream-100 flex items-center justify-center text-text-tertiary mb-3">
          <FileQuestion className="w-7 h-7" aria-hidden />
        </div>
        <h3 className="font-heading font-black text-lg text-text-primary mb-1">
          Sin datos para el periodo seleccionado
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          No se registraron ventas, compras a proveedores ni egresos de caja para las sucursales y fechas indicadas.
          Probá ampliando el rango de fechas o seleccionando otras sucursales.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra superior de acciones de exportación */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3 print:hidden">
        <div>
          <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            Resumen de Rentabilidad
          </h2>
          <p className="text-xs font-semibold text-text-secondary">
            {resultado.sucursales.length}{" "}
            {resultado.sucursales.length === 1 ? "sucursal evaluada" : "sucursales evaluadas"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            aria-label="Exportar rentabilidad a CSV"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Exportar a CSV
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleExportPDF}
            aria-label="Exportar rentabilidad a PDF"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Exportar a PDF
          </Button>
        </div>
      </div>

      {/* Tarjetas de Totales Globales Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Ingresos (Ventas) */}
        <div className="bg-surface-card rounded-card border border-border-card p-4 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
            <span>Ventas Totales</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden />
          </div>
          <div className="font-heading font-black text-xl text-brand-900">
            {formatMoney(resultado.totalIngresos)}
          </div>
          <span className="text-[11px] text-text-tertiary">Ingresos mostrador/recepción</span>
        </div>

        {/* Pagos a Proveedores (Compras Cta. Cte.) */}
        <div className="bg-surface-card rounded-card border border-border-card p-4 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
            <span>Compras / Proveedores</span>
            <ShoppingCart className="w-4 h-4 text-amber-700" aria-hidden />
          </div>
          <div className="font-heading font-black text-xl text-text-primary">
            {formatMoney(resultado.totalEgresosProveedores)}
          </div>
          <span className="text-[11px] text-text-tertiary">Pagos cta. cte. proveedores</span>
        </div>

        {/* Egresos de Caja */}
        <div className="bg-surface-card rounded-card border border-border-card p-4 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
            <span>Egresos Caja Chica</span>
            <Receipt className="w-4 h-4 text-status-danger" aria-hidden />
          </div>
          <div className="font-heading font-black text-xl text-text-primary">
            {formatMoney(resultado.totalEgresosCaja)}
          </div>
          <span className="text-[11px] text-text-tertiary">Salidas operativas de caja</span>
        </div>

        {/* Total Egresos */}
        <div className="bg-surface-card rounded-card border border-border-card p-4 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
            <span>Total Egresos</span>
            <TrendingDown className="w-4 h-4 text-status-danger" aria-hidden />
          </div>
          <div className="font-heading font-black text-xl text-text-primary">
            {formatMoney(resultado.totalEgresos)}
          </div>
          <span className="text-[11px] text-text-tertiary">Proveedores + Caja chica</span>
        </div>

        {/* Margen Bruto Consolidado */}
        <div className="bg-surface-card rounded-card border border-border-card p-4 shadow-card sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
            <span>Margen Bruto Total</span>
            <DollarSign className="w-4 h-4 text-brand-700" aria-hidden />
          </div>
          <div
            className={`font-heading font-black text-xl ${
              resultado.margenBrutoTotal >= 0 ? "text-brand-900" : "text-status-danger"
            }`}
          >
            {formatMoney(resultado.margenBrutoTotal)}
          </div>
          <span
            className={`text-[11px] font-bold ${
              resultado.margenPorcentajeTotal >= 0 ? "text-emerald-700" : "text-status-danger"
            }`}
          >
            Margen: {resultado.margenPorcentajeTotal > 0 ? `+${resultado.margenPorcentajeTotal}%` : `${resultado.margenPorcentajeTotal}%`}
          </span>
        </div>
      </div>

      {/* Bloque: Gráfico de Barras Acumuladas Mensuales (Full-Width) */}
      <div>
        <ProfitabilityAccumulatedBarChart
          sucursales={resultado.sucursales}
          desde={desde}
          hasta={hasta}
        />
      </div>

      {/* Bloque: Gráfico Comparativo y Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <ProfitabilityBarChart sucursales={resultado.sucursales} />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <ProfitabilityRanking ranking={resultado.ranking} />
        </div>
      </div>

      {/* Bloque: Tarjetas de Indicadores por Sucursal */}
      <div>
        <ProfitabilityKPIs sucursales={resultado.sucursales} />
      </div>
    </div>
  );
}
