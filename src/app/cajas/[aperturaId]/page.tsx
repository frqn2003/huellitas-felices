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
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { MovimientosCajaTable } from "@/components/cajas/MovimientosCajaTable";
import { ResumenCaja } from "@/components/cajas/ResumenCaja";
import { MovimientoCajaFormModal } from "@/components/cajas/MovimientoCajaFormModal";
import { CerrarCajaModal } from "@/components/cajas/CerrarCajaModal";
import { EstadoCajaBadge } from "@/components/cajas/EstadoCajaBadge";
import {
  aperturasIniciales,
  movimientosCajaIniciales,
  SIMULAR_ERROR,
  SIMULAR_VACIO,
  type MovimientoCaja,
  type TipoMovimientoCaja,
  esperadoPreview,
} from "@/data/cajas";

export default function CajaDetallePage() {
  const params = useParams<{ aperturaId: string }>();
  const aperturaId = Number(params.aperturaId);
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recargar, setRecargar] = useState(0);

  const [apertura, setApertura] = useState<(typeof aperturasIniciales)[number] | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [nuevoMovOpen, setNuevoMovOpen] = useState(false);
  const [cerrarCajaOpen, setCerrarCajaOpen] = useState(false);

  useEffect(() => {
    let cancelado = false;
    // `loading` arranca en true y el retry lo setea desde el handler: el effect
    // solo resuelve el resultado (regla react-hooks/set-state-in-effect).
    // BACKEND: GET /api/caja_apertura/{id} (JOIN caja,sucursal,usuario) + GET /api/caja_movimiento?caja_apertura_id={id}&order=fecha_hora ASC
    const t = setTimeout(() => {
      if (cancelado) return;
      if (SIMULAR_ERROR) {
        setError(true);
        setLoading(false);
        return;
      }
      const ap = aperturasIniciales.find((a) => a.id === aperturaId) ?? null;
      setApertura(ap);
      if (ap && !SIMULAR_VACIO) {
        setMovimientos(movimientosCajaIniciales.filter((m) => m.cajaAperturaId === ap.id));
      } else {
        setMovimientos([]);
      }
      setError(false);
      setLoading(false);
    }, 700);
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
      if (!q) return true;
      return (
        m.motivo.toLowerCase().includes(q) ||
        String(m.id).includes(q) ||
        (m.ventaId !== null && String(m.ventaId).includes(q))
      );
    });
  }, [movimientos, busqueda]);

  const totalPages = Math.max(1, Math.ceil(movimientosFiltrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = movimientosFiltrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = movimientosFiltrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, movimientosFiltrados.length);

  const hasActiveFilters = busqueda.trim() !== "";

  const limpiarFiltros = () => {
    setBusqueda("");
    setPage(1);
  };

  const handleRegistrarMovimiento = (data: {
    tipo: TipoMovimientoCaja;
    monto: number;
    motivo: string;
  }) => {
    if (!apertura) return;
    // BACKEND: POST /api/caja_movimiento (caja_apertura_id, tipo, monto, motivo, venta_id)
    //          trigger actualiza caja.saldo_actual y valida que la caja esté abierta
    const nuevoId = Math.max(0, ...movimientos.map((m) => m.id)) + 1;
    const nuevoMov: MovimientoCaja = {
      id: nuevoId,
      cajaAperturaId: apertura.id,
      tipo: data.tipo,
      monto: data.monto,
      motivo: data.motivo,
      ventaId: null,
      usuarioId: apertura.cajeroId,
      fechaHora: new Date().toISOString(),
    };
    setMovimientos((prev) => [...prev, nuevoMov]);
    setNuevoMovOpen(false);
    showToast("success", "Movimiento registrado");
    setPage(1);
  };

  const handleCerrarCaja = (montoContado: number) => {
    if (!apertura) return;
    // BACKEND: PATCH /api/caja_apertura/{id}/cerrar { montoContado }
    //          fn_caja_cerrar_apertura calcula monto_esperado, diferencia,
    //          fecha_cierre, estado=false
    const esperado = esperadoPreview(apertura, movimientos);
    const diferencia = montoContado - esperado;
    setApertura((prev) =>
      prev
        ? {
            ...prev,
            estado: false,
            montoContado,
            montoEsperado: esperado,
            diferencia,
            fechaCierre: new Date().toISOString(),
          }
        : prev
    );
    setCerrarCajaOpen(false);
    showToast("success", "Caja cerrada correctamente");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col">
        <header className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => router.push("/clientes?tab=cajas")}
              aria-label="Volver a cajas"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-7 w-48 animate-pulse rounded bg-cream-100" />
              <div className="flex gap-2">
                <div className="h-11 w-40 animate-pulse rounded-pill bg-cream-100" />
                <div className="h-11 w-44 animate-pulse rounded-pill bg-cream-100" />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          <div className="h-32 w-full animate-pulse rounded-md bg-cream-100" />
          <div className="h-64 w-full animate-pulse rounded-md bg-cream-100" />
        </main>
      </div>
    );
  }

  if (error || !apertura) {
    return (
      <div className="flex min-h-[60vh] flex-col">
        <header className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => router.push("/clientes?tab=cajas")}
              aria-label="Volver a cajas"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
              Detalle de caja
            </h1>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-6 sm:px-8">
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <header className="sticky top-0 z-10 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-8">
          {/* Fila 1: volver + identificación (izquierda) y acciones (derecha).
              `ml-auto` garantiza la alineación aunque la fila haga wrap. */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/clientes?tab=cajas")}
                aria-label="Volver a cajas"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Caja #{String(apertura.id).padStart(4, "0")}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    {format(new Date(apertura.fechaApertura), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                  <span>· {apertura.cajaNombre}</span>
                  <span>· {apertura.sucursal}</span>
                  <span>
                    · {apertura.cajero.nombre} {apertura.cajero.apellido}
                  </span>
                  <EstadoCajaBadge abierto={abierto} />
                </div>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
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

          {/* Fila 2: buscador por motivo. */}
          <div className="relative w-full sm:max-w-sm">
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
              placeholder="Buscar por motivo..."
              aria-label="Buscar movimiento por motivo, id o venta"
              disabled={loading || error}
              className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
        <ResumenCaja apertura={apertura} movimientos={movimientos} />

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-brand-900" aria-hidden="true" />
              <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                Movimientos
              </h2>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={limpiarFiltros} size="sm">
                Limpiar búsqueda
              </Button>
            )}
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

          {!loading && movimientosFiltrados.length === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-12 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
                <Wallet className="h-7 w-7 text-brand-900" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                  {hasActiveFilters ? "Sin resultados" : "Sin movimientos registrados"}
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  {hasActiveFilters
                    ? "No hay movimientos que coincidan con la búsqueda aplicada."
                    : "Los ingresos por cobro en efectivo aparecen automáticamente. Podés registrar un movimiento manual."}
                </p>
              </div>
              {abierto && !hasActiveFilters && (
                <Button variant="primary" onClick={() => setNuevoMovOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Registrar movimiento
                </Button>
              )}
            </div>
          )}
        </section>
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