"use client";

import { AlertTriangle, ArrowLeftRight, Building2, ClipboardList, Download, RotateCcw, Search } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {

  type Deposito,
  type FichaStock,
} from "@/data/stock";
import type { Articulo } from "@/data/articulos";
import { apiGet, apiGetOpcional, apiSend, mensajeDeError } from "@/lib/api-client";
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
  parseCantidad,
  tiposMovimiento,
  type MovimientoStock,
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
  type MovimientoInicial,
} from "@/components/movimientos/MovimientoFormModal";
import { AlertaReposicionModal } from "@/components/movimientos/AlertaReposicionModal";

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

function exportarCSVMovimientos(movimientos: MovimientoStock[]) {
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
      `"${(m.origen?.nombre ?? m.tipo).replace(/"/g, '""')}"`,
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

// Aplica el efecto local de un movimiento sobre una lista de fichas (demo):
// Ingreso suma, Egreso resta, Transferencia resta origen / suma destino,
// Ajuste suma o resta según signo. Devuelve la lista actualizada y el mapa
// de fichas afectadas (para evaluar alertas de reposición).
// `aplicarEfectoMovimiento()` se eliminó: recalculaba el stock de cada ficha en
// el front para simular el movimiento. Ahora lo hace un trigger de la base, de
// forma atómica, y la página relee las fichas después de confirmar.


function StockScreen() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fichas, setFichas] = useState<FichaStock[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);

  // El tab inicial sale de la URL: /stock?tab=movimientos viene del redirect de
  // la vieja ruta /movimientos-stock. Se lee con useSearchParams y no con un
  // setState dentro de un efecto, que dispararía un render en cascada.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<TabStock>(
    tabParam === "depositos" || tabParam === "movimientos" ? tabParam : "fichas",
  );

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosStockType>(FILTROS_STOCK_VACIOS);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [fichaFormOpen, setFichaFormOpen] = useState(false);
  const [fichaFormModo, setFichaFormModo] = useState<FichaFormModo>("INSERCION");
  const [fichaEnEdicion, setFichaEnEdicion] = useState<FichaStock | null>(null);

  const [depositoFormOpen, setDepositoFormOpen] = useState(false);
  const [depositoEnEdicion, setDepositoEnEdicion] = useState<Deposito | null>(null);

  // Estado del tab "Movimientos" (bitácora de movimientos de stock).
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [fichasMov, setFichasMov] = useState<FichaStock[]>([]);
  const [busquedaMov, setBusquedaMov] = useState("");
  const [filtrosMov, setFiltrosMov] = useState<FiltrosMovimientosType>(FILTROS_MOVIMIENTOS_VACIOS);
  const [pageSizeMov, setPageSizeMov] = useState(10);
  const [pageMov, setPageMov] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [movimientoInicial, setMovimientoInicial] = useState<MovimientoInicial | null>(null);
  const [alertaFicha, setAlertaFicha] = useState<FichaStock | null>(null);

  const [articulosActivos, setArticulosActivos] = useState<Articulo[]>([]);
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);

  // Opciones del filtro por artículo del tab de movimientos, derivadas de las
  // fichas cargadas (antes salían de un mock a nivel de módulo).
  const articulosFiltro = useMemo(
    () =>
      fichasMov
        .map((f) => ({ id: f.articulo.id, nombre: f.articulo.nombre }))
        .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [fichasMov],
  );
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      apiGet<FichaStock[]>("/api/fichas-stock"),
      apiGet<Deposito[]>("/api/depositos"),
      apiGet<MovimientoStock[]>("/api/movimientos-stock"),
      // Catálogos: si uno falla, la pantalla sigue y solo queda vacío su select.
      apiGetOpcional<Articulo[]>("/api/articulos?estado=activo", []),
      apiGetOpcional<{ id: number; nombre: string }[]>("/api/sucursales", []),
    ])
      .then(([listaFichas, listaDepositos, listaMovimientos, listaArticulos, listaSucursales]) => {
        if (cancelado) return;
        setFichas(listaFichas);
        setDepositos(listaDepositos);
        setMovimientos(listaMovimientos);
        setArticulosActivos(listaArticulos);
        setSucursales(listaSucursales);
        // El formulario de movimientos solo ofrece fichas de artículos activos:
        // uno inactivo no puede usarse en movimientos nuevos (HU-STK-01).
        setFichasMov(listaFichas.filter((f) => f.articulo.estado === "activo"));
      })
      .catch(() => {
        if (!cancelado) setError(true);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [recarga]);

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
        f.deposito.sucursal ===
        sucursales.find((s) => s.id === Number(filtros.sucursalId))?.nombre;
      const matchEstado = filtros.estadoStock === "todos" || f.estadoCalculado === filtros.estadoStock;
      return matchBusqueda && matchSucursal && matchEstado;
    });
  }, [fichasVisibles, busqueda, filtros, sucursales]);

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

  /**
   * Alta y edición de la ficha de stock.
   *
   * El `stockActual` NO se manda nunca: arranca en 0 y solo lo cambian los
   * movimientos (criterio de HU-STK-02, y lo hace un trigger de la base). El
   * formulario edita únicamente los umbrales.
   */
  const handleSaveFicha = async (draft: FichaDraft) => {
    const body = {
      articuloId: Number(draft.articuloId),
      depositoId: Number(draft.depositoId),
      stockMinimo: Number.parseFloat(draft.stockMinimo),
      stockCritico:
        draft.stockCritico.trim() !== "" ? Number.parseFloat(draft.stockCritico) : null,
    };

    try {
      if (fichaFormModo === "INSERCION") {
        const creada = await apiSend<FichaStock>("POST", "/api/fichas-stock", body);
        setFichas((prev) => [creada, ...prev]);
        showToast("success", "Ficha de stock creada correctamente");
      } else if (fichaFormModo === "EDICION" && fichaEnEdicion) {
        const actualizada = await apiSend<FichaStock>(
          "PUT",
          `/api/fichas-stock/${fichaEnEdicion.id}`,
          body,
        );
        setFichas((prev) => prev.map((f) => (f.id === actualizada.id ? actualizada : f)));
        showToast("success", "Ficha de stock guardada correctamente");
      }
      setFichaFormOpen(false);
    } catch (e) {
      showToast("error", mensajeDeError(e));
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

  const handleSaveDeposito = async (draft: DepositoDraft) => {
    const body = {
      sucursalId: Number(draft.sucursalId),
      nombre: draft.nombre.trim(),
      ubicacion: draft.ubicacion.trim() || undefined,
    };

    try {
      if (depositoEnEdicion) {
        const actualizado = await apiSend<Deposito>(
          "PUT",
          `/api/depositos/${depositoEnEdicion.id}`,
          body,
        );
        setDepositos((prev) =>
          prev.map((d) => (d.id === actualizado.id ? actualizado : d)),
        );
        showToast("success", "Depósito guardado correctamente");
      } else {
        // El back rechaza un nombre repetido DENTRO de la misma sucursal
        // (DEPOSITO_DUPLICADO); el mismo nombre en otra sucursal sí se permite.
        const creado = await apiSend<Deposito>("POST", "/api/depositos", body);
        setDepositos((prev) => [...prev, creado]);
        showToast("success", "Depósito creado correctamente");
      }
      setDepositoFormOpen(false);
    } catch (e) {
      showToast("error", mensajeDeError(e));
    }
  };

  const handleExportar = () => {
    exportarCSV(filtradas);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  const retry = () => {
    setError(false);
    setLoading(true);
    setRecarga((n) => n + 1);
  };

  // ── Tab "Movimientos" ─────────────────────────────────────────────────────

  const filtradasMov = useMemo(() => {
    const q = busquedaMov.trim().toLowerCase();
    return movimientos.filter((m) => {
      const matchBusqueda =
        !q ||
        m.numero.toLowerCase().includes(q) ||
        m.fichaStock.articuloNombre.toLowerCase().includes(q);
      const matchTipo =
        !filtrosMov.tipoId ||
        m.tipo === tiposMovimiento.find((t) => t.id === Number(filtrosMov.tipoId))?.nombre;
      const matchDeposito =
        !filtrosMov.depositoId ||
        m.fichaStock.depositoNombre ===
          depositos.find((d) => d.id === Number(filtrosMov.depositoId))?.nombre;
      const matchArticulo =
        !filtrosMov.articulo || m.fichaStock.articuloNombre ===
          articulosFiltro.find((a) => a.id === Number(filtrosMov.articulo))?.nombre;
      const fecha = m.fechaHora.slice(0, 10);
      const matchDesde = !filtrosMov.desde || fecha >= filtrosMov.desde;
      const matchHasta = !filtrosMov.hasta || fecha <= filtrosMov.hasta;
      return matchBusqueda && matchTipo && matchDeposito && matchArticulo && matchDesde && matchHasta;
    });
  }, [movimientos, busquedaMov, filtrosMov, depositos, articulosFiltro]);

  const totalPagesMov = Math.max(1, Math.ceil(filtradasMov.length / pageSizeMov));
  const safePageMov = Math.min(pageMov, totalPagesMov);
  const pageItemsMov = filtradasMov.slice((safePageMov - 1) * pageSizeMov, safePageMov * pageSizeMov);
  const pageStartMov = filtradasMov.length === 0 ? 0 : (safePageMov - 1) * pageSizeMov + 1;
  const pageEndMov = Math.min(safePageMov * pageSizeMov, filtradasMov.length);
  const hasActiveFiltersMov =
    busquedaMov.trim() !== "" ||
    filtrosMov.tipoId !== "" ||
    filtrosMov.depositoId !== "" ||
    filtrosMov.articulo !== "" ||
    filtrosMov.desde !== "" ||
    filtrosMov.hasta !== "";

  const handleBusquedaMov = (value: string) => {
    setBusquedaMov(value);
    setPageMov(1);
  };

  const handleFiltrosMov = (value: FiltrosMovimientosType) => {
    setFiltrosMov(value);
    setPageMov(1);
  };

  const limpiarTodoMov = () => {
    setBusquedaMov("");
    setFiltrosMov(FILTROS_MOVIMIENTOS_VACIOS);
  };

  const numeroSiguienteMov = useMemo(
    () =>
      movimientos.reduce((acc, m) => {
        const n = Number.parseInt(m.numero.replace(/\D/g, ""), 10);
        return Number.isNaN(n) ? acc : Math.max(acc, n);
      }, 0) + 1,
    [movimientos],
  );
  const numeroSiguienteMovStr = `MOV-${String(numeroSiguienteMov).padStart(4, "0")}`;

  const handleExportarMov = () => {
    exportarCSVMovimientos(filtradasMov);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  // Atajo "Transferir" desde una ficha: salta al tab Movimientos y abre el modal
  // con tipo Transferencia, depósito origen y artículo precargados (si la ficha
  // existe en el catálogo de fichas de movimientos; si no, abre el modal vacío).
  const abrirTransferencia = (ficha: FichaStock) => {
    const fichaMov = fichasMov.find(
      (f) => f.articuloId === ficha.articuloId && f.depositoId === ficha.depositoId,
    );
    setMovimientoInicial(
      fichaMov
        ? { articuloId: fichaMov.articuloId, depositoId: fichaMov.depositoId }
        : null,
    );
    setTab("movimientos");
    setFormOpen(true);
  };

  /**
   * Confirma el movimiento contra la API.
   *
   * Antes acá había ~130 líneas que simulaban el efecto: recalculaban el stock
   * de cada ficha, armaban el par de la transferencia y derivaban las alertas.
   * Todo eso lo hace ahora el back:
   *
   *  · el stock lo actualiza un trigger de la base, de forma atómica;
   *  · el número (MOV-XXXXXX) lo genera una secuencia;
   *  · las alertas de reposición vienen en la respuesta del POST.
   *
   * Como el movimiento puede cambiar varias fichas a la vez, se recarga el
   * listado de fichas después de confirmar en vez de parchearlo a mano.
   */
  const handleConfirmMov = async (draft: MovimientoDraft) => {
    const tipo = tiposMovimiento.find((t) => t.id === Number(draft.tipoId));
    if (!tipo) return;

    const origenEntidadIdRaw = draft.origenEntidadId.trim();

    const body = {
      depositoId: Number(draft.depositoId),
      tipo: tipo.nombre,
      origenId: draft.origenId ? Number(draft.origenId) : undefined,
      origenEntidadId: origenEntidadIdRaw !== "" ? Number(origenEntidadIdRaw) : undefined,
      motivo: draft.motivo.trim() || undefined,
      fechaHora: draft.fechaHora ? new Date(draft.fechaHora).toISOString() : undefined,
      depositoDestinoId: draft.depositoDestinoId
        ? Number(draft.depositoDestinoId)
        : undefined,
      items: draft.items.map((i) => ({
        articuloId: Number(i.articuloId),
        cantidad: parseCantidad(i.cantidad),
      })),
    };

    try {
      const { movimientos: creados, alertas } = await apiSend<{
        movimientos: MovimientoStock[];
        alertas: {
          articuloId: number;
          depositoId: number;
          nivel: "bajo" | "critico";
        }[];
      }>("POST", "/api/movimientos-stock", body);

      setMovimientos((prev) => [...creados, ...prev]);
      setFormOpen(false);
      setMovimientoInicial(null);
      showToast("success", "Movimiento registrado correctamente");

      // Las fichas cambiaron de saldo: se releen en vez de recalcularlas acá.
      const fichasFrescas = await apiGet<FichaStock[]>("/api/fichas-stock");
      setFichas(fichasFrescas);
      setFichasMov(fichasFrescas.filter((f) => f.articulo.estado === "activo"));

      // El back ya ordena las alertas con el crítico primero.
      const primera = alertas[0];
      if (primera) {
        const ficha = fichasFrescas.find(
          (f) => f.articuloId === primera.articuloId && f.depositoId === primera.depositoId,
        );
        if (ficha) setAlertaFicha(ficha);
      }
    } catch (e) {
      // El trigger rechaza el egreso que dejaría stock negativo (HF001) y el
      // service rechaza el movimiento si falta la ficha en el depósito.
      showToast("error", mensajeDeError(e));
    }
  };

  const esFichas = tab === "fichas";
  const esDepositos = tab === "depositos";
  const esMovimientos = tab === "movimientos";

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Gestión de stock
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Inventario
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
                {esMovimientos && (
                  <>
                    <Button onClick={() => setFormOpen(true)} disabled={loading || error} size="lg">
                      <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
                      Nuevo movimiento
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportarMov}
                      disabled={loading || error || filtradasMov.length === 0}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Exportar
                    </Button>
                  </>
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
                  <FiltrosStock
                    filtros={filtros}
                    onChange={handleFiltros}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosStockChips filtros={filtros} onChange={handleFiltros} />
                </div>
              </div>
            )}
            {esMovimientos && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={busquedaMov}
                      onChange={(e) => handleBusquedaMov(e.target.value)}
                      placeholder="Buscar por nro. o artículo..."
                      aria-label="Buscar por número de movimiento o artículo"
                      disabled={loading || error}
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </div>
                  <FiltrosMovimientos
                    filtros={filtrosMov}
                    depositos={depositos}
                    articulos={articulosFiltro}
                    onChange={handleFiltrosMov}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosMovimientosChips
                    filtros={filtrosMov}
                    depositos={depositos}
                    articulos={articulosFiltro}
                    onChange={handleFiltrosMov}
                  />
                </div>
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
                  No se pudieron cargar los datos de inventario
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  Hubo un problema al consultar depósitos, fichas o movimientos. Revisá tu conexión e intentá de nuevo.
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
                    sucursales={sucursales}
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
              {esMovimientos && (
                <div
                  id="panel-movimientos"
                  role="tabpanel"
                  aria-labelledby="tab-movimientos"
                  className="flex flex-col gap-6"
                >
                  <MovimientosTable
                    movimientos={pageItemsMov}
                    loading={loading}
                    hasActiveFilters={hasActiveFiltersMov}
                    onClearFilters={limpiarTodoMov}
                    onNew={() => setFormOpen(true)}
                  />
                  {!loading && pageItemsMov.length > 0 && (
                    <Pagination
                      page={safePageMov}
                      totalPages={totalPagesMov}
                      totalItems={filtradasMov.length}
                      pageStart={pageStartMov}
                      pageEnd={pageEndMov}
                      pageSize={pageSizeMov}
                      onPageChange={setPageMov}
                      onPageSizeChange={setPageSizeMov}
                      disabled={loading || error}
                      itemLabel="movimientos"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <FichaFormModal
        sucursales={sucursales}
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
        sucursales={sucursales}
        open={depositoFormOpen}
        deposito={depositoEnEdicion}
        depositos={depositos}
        onClose={() => setDepositoFormOpen(false)}
        onSave={handleSaveDeposito}
      />
      <MovimientoFormModal
        open={formOpen}
        depositos={depositos}
        fichas={fichasMov}
        numeroSiguiente={numeroSiguienteMovStr}
        inicial={movimientoInicial}
        onClose={() => {
          setFormOpen(false);
          setMovimientoInicial(null);
        }}
        onConfirm={handleConfirmMov}
      />
      <AlertaReposicionModal ficha={alertaFicha} onClose={() => setAlertaFicha(null)} />
    </div>
  );
}

export default function StockPage() {
  return (
    <ToastProvider>
      {/* useSearchParams necesita un límite de Suspense: durante el prerender
          la query todavía no se conoce. */}
      <Suspense fallback={null}>
        <StockScreen />
      </Suspense>
    </ToastProvider>
  );
}