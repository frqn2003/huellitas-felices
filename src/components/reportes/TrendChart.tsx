"use client";

import { TrendingUp } from "lucide-react";
import { useId, useState } from "react";
import type { TendenciaPunto } from "@/modules/reportes/reportes.types";

interface TrendChartProps {
  data: TendenciaPunto[];
  className?: string;
}

const formatMoneda = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export function TrendChart({ data, className }: TrendChartProps) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return null;
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const minTotal = 0;

  // Dimensiones del canvas SVG
  const width = 800;
  const height = 260;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Coordenadas para cada punto
  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * chartWidth;
    const y =
      paddingTop + chartHeight - ((d.total - minTotal) / (maxTotal - minTotal)) * chartHeight;
    return { ...d, x, y };
  });

  // Generar path SVG para la línea y área
  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${
          points[0].x
        } ${paddingTop + chartHeight} Z`
      : "";

  return (
    <div
      className={`rounded-md border border-border bg-surface p-5 shadow-card ${
        className ?? ""
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-900" aria-hidden="true" />
          <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
            Evolución de Ventas
          </h3>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {data.length} {data.length === 1 ? "día con ventas" : "días con ventas"}
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] select-none"
          role="img"
          aria-label="Gráfico de tendencia de ventas"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#114F3C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#114F3C" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas de guía horizontales */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const val = minTotal + (maxTotal - minTotal) * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#DDD8C8"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-[#547066] text-[10px] font-mono font-medium"
                >
                  {formatMoneda(val)}
                </text>
              </g>
            );
          })}

          {/* Área sombreada */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* Línea principal */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#114F3C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Puntos y etiquetas */}
          {points.map((p, index) => {
            const isHovered = hoveredIndex === index;
            const formatoDia = p.fecha.slice(5); // MM-DD

            return (
              <g
                key={p.fecha}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Zona de hover invisible para fácil interacción táctil */}
                <rect
                  x={p.x - 20}
                  y={paddingTop}
                  width="40"
                  height={chartHeight + 10}
                  fill="transparent"
                />

                {/* Línea vertical activa en hover */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingTop}
                    x2={p.x}
                    y2={paddingTop + chartHeight}
                    stroke="#F9A900"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Círculo del punto */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  className="transition-all duration-150"
                  fill={isHovered ? "#F9A900" : "#114F3C"}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Etiqueta de fecha en el eje X */}
                <text
                  x={p.x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[11px] font-mono transition-colors ${
                    isHovered
                      ? "fill-[#114F3C] font-extrabold"
                      : "fill-[#547066] font-medium"
                  }`}
                >
                  {formatoDia}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip flotante en hover */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-2 shadow-card text-center"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${Math.max(10, (points[hoveredIndex].y / height) * 100 - 32)}%`,
            }}
          >
            <div className="text-[11px] font-extrabold uppercase text-text-secondary">
              {points[hoveredIndex].fecha}
            </div>
            <div className="font-mono text-sm font-extrabold text-brand-900 tabular-nums">
              {formatMoneda(points[hoveredIndex].total)}
            </div>
            <div className="text-[10px] font-semibold text-text-secondary">
              {points[hoveredIndex].operaciones}{" "}
              {points[hoveredIndex].operaciones === 1 ? "operación" : "operaciones"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
