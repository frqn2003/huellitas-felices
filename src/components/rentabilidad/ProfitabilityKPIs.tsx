"use client";

import {
  Building2,
  DollarSign,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { SucursalRentabilidad } from "@/modules/rentabilidad/rentabilidad.types";

interface ProfitabilityKPIsProps {
  sucursales: SucursalRentabilidad[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProfitabilityKPIs({ sucursales }: ProfitabilityKPIsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-black text-base text-brand-900 uppercase tracking-wide flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-700" aria-hidden />
          Indicadores de Rentabilidad por Sucursal
        </h3>
        <span className="text-xs text-text-secondary font-medium">
          {sucursales.length} {sucursales.length === 1 ? "sucursal evaluada" : "sucursales evaluadas"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {sucursales.map((suc) => {
          const isPositivo = suc.margenBruto >= 0;
          return (
            <div
              key={suc.sucursalId}
              className="bg-surface-card rounded-card border border-border-card p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center text-brand-900 font-bold text-sm">
                      {suc.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-heading font-bold text-base text-text-primary">
                        {suc.nombre}
                      </h4>
                      <p className="text-[11px] text-text-tertiary">
                        {suc.cantidadVentas} ventas · {suc.cantidadEgresosCaja} egresos caja ·{" "}
                        {suc.cantidadPagosProveedores} pagos proveedores
                      </p>
                    </div>
                  </div>

                  {/* Badge Margen % */}
                  <span
                    className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-pill text-xs font-black ${
                      isPositivo
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-status-danger border border-status-danger/30"
                    }`}
                  >
                    <Percent className="w-3 h-3" />
                    <span>
                      {suc.margenPorcentaje > 0
                        ? `+${suc.margenPorcentaje}%`
                        : `${suc.margenPorcentaje}%`}
                    </span>
                  </span>
                </div>

                {/* Métricas: Ingresos y Egresos con Desglose */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-cream-50/70 rounded-md border border-border-card/60 mb-3 text-xs">
                  {/* Ingresos por Ventas */}
                  <div>
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-text-secondary mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      <span>Ventas</span>
                    </div>
                    <div className="font-heading font-bold text-base text-text-primary">
                      {formatMoney(suc.ingresos)}
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      {suc.cantidadVentas} operaciones
                    </span>
                  </div>

                  {/* Egresos a Proveedores */}
                  <div>
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-text-secondary mb-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-amber-700" aria-hidden />
                      <span>Proveedores</span>
                    </div>
                    <div className="font-heading font-bold text-base text-text-primary">
                      {formatMoney(suc.egresosProveedores)}
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      {suc.cantidadPagosProveedores} pagos cta. cte.
                    </span>
                  </div>

                  {/* Egresos Operativos de Caja */}
                  <div>
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-text-secondary mb-1">
                      <Receipt className="w-3.5 h-3.5 text-status-danger" aria-hidden />
                      <span>Caja Chica</span>
                    </div>
                    <div className="font-heading font-bold text-base text-text-primary">
                      {formatMoney(suc.egresosCaja)}
                    </div>
                    <span className="text-[10px] text-text-tertiary">
                      {suc.cantidadEgresosCaja} egresos caja
                    </span>
                  </div>
                </div>
              </div>

              {/* Pie de la tarjeta: Total Egresos y Margen Bruto */}
              <div className="pt-3 border-t border-border-card flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <TrendingDown className="w-4 h-4 text-status-danger" />
                  <span>Total Egresos:</span>
                  <span className="font-bold text-text-primary">{formatMoney(suc.egresos)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-brand-700" />
                    Margen Bruto:
                  </span>
                  <span
                    className={`font-heading font-black text-base ${
                      isPositivo ? "text-brand-900" : "text-status-danger"
                    }`}
                  >
                    {formatMoney(suc.margenBruto)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
