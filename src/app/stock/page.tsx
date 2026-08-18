"use client";

import { AlertTriangle, Building2, ClipboardList, Download, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  calcularEstadoStock,
  depositosIniciales,
  fichasStockIniciales,
  SIMULAR_ERROR,
  SIMULAR_VACIO,
  SUCURSALES,
  type Deposito,
  type FichaStock,
} from "@/data/stock";
import { articulosIniciales } from "@/data/articulos";
import {
  DepositoFormModal,
  type DepositoDraft,
} from "@/components/stock/DepositoFormModal";
import { DepositosList } from "@/components/stock/DepositosList";
import {
  FichaFormModal,
  type FichaDraft,
  type FichaFormModo,
} from "@/components/stock/FichaFormModal";
import { FichasTable } from "@/components/stock/FichasTable";
import {
  FiltrosStock,
  FiltrosStockChips,
  FILTROS_STOCK_VACIOS,
  type FiltrosStock as FiltrosStockType,
} from "@/components/stock/FiltrosStock";
import { StockTabs, type TabStock } from "@/components/stock/StockTabs";
import {
  TransferenciaForm,
  type TransferenciaDatos,
} from "@/components/stock/TransferenciaForm";

function exportarCSV(fichas: FichaStock[]) {
  const cabeceras = [
    "Sucursal",
    "Deposito",
    "Codigo",
    "Articulo",
    "StockActual",
    "StockMinimo",
    "StockCritico",
    "Estado",
  ];
  const filas = fichas.map((f) =>
    [
      f.deposito.sucursal,
      f.deposito.nombre,
      f.articulo.codigo,
      `"${f.articulo.nombre.replace(/"/g, '""')}"`,
      f.stockActual.toFixed(2),
      f.stockMinimo.toFixed(2),
      f.stockCritico !== null ? f.stockCritico.toFixed(2) : "",
      f.estadoCalculado,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fichas-stock.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function StockScreen() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fichas, setFichas] = useState<FichaStock[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);

  const [tab, setTab] = useState<TabStock>("fichas");

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosStockType>(FILTROS_STOCK_VACIOS);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [fichaFormOpen, setFichaFormOpen] = useState(false);
  const [fichaFormModo, setFichaFormModo] = useState<FichaFormModo>("INSERCION");
  const [fichaEnEdicion, setFichaEnEdicion] = useState<FichaStock | null>(null);

  const [depositoFormOpen, setDepositoFormOpen] = useState(false);
  const [depositoEnEdicion, setDepositoEnEdicion] = useState<Deposito | null>(null);

  const [transferInicial, setTransferInicial] = useState<{
    depositoId: number;
    articuloId: number;
  } | null>(null);
  const [transferKey, setTransferKey] = useState(0);

  useEffect(() => {
    // BACKEND: reemplazar la simulación por GET /api/fichas-stock y GET /api/depositos.
    // Los estados SIMULAR_VACIO / SIMULAR_ERROR de src/data/stock.ts controlan esta demo.
    const timer = window.setTimeout(() => {
      if (SIMULAR_ERROR) {
        setError(true);
      } else {
        setFichas(SIMULAR_VACIO ? [] : fichasStockIniciales);
        setDepositos(depositosIniciales);
      }
      setLoading(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const articulosActivos = useMemo(
    () => articulosIniciales.filter((a) => a.activo),
    [],
  );

  const fichasVisibles = useMemo(
    () => fichas.filter((f) => f.articulo.estado === "activo"),
    [fichas],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return fichasVisibles.filter((f) => {
      const matchBusqueda =
        !q ||
        f.articulo.codigo.toLowerCase().includes(q) ||
        f.articulo.nombre.toLowerCase().includes(q) ||
        f.deposito.sucursal.toLowerCase().includes(q);
      const matchSucursal =
        !filtros.sucursalId ||
        f.deposito.sucursal === SUCURSALES.find((s) => s.id === Number(filtros.sucursalId))?.nombre;
      const matchEstado = filtros.estadoStock === "todos" || f.estadoCalculado === filtros.estadoStock;
      return matchBusqueda && matchSucursal && matchEstado;
    });
  }, [fichasVisibles, busqueda, filtros]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtradas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtradas.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtradas.length);
  const hasActiveFilters =
    busqueda.trim() !== "" ||
    filtros.sucursalId !== "" ||
    filtros.estadoStock !== "todos";

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const handleFiltros = (value: FiltrosStockType) => {
    setFiltros(value);
    setPage(1);
  };

  const limpiarTodo = () => {
    setBusqueda("");
    setFiltros(FILTROS_STOCK_VACIOS);
  };

  const openNuevaFicha = () => {
    setFichaEnEdicion(null);
    setFichaFormModo("INSERCION");
    setFichaFormOpen(true);
  };

  const openEdicionFicha = (ficha: FichaStock) => {
    setFichaEnEdicion(ficha);
    setFichaFormModo("EDICION");
    setFichaFormOpen(true);
  };

  const handleSaveFicha = (draft: FichaDraft) => {
    // BACKEND: enviar el draft por POST /api/fichas-stock (INSERCION) o
    // PUT /api/fichas-stock/:id (EDICION). La bitácora de auditoría la registra
    // el back con usuario, fecha y valores anterior/nuevo.
    const deposito = depositos.find((d) => d.id === Number(draft.depositoId));
    const articulo = articulosIniciales.find((a) => a.id === Number(draft.articuloId));
    if (!deposito || !articulo) return;

    const stockCritico = draft.stockCritico.trim() !== "" ? Number.parseFloat(draft.stockCritico) : null;
    const stockMinimo = Number.parseFloat(draft.stockMinimo);
    const base = {
      articulo: {
        id: articulo.id,
        codigo: articulo.codigo,
        nombre: articulo.nombre,
        unidadMedida: articulo.unidadMedida,
        estado: articulo.activo ? ("activo" as const) : ("inactivo" as const),
      },
      deposito: { id: deposito.id, nombre: deposito.nombre, sucursal: deposito.sucursal },
      stockMinimo,
      stockCritico,
    };

    if (fichaFormModo === "INSERCION") {
      const nueva: FichaStock = {
        id: Math.max(0, ...fichas.map((f) => f.id)) + 1,
        articuloId: articulo.id,
        depositoId: deposito.id,
        stockActual: 0,
        ...base,
        estadoCalculado: calcularEstadoStock({ stockActual: 0, stockMinimo, stockCritico }),
      };
      setFichas((prev) => [nueva, ...prev]);
      setFichaFormOpen(false);
      showToast("success", "Ficha de stock creada correctamente");
    } else if (fichaFormModo === "EDICION" && fichaEnEdicion) {
      setFichas((prev) =>
        prev.map((f) =>
          f.id === fichaEnEdicion.id
            ? {
                ...f,
                ...base,
                depositoId: deposito.id,
                articuloId: articulo.id,
                estadoCalculado: calcularEstadoStock({ stockActual: f.stockActual, stockMinimo, stockCritico }),
              }
            : f,
        ),
      );
      setFichaFormOpen(false);
      showToast("success", "Ficha de stock guardada correctamente");
    }
  };

  const openNuevoDeposito = () => {
    setDepositoEnEdicion(null);
    setDepositoFormOpen(true);
  };

  const openEdicionDeposito = (deposito: Deposito) => {
    setDepositoEnEdicion(deposito);
    setDepositoFormOpen(true);
  };

  const handleSaveDeposito = (draft: DepositoDraft) => {
    // BACKEND: enviar el draft por POST /api/depositos (nuevo) o PUT /api/depositos/:id.
    const sucursal = SUCURSALES.find((s) => s.id === Number(draft.sucursalId));
    if (!sucursal) return;
    if (depositoEnEdicion) {
      setDepositos((prev) =>
        prev.map((d) =>
          d.id === depositoEnEdicion.id
            ? { ...d, sucursalId: sucursal.id, sucursal: sucursal.nombre, nombre: draft.nombre.trim(), ubicacion: draft.ubicacion.trim() }
            : d,
        ),
      );
      showToast("success", "Depósito guardado correctamente");
    } else {
      const nuevo: Deposito = {
        id: Math.max(0, ...depositos.map((d) => d.id)) + 1,
        sucursalId: sucursal.id,
        sucursal: sucursal.nombre,
        nombre: draft.nombre.trim(),
        ubicacion: draft.ubicacion.trim(),
      };
      setDepositos((prev) => [...prev, nuevo]);
      showToast("success", "Depósito creado correctamente");
    }
    setDepositoFormOpen(false);
  };

  const abrirTransferencia = (ficha: FichaStock) => {
    setTransferInicial({ depositoId: ficha.depositoId, articuloId: ficha.articuloId });
    setTransferKey((k) => k + 1);
    setTab("transferencias");
  };

  const handleTransferencia = (datos: TransferenciaDatos) => {
    // BACKEND: ver comentario en TransferenciaForm (POST /api/transferencias).
    // Acá se aplica el efecto local del egreso/ingreso sobre las fichas.
    setFichas((prev) => {
      const origen = prev.find((f) => f.id === datos.fichaOrigen.id);
      if (!origen) return prev;
      return prev.map((f) => {
        if (f.id === datos.fichaOrigen.id) {
          const stockActual = Math.max(0, f.stockActual - datos.cantidad);
          return {
            ...f,
            stockActual,
            estadoCalculado: calcularEstadoStock({ stockActual, stockMinimo: f.stockMinimo, stockCritico: f.stockCritico }),
          };
        }
        if (datos.fichaDestino && f.id === datos.fichaDestino.id) {
          const stockActual = f.stockActual + datos.cantidad;
          return {
            ...f,
            stockActual,
            estadoCalculado: calcularEstadoStock({ stockActual, stockMinimo: f.stockMinimo, stockCritico: f.stockCritico }),
          };
        }
        return f;
      });
    });
    if (!datos.fichaDestino) {
      const deposito = datos.depositoDestino;
      const nueva: FichaStock = {
        id: Math.max(0, ...fichas.map((f) => f.id)) + 1,
        articuloId: datos.articulo.id,
        depositoId: deposito?.id ?? 0,
        deposito: deposito ?? datos.fichaOrigen.deposito,
        articulo: datos.articulo,
        stockActual: datos.cantidad,
        stockMinimo: 0,
        stockCritico: null,
        estadoCalculado: "normal",
      };
      setFichas((prev) => [...prev, nueva]);
    }
    setTransferInicial(null);
    setTransferKey((k) => k + 1);
    setTab("fichas");
    showToast("success", "Transferencia realizada correctamente");
  };

  const handleExportar = () => {
    exportarCSV(filtradas);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  const retry = () => {
    setError(false);
    setLoading(true);
    window.setTimeout(() => {
      setFichas(SIMULAR_VACIO ? [] : fichasStockIniciales);
      setDepositos(depositosIniciales);
      setLoading(false);
    }, 900);
  };

  const esFichas = tab === "fichas";
  const esDepositos = tab === "depositos";

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
                  Stock
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {esFichas && (
                  <>
                    <Button onClick={openNuevaFicha} disabled={loading || error} size="lg">
                      <ClipboardList className="h-5 w-5" aria-hidden="true" />
                      Nueva ficha
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportar}
                      disabled={loading || error || filtradas.length === 0}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Exportar
                    </Button>
                  </>
                )}
                {esDepositos && (
                  <Button onClick={openNuevoDeposito} disabled={loading || error} size="lg">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                    Nuevo depósito
                  </Button>
                )}
              </div>
            </div>
            <StockTabs active={tab} onChange={setTab} disabled={loading || error} />
            {esFichas && (
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
                      placeholder="Buscar por código, artículo o sucursal..."
                      aria-label="Buscar por código, artículo o sucursal"
                      disabled={loading || error}
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </div>
                  <FiltrosStock filtros={filtros} onChange={handleFiltros} disabled={loading || error} />
                </div>
                <FiltrosStockChips filtros={filtros} onChange={handleFiltros} />
              </div>
            )}
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
                  No se pudieron cargar los datos de stock
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  Hubo un problema al consultar depósitos y fichas. Revisá tu conexión e intentá de nuevo.
                </p>
              </div>
              <Button variant="secondary" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              {esDepositos && (
                <div
                  id="panel-depositos"
                  role="tabpanel"
                  aria-labelledby="tab-depositos"
                  className="flex flex-col gap-6"
                >
                  <DepositosList
                    depositos={depositos}
                    loading={loading}
                    onEdit={openEdicionDeposito}
                    onNew={openNuevoDeposito}
                  />
                </div>
              )}
              {esFichas && (
                <div
                  id="panel-fichas"
                  role="tabpanel"
                  aria-labelledby="tab-fichas"
                  className="flex flex-col gap-6"
                >
                  <FichasTable
                    fichas={pageItems}
                    loading={loading}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={limpiarTodo}
                    onEdit={openEdicionFicha}
                    onTransfer={abrirTransferencia}
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
                      itemLabel="fichas"
                    />
                  )}
                </div>
              )}
              {tab === "transferencias" && (
                <div
                  id="panel-transferencias"
                  role="tabpanel"
                  aria-labelledby="tab-transferencias"
                  className="mx-auto w-full max-w-3xl"
                >
                  <TransferenciaForm
                    key={transferKey}
                    depositos={depositos}
                    fichas={fichas}
                    inicial={transferInicial}
                    onConfirm={handleTransferencia}
                    onCancel={() => {
                      setTransferInicial(null);
                      setTab("fichas");
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <FichaFormModal
        open={fichaFormOpen}
        modo={fichaFormModo}
        ficha={fichaEnEdicion}
        depositos={depositos}
        articulos={articulosActivos}
        fichas={fichas}
        onClose={() => setFichaFormOpen(false)}
        onSave={handleSaveFicha}
      />
      <DepositoFormModal
        open={depositoFormOpen}
        deposito={depositoEnEdicion}
        depositos={depositos}
        onClose={() => setDepositoFormOpen(false)}
        onSave={handleSaveDeposito}
      />
    </div>
  );
}

export default function StockPage() {
  return (
    <ToastProvider>
      <StockScreen />
    </ToastProvider>
  );
}