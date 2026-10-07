"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Lock,
  Plus,
  Receipt,
  RotateCcw,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { MovimientosCajaTable } from "@/components/cajas/MovimientosCajaTable";
import { ResumenCaja } from "@/components/cajas/ResumenCaja";
import { MovimientoCajaFormModal } from "@/components/cajas/MovimientoCajaFormModal";
import { CerrarCajaModal } from "@/components/cajas/CerrarCajaModal";
import { EstadoCajaBadge } from "@/components/cajas/EstadoCajaBadge";
import type { CajaApertura, MovimientoCaja, TipoMovimientoCaja } from "@/data/cajas";
import { ApiError, apiGet, apiSend, mensajeDeError } from "@/lib/api-client";

export default function CajaDetallePage() {
  const params = useParams<{ aperturaId: string }>();
  const aperturaId = Number(params.aperturaId);
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recargar, setRecargar] = useState(0);

  const [apertura, setApertura] = useState<CajaApertura | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "Ingreso" | "Egreso">("todos");
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "venta" | "manual">("todos");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [nuevoMovOpen, setNuevoMovOpen] = useState(false);
  const [cerrarCajaOpen, setCerrarCajaOpen] = useState(false);

  useEffect(() => {
    let cancelado = false;
    // `loading` arranca en true y el retry lo setea desde el handler: el effect
    // solo resuelve el resultado (regla react-hooks/set-state-in-effect).
    const t = setTimeout(async () => {
      if (cancelado) return;
      try {
        // Apertura (con caja, sucursal y cajero) + TODOS sus movimientos: el
        // esperado se calcula sobre el total, no sobre la página visible.
        const [ap, movs] = await Promise.all([
          apiGet<CajaApertura>(`/api/cajas/aperturas/${aperturaId}`),
          apiGet<MovimientoCaja[]>(`/api/cajas/aperturas/${aperturaId}/movimientos`),
        ]);
        if (cancelado) return;
        setApertura(ap);
        setMovimientos(movs);
        setError(false);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof ApiError && e.status === 404) {
          setApertura(null); // la pantalla ya tiene su estado "no encontrada"
          setMovimientos([]);
          setError(false);
        } else {
          setError(true);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [aperturaId, recargar]);

  const abierto = apertura?.estado === true;

  // `movimientos` ya viene filtrado por apertura, así que alcanza con sumar.
  const ingresos = movimientos.reduce((acc, m) => (m.tipo === "Ingreso" ? acc + m.monto : acc), 0);
  const egresos = movimientos.reduce((acc, m) => (m.tipo === "Egreso" ? acc + m.monto : acc), 0);

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      const matchBusqueda =
        !q ||
        m.motivo.toLowerCase().includes(q) ||
        String(m.id).includes(q) ||
        (m.ventaId !== null && String(m.ventaId).includes(q));

      const matchTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
      const matchOrigen =
        filtroOrigen === "todos" ||
        (filtroOrigen === "venta" && m.ventaId !== null) ||
        (filtroOrigen === "manual" && m.ventaId === null);

      return matchBusqueda && matchTipo && matchOrigen;
    });
  }, [movimientos, busqueda, filtroTipo, filtroOrigen]);

  const totalPages = Math.max(1, Math.ceil(movimientosFiltrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = movimientosFiltrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = movimientosFiltrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, movimientosFiltrados.length);

  const hasActiveFilters = busqueda.trim() !== "" || filtroTipo !== "todos" || filtroOrigen !== "todos";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroTipo("todos");
    setFiltroOrigen("todos");
    setPage(1);
  };

  const handleRegistrarMovimiento = async (data: {
    tipo: TipoMovimientoCaja;
    monto: number;
    motivo: string;
  }) => {
    if (!apertura) return;
    try {
      // El usuario responsable es el de la sesión. El saldo lo actualiza la base.
      const nuevo = await apiSend<MovimientoCaja>(
        "POST",
        `/api/cajas/aperturas/${apertura.id}/movimientos`,
        data,
      );
      setMovimientos((prev) => [...prev, nuevo]);
      setNuevoMovOpen(false);
      showToast("success", "Movimiento registrado");
      setPage(1);
    } catch (e) {
      showToast("error", mensajeDeError(e));
    }
  };

  const handleCerrarCaja = async (montoContado: number) => {
    if (!apertura) return;
    try {
      // La base calcula el esperado (inicial + ingresos − egresos) y la API la diferencia.
      const cerrada = await apiSend<CajaApertura>(
        "PATCH",
        `/api/cajas/aperturas/${apertura.id}/cerrar`,
        { montoContado },
      );
      setApertura(cerrada);
      setCerrarCajaOpen(false);
      showToast("success", "Caja cerrada correctamente");
    } catch (e) {
      showToast("error", mensajeDeError(e));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-cream-50">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="border-b border-border bg-cream-50 px-4 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/clientes?tab=cajas")}
                className="gap-2 font-bold"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a Cajas
              </Button>
              <div className="h-7 w-48 animate-pulse rounded bg-cream-100" />
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
            <div className="h-32 w-full animate-pulse rounded-md bg-cream-100" />
            <div className="h-64 w-full animate-pulse rounded-md bg-cream-100" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !apertura) {
    return (
      <div className="flex min-h-screen bg-cream-50">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="border-b border-border bg-cream-50 px-4 py-4 sm:px-8">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/clientes?tab=cajas")}
                className="gap-2 font-bold"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a Cajas
              </Button>
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
                Detalle de caja
              </h1>
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-12 sm:px-8">
            <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-status-danger/10">
                <AlertTriangle className="h-7 w-7 text-status-danger-strong" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                  No se pudo cargar el detalle
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  {error
                    ? "Hubo un problema al consultar la caja. Revisá tu conexión e intentá de nuevo."
                    : "No encontramos la apertura de caja solicitada."}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError(false);
                    setLoading(true);
                    setRecargar((n) => n + 1);
                  }}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reintentar
                </Button>
                <Button variant="ghost" onClick={() => router.push("/clientes?tab=cajas")}>
                  Volver al listado
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="border-b border-border bg-cream-50 px-4 py-4 sm:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/clientes?tab=cajas")}
                className="gap-2 font-bold"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a Cajas
              </Button>
              <span className="text-xs font-bold text-text-secondary">/</span>
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Módulo de Caja
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                    Caja #{String(apertura.id).padStart(4, "0")}
                  </h1>
                  <EstadoCajaBadge abierto={abierto} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-4 w-4 text-brand-900" aria-hidden="true" />
                    {format(new Date(apertura.fechaApertura), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                  <span>· {apertura.cajaNombre}</span>
                  <span>· {apertura.sucursal}</span>
                  <span>
                    · Responsable: <strong className="text-brand-900">{apertura.cajero.nombre} {apertura.cajero.apellido}</strong>
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {abierto && (
                  <>
                    <Button variant="primary" onClick={() => setNuevoMovOpen(true)}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Nuevo movimiento
                    </Button>
                    <Button variant="destructive" onClick={() => setCerrarCajaOpen(true)}>
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Cerrar caja
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          {/* Índices KPI de la caja en una sola fila horizontal */}
          <ResumenCaja apertura={apertura} movimientos={movimientos} />

          {/* Sección de Movimientos con controles de búsqueda y filtros */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-brand-900" aria-hidden="true" />
                <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                  Movimientos de la Jornada
                </h2>
              </div>
              <span className="text-xs font-bold text-text-secondary">
                {movimientosFiltrados.length} {movimientosFiltrados.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {/* Buscador por motivo y filtros unificados debajo de los índices */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por motivo, ID o N° de venta..."
                  aria-label="Buscar movimiento por motivo, id o venta"
                  disabled={loading || error}
                  className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-sm text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroTipo}
                  onChange={(e) => {
                    setFiltroTipo(e.target.value as "todos" | "Ingreso" | "Egreso");
                    setPage(1);
                  }}
                  aria-label="Filtrar por tipo de movimiento"
                  className="h-11 rounded-pill border border-border bg-surface px-4 text-xs font-bold uppercase tracking-wide text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="Ingreso">Solo Ingresos (+)</option>
                  <option value="Egreso">Solo Egresos (−)</option>
                </select>

                <select
                  value={filtroOrigen}
                  onChange={(e) => {
                    setFiltroOrigen(e.target.value as "todos" | "venta" | "manual");
                    setPage(1);
                  }}
                  aria-label="Filtrar por origen"
                  className="h-11 rounded-pill border border-border bg-surface px-4 text-xs font-bold uppercase tracking-wide text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                >
                  <option value="todos">Todos los orígenes</option>
                  <option value="venta">Ventas / Cobros</option>
                  <option value="manual">Manual / Ajustes</option>
                </select>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={limpiarFiltros} size="sm">
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>

            <MovimientosCajaTable
              movimientos={pageItems}
              loading={loading}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={limpiarFiltros}
            />

            {!loading && movimientosFiltrados.length > 0 && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={movimientosFiltrados.length}
                pageStart={pageStart}
                pageEnd={pageEnd}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                disabled={loading}
              />
            )}
          </section>
        </div>
      </main>

      <MovimientoCajaFormModal
        open={nuevoMovOpen}
        onClose={() => setNuevoMovOpen(false)}
        onConfirm={handleRegistrarMovimiento}
        cajeroNombre={`${apertura.cajero.nombre} ${apertura.cajero.apellido}`.trim()}
        loading={loading}
      />
      <CerrarCajaModal
        open={cerrarCajaOpen}
        onClose={() => setCerrarCajaOpen(false)}
        onConfirm={handleCerrarCaja}
        montoInicial={apertura.montoInicial}
        ingresos={ingresos}
        egresos={egresos}
        responsable={`${apertura.cajero.nombre} ${apertura.cajero.apellido}`.trim()}
        loading={loading}
      />
    </div>
  );
}