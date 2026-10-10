"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RentabilidadResumen } from "@/modules/rentabilidad/rentabilidad.types";
import { ProfitabilityFilters, type SucursalOpcion } from "./ProfitabilityFilters";
import { ProfitabilityResults } from "./ProfitabilityResults";

function getPrimerDiaMes(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function getHoy(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ProfitabilityContent() {
  const [desde, setDesde] = useState(getPrimerDiaMes);
  const [hasta, setHasta] = useState(getHoy);
  const [sucursalesIds, setSucursalesIds] = useState<number[]>([]);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState<SucursalOpcion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RentabilidadResumen | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const initialLoadedRef = useRef(false);

  // 1. Cargar catálogo de sucursales
  useEffect(() => {
    let cancelled = false;
    async function cargarSucursales() {
      try {
        const res = await fetch("/api/sucursales");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setSucursalesDisponibles(data);
        }
      } catch (err) {
        console.error("Error al cargar sucursales:", err);
      }
    }
    cargarSucursales();
    return () => {
      cancelled = true;
    };
  }, []);

  // Validación estricta del rango de fechas
  const validarPeriodo = useCallback((d: string, h: string): string | null => {
    if (!d || !h) {
      return "El rango de fechas no puede estar incompleto.";
    }
    if (d > h) {
      return "La fecha de inicio no puede ser posterior a la fecha de fin.";
    }
    return null;
  }, []);

  // Ejecutar consulta al backend
  const ejecutarConsulta = useCallback(
    async (d: string, h: string, sucs: number[]) => {
      const error = validarPeriodo(d, h);
      if (error) {
        setErrorPeriodo(error);
        return;
      }

      setErrorPeriodo(null);
      setErrorGlobal(null);
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          desde: d,
          hasta: h,
        });
        if (sucs.length > 0) {
          params.set("sucursales", sucs.join(","));
        }

        const res = await fetch(`/api/dashboard/rentabilidad?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.mensaje || "Error al consultar la rentabilidad.");
        }

        const data: RentabilidadResumen = await res.json();
        setResultado(data);
      } catch (err) {
        console.error("Error al obtener rentabilidad:", err);
        setErrorGlobal(err instanceof Error ? err.message : "Error inesperado al consultar datos.");
      } finally {
        setIsLoading(false);
      }
    },
    [validarPeriodo],
  );

  // Carga inicial automática en el primer render
  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      ejecutarConsulta(desde, hasta, sucursalesIds);
    }
  }, [desde, hasta, sucursalesIds, ejecutarConsulta]);

  // Manejo de cambios en el selector de fechas
  const handleDesdeChange = (v: string) => {
    setDesde(v);
    if (errorPeriodo) {
      setErrorPeriodo(validarPeriodo(v, hasta));
    }
  };

  const handleHastaChange = (v: string) => {
    setHasta(v);
    if (errorPeriodo) {
      setErrorPeriodo(validarPeriodo(desde, v));
    }
  };

  // Toggle individual de sucursal
  const handleToggleSucursal = (id: number) => {
    setSucursalesIds((prev) => {
      if (prev.length === 0) {
        // Estaban todas implícitamente seleccionadas: al desmarcar una, quedan las otras
        const todasMenosEsta = sucursalesDisponibles.map((s) => s.id).filter((sId) => sId !== id);
        return todasMenosEsta;
      }
      if (prev.includes(id)) {
        return prev.filter((sId) => sId !== id);
      }
      const nuevo = [...prev, id];
      // Si ahora están todas, volvemos a vacío (que representa todas)
      if (nuevo.length === sucursalesDisponibles.length) {
        return [];
      }
      return nuevo;
    });
  };

  const handleSelectAllSucursales = () => {
    setSucursalesIds([]);
  };

  const handleClearSucursales = () => {
    setSucursalesIds([-1]); // Ninguna seleccionada
  };

  const handleResetFiltros = () => {
    const d = getPrimerDiaMes();
    const h = getHoy();
    setDesde(d);
    setHasta(h);
    setSucursalesIds([]);
    setErrorPeriodo(null);
    ejecutarConsulta(d, h, []);
  };

  const handleConsultar = () => {
    ejecutarConsulta(desde, hasta, sucursalesIds);
  };

  return (
    <section aria-labelledby="seccion-rentabilidad-title" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2
            id="seccion-rentabilidad-title"
            className="font-heading font-black text-xl text-brand-900 tracking-tight"
          >
            Rentabilidad por Sucursal
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Análisis consolidado de ingresos, egresos de caja y margen bruto operativo
          </p>
        </div>
      </div>

      {/* Filtros de la sección */}
      <ProfitabilityFilters
        desde={desde}
        hasta={hasta}
        sucursalesIds={sucursalesIds}
        sucursalesDisponibles={sucursalesDisponibles}
        isLoading={isLoading}
        errorPeriodo={errorPeriodo}
        onDesdeChange={handleDesdeChange}
        onHastaChange={handleHastaChange}
        onToggleSucursal={handleToggleSucursal}
        onSelectAllSucursales={handleSelectAllSucursales}
        onClearSucursales={handleClearSucursales}
        onConsultar={handleConsultar}
        onResetFiltros={handleResetFiltros}
      />

      {/* Error Global */}
      {errorGlobal && (
        <div
          role="alert"
          className="p-4 rounded-card bg-red-50 border border-status-danger/30 text-status-danger text-sm font-semibold"
        >
          {errorGlobal}
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <div className="bg-surface-card rounded-card border border-border-card p-12 text-center shadow-card flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-heading font-bold text-sm text-brand-900">
            Consultando rentabilidad por sucursal...
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Calculando ingresos, egresos y márgenes operativos
          </p>
        </div>
      )}

      {/* Resultados de rentabilidad */}
      {!isLoading && (
        <ProfitabilityResults resultado={resultado} desde={desde} hasta={hasta} />
      )}
    </section>
  );
}
