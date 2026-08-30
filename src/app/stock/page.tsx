"use client";

import { AlertTriangle, ArrowLeftRight, Building2, ClipboardList, Download, RotateCcw, Search } from "lucide-react";
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
  EMPLEADO_ACTUAL,
  SIMULAR_ERROR as SIMULAR_ERROR_MOVIMIENTOS,
  SIMULAR_VACIO as SIMULAR_VACIO_MOVIMIENTOS,
  fichasMovimientos,
  movimientosIniciales,
  origenesMovimiento,
  parseCantidad,
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

const articulosFiltro = fichasMovimientos
  .map((f) => ({ id: f.articulo.id, nombre: f.articulo.nombre }))
  .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
  .sort((a, b) => a.nombre.localeCompare(b.nombre));

// Aplica el efecto local de un movimiento sobre una lista de fichas (demo):
// Ingreso suma, Egreso resta, Transferencia resta origen / suma destino,
// Ajuste suma o resta según signo. Devuelve la lista actualizada y el mapa
// de fichas afectadas (para evaluar alertas de reposición).
function aplicarEfectoMovimiento(
  fichasPrev: FichaStock[],
  items: MovimientoDraft["items"],
  esTransferencia: boolean,
  depositoOrigenId: number,
  depositoDestinoId: number,
  tipoNombre: string,
): { fichas: FichaStock[]; afectadas: Map<number, FichaStock> } {
  const afectadas = new Map<number, FichaStock>();
  const fichas = fichasPrev.map((f) => {
    let stockActual = f.stockActual;
    for (const item of items) {
      const cantidad = parseCantidad(item.cantidad);
      const articuloId = Number(item.articuloId);
      if (f.articuloId !== articuloId) continue;
      if (esTransferencia && depositoDestinoId) {
        if (f.depositoId === depositoOrigenId) stockActual -= cantidad;
        if (f.depositoId === depositoDestinoId) stockActual += cantidad;
      } else if (f.depositoId === depositoOrigenId) {
        stockActual += tipoNombre === "Egreso" ? -cantidad : cantidad;
      }
    }
    if (stockActual !== f.stockActual) {
      const actualizada: FichaStock = { ...f, stockActual };
      afectadas.set(f.id, actualizada);
      return actualizada;
    }
    return f;
  });
  return { fichas, afectadas };
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

  useEffect(() => {
    // BACKEND: reemplazar la simulación por GET /api/fichas-stock, GET /api/depositos,
    // GET /api/movimientos-stock y GET /api/fichas-stock (para el formulario de
    // movimientos). Los estados SIMULAR_VACIO / SIMULAR_ERROR de src/data/stock.ts
    // y src/data/movimientos.ts controlan esta demo.
    const timer = window.setTimeout(() => {
      // Inicializar el tab desde la URL (/stock?tab=movimientos viene del redirect
      // de la antigua ruta /movimientos-stock). Los tabs están disabled durante
      // el loading, así que el cambio no se percibe como salto.
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "depositos" || tabParam === "fichas" || tabParam === "movimientos") {
        setTab(tabParam);
      }
      if (SIMULAR_ERROR) {
        setError(true);
      } else {
        setFichas(SIMULAR_VACIO ? [] : fichasStockIniciales);
        setDepositos(depositosIniciales);
      }
      if (SIMULAR_ERROR_MOVIMIENTOS) {
        setError(true);
      } else {
        setMovimientos(SIMULAR_VACIO_MOVIMIENTOS ? [] : movimientosIniciales);
        setFichasMov(SIMULAR_VACIO_MOVIMIENTOS ? [] : fichasMovimientos);
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
      const matchDeposito = !filtros.depositoId || f.depositoId === Number(filtros.depositoId);
      const matchEstado = filtros.estadoStock === "todos" || f.estadoCalculado === filtros.estadoStock;
      return matchBusqueda && matchSucursal && matchDeposito && matchEstado;
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
    filtros.depositoId !== "" ||
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

  const verFichasDeposito = (deposito: Deposito) => {
    setFiltros({
      sucursalId: String(deposito.sucursalId),
      depositoId: String(deposito.id),
      estadoStock: "todos",
    });
    setPage(1);
    setTab("fichas");
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
      setMovimientos(SIMULAR_VACIO_MOVIMIENTOS ? [] : movimientosIniciales);
      setFichasMov(SIMULAR_VACIO_MOVIMIENTOS ? [] : fichasMovimientos);
      setLoading(false);
    }, 900);
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
          depositosIniciales.find((d) => d.id === Number(filtrosMov.depositoId))?.nombre;
      const matchArticulo =
        !filtrosMov.articulo || m.fichaStock.articuloNombre ===
          articulosFiltro.find((a) => a.id === Number(filtrosMov.articulo))?.nombre;
      const fecha = m.fechaHora.slice(0, 10);
      const matchDesde = !filtrosMov.desde || fecha >= filtrosMov.desde;
      const matchHasta = !filtrosMov.hasta || fecha <= filtrosMov.hasta;
      return matchBusqueda && matchTipo && matchDeposito && matchArticulo && matchDesde && matchHasta;
    });
  }, [movimientos, busquedaMov, filtrosMov]);

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

  // BACKEND: al confirmar el modal, enviar el draft por POST /api/movimientos-stock.
  // El back crea UN registro por artículo (mismo `numero`), actualiza stock_actual
  // de forma atómica, vincula el par de transferencias y registra la bitácora.
  // Acá se replica el efecto local para la demo (actualización de fichas y alertas).
  const handleConfirmMov = (draft: MovimientoDraft) => {
    const tipo = tiposMovimiento.find((t) => t.id === Number(draft.tipoId));
    const origen = origenesMovimiento.find((o) => o.id === Number(draft.origenId));
    if (!tipo) return;

    const fechaHora = new Date(draft.fechaHora).toISOString();
    const motivo = draft.motivo.trim();
    const origenEntidadIdRaw = draft.origenEntidadId.trim();
    const origenEntidadId = origenEntidadIdRaw !== "" ? Number(origenEntidadIdRaw) : null;
    const depositoOrigen = depositos.find((d) => d.id === Number(draft.depositoId));
    if (!depositoOrigen) return;
    const depositoDestino = depositos.find((d) => d.id === Number(draft.depositoDestinoId));

    const nuevos: MovimientoStock[] = [];
    const proximoId = Math.max(0, ...movimientos.map((m) => m.id)) + 1;
    const esTransferencia = tipo.nombre === "Transferencia";

    draft.items.forEach((item, index) => {
      const fichaOrigen = fichasMov.find(
        (f) => f.articuloId === Number(item.articuloId) && f.depositoId === depositoOrigen.id,
      );
      if (!fichaOrigen) return;
      const cantidad = parseCantidad(item.cantidad);
      const base = {
        numero: draft.numero,
        fechaHora,
        origenId: origen?.id ?? null,
        origen: origen ? { nombre: origen.nombre } : null,
        origenEntidadId,
        empleadoId: EMPLEADO_ACTUAL.id,
        empleado: { nombre: EMPLEADO_ACTUAL.nombre },
        motivo,
        createdAt: fechaHora,
      };

      if (esTransferencia && depositoDestino) {
        const fichaDestino = fichasMov.find(
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

    // Efecto local sobre las fichas (demo): se aplica a la lista de fichas del
    // tab Movimientos y también a la del tab Fichas de Stock para mantener la
    // coherencia del inventario.
    const resMov = aplicarEfectoMovimiento(
      fichasMov,
      draft.items,
      esTransferencia,
      depositoOrigen.id,
      depositoDestino?.id ?? 0,
      tipo.nombre,
    );
    setFichasMov(resMov.fichas);
    const resStock = aplicarEfectoMovimiento(
      fichas,
      draft.items,
      esTransferencia,
      depositoOrigen.id,
      depositoDestino?.id ?? 0,
      tipo.nombre,
    );
    setFichas(resStock.fichas);

    setMovimientos((prev) => [...nuevos, ...prev]);
    setFormOpen(false);
    setMovimientoInicial(null);
    showToast("success", "Movimiento registrado correctamente");

    // BACKEND: el back responde en el POST /api/movimientos-stock si alguna ficha
    // quedó bajo umbral (stock_actual <= stock_minimo o <= stock_critico). En la
    // demo se calcula con las fichas afectadas (crítico tiene prioridad).
    const alertas = [...resMov.afectadas.values()]
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
                    depositos={depositos}
                    onChange={handleFiltros}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosStockChips filtros={filtros} depositos={depositos} onChange={handleFiltros} />
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
                    articulos={articulosFiltro}
                    onChange={handleFiltrosMov}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosMovimientosChips
                    filtros={filtrosMov}
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
                    depositos={depositos}
                    loading={loading}
                    onEdit={openEdicionDeposito}
                    onNew={openNuevoDeposito}
                    onView={verFichasDeposito}
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
      <StockScreen />
    </ToastProvider>
  );
}