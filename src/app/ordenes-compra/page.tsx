"use client";

import { AlertTriangle, Download, FilePlus2, PackagePlus, RotateCcw, Search } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { CancelarSolicitudModal } from "@/components/cotizaciones/CancelarSolicitudModal";
import { CompararCotizacionesModal } from "@/components/cotizaciones/CompararCotizacionesModal";
import {
  FILTROS_SOLICITUD_VACIOS,
  FiltrosChips as FiltrosCotChips,
  FiltrosCotizaciones,
  type FiltrosSolicitud,
} from "@/components/cotizaciones/FiltrosCotizaciones";
import { CotizacionFormModal } from "@/components/cotizaciones/CotizacionFormModal";
import { SolicitudFormModal } from "@/components/cotizaciones/SolicitudFormModal";
import { SolicitudesTable } from "@/components/cotizaciones/SolicitudesTable";
import { ComprasTabs, type TabCompras } from "@/components/compras/ComprasTabs";
import { CancelarOrdenModal } from "@/components/ordenes-compra/CancelarOrdenModal";
import {
  FiltrosChips,
  FiltrosOrdenes,
  FILTROS_ORDEN_VACIOS,
  type FiltrosOrden,
} from "@/components/ordenes-compra/FiltrosOrdenes";
import {
  OrdenFormModal,
  type OrdenDraft,
  type OrdenFormModo,
} from "@/components/ordenes-compra/OrdenFormModal";
import { OrdenesTable } from "@/components/ordenes-compra/OrdenesTable";
import { useCotizaciones, type AsignacionArticulo } from "@/context/CotizacionesContext";
import type { CatalogosCotizacion, SolicitudCotizacion } from "@/data/cotizaciones";
import type { OrdenCompra } from "@/data/ordenes-compra";
import { formatFecha, parseImporte } from "@/data/ordenes-compra";
import type { CatalogosOrden } from "@/components/ordenes-compra/OrdenFormModal";
import { apiGet, apiGetOpcional, apiSend, mensajeDeError } from "@/lib/api-client";

const CATALOGOS_VACIOS: CatalogosOrden = {
  proveedores: [],
  articulos: [],
  depositos: [],
  condicionesPago: [],
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Convierte un input de rango a número; vacío o inválido = sin límite.
function parseRango(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = parseImporte(raw);
  return Number.isNaN(n) ? null : n;
}

const TITULO_ACCIONES: Record<Exclude<OrdenFormModo, "LECTURA">, string> = {
  INSERCION: "Orden de compra creada correctamente",
  EDICION: "Orden guardada correctamente",
};

function exportarCSV(ordenes: OrdenCompra[]) {
  const cabeceras = [
    "N° Orden",
    "Proveedor",
    "Fecha",
    "Fecha Entrega",
    "Condición de Pago",
    "Estado",
    "Subtotal",
    "Descuento (%)",
    "Gastos Envío",
    "Total",
  ];
  const filas = ordenes.map((o) =>
    [
      o.cod_ord,
      `"${o._proveedor.razon_social.replace(/"/g, '""')}"`,
      formatFecha(o.fecha),
      formatFecha(o.fecha_entrega),
      o.condicion_pago,
      o.estado,
      String(o.subtotal).replace(".", ","),
      `${String(o.descuento).replace(".", ",")}%`,
      String(o.gastos_envio).replace(".", ","),
      String(o.total).replace(".", ","),
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ordenes-compra.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ComprasScreen() {
  const { showToast } = useToast();
  // Fuente viva de solicitudes: resuelve cotizacion_id → "SC-XXXX" en el
  // detalle de lectura y alimenta el tab de cotizaciones (HU-COMP-02).
  const {
    solicitudes,
    crearSolicitud,
    registrarCotizacion,
    adjudicarPorArticulo,
    cancelarSolicitud,
  } = useCotizaciones();
  // Alias para no tocar los ~10 usos de abajo. Ya no filtra nada: la lista es
  // la que devuelve la API.
  const solicitudesDemo = solicitudes;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // El tab inicial sale de la URL: ?tab=cotizaciones viene del redirect de la
  // vieja ruta /cotizaciones.
  const searchParams = useSearchParams();
  const tabInicial: TabCompras =
    searchParams.get("tab") === "cotizaciones" ? "cotizaciones" : "ordenes";
  const [tab, setTab] = useState<TabCompras>(tabInicial);

  // ── Estado del tab "Órdenes de compra" ──────────────────────────────
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosOrden>(FILTROS_ORDEN_VACIOS);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [formModo, setFormModo] = useState<OrdenFormModo>("INSERCION");
  const [formOrden, setFormOrden] = useState<OrdenCompra | null>(null);
  const [aCancelarOrden, setACancelarOrden] = useState<OrdenCompra | null>(null);

  // ── Estado del tab "Cotizaciones" ───────────────────────────────────
  const [busquedaCot, setBusquedaCot] = useState("");
  const [filtrosCot, setFiltrosCot] = useState<FiltrosSolicitud>(FILTROS_SOLICITUD_VACIOS);
  const [pageSizeCot, setPageSizeCot] = useState(10);
  const [pageCot, setPageCot] = useState(1);
  const [formSolicitudOpen, setFormSolicitudOpen] = useState(false);
  const [aCotizar, setACotizar] = useState<SolicitudCotizacion | null>(null);
  const [aComparar, setAComparar] = useState<SolicitudCotizacion | null>(null);
  const [aCancelarSolicitud, setACancelarSolicitud] = useState<SolicitudCotizacion | null>(null);

  const [catalogos, setCatalogos] = useState<CatalogosOrden>(CATALOGOS_VACIOS);
  const [fichas, setFichas] = useState<
    { articuloId: number; stockActual: number; estadoCalculado: string }[]
  >([]);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    // El LISTADO va con apiGet: si falla, la pantalla no tiene nada que mostrar
    // y corresponde el estado de error.
    //
    // Los CATÁLOGOS van con apiGetOpcional: alimentan los selects de los
    // formularios. Que falte uno no puede dejar la pantalla en blanco — antes,
    // con Promise.all, un solo catálogo caído tiraba abajo todo el listado.
    Promise.all([
      apiGet<OrdenCompra[]>("/api/ordenes-compra"),
      apiGetOpcional<{ id: number; razonSocial: string }[]>(
        "/api/proveedores?estado=activo",
        [],
      ),
      apiGetOpcional<{ id: number; codigo: string; nombre: string }[]>(
        "/api/articulos?estado=activo",
        [],
      ),
      apiGetOpcional<{ id: number; nombre: string; sucursal: string }[]>(
        "/api/depositos",
        [],
      ),
      apiGetOpcional<{ id: number; nombre: string }[]>("/api/condiciones-pago", []),
      // Para resaltar los artículos con stock bajo en el selector de la solicitud.
      apiGetOpcional<
        { articuloId: number; stockActual: number; estadoCalculado: string }[]
      >("/api/fichas-stock", []),
    ])
      .then(([lista, proveedores, articulos, depositos, condicionesPago, fichas]) => {
        if (cancelado) return;
        setOrdenes(lista);
        setCatalogos({
          // La API de proveedores usa `razonSocial`; el catálogo del modal
          // habla de `nombre`. Se adapta acá, en el borde.
          proveedores: proveedores.map((p) => ({ id: p.id, nombre: p.razonSocial })),
          articulos,
          depositos,
          condicionesPago,
        });
        setFichas(fichas);
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

  // ── Filtrado órdenes ────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const totalMin = parseRango(filtros.totalMin);
    const totalMax = parseRango(filtros.totalMax);
    const lista = ordenes.filter((o) => {
      const matchBusqueda =
        !q ||
        o.cod_ord.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o._proveedor.razon_social.toLowerCase().includes(q);
      let matchEstado = true;
      if (filtros.estado !== "Todas") matchEstado = o.estado === filtros.estado;
      const matchProveedor =
        !filtros.proveedorId || o.proveedor_id === Number(filtros.proveedorId);
      const matchTotal =
        (totalMin === null || o.total >= totalMin) &&
        (totalMax === null || o.total <= totalMax);
      return matchBusqueda && matchEstado && matchProveedor && matchTotal;
    });
    // BACKEND: el ORDER BY fecha lo resuelve la consulta SQL; acá es solo demo.
    return lista.sort((a, b) =>
      filtros.ordenFecha === "antiguas"
        ? Date.parse(a.fecha) - Date.parse(b.fecha)
        : Date.parse(b.fecha) - Date.parse(a.fecha),
    );
  }, [ordenes, busqueda, filtros]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtradas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtradas.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtradas.length);
  const hasActiveFilters =
    busqueda.trim() !== "" ||
    filtros.proveedorId !== "" ||
    filtros.estado !== FILTROS_ORDEN_VACIOS.estado ||
    filtros.totalMin.trim() !== "" ||
    filtros.totalMax.trim() !== "";

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const handleFiltros = (value: FiltrosOrden) => {
    setFiltros(value);
    setPage(1);
  };

  const openNuevo = () => {
    setFormOrden(null);
    setFormModo("INSERCION");
    setFormOpen(true);
  };

  const openEdicion = (orden: OrdenCompra) => {
    setFormOrden(orden);
    setFormModo("EDICION");
    setFormOpen(true);
  };

  const openLectura = (orden: OrdenCompra) => {
    setFormOrden(orden);
    setFormModo("LECTURA");
    setFormOpen(true);
  };

  /**
   * Alta y edición contra la API.
   *
   * El front ya NO arma la orden: manda el draft y guarda lo que devuelve el
   * server. Eso trae el `cod_ord` real (lo genera una secuencia de la base) y
   * los totales recalculados — el back descarta el subtotal y el total que
   * venían del formulario, así que reconstruirlos acá sería adivinar.
   *
   * Tampoco se manda `fecha`: la fecha de emisión la sella el servidor.
   */
  const handleSave = async (draft: OrdenDraft) => {
    const body = {
      proveedorId: Number(draft.proveedorId),
      formaPagoId: Number(draft.condicionPago),
      depositoEntregaId: draft.depositoEntregaId
        ? Number(draft.depositoEntregaId)
        : undefined,
      fechaEntrega: draft.fechaEntrega || undefined,
      notas: draft.notas.trim() || undefined,
      descuento: draft.descuento.trim() ? parseImporte(draft.descuento) : 0,
      gastosEnvio: draft.gastosEnvio.trim() ? parseImporte(draft.gastosEnvio) : 0,
      lineas: draft.lineas.map((l) => ({
        articuloId: Number(l.articuloId),
        cantidad: parseImporte(l.cantidad),
        precioAcordado: parseImporte(l.precio),
      })),
    };

    try {
      if (formModo === "INSERCION") {
        const creada = await apiSend<OrdenCompra>("POST", "/api/ordenes-compra", body);
        setOrdenes((prev) => [creada, ...prev]);
        setFormOpen(false);
        showToast("success", `${TITULO_ACCIONES.INSERCION} (${creada.cod_ord})`);
      } else if (formModo === "EDICION" && formOrden) {
        const actualizada = await apiSend<OrdenCompra>(
          "PUT",
          `/api/ordenes-compra/${formOrden.id}`,
          body,
        );
        setOrdenes((prev) => prev.map((o) => (o.id === actualizada.id ? actualizada : o)));
        setFormOpen(false);
        showToast("success", TITULO_ACCIONES.EDICION);
      }
      return {};
    } catch (e) {
      // El modal queda abierto con los datos: el back rechaza editar una orden
      // que ya no está Pendiente (ORDEN_NO_EDITABLE), entre otras reglas.
      const error = mensajeDeError(e);
      showToast("error", error);
      return { error };
    }
  };

  /**
   * Transiciones de estado. El back valida contra `estado_orden_compra.es_final`
   * y rechaza con TRANSICION_INVALIDA si el estado actual no lo permite, así que
   * el front no replica esa máquina de estados.
   */
  const handleEnviar = async (orden: OrdenCompra) => {
    try {
      const actualizada = await apiSend<OrdenCompra>(
        "PATCH",
        `/api/ordenes-compra/${orden.id}/enviar`,
      );
      setOrdenes((prev) => prev.map((o) => (o.id === actualizada.id ? actualizada : o)));
      setFormOrden((actual) => (actual?.id === actualizada.id ? actualizada : actual));
      showToast("success", "Orden enviada al proveedor correctamente");
    } catch (e) {
      showToast("error", mensajeDeError(e));
    }
  };

  const handleCancelar = async (orden: OrdenCompra) => {
    try {
      const actualizada = await apiSend<OrdenCompra>(
        "PATCH",
        `/api/ordenes-compra/${orden.id}/cancelar`,
      );
      setOrdenes((prev) => prev.map((o) => (o.id === actualizada.id ? actualizada : o)));
      setACancelarOrden(null);
      setFormOpen(false);
      showToast("success", "Orden cancelada correctamente");
    } catch (e) {
      setACancelarOrden(null);
      showToast("error", mensajeDeError(e));
    }
  };

  const handleExportar = () => {
    exportarCSV(filtradas);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  const limpiarTodo = () => {
    setBusqueda("");
    setFiltros(FILTROS_ORDEN_VACIOS);
  };

  // ── Filtrado cotizaciones ───────────────────────────────────────────
  const filtradasCot = useMemo(() => {
    const q = busquedaCot.trim().toLowerCase();
    const lista = solicitudesDemo.filter((s) => {
      const matchBusqueda =
        !q ||
        s.cod_sol.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        s._articulos_solicitados.some((a) => {
          const nombre =
            catalogos.articulos.find((x) => x.id === a.articulo_id)?.nombre ?? "";
          return nombre.toLowerCase().includes(q);
        });
      const matchEstado = filtrosCot.estado === "Todas" || s.estado === filtrosCot.estado;
      return matchBusqueda && matchEstado;
    });
    // BACKEND: el ORDER BY fecha lo resuelve la consulta SQL; acá es solo demo.
    return lista.sort((a, b) =>
      filtrosCot.ordenFecha === "antiguas"
        ? Date.parse(a.fecha) - Date.parse(b.fecha)
        : Date.parse(b.fecha) - Date.parse(a.fecha),
    );
  }, [solicitudesDemo, busquedaCot, filtrosCot]);

  const totalPagesCot = Math.max(1, Math.ceil(filtradasCot.length / pageSizeCot));
  const safePageCot = Math.min(pageCot, totalPagesCot);
  const pageItemsCot = filtradasCot.slice(
    (safePageCot - 1) * pageSizeCot,
    safePageCot * pageSizeCot,
  );
  const pageStartCot = filtradasCot.length === 0 ? 0 : (safePageCot - 1) * pageSizeCot + 1;
  const pageEndCot = Math.min(safePageCot * pageSizeCot, filtradasCot.length);
  const hasActiveFiltersCot =
    busquedaCot.trim() !== "" || filtrosCot.estado !== FILTROS_SOLICITUD_VACIOS.estado;

  const handleBusquedaCot = (value: string) => {
    setBusquedaCot(value);
    setPageCot(1);
  };

  const handleFiltrosCot = (next: FiltrosSolicitud) => {
    setFiltrosCot(next);
    setPageCot(1);
  };

  const limpiarTodoCot = () => {
    setBusquedaCot("");
    setFiltrosCot(FILTROS_SOLICITUD_VACIOS);
  };

  const handleCrearSolicitud = async (input: Parameters<typeof crearSolicitud>[0]) => {
    const res = await crearSolicitud(input);
    if (res.error) {
      showToast("error", res.error);
      return;
    }
    setFormSolicitudOpen(false);
    showToast("success", "Solicitud creada correctamente");
  };

  const handleGuardarCotizacion = async (
    input: Parameters<typeof registrarCotizacion>[1],
  ) => {
    if (!aCotizar) return {};
    // El back rechaza que el mismo proveedor cotice dos veces la misma
    // solicitud (COTIZACION_DUPLICADA) y que la cotización no cubra todos los
    // artículos pedidos (COTIZACION_INCOMPLETA).
    const res = await registrarCotizacion(aCotizar.id, input);
    if (res.error) return res;

    setACotizar(null);
    showToast("success", "Cotización registrada correctamente");
    return {};
  };

  /**
   * Adjudicación por artículo: cada línea puede ir a un proveedor distinto.
   *
   * El BACK crea las órdenes (una por proveedor ganador) dentro de la misma
   * transacción que marca la solicitud como adjudicada. Antes el front las
   * armaba a mano acá: eran ~60 líneas que duplicaban el cálculo de totales y
   * podían quedar desincronizadas del estado de la solicitud si algo fallaba
   * entre medio. Ahora solo se agregan a la lista las que devolvió el server.
   */
  const handleAdjudicar = async (asignaciones: AsignacionArticulo[]) => {
    if (!aComparar) return;

    const res = await adjudicarPorArticulo(aComparar.id, asignaciones);
    setAComparar(null);

    if (res.error) {
      showToast("error", res.error);
      return;
    }

    const nuevas = res.ordenes ?? [];
    setOrdenes((prev) => [...nuevas, ...prev]);
    showToast(
      "success",
      `Se ${nuevas.length === 1 ? "generó" : "generaron"} ${nuevas.length} ${
        nuevas.length === 1 ? "orden de compra" : "órdenes de compra"
      } pendientes`,
    );
    setTab("ordenes");
  };

  const handleCancelarSolicitud = async (solicitud: SolicitudCotizacion) => {
    const res = await cancelarSolicitud(solicitud.id);
    setACancelarSolicitud(null);
    if (res.error) {
      showToast("error", res.error);
      return;
    }
    showToast("success", "Solicitud cancelada correctamente");
  };

  // Los modales de cotización necesitan artículos con su unidad y las fichas de
  // stock; se arma una sola vez y se baja por prop a los tres.
  const catalogosCotizacion: CatalogosCotizacion = useMemo(
    () => ({
      articulos: catalogos.articulos.map((a) => ({ ...a, unidadMedida: "" })),
      proveedores: catalogos.proveedores,
      fichas,
    }),
    [catalogos, fichas],
  );

  const esOrdenes = tab === "ordenes";
  const esCotizaciones = tab === "cotizaciones";

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Gestión de compras
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Compras
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {esOrdenes && (
                  <>
                    <Button onClick={openNuevo} disabled={loading || error} size="lg">
                      <PackagePlus className="h-5 w-5" aria-hidden="true" />
                      Nueva
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
                {esCotizaciones && (
                  <Button
                    onClick={() => setFormSolicitudOpen(true)}
                    disabled={loading || error}
                    size="lg"
                  >
                    <FilePlus2 className="h-5 w-5" aria-hidden="true" />
                    Nueva solicitud
                  </Button>
                )}
              </div>
            </div>

            <ComprasTabs active={tab} onChange={setTab} disabled={loading || error} />

            {esOrdenes && (
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
                      placeholder="Buscar por N° de orden o proveedor..."
                      aria-label="Buscar por número de orden o proveedor"
                      disabled={loading || error}
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </div>
                  <FiltrosOrdenes
                    filtros={filtros}
                    onChange={handleFiltros}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosChips filtros={filtros} onChange={handleFiltros} />
                </div>
              </div>
            )}

            {esCotizaciones && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={busquedaCot}
                      onChange={(e) => handleBusquedaCot(e.target.value)}
                      placeholder="Buscar por N° de solicitud o artículo..."
                      aria-label="Buscar por número de solicitud o artículo"
                      disabled={loading || error}
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </div>
                  <FiltrosCotizaciones
                    filtros={filtrosCot}
                    onChange={handleFiltrosCot}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosCotChips filtros={filtrosCot} onChange={handleFiltrosCot} />
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
                  No se pudieron cargar los datos de compras
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  Hubo un problema al consultar las órdenes o las solicitudes de cotización. Revisá tu conexión e intentá de nuevo.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setError(false);
                  setLoading(true);
                  setRecarga((n) => n + 1);
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              {esOrdenes && (
                <div
                  id="panel-ordenes"
                  role="tabpanel"
                  aria-labelledby="tab-ordenes"
                  className="flex flex-col gap-6"
                >
                  <OrdenesTable
                    ordenes={pageItems}
                    loading={loading}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={limpiarTodo}
                    onView={openLectura}
                    onEdit={openEdicion}
                    onCancel={setACancelarOrden}
                    onNueva={openNuevo}
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
                      itemLabel="órdenes"
                    />
                  )}
                </div>
              )}

              {esCotizaciones && (
                <div
                  id="panel-cotizaciones"
                  role="tabpanel"
                  aria-labelledby="tab-cotizaciones"
                  className="flex flex-col gap-6"
                >
                  <SolicitudesTable
                    solicitudes={pageItemsCot}
                    loading={loading}
                    hasActiveFilters={hasActiveFiltersCot}
                    onClearFilters={limpiarTodoCot}
                    onNueva={() => setFormSolicitudOpen(true)}
                    onComparar={setAComparar}
                    onRegistrarCotizacion={setACotizar}
                    onCancelar={setACancelarSolicitud}
                  />
                  {!loading && pageItemsCot.length > 0 && (
                    <Pagination
                      page={safePageCot}
                      totalPages={totalPagesCot}
                      totalItems={filtradasCot.length}
                      pageStart={pageStartCot}
                      pageEnd={pageEndCot}
                      pageSize={pageSizeCot}
                      onPageChange={setPageCot}
                      onPageSizeChange={setPageSizeCot}
                      disabled={loading || error}
                      itemLabel="solicitudes"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Modales del tab Órdenes de compra ── */}
      <OrdenFormModal
        catalogos={catalogos}
        open={formOpen}
        modo={formModo}
        orden={formOrden}
        ordenes={ordenes}
        cotizacionCodigo={(() => {
          if (!formOrden?.cotizacion_id) return null;
          const solicitud = solicitudes.find((s) =>
            s._cotizaciones.some((c) => c.id === formOrden.cotizacion_id),
          );
          return solicitud ? solicitud.cod_sol : null;
        })()}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        onCancelFromRead={(orden) => {
          setFormOpen(false);
          setACancelarOrden(orden);
        }}
        onEnviar={handleEnviar}
      />
      <CancelarOrdenModal
        orden={aCancelarOrden}
        onClose={() => setACancelarOrden(null)}
        onConfirm={handleCancelar}
      />

      {/* ── Modales del tab Cotizaciones ── */}
      <SolicitudFormModal
        catalogos={catalogosCotizacion}
        open={formSolicitudOpen}
        onClose={() => setFormSolicitudOpen(false)}
        onSave={handleCrearSolicitud}
      />
      <CotizacionFormModal
        condicionesPago={catalogos.condicionesPago}
        catalogos={catalogosCotizacion}
        solicitud={aCotizar}
        onClose={() => setACotizar(null)}
        onSave={handleGuardarCotizacion}
      />
      <CompararCotizacionesModal
        catalogos={catalogosCotizacion}
        solicitud={aComparar}
        onClose={() => setAComparar(null)}
        onAdjudicar={handleAdjudicar}
      />
      <CancelarSolicitudModal
        solicitud={aCancelarSolicitud}
        onClose={() => setACancelarSolicitud(null)}
        onConfirm={handleCancelarSolicitud}
      />
    </div>
  );
}

export default function ComprasPage() {
  return (
    <ToastProvider>
      {/* useSearchParams necesita un límite de Suspense: durante el prerender
          la query todavía no se conoce. */}
      <Suspense fallback={null}>
        <ComprasScreen />
      </Suspense>
    </ToastProvider>
  );
}
