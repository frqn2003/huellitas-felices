"use client";

import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  ReportFilters,
  type ReportFiltersValues,
} from "./ReportFilters";
import { ReportResults } from "./ReportResults";
import type { ReporteVentasResultado } from "@/modules/reportes/reportes.types";
import { apiGet, apiGetOpcional, mensajeDeError } from "@/lib/api-client";

interface Sucursal {
  id: number;
  nombre: string;
}

interface Categoria {
  id: number;
  nombre: string;
}

interface CatalogosArticulo {
  categorias: Categoria[];
}

export function ReportesContent() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Fechas iniciales: mes corriente
  const hoyStr = new Date().toISOString().slice(0, 10);
  const inicioMesStr = `${hoyStr.slice(0, 7)}-01`;

  const [filtros, setFiltros] = useState<ReportFiltersValues>({
    desde: inicioMesStr,
    hasta: hoyStr,
    sucursalId: "",
    categoriaId: "",
  });

  const [resultado, setResultado] = useState<ReporteVentasResultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recargar, setRecargar] = useState(0);
  const hasLoadedRef = useRef(false);

  // Carga de catálogos
  useEffect(() => {
    let cancelado = false;

    Promise.all([
      apiGetOpcional<Sucursal[]>("/api/sucursales", []),
      apiGetOpcional<CatalogosArticulo>("/api/articulos/catalogos", {
        categorias: [],
      }),
    ]).then(([listaSucursales, cats]) => {
      if (cancelado) return;
      setSucursales(listaSucursales);
      const listaCats = cats.categorias ?? [];
      const tieneServicios = listaCats.some((c) =>
        c.nombre.toLowerCase().includes("servicio"),
      );
      setCategorias(
        tieneServicios
          ? listaCats
          : [...listaCats, { id: 3, nombre: "Servicios" }],
      );
    });

    return () => {
      cancelado = true;
    };
  }, []);

  // Carga automática del reporte ante cualquier cambio de filtros o recarga
  useEffect(() => {
    let cancelado = false;

    async function cargarReporte() {
      if (hasLoadedRef.current) {
        setIsRefreshing(true);
      }
      try {
        const sp = new URLSearchParams();
        sp.set("desde", filtros.desde);
        sp.set("hasta", filtros.hasta);
        if (filtros.sucursalId) sp.set("sucursalId", filtros.sucursalId);
        if (filtros.categoriaId) sp.set("categoriaId", filtros.categoriaId);

        const res = await apiGet<ReporteVentasResultado>(
          `/api/reportes/ventas?${sp.toString()}`,
        );
        if (cancelado) return;
        setResultado(res);
        setError(null);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelado) return;
        setError(mensajeDeError(err));
      } finally {
        if (!cancelado) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    cargarReporte();

    return () => {
      cancelado = true;
    };
  }, [filtros, recargar]);

  const sinDatos =
    !loading && !error && resultado !== null && resultado.filas.length === 0;
  const conDatos =
    !loading && !error && resultado !== null && resultado.filas.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Filtros con actualización reactiva inmediata */}
      <div className="print:hidden">
        <ReportFilters
          filtros={filtros}
          sucursales={sucursales}
          categorias={categorias}
          loading={loading || isRefreshing}
          onChange={(nuevosFiltros) => {
            setFiltros(nuevosFiltros);
          }}
        />
      </div>

      {/* Indicador de refresco en progreso */}
      {isRefreshing && (
        <div className="flex items-center justify-end print:hidden">
          <span className="inline-flex items-center gap-2 rounded-pill bg-cream-100 px-3 py-1 text-xs font-bold text-brand-900">
            <span className="h-2 w-2 animate-ping rounded-pill bg-brand-900" />
            Actualizando datos...
          </span>
        </div>
      )}

      {/* Estado de carga inicial */}
      {loading && !resultado && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface py-16 shadow-card"
          aria-busy="true"
          aria-label="Cargando reporte de ventas"
        >
          <div className="h-8 w-8 animate-spin rounded-pill border-4 border-brand-900/20 border-t-brand-900" />
          <p className="font-display text-sm font-extrabold uppercase tracking-wide text-brand-900">
            Cargando reporte de ventas...
          </p>
        </div>
      )}

      {/* Estado de error */}
      {error && !loading && (
        <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
              No se pudo obtener el reporte
            </h2>
            <p className="max-w-md text-sm text-text-secondary">{error}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setLoading(true);
              setRecargar((r) => r + 1);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      {/* Estado sin datos (Requerido: "Sin datos para los filtros seleccionados") */}
      {sinDatos && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card"
          role="status"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-cream-100 text-brand-900">
            <Inbox className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
              Sin datos para los filtros seleccionados
            </h2>
            <p className="max-w-md text-sm text-text-secondary">
              No se encontraron ventas registradas en el período y parámetros indicados.
              Intentá seleccionando otro rango de fechas o modificando la sucursal y categoría.
            </p>
          </div>
        </div>
      )}

      {/* Resultados generados */}
      {conDatos && resultado && (
        <ReportResults
          resultado={resultado}
          desde={filtros.desde}
          hasta={filtros.hasta}
        />
      )}
    </div>
  );
}
