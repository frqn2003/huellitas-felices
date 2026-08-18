"use client";

import { AlertTriangle, ArrowLeftRight, Download, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { depositosIniciales, type FichaStock } from "@/data/stock";
import {
  EMPLEADO_ACTUAL,
  SIMULAR_ERROR,
  SIMULAR_VACIO,
  fichasMovimientos,
  movimientosIniciales,
  origenesMovimiento,
  tiposMovimiento,
  type MovimientoStock,
  type TipoMovimiento,
} from "@/data/movimientos";
import {
  FiltrosMovimientos,
  FiltrosMovimientosChips,
  FILTROS_MOVIMIENTOS_VACIOS,
  type FiltrosMovimientos as FiltrosMovimientosType,
} from "@/components/movimientos/FiltrosMovimientos";
import { MovimientosTable } from "@/components/movimientos/MovimientosTable";
import {
  MovimientoFormModal,
  type MovimientoDraft,
} from "@/components/movimientos/MovimientoFormModal";
import { AlertaReposicionModal } from "@/components/movimientos/AlertaReposicionModal";

function exportarCSV(movimientos: MovimientoStock[]) {
  const cabeceras = [
    "Numero",
    "FechaHora",
    "Tipo",
    "Deposito",
    "Articulo",
    "Cantidad",
    "Origen",
    "OrigenEntidadId",
    "Empleado",
    "Motivo",
  ];
  const filas = movimientos.map((m) =>
    [
      m.numero,
      m.fechaHora,
      m.tipo,
      `"${m.fichaStock.depositoNombre.replace(/"/g, '""')}"`,
      `"${m.fichaStock.articuloNombre.replace(/"/g, '""')}"`,
      m.cantidad.toFixed(2),
      `"${m.origen.nombre.replace(/"/g, '""')}"`,
      m.origenEntidadId !== null ? m.origenEntidadId : "",
      `"${m.empleado.nombre.replace(/"/g, '""')}"`,
      `"${m.motivo.replace(/"/g, '""')}"`,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "movimientos-stock.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const articulosFiltro = fichasMovimientos
  .map((f) => ({ id: f.articulo.id, nombre: f.articulo.nombre }))
  .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
  .sort((a, b) => a.nombre.localeCompare(b.nombre));

function MovimientosScreen() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [fichas, setFichas] = useState<FichaStock[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosMovimientosType>(FILTROS_MOVIMIENTOS_VACIOS);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [alertaFicha, setAlertaFicha] = useState<FichaStock | null>(null);

  useEffect(() => {
    // BACKEND: reemplazar la simulación por GET /api/movimientos-stock y
    // GET /api/fichas-stock. Los estados SIMULAR_VACIO / SIMULAR_ERROR de
    // src/data/movimientos.ts controlan esta demo.
    const timer = window.setTimeout(() => {
      if (SIMULAR_ERROR) {
        setError(true);
      } else {
        setMovimientos(SIMULAR_VACIO ? [] : movimientosIniciales);
        setFichas(fichasMovimientos);
      }
      setLoading(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      const matchBusqueda =
        !q ||
        m.numero.toLowerCase().includes(q) ||
        m.fichaStock.articuloNombre.toLowerCase().includes(q);
      const matchTipo = !filtros.tipoId || String(m.tipo) === filtros.tipoId;
      const matchDeposito =
        !filtros.depositoId ||
        m.fichaStock.depositoNombre ===
          depositosIniciales.find((d) => d.id === Number(filtros.depositoId))?.nombre;
      const matchArticulo =
        !filtros.articulo || m.fichaStock.articuloNombre ===
          articulosFiltro.find((a) => a.id === Number(filtros.articulo))?.nombre;
      const fecha = m.fechaHora.slice(0, 10);
      const matchDesde = !filtros.desde || fecha >= filtros.desde;
      const matchHasta = !filtros.hasta || fecha <= filtros.hasta;
      return matchBusqueda && matchTipo && matchDeposito && matchArticulo && matchDesde && matchHasta;
    });
  }, [movimientos, busqueda, filtros]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtradas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtradas.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtradas.length);
  const hasActiveFilters =
    busqueda.trim() !== "" ||
    filtros.tipoId !== "" ||
    filtros.depositoId !== "" ||
    filtros.articulo !== "" ||
    filtros.desde !== "" ||
    filtros.hasta !== "";

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const handleFiltros = (value: FiltrosMovimientosType) => {
    setFiltros(value);
    setPage(1);
  };

  const limpiarTodo = () => {
    setBusqueda("");
    setFiltros(FILTROS_MOVIMIENTOS_VACIOS);
  };

  const retry = () => {
    setError(false);
    setLoading(true);
    window.setTimeout(() => {
      setMovimientos(SIMULAR_VACIO ? [] : movimientosIniciales);
      setFichas(fichasMovimientos);
      setLoading(false);
    }, 900);
  };

  const numeroSiguiente = useMemo(
    () =>
      movimientos.reduce((acc, m) => {
        const n = Number.parseInt(m.numero.replace(/\D/g, ""), 10);
        return Number.isNaN(n) ? acc : Math.max(acc, n);
      }, 0) + 1,
    [movimientos],
  );
  const numeroSiguienteStr = `MOV-${String(numeroSiguiente).padStart(4, "0")}`;

  const handleExportar = () => {
    exportarCSV(filtradas);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  // BACKEND: al confirmar el modal, enviar el draft por POST /api/movimientos-stock.
  // El back crea UN registro por artículo (mismo `numero`), actualiza stock_actual
  // de forma atómica, vincula el par de transferencias y registra la bitácora.
  // Acá se replica el efecto local para la demo (actualización de fichas y alertas).
  const handleConfirm = (draft: MovimientoDraft) => {
    const tipo = tiposMovimiento.find((t) => t.id === Number(draft.tipoId));
    const origen = origenesMovimiento.find((o) => o.id === Number(draft.origenId));
    if (!tipo || !origen) return;

    const fechaHora = new Date(draft.fechaHora).toISOString();
    const motivo = draft.motivo.trim();
    const origenEntidadIdRaw = draft.origenEntidadId.trim();
    const origenEntidadId = origenEntidadIdRaw !== "" ? Number(origenEntidadIdRaw) : null;
    const depositoOrigen = depositosIniciales.find((d) => d.id === Number(draft.depositoId));
    if (!depositoOrigen) return;
    const depositoDestino = depositosIniciales.find((d) => d.id === Number(draft.depositoDestinoId));

    const nuevos: MovimientoStock[] = [];
    const proximoId = Math.max(0, ...movimientos.map((m) => m.id)) + 1;
    const esTransferencia = tipo.nombre === "Transferencia";

    draft.items.forEach((item, index) => {
      const fichaOrigen = fichas.find(
        (f) => f.articuloId === Number(item.articuloId) && f.depositoId === depositoOrigen.id,
      );
      if (!fichaOrigen) return;
      const cantidad = Number.parseFloat(item.cantidad);
      const base = {
        numero: draft.numero,
        fechaHora,
        origenId: origen.id,
        origen: { nombre: origen.nombre },
        origenEntidadId,
        empleadoId: EMPLEADO_ACTUAL.id,
        empleado: { nombre: EMPLEADO_ACTUAL.nombre },
        motivo,
        createdAt: fechaHora,
      };

      if (esTransferencia && depositoDestino) {
        const fichaDestino = fichas.find(
          (f) => f.articuloId === fichaOrigen.articuloId && f.depositoId === depositoDestino.id,
        );
        if (!fichaDestino) return;
        const egresoId = proximoId + index * 2;
        const ingresoId = egresoId + 1;
        nuevos.push({
          id: egresoId,
          ...base,
          fichaStockId: fichaOrigen.id,
          fichaStock: {
            articuloNombre: fichaOrigen.articulo.nombre,
            articuloUnidad: fichaOrigen.articulo.unidadMedida,
            depositoNombre: depositoOrigen.nombre,
          },
          tipo: "Egreso" as TipoMovimiento,
          cantidad,
          movimientoVinculadoId: ingresoId,
        });
        nuevos.push({
          id: ingresoId,
          ...base,
          fichaStockId: fichaDestino.id,
          fichaStock: {
            articuloNombre: fichaDestino.articulo.nombre,
            articuloUnidad: fichaDestino.articulo.unidadMedida,
            depositoNombre: depositoDestino.nombre,
          },
          tipo: "Ingreso" as TipoMovimiento,
          cantidad,
          movimientoVinculadoId: egresoId,
        });
      } else {
        nuevos.push({
          id: proximoId + index,
          ...base,
          fichaStockId: fichaOrigen.id,
          fichaStock: {
            articuloNombre: fichaOrigen.articulo.nombre,
            articuloUnidad: fichaOrigen.articulo.unidadMedida,
            depositoNombre: depositoOrigen.nombre,
          },
          tipo: tipo.nombre,
          cantidad,
          movimientoVinculadoId: null,
        });
      }
    });

    if (nuevos.length === 0) {
      showToast("error", "Error al registrar: no se pudo resolver alguna ficha de stock");
      return;
    }

    // Efecto local sobre las fichas (demo): Ingreso suma, Egreso resta,
    // Transferencia resta origen / suma destino, Ajuste suma o resta según signo.
    const fichasAfectadas = new Map<number, FichaStock>();
    setFichas((prev) =>
      prev.map((f) => {
        let stockActual = f.stockActual;
        for (const item of draft.items) {
          const cantidad = Number.parseFloat(item.cantidad);
          const articuloId = Number(item.articuloId);
          if (f.articuloId !== articuloId) continue;
          if (esTransferencia && depositoDestino) {
            if (f.depositoId === depositoOrigen.id) stockActual -= cantidad;
            if (f.depositoId === depositoDestino.id) stockActual += cantidad;
          } else if (f.depositoId === depositoOrigen.id) {
            stockActual += tipo.nombre === "Egreso" ? -cantidad : cantidad;
          }
        }
        if (stockActual !== f.stockActual) {
          const actualizada: FichaStock = { ...f, stockActual };
          fichasAfectadas.set(f.id, actualizada);
          return actualizada;
        }
        return f;
      }),
    );

    setMovimientos((prev) => [...nuevos, ...prev]);
    setFormOpen(false);
    showToast("success", "Movimiento registrado correctamente");

    // BACKEND: el back responde en el POST /api/movimientos-stock si alguna ficha
    // quedó bajo umbral (stock_actual <= stock_minimo o <= stock_critico). En la
    // demo se calcula con las fichas afectadas (crítico tiene prioridad).
    const alertas = [...fichasAfectadas.values()]
      .filter((f) => f.stockActual <= f.stockMinimo || (f.stockCritico !== null && f.stockActual <= f.stockCritico))
      .sort((a, b) => {
        const nivelA = b.stockCritico !== null && b.stockActual <= b.stockCritico ? 1 : 0;
        const nivelB = a.stockCritico !== null && a.stockActual <= a.stockCritico ? 1 : 0;
        return nivelA - nivelB;
      });
    if (alertas.length > 0) {
      setAlertaFicha(alertas[0]);
    }
  };

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Stock · Inventario
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Movimientos de Stock
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => setFormOpen(true)} disabled={loading || error} size="lg">
                  <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
                  Nuevo movimiento
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportar}
                  disabled={loading || error || filtradas.length === 0}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => handleBusqueda(e.target.value)}
                    placeholder="Buscar por nro. o artículo..."
                    aria-label="Buscar por número de movimiento o artículo"
                    disabled={loading || error}
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </div>
                <FiltrosMovimientos
                  filtros={filtros}
                  articulos={articulosFiltro}
                  onChange={handleFiltros}
                  disabled={loading || error}
                />
              </div>
              <FiltrosMovimientosChips filtros={filtros} articulos={articulosFiltro} onChange={handleFiltros} />
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          {error ? (
            <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                  No se pudieron cargar los movimientos
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  Hubo un problema al consultar los movimientos de stock. Revisá tu conexión e intentá de nuevo.
                </p>
              </div>
              <Button variant="secondary" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <MovimientosTable
                movimientos={pageItems}
                loading={loading}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={limpiarTodo}
                onNew={() => setFormOpen(true)}
              />
              {!loading && pageItems.length > 0 && (
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  totalItems={filtradas.length}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  disabled={loading || error}
                  itemLabel="movimientos"
                />
              )}
            </div>
          )}
        </div>
      </main>

      <MovimientoFormModal
        open={formOpen}
        depositos={depositosIniciales}
        fichas={fichas}
        numeroSiguiente={numeroSiguienteStr}
        onClose={() => setFormOpen(false)}
        onConfirm={handleConfirm}
      />
      <AlertaReposicionModal ficha={alertaFicha} onClose={() => setAlertaFicha(null)} />
    </div>
  );
}

export default function MovimientosStockPage() {
  return (
    <ToastProvider>
      <MovimientosScreen />
    </ToastProvider>
  );
}