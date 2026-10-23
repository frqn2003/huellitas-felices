"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Layers,
  Loader2,
} from "lucide-react";
import type {
  EvolucionRentabilidadResponse,
  MesEvolucionRentabilidad,
  SucursalRentabilidad,
} from "@/modules/rentabilidad/rentabilidad.types";
import { apiGet, mensajeDeError } from "@/lib/api-client";

interface ProfitabilityAccumulatedBarChartProps {
  sucursales: SucursalRentabilidad[];
  desde?: string;
  hasta?: string;
}

type ModoVisualizacion = "meses" | "acumulado" | "total";

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

export function ProfitabilityAccumulatedBarChart({
  sucursales,
  desde = "",
  hasta = "",
}: ProfitabilityAccumulatedBarChartProps) {
  const chartId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Selector de sucursal independiente para este gráfico
  const [selectedSucursalId, setSelectedSucursalId] = useState<number>(() => {
    return sucursales[0]?.sucursalId ?? 1;
  });

  // Modo de visualización:
  // - "meses": desglose mensual mes a mes
  // - "acumulado": evolución acumulada progresiva (detenida en el mes actual)
  // - "total": total acumulado consolidado del período (2 barras apiladas de la sucursal)
  const [modoVisualizacion, setModoVisualizacion] = useState<ModoVisualizacion>("meses");

  // Estado de carga y datos provenientes directamente del backend Postgres
  const [backendMeses, setBackendMeses] = useState<MesEvolucionRentabilidad[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorBackend, setErrorBackend] = useState<string | null>(null);

  // Sucursal actualmente seleccionada
  const sucursalActiva = useMemo(() => {
    return (
      sucursales.find((s) => s.sucursalId === selectedSucursalId) ||
      sucursales[0] ||
      null
    );
  }, [sucursales, selectedSucursalId]);

  // Carga reactiva de datos reales desde el backend
  useEffect(() => {
    if (!selectedSucursalId || !desde || !hasta) return;
    let cancelado = false;

    const queryParams = new URLSearchParams({
      sucursalId: String(selectedSucursalId),
      desde,
      hasta,
    });

    const timer = setTimeout(() => {
      if (cancelado) return;
      setIsLoading(true);
      setErrorBackend(null);

      apiGet<EvolucionRentabilidadResponse>(
        `/api/dashboard/rentabilidad/evolucion?${queryParams.toString()}`,
      )
        .then((res) => {
          if (!cancelado) {
            setBackendMeses(res.meses);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelado) {
            setErrorBackend(mensajeDeError(err));
            setIsLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [selectedSucursalId, desde, hasta]);

  // Serie temporal activa (usa la devuelta por el backend SQL)
  const datosTemporales = useMemo(() => backendMeses ?? [], [backendMeses]);

  // Totales consolidados de la serie temporal activa
  const totales = useMemo(() => {
    const totIngresos = datosTemporales.reduce((acc, m) => acc + m.ingresos, 0);
    const totProveedores = datosTemporales.reduce(
      (acc, m) => acc + m.egresosProveedores,
      0,
    );
    const totCaja = datosTemporales.reduce((acc, m) => acc + m.egresosCaja, 0);
    const totEgresos = totProveedores + totCaja;
    const totMargen = totIngresos - totEgresos;
    const pctMargen =
      totIngresos > 0
        ? Number(((totMargen / totIngresos) * 100).toFixed(2))
        : totEgresos > 0
          ? -100
          : 0;

    return {
      ingresos: totIngresos,
      egresosProveedores: totProveedores,
      egresosCaja: totCaja,
      egresosTotal: totEgresos,
      margenBruto: totMargen,
      margenPorcentaje: pctMargen,
    };
  }, [datosTemporales]);

  if (!sucursalActiva) return null;

  // Dimensiones del SVG
  const width = 1000;
  const height = 380;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determinar el valor máximo para la escala Y según el modo activo
  const maxMonto =
    modoVisualizacion === "total"
      ? Math.max(totales.ingresos, totales.egresosTotal, 10000)
      : Math.max(
          ...datosTemporales.map((d) =>
            modoVisualizacion === "acumulado"
              ? Math.max(d.acumIngresos, d.acumEgresosTotal)
              : Math.max(d.ingresos, d.egresosTotal),
          ),
          10000,
        );

  const stepMagnitude = Math.pow(10, Math.floor(Math.log10(maxMonto)));
  const yMax = Math.ceil(maxMonto / stepMagnitude) * stepMagnitude;
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  // Ancho de barras para vista mensual o acumulada
  const groupWidth =
    datosTemporales.length > 0 ? chartWidth / datosTemporales.length : chartWidth;
  const barWidth = Math.min(32, Math.max(16, (groupWidth * 0.65) / 2));
  const barGap = 6;

  // Ancho de barras para vista total consolidada (separadas adecuadamente para que no se solapen sus textos)
  const totalBarWidth = 72;
  const totalBarGap = 110;

  const hoveredData = hoveredIndex !== null ? datosTemporales[hoveredIndex] : null;

  return (
    <div className="bg-surface-card rounded-card border border-border-card p-5 shadow-card w-full flex flex-col justify-between">
      {/* Cabecera del Gráfico con Selector de Sucursal y Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-brand-50 text-brand-900 border border-brand-200/50">
              <Layers className="w-4 h-4 text-brand-800" aria-hidden />
            </span>
            <h3 className="font-heading font-black text-base text-brand-900 uppercase tracking-wide">
              Comparativa Temporal Acumulada: Ingresos vs. Egresos
            </h3>
            {isLoading && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/60 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                Actualizando datos...
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Evolución periódica y comparativa de ingresos vs. egresos
          </p>
        </div>

        {/* Controles: Selector de Sucursal exclusivo + Toggle de modos */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Sucursal propio e independiente */}
          <div className="flex items-center gap-1.5 bg-cream-50/80 border border-border-card px-2.5 py-1 rounded-sm shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-brand-700" aria-hidden />
            <label
              htmlFor={`${chartId}-select-sucursal`}
              className="text-xs font-bold text-text-secondary uppercase tracking-wider"
            >
              Sucursal:
            </label>
            <select
              id={`${chartId}-select-sucursal`}
              value={selectedSucursalId}
              onChange={(e) => setSelectedSucursalId(Number(e.target.value))}
              aria-label="Seleccionar sucursal para la comparativa temporal"
              className="bg-transparent text-xs font-extrabold text-brand-900 focus:outline-none cursor-pointer py-0.5 pr-1"
            >
              {sucursales.map((suc) => (
                <option key={suc.sucursalId} value={suc.sucursalId} className="bg-surface text-text-primary">
                  {suc.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Modos: Mes a Mes / Acumulado Progresivo / Total Período */}
          <div
            role="group"
            aria-label="Modo de visualización temporal"
            className="flex items-center bg-cream-100 p-0.5 rounded-sm border border-border/70 text-xs font-bold"
          >
            <button
              type="button"
              onClick={() => setModoVisualizacion("meses")}
              className={`px-3 py-1 rounded-xs transition-colors duration-fast ${
                modoVisualizacion === "meses"
                  ? "bg-brand-900 text-cream-50 shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Mes a Mes
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacion("acumulado")}
              className={`px-3 py-1 rounded-xs transition-colors duration-fast ${
                modoVisualizacion === "acumulado"
                  ? "bg-brand-900 text-cream-50 shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Acumulado Progresivo
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacion("total")}
              className={`px-3 py-1 rounded-xs transition-colors duration-fast ${
                modoVisualizacion === "total"
                  ? "bg-brand-900 text-cream-50 shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Total Período
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {errorBackend && (
        <div
          role="alert"
          className="p-3 mb-3 rounded-card bg-red-50 border border-status-danger/30 text-status-danger text-xs font-semibold"
        >
          {errorBackend}
        </div>
      )}

      {/* Leyenda de Conceptos */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-1">
        <div className="text-xs text-text-secondary flex items-center gap-1.5 font-semibold">
          <Calendar className="w-3.5 h-3.5 text-brand-700" aria-hidden />
          <span>
            {datosTemporales.length > 0 ? (
              <>
                Mostrando período de{" "}
                <strong className="text-brand-900">
                  {datosTemporales[0]?.mesCompleto}
                </strong>{" "}
                a{" "}
                <strong className="text-brand-900">
                  {datosTemporales[datosTemporales.length - 1]?.mesCompleto}
                </strong>
              </>
            ) : (
              <span>Cargando serie temporal...</span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#114F3C]" aria-hidden />
            <span className="text-text-primary">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#E06D53]" aria-hidden />
            <span className="text-text-primary">Egresos</span>
          </div>
        </div>
      </div>

      {/* Área del Gráfico SVG */}
      <div className="relative w-full flex-1 flex flex-col justify-end overflow-x-auto min-h-[300px]">
        {datosTemporales.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-text-secondary">
            <p className="text-sm font-bold text-text-primary">
              Sin datos registrados para el rango seleccionado
            </p>
            <p className="text-xs mt-1">
              Probá ampliando el rango de fechas en la barra superior.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[700px] select-none"
            role="img"
            aria-labelledby={`${chartId}-title`}
          >
            <title id={`${chartId}-title`}>
              Gráfico de barras acumuladas de ingresos y egresos para {sucursalActiva.nombre}
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
                    x={paddingLeft - 10}
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

            {/* VISTA 1: TOTAL CONSOLIDADO DEL PERÍODO (2 BARRAS) */}
            {modoVisualizacion === "total" && (
              <g>
                {(() => {
                  const centerX = paddingLeft + chartWidth / 2;
                  const xIngreso = centerX - totalBarWidth - totalBarGap / 2;
                  const xEgreso = centerX + totalBarGap / 2;

                  const hIngreso = yMax > 0 ? (totales.ingresos / yMax) * chartHeight : 0;
                  const hEgreso = yMax > 0 ? (totales.egresosTotal / yMax) * chartHeight : 0;

                  const yIngreso = paddingTop + chartHeight - hIngreso;
                  const yEgreso = paddingTop + chartHeight - hEgreso;

                  return (
                    <>
                      {/* Barra de Ingreso Total */}
                      <g>
                        <rect
                          x={xIngreso}
                          y={yIngreso}
                          width={totalBarWidth}
                          height={Math.max(hIngreso, 2)}
                          rx="4"
                          fill="#114F3C"
                          className="transition-all duration-300"
                        />
                        {/* Etiqueta de monto sobre la barra */}
                        <text
                          x={xIngreso + totalBarWidth / 2}
                          y={yIngreso - 8}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="800"
                          fill="#114F3C"
                        >
                          {formatCompactMoney(totales.ingresos)}
                        </text>
                        {/* Etiqueta Eje X */}
                        <text
                          x={xIngreso + totalBarWidth / 2}
                          y={height - paddingBottom + 22}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="700"
                          fill="#114F3C"
                        >
                          Ingresos
                        </text>
                      </g>

                      {/* Barra de Egresos Totales */}
                      <g>
                        <rect
                          x={xEgreso}
                          y={yEgreso}
                          width={totalBarWidth}
                          height={Math.max(hEgreso, 2)}
                          rx="4"
                          fill="#E06D53"
                          className="transition-all duration-300"
                        />
                        {/* Etiqueta de monto sobre la barra */}
                        <text
                          x={xEgreso + totalBarWidth / 2}
                          y={yEgreso - 8}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="800"
                          fill="#E06D53"
                        >
                          {formatCompactMoney(totales.egresosTotal)}
                        </text>
                        {/* Etiqueta Eje X */}
                        <text
                          x={xEgreso + totalBarWidth / 2}
                          y={height - paddingBottom + 22}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="700"
                          fill="#4A4036"
                        >
                          Egresos
                        </text>
                      </g>
                    </>
                  );
                })()}
              </g>
            )}

            {/* VISTA 2: MENSUAL O ACUMULADO PROGRESIVO POR PERÍODO */}
            {modoVisualizacion !== "total" &&
              datosTemporales.map((item, idx) => {
                const groupCenterX = paddingLeft + idx * groupWidth + groupWidth / 2;
                const xIngreso = groupCenterX - barWidth - barGap / 2;
                const xEgreso = groupCenterX + barGap / 2;

                // En modo acumulado progresivo, si el mes es futuro o posterior al mes actual,
                // no se proyectan barras acumuladas repetidas
                const esFuturoOInactivo =
                  modoVisualizacion === "acumulado" && Boolean(item.esFuturo);

                const valIngreso = esFuturoOInactivo
                  ? 0
                  : modoVisualizacion === "acumulado"
                    ? item.acumIngresos
                    : item.ingresos;

                const valEgreso = esFuturoOInactivo
                  ? 0
                  : modoVisualizacion === "acumulado"
                    ? item.acumEgresosTotal
                    : item.egresosTotal;

                // Alturas relativas a yMax
                const hIngreso = yMax > 0 && valIngreso > 0 ? (valIngreso / yMax) * chartHeight : 0;
                const hEgreso = yMax > 0 && valEgreso > 0 ? (valEgreso / yMax) * chartHeight : 0;

                const yIngreso = paddingTop + chartHeight - hIngreso;
                const yEgreso = paddingTop + chartHeight - hEgreso;

                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.mesCompleto}: Ingresos ${formatMoney(valIngreso)}, Egresos ${formatMoney(valEgreso)}`}
                    onFocus={() => setHoveredIndex(idx)}
                    onBlur={() => setHoveredIndex(null)}
                  >
                    {/* Zona reactiva transparente al hover */}
                    <rect
                      x={paddingLeft + idx * groupWidth + 2}
                      y={paddingTop}
                      width={groupWidth - 4}
                      height={chartHeight}
                      fill={isHovered ? "#114F3C" : "transparent"}
                      fillOpacity={isHovered ? 0.04 : 0}
                      rx="6"
                    />

                    {/* Barra de Ingreso (Ventas) */}
                    {hIngreso > 0 && (
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
                    )}

                    {/* Barra de Egresos */}
                    {hEgreso > 0 && (
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
                    )}

                    {/* Etiqueta de Mes en el Eje X */}
                    <text
                      x={groupCenterX}
                      y={height - paddingBottom + 20}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight={isHovered ? "700" : "600"}
                      fill={isHovered ? "#114F3C" : item.esFuturo ? "#9C9284" : "#4A4036"}
                      fontFamily="inherit"
                    >
                      {item.mesLabel}
                    </text>
                  </g>
                );
              })}
          </svg>
        )}

        {/* Tooltip flotante interactivo */}
        {hoveredData && hoveredIndex !== null && modoVisualizacion !== "total" && (
          <div className="absolute top-2 right-3 pointer-events-none bg-brand-900 text-cream-50 p-3.5 rounded-lg shadow-lg text-xs z-10 border border-brand-800 animate-in fade-in duration-150 min-w-[220px]">
            <div className="font-heading font-black text-sm text-accent-500 mb-1 border-b border-brand-800 pb-1 flex justify-between items-center">
              <span>{hoveredData.mesCompleto}</span>
              <span className="text-[10px] text-cream-200 uppercase font-sans font-normal">
                {modoVisualizacion === "acumulado" ? "Acumulado" : "Mensual"}
              </span>
            </div>

            {hoveredData.esFuturo && modoVisualizacion === "acumulado" ? (
              <div className="py-1 text-cream-200 text-center">
                <span className="italic">Mes sin operaciones (período futuro)</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-cream-200">Ingresos:</span>
                  <span className="font-bold text-white">
                    {formatMoney(
                      modoVisualizacion === "acumulado"
                        ? hoveredData.acumIngresos
                        : hoveredData.ingresos,
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-cream-200">Egresos:</span>
                  <span className="font-bold text-[#FFAAA0]">
                    {formatMoney(
                      modoVisualizacion === "acumulado"
                        ? hoveredData.acumEgresosTotal
                        : hoveredData.egresosTotal,
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-brand-800 mt-1 font-bold">
                  <span className="text-accent-500">Margen Bruto:</span>
                  <span
                    className={
                      (modoVisualizacion === "acumulado"
                        ? hoveredData.acumMargenBruto
                        : hoveredData.margenBruto) >= 0
                        ? "text-emerald-400"
                        : "text-status-danger"
                    }
                  >
                    {formatMoney(
                      modoVisualizacion === "acumulado"
                        ? hoveredData.acumMargenBruto
                        : hoveredData.margenBruto,
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Resumen de totales reales de la sucursal seleccionada */}
      <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-cream-50 p-2.5 rounded-sm border border-border-card/60">
          <span className="text-text-tertiary block text-[10px] uppercase font-bold tracking-wider">
            Total Ingresos ({sucursalActiva.nombre})
          </span>
          <span className="font-heading font-black text-sm text-brand-900">
            {formatMoney(totales.ingresos)}
          </span>
        </div>

        <div className="bg-cream-50 p-2.5 rounded-sm border border-border-card/60">
          <span className="text-text-tertiary block text-[10px] uppercase font-bold tracking-wider">
            Total Egresos
          </span>
          <span className="font-heading font-black text-sm text-[#E06D53]">
            {formatMoney(totales.egresosTotal)}
          </span>
        </div>

        <div className="bg-cream-50 p-2.5 rounded-sm border border-border-card/60">
          <span className="text-text-tertiary block text-[10px] uppercase font-bold tracking-wider">
            Margen Bruto Sucursal
          </span>
          <span
            className={`font-heading font-black text-sm ${
              totales.margenBruto >= 0 ? "text-emerald-800" : "text-status-danger"
            }`}
          >
            {formatMoney(totales.margenBruto)} ({totales.margenPorcentaje}%)
          </span>
        </div>
      </div>
    </div>
  );
}
