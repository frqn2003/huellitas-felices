"use client";

import { useState } from "react";
import { Award, Medal, Trophy } from "lucide-react";
import type { SucursalRentabilidad } from "@/modules/rentabilidad/rentabilidad.types";

interface ProfitabilityRankingProps {
  ranking: SucursalRentabilidad[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProfitabilityRanking({ ranking }: ProfitabilityRankingProps) {
  const [criterio, setCriterio] = useState<"margen" | "ingresos">("margen");

  if (ranking.length === 0) return null;

  const listaOrdenada = [...ranking].sort((a, b) =>
    criterio === "margen" ? b.margenBruto - a.margenBruto : b.ingresos - a.ingresos,
  );

  const maxValor = Math.max(
    ...listaOrdenada.map((s) => (criterio === "margen" ? Math.max(s.margenBruto, 1) : s.ingresos)),
    1,
  );

  return (
    <div className="bg-surface-card rounded-card border border-border-card p-5 shadow-card h-full flex flex-col justify-between">
      {/* Header del Ranking y Toggle de Criterio */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-heading font-black text-base text-brand-900 uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-600" aria-hidden />
            Ranking de Sucursales
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Desempeño y orden de mérito de la red veterinaria
          </p>
        </div>

        {/* Criterio selector */}
        <div className="flex items-center gap-1 bg-cream-100 p-1 rounded-pill text-xs font-bold">
          <button
            type="button"
            onClick={() => setCriterio("margen")}
            className={`px-3 py-1 rounded-pill transition-all cursor-pointer ${
              criterio === "margen"
                ? "bg-brand-900 text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Por Margen Bruto
          </button>
          <button
            type="button"
            onClick={() => setCriterio("ingresos")}
            className={`px-3 py-1 rounded-pill transition-all cursor-pointer ${
              criterio === "ingresos"
                ? "bg-brand-900 text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Por Mayores Ingresos
          </button>
        </div>
      </div>

      {/* Lista del Ranking */}
      <div className="space-y-3">
        {listaOrdenada.map((suc, index) => {
          const valorActual = criterio === "margen" ? suc.margenBruto : suc.ingresos;
          const porcentajeBarra = Math.max(0, Math.min(100, (valorActual / maxValor) * 100));

          // Estilo de posición según el podio
          let badgeColor = "bg-cream-100 text-text-secondary border-border-card";
          let icon = null;

          if (index === 0) {
            badgeColor = "bg-amber-100 text-amber-900 border-amber-300 font-black";
            icon = <Trophy className="w-4 h-4 text-amber-600 shrink-0" />;
          } else if (index === 1) {
            badgeColor = "bg-slate-100 text-slate-800 border-slate-300 font-bold";
            icon = <Medal className="w-4 h-4 text-slate-500 shrink-0" />;
          } else if (index === 2) {
            badgeColor = "bg-amber-50 text-amber-950 border-amber-200 font-bold";
            icon = <Award className="w-4 h-4 text-amber-700 shrink-0" />;
          }

          return (
            <div
              key={suc.sucursalId}
              className="p-3.5 rounded-lg border border-border-card/80 bg-cream-50/40 hover:bg-cream-50 transition-all flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Posición y Nombre */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border text-xs ${badgeColor}`}
                  >
                    {icon || `#${index + 1}`}
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-text-primary">
                      {suc.nombre}
                    </h4>
                    <span className="text-[11px] text-text-tertiary">
                      Ventas: {formatMoney(suc.ingresos)} · Proveedores: {formatMoney(suc.egresosProveedores)} · Caja: {formatMoney(suc.egresosCaja)}
                    </span>
                  </div>
                </div>

                {/* Métricas destacadas */}
                <div className="text-right">
                  <div className="font-heading font-black text-sm text-brand-900">
                    {formatMoney(suc.margenBruto)}
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      suc.margenPorcentaje >= 0 ? "text-emerald-700" : "text-status-danger"
                    }`}
                  >
                    Margen: {suc.margenPorcentaje > 0 ? `+${suc.margenPorcentaje}%` : `${suc.margenPorcentaje}%`}
                  </span>
                </div>
              </div>

              {/* Barra de progreso visual */}
              <div className="w-full bg-cream-200/80 rounded-pill h-2 overflow-hidden">
                <div
                  className="bg-brand-900 h-full rounded-pill transition-all duration-500"
                  style={{ width: `${porcentajeBarra}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
