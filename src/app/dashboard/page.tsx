"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  RotateCcw,
  Search,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import {
  DashboardTabs,
  type TabDashboard,
} from "@/components/dashboard/DashboardTabs";
import { ReportesContent } from "@/components/reportes/ReportesContent";
import { ProfitabilityContent } from "@/components/rentabilidad/ProfitabilityContent";
import { HistorialPreciosDashboardContent } from "@/components/dashboard/HistorialPreciosDashboardContent";
import {
  FiltrosArticulos,
  type Filtros,
  type CatalogosFiltroArticulo,
} from "@/components/articulos/FiltrosArticulos";
import type { CatalogosArticulo } from "@/data/articulos";
import type { DashboardKPIs } from "@/modules/dashboard/dashboard.types";
import { apiGet, apiGetOpcional, mensajeDeError } from "@/lib/api-client";

interface Sucursal {
  id: number;
  nombre: string;
}

const INTERVALO_REFRESCO_MS = 30000; // 30 segundos

function ManagerialDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab activo derivado de la URL (?tab=reportes, ?tab=rentabilidad, ?tab=historial-precios o ?tab=indicadores)
  const tabParam = searchParams.get("tab");
  const tabActivo: TabDashboard =
    tabParam === "reportes"
      ? "reportes"
      : tabParam === "rentabilidad"
        ? "rentabilidad"
        : tabParam === "historial-precios"
          ? "historial-precios"
          : "indicadores";

  const handleTabChange = (nuevoTab: TabDashboard) => {
    if (nuevoTab === "indicadores") {
      router.push("/dashboard");
    } else if (nuevoTab === "rentabilidad") {
      router.push("/dashboard?tab=rentabilidad");
    } else if (nuevoTab === "historial-precios") {
      router.push("/dashboard?tab=historial-precios");
    } else {
      router.push("/dashboard?tab=reportes");
    }
  };

  const sucursalSelectId = useId();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");
  const [data, setData] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para búsqueda y filtro de precios (por encima de la línea horizontal)
  const [busquedaPrecios, setBusquedaPrecios] = useState("");
  const [filtrosPrecios, setFiltrosPrecios] = useState<Filtros>({
    categoria: "",
    estado: "Todos",
    unidadMedida: "",
    proveedorId: "",
  });
  const [categoriasPrecios, setCategoriasPrecios] = useState<CatalogosArticulo["categorias"]>([]);

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      if (cancelado) return;
      try {
        const cat = await apiGetOpcional<Partial<CatalogosArticulo>>(
          "/api/articulos/catalogos",
          {},
        );
        if (!cancelado) setCategoriasPrecios(cat.categorias ?? []);
      } catch {
        if (!cancelado) setCategoriasPrecios([]);
      }
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, []);

  const catalogosFiltroPrecios = useMemo<CatalogosFiltroArticulo>(
    () => ({
      categorias: categoriasPrecios,
      unidadesMedida: [],
      proveedores: [],
    }),
    [categoriasPrecios],
  );

  // Carga de catálogo de sucursales
  useEffect(() => {
    let cancelado = false;
    apiGetOpcional<Sucursal[]>("/api/sucursales", []).then((lista) => {
      if (!cancelado) {
        setSucursales(lista);
      }
    });
    return () => {
      cancelado = true;
    };
  }, []);

  // Carga de KPIs e intervalo cada 30s
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function ejecutar(esSilencioso = false) {
      if (esSilencioso) {
        setIsRefreshing(true);
      }
      try {
        const queryParam = sucursalSeleccionada
          ? `?sucursalId=${sucursalSeleccionada}`
          : "";
        const res = await apiGet<DashboardKPIs>(
          `/api/dashboard/kpis${queryParam}`,
        );
        if (cancelado) return;
        setData(res);
        setError(null);
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

    ejecutar(false);

    const intervalId = setInterval(() => {
      ejecutar(true);
    }, INTERVALO_REFRESCO_MS);

    return () => {
      cancelado = true;
      clearInterval(intervalId);
    };
  }, [sucursalSeleccionada, recargar]);

  // Cantidad de KPIs en alerta
  const totalAlertas = data
    ? [
      data.ventasDelDia.alerta,
      data.turnosDelDia.alerta,
      data.pacientesInternacion.alerta,
      data.articulosStockCritico.alerta,
    ].filter(Boolean).length
    : 0;

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col pb-12">
        {/* Header de la sección */}
        <header className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8 print:border-none print:px-0 print:py-2">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Gestión y Métricas
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Dashboard Gerencial
                </h1>
              </div>

              {/* Botón refrescar visible en la pestaña de Indicadores */}
              {tabActivo === "indicadores" && (
                <div className="flex flex-wrap items-center gap-3 print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRefreshing(true);
                      setRecargar((r) => r + 1);
                    }}
                    disabled={loading || isRefreshing}
                    aria-label="Actualizar datos del dashboard"
                  >
                    <RotateCcw
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                      aria-hidden="true"
                    />
                    <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Pestañas de Navegación del Dashboard */}
            <div className="mt-1 print:hidden">
              <DashboardTabs
                active={tabActivo}
                onChange={handleTabChange}
                disabled={loading && tabActivo === "indicadores"}
              />
            </div>

            {/* Buscador y filtro por encima de la línea horizontal (solo en pestaña Historial de Precios) */}
            {tabActivo === "historial-precios" && (
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center print:hidden">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={busquedaPrecios}
                    onChange={(e) => setBusquedaPrecios(e.target.value)}
                    placeholder="Buscar por código o nombre..."
                    aria-label="Buscar por código o nombre"
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </div>
                <FiltrosArticulos
                  filtros={filtrosPrecios}
                  onChange={setFiltrosPrecios}
                  catalogos={catalogosFiltroPrecios}
                  hideChips
                  grupos={["categoria", "estado"]}
                />
              </div>
            )}
          </div>
        </header>

        {/* Contenido principal según la pestaña activa */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 print:p-0">
          {tabActivo === "indicadores" ? (
            <>
              {/* Filtro principal de Sucursal para los KPIs del día */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Building2
                      className="h-5 w-5 text-brand-900 shrink-0"
                      aria-hidden="true"
                    />
                    <label
                      htmlFor={sucursalSelectId}
                      className="text-xs font-extrabold uppercase tracking-wider text-text-secondary"
                    >
                      Filtrar por Sucursal:
                    </label>
                  </div>

                  <select
                    id={sucursalSelectId}
                    value={sucursalSeleccionada}
                    onChange={(e) => {
                      setLoading(true);
                      setSucursalSeleccionada(e.target.value);
                    }}
                    disabled={loading}
                    aria-label="Seleccionar sucursal o consolidado"
                    className="h-11 cursor-pointer rounded-pill border border-border bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-900 shadow-sm transition-colors duration-fast ease-out hover:border-brand-900 focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Consolidado (Todas las sucursales)</option>
                    {sucursales.map((suc) => (
                      <option key={suc.id} value={suc.id}>
                        {suc.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-semibold text-text-secondary">
                  {sucursalSeleccionada
                    ? `Mostrando datos de ${sucursales.find(
                      (s) => s.id === Number(sucursalSeleccionada),
                    )?.nombre ?? "sucursal seleccionada"
                    }`
                    : "Mostrando datos consolidados de la red"}
                </span>
              </div>

              {/* Banner de estado / Alertas consolidadas */}
              {!loading && !error && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-4 shadow-card ${totalAlertas > 0
                      ? "border-status-danger/40 bg-status-danger/10 text-status-danger-strong"
                      : "border-status-success/30 bg-status-success/10 text-status-success-strong"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {totalAlertas > 0 ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-status-danger/20 text-status-danger-strong">
                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-status-success/20 text-status-success-strong">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}

                    <div>
                      <h2 className="text-sm font-extrabold uppercase tracking-wide">
                        {totalAlertas > 0
                          ? `${totalAlertas} ${totalAlertas === 1
                            ? "indicador requiere atención"
                            : "indicadores requieren atención"
                          }`
                          : "Operación normal"}
                      </h2>
                      <p className="text-xs font-medium opacity-90">
                        {totalAlertas > 0
                          ? "Hay indicadores que han superado los umbrales configurados para la jornada."
                          : "Todos los indicadores evaluados se encuentran dentro de los rangos esperados."}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs font-bold uppercase tracking-wider">
                    {sucursalSeleccionada ? "Vista Sucursal" : "Vista Consolidada"}
                  </div>
                </div>
              )}

              {/* Estado de error */}
              {error ? (
                <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                    <AlertTriangle
                      className="h-7 w-7 text-destructive"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                      No se pudieron cargar los datos del dashboard
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
              ) : (
                /* Grid de KPIs */
                <section aria-labelledby="kpi-grid-heading">
                  <h2 id="kpi-grid-heading" className="sr-only">
                    Indicadores Clave del Día
                  </h2>
                  <KPIGrid data={data} loading={loading} />
                </section>
              )}
            </>
          ) : tabActivo === "rentabilidad" ? (
            /* Rentabilidad por Sucursal */
            <ProfitabilityContent />
          ) : tabActivo === "reportes" ? (
            /* Módulo de Reportes de Ventas Integrado (HU-REP-02) */
            <ReportesContent />
          ) : (
            /* Consulta de Precios Históricos */
            <HistorialPreciosDashboardContent
              busqueda={busquedaPrecios}
              categoria={filtrosPrecios.categoria}
              estado={filtrosPrecios.estado}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function ManagerialDashboardPage() {
  return (
    <Suspense fallback={null}>
      <ManagerialDashboardContent />
    </Suspense>
  );
}
