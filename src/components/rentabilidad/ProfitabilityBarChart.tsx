"use client";

import { useId, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { SucursalRentabilidad } from "@/modules/rentabilidad/rentabilidad.types";

interface ProfitabilityBarChartProps {
  sucursales: SucursalRentabilidad[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`;
  }
  return `$${amount}`;
}

export function ProfitabilityBarChart({ sucursales }: ProfitabilityBarChartProps) {
  const chartId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (sucursales.length === 0) return null;

  // Dimensiones del SVG
  const width = 800;
  const height = 440;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determinar valor máximo para la escala Y
  const maxMonto = Math.max(
    ...sucursales.map((s) => Math.max(s.ingresos, s.egresos)),
    10000,
  );
  // Redondear a múltiplo superior amigable
  const stepMagnitude = Math.pow(10, Math.floor(Math.log10(maxMonto)));
  const yMax = Math.ceil(maxMonto / stepMagnitude) * stepMagnitude;

  // 4 líneas de referencia
  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax];

  // Cálculo de posiciones para barras agrupadas
  const groupWidth = chartWidth / sucursales.length;
  const barWidth = Math.min(36, Math.max(18, (groupWidth * 0.6) / 2));
  const barGap = 6;

  const hoveredSucursal = hoveredIndex !== null ? sucursales[hoveredIndex] : null;

  return (
    <div className="bg-surface-card rounded-card border border-border-card p-5 shadow-card h-full flex flex-col justify-between">
      {/* Header del Gráfico */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-black text-base text-brand-900 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-700" aria-hidden />
            Comparativa de Rentabilidad por Sucursal
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Ingresos vs. Egresos por sucursal en el período seleccionado
          </p>
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#114F3C]" aria-hidden />
            <span className="text-text-primary">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#E06D53]" aria-hidden />
            <span className="text-text-primary">Egresos</span>
          </div>
        </div>
      </div>

      {/* Área del Gráfico SVG */}
      <div className="relative w-full flex-1 flex flex-col justify-end overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[550px] select-none"
          role="img"
          aria-labelledby={`${chartId}-title`}
        >
          <title id={`${chartId}-title`}>
            Gráfico comparativo de ingresos y egresos por sucursal
          </title>

          {/* Líneas horizontales de cuadrícula y etiquetas de escala Y */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - (tick / yMax) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#EFE5D2"
                  strokeWidth="1"
                  strokeDasharray={i === 0 ? "none" : "3,3"}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#7A7063"
                  fontFamily="inherit"
                  fontWeight="600"
                >
                  {formatCompactMoney(tick)}
                </text>
              </g>
            );
          })}

          {/* Grupos de Barras por Sucursal */}
          {sucursales.map((suc, idx) => {
            const groupCenterX = paddingLeft + idx * groupWidth + groupWidth / 2;
            const xIngreso = groupCenterX - barWidth - barGap / 2;
            const xEgreso = groupCenterX + barGap / 2;

            const hIngreso = yMax > 0 ? (suc.ingresos / yMax) * chartHeight : 0;
            const hEgreso = yMax > 0 ? (suc.egresos / yMax) * chartHeight : 0;

            const yIngreso = paddingTop + chartHeight - hIngreso;
            const yEgreso = paddingTop + chartHeight - hEgreso;

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={suc.sucursalId}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                tabIndex={0}
                role="button"
                aria-label={`${suc.nombre}: Ingresos ${formatMoney(suc.ingresos)}, Egresos ${formatMoney(suc.egresos)}, Margen ${formatMoney(suc.margenBruto)}`}
                onFocus={() => setHoveredIndex(idx)}
                onBlur={() => setHoveredIndex(null)}
              >
                {/* Zona de fondo reactiva al hover */}
                <rect
                  x={paddingLeft + idx * groupWidth + 4}
                  y={paddingTop}
                  width={groupWidth - 8}
                  height={chartHeight}
                  fill={isHovered ? "#114F3C" : "transparent"}
                  fillOpacity={isHovered ? 0.04 : 0}
                  rx="6"
                />

                {/* Barra de Ingreso */}
                <rect
                  x={xIngreso}
                  y={yIngreso}
                  width={barWidth}
                  height={Math.max(hIngreso, 2)}
                  rx="3"
                  fill="#114F3C"
                  className="transition-all duration-300"
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                />

                {/* Barra de Egreso */}
                <rect
                  x={xEgreso}
                  y={yEgreso}
                  width={barWidth}
                  height={Math.max(hEgreso, 2)}
                  rx="3"
                  fill="#E06D53"
                  className="transition-all duration-300"
                  opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                />

                {/* Etiqueta de Sucursal en el Eje X */}
                <text
                  x={groupCenterX}
                  y={height - paddingBottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={isHovered ? "700" : "600"}
                  fill={isHovered ? "#114F3C" : "#4A4036"}
                  fontFamily="inherit"
                >
                  {suc.nombre.replace("Sucursal ", "")}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip flotante interactivo */}
        {hoveredSucursal && hoveredIndex !== null && (
          <div
            className="absolute top-3 right-4 pointer-events-none bg-brand-900 text-cream-50 p-3 rounded-lg shadow-lg text-xs z-10 border border-brand-800 animate-in fade-in duration-150 min-w-[190px]"
          >
            <div className="font-heading font-black text-sm text-accent-500 mb-1 border-b border-brand-800 pb-1">
              {hoveredSucursal.nombre}
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-cream-200">Ventas:</span>
              <span className="font-bold text-white">{formatMoney(hoveredSucursal.ingresos)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-cream-200">Proveedores:</span>
              <span className="font-bold text-[#FFAAA0]">{formatMoney(hoveredSucursal.egresosProveedores)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-cream-200">Caja Chica:</span>
              <span className="font-bold text-[#FFAAA0]">{formatMoney(hoveredSucursal.egresosCaja)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-t border-brand-800/60 pt-0.5">
              <span className="text-cream-200 font-semibold">Total Egresos:</span>
              <span className="font-bold text-[#FFAAA0]">{formatMoney(hoveredSucursal.egresos)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-brand-800 mt-1 font-bold">
              <span className="text-accent-500">Margen Bruto:</span>
              <span
                className={
                  hoveredSucursal.margenBruto >= 0 ? "text-emerald-400" : "text-status-danger"
                }
              >
                {formatMoney(hoveredSucursal.margenBruto)} ({hoveredSucursal.margenPorcentaje}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
