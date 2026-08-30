"use client";

import { AlertTriangle, Download, FilePlus2, PackagePlus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { RecepcionDetalleModal } from "@/components/recepciones/RecepcionDetalleModal";
import { RecepcionFormModal } from "@/components/recepciones/RecepcionFormModal";
import { RecepcionesTable } from "@/components/recepciones/RecepcionesTable";
import {
  FILTROS_RECEPCION_VACIOS,
  FiltrosChipsRecepciones,
  FiltrosRecepciones,
  type FiltrosRecepcion,
} from "@/components/recepciones/FiltrosRecepciones";
import { useCotizaciones, type AsignacionArticulo } from "@/context/CotizacionesContext";
import { articulosIniciales, PROVEEDORES } from "@/data/articulos";
import {
  SIMULAR_ERROR as SIMULAR_ERROR_COT,
  SIMULAR_VACIO as SIMULAR_VACIO_COT,
  codigoSolicitud,
  type SolicitudCotizacion,
} from "@/data/cotizaciones";
import type { OrdenCompra } from "@/data/ordenes-compra";
import {
  DEPOSITO_ENTREGA_DEFAULT_ID,
  SIMULAR_ERROR,
  SIMULAR_VACIO,
  USUARIO_SESION,
  formatFecha,
  numeroOrden,
  ordenesCompraIniciales,
  parseImporte,
} from "@/data/ordenes-compra";
import { depositosIniciales } from "@/data/stock";
import {
  recepcionesIniciales,
  ordenesDisponibles,
  type Recepcion,
} from "@/data/recepciones";

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
      numeroOrden(o.id),
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
  // La simulación de vacío filtra la fuente; el estado vivo lo maneja el contexto.
  const solicitudesDemo = useMemo(
    () => (SIMULAR_VACIO_COT ? [] : solicitudes),
    [solicitudes],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [tab, setTab] = useState<TabCompras>("ordenes");

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

  // ── Estado del tab "Recepciones" ─────────────────────────────────────
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [busquedaRec, setBusquedaRec] = useState("");
  const [filtrosRec, setFiltrosRec] = useState<FiltrosRecepcion>(FILTROS_RECEPCION_VACIOS);
  const [pageSizeRec, setPageSizeRec] = useState(10);
  const [pageRec, setPageRec] = useState(1);
  const [formRecepcionOpen, setFormRecepcionOpen] = useState(false);
  const [aVerDetalleRec, setAVerDetalleRec] = useState<Recepcion | null>(null);

  useEffect(() => {
    // BACKEND: reemplazar la simulación por GET /api/ordenes-compra y
    // GET /api/solicitudes-cotizacion (con cotizaciones y detalles resueltos
    // por JOINs). Los estados SIMULAR_VACIO / SIMULAR_ERROR controlan la demo.
    const timer = window.setTimeout(() => {
      // Inicializar el tab desde la URL (?tab=cotizaciones viene del redirect
      // de la antigua ruta /cotizaciones). Los tabs están disabled durante el
      // loading, así que el cambio no se percibe como salto.
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "ordenes" || tabParam === "cotizaciones" || tabParam === "recepciones") {
        setTab(tabParam);
      }
      if (SIMULAR_ERROR) {
        setError(true);
      } else {
        setOrdenes(SIMULAR_VACIO ? [] : ordenesCompraIniciales);
        setRecepciones(recepcionesIniciales);
      }
      if (SIMULAR_ERROR_COT) {
        setError(true);
      }
      setLoading(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  // ── Filtrado órdenes ────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const totalMin = parseRango(filtros.totalMin);
    const totalMax = parseRango(filtros.totalMax);
    const lista = ordenes.filter((o) => {
      const matchBusqueda =
        !q ||
        numeroOrden(o.id).toLowerCase().includes(q) ||
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

  const handleSave = (draft: OrdenDraft) => {
    // BACKEND: enviar el draft por POST /api/ordenes-compra (alta) o
    // PUT /api/ordenes-compra/:id (edición, solo si sigue Pendiente).
    // El back calcula totales, asigna el número OC-XXXX y registra la bitácora
    // de auditoría (usuario, fecha/hora, valores anterior y nuevo).
    const proveedor = PROVEEDORES.find((p) => p.id === Number(draft.proveedorId));
    // La BD guarda solo el varchar direccion_entrega (sin FK a deposito):
    // se resuelve la ubicación del depósito elegido en el catálogo.
    const depositoEntrega = depositosIniciales.find(
      (d) => d.id === Number(draft.depositoEntregaId),
    );
    const detallesBase = draft.lineas.map((l) => ({
      articulo_id: Number(l.articuloId),
      cantidad: parseImporte(l.cantidad),
      precio_acordado: parseImporte(l.precio),
    }));
    const subtotal = round2(
      detallesBase.reduce((acc, d) => acc + d.cantidad * d.precio_acordado, 0),
    );
    // El descuento se ingresa como porcentaje (0-100); la columna `descuento`
    // de `orden_compra` guarda ese porcentaje y el monto se calcula acá.
    const descuentoPct = draft.descuento.trim() !== "" ? parseImporte(draft.descuento) : 0;
    const descuentoMonto = round2((subtotal * descuentoPct) / 100);
    const gastosEnvio = draft.gastosEnvio.trim() !== "" ? parseImporte(draft.gastosEnvio) : 0;
    const total = round2(subtotal - descuentoMonto + gastosEnvio);

    if (formModo === "INSERCION") {
      const nuevoId = Math.max(0, ...ordenes.map((o) => o.id)) + 1;
      let detalleId = Math.max(0, ...ordenes.flatMap((o) => o._detalles.map((d) => d.id)));
      const nueva: OrdenCompra = {
        id: nuevoId,
        proveedor_id: Number(draft.proveedorId),
        cotizacion_id: null,
        usuario_id: USUARIO_SESION.id,
        fecha: `${draft.fecha}T12:00:00Z`,
        fecha_entrega: draft.fechaEntrega ? `${draft.fechaEntrega}T12:00:00Z` : null,
        direccion_entrega: depositoEntrega?.ubicacion ?? "",
        condicion_pago: draft.condicionPago,
        notas: draft.notas.trim() || null,
        subtotal,
        descuento: descuentoPct,
        gastos_envio: gastosEnvio,
        total,
        estado: "Pendiente",
        _proveedor: { id: proveedor?.id ?? 0, razon_social: proveedor?.nombre ?? "" },
        _usuario: { id: USUARIO_SESION.id, nombre: USUARIO_SESION.nombre },
        _detalles: detallesBase.map((d) => ({
          id: ++detalleId,
          orden_compra_id: nuevoId,
          ...d,
        })),
      };
      setOrdenes((prev) => [nueva, ...prev]);
      setFormOpen(false);
      showToast("success", TITULO_ACCIONES.INSERCION);
    } else if (formModo === "EDICION" && formOrden) {
      let detalleId = Math.max(0, ...ordenes.flatMap((o) => o._detalles.map((d) => d.id)));
      setOrdenes((prev) =>
        prev.map((o) =>
          o.id === formOrden.id
            ? {
                ...o,
                proveedor_id: Number(draft.proveedorId),
                fecha: `${draft.fecha}T12:00:00Z`,
                fecha_entrega: draft.fechaEntrega ? `${draft.fechaEntrega}T12:00:00Z` : null,
                direccion_entrega: depositoEntrega?.ubicacion ?? "",
                condicion_pago: draft.condicionPago,
                notas: draft.notas.trim() || null,
                subtotal,
                descuento: descuentoPct,
                gastos_envio: gastosEnvio,
                total,
                _proveedor: { id: proveedor?.id ?? 0, razon_social: proveedor?.nombre ?? "" },
                _detalles: detallesBase.map((d) => ({
                  id: ++detalleId,
                  orden_compra_id: o.id,
                  ...d,
                })),
              }
            : o,
        ),
      );
      setFormOpen(false);
      showToast("success", TITULO_ACCIONES.EDICION);
    }
  };

  const handleEnviar = (orden: OrdenCompra) => {
    // BACKEND: PATCH /api/ordenes-compra/:id/enviar + registro de auditoría.
    // (Antes "Aprobar": la orden se marca como enviada al proveedor.)
    setOrdenes((prev) =>
      prev.map((o) => (o.id === orden.id ? { ...o, estado: "Enviada" } : o)),
    );
    setFormOrden((actual) =>
      actual && actual.id === orden.id ? { ...actual, estado: "Enviada" } : actual,
    );
    showToast("success", "Orden enviada al proveedor correctamente");
  };

  const handleCancelar = (orden: OrdenCompra) => {
    // BACKEND: PATCH /api/ordenes-compra/:id/cancelar (baja lógica) + auditoría.
    // Los artículos no recepcionados vuelven a estar disponibles para nuevas órdenes.
    setOrdenes((prev) =>
      prev.map((o) => (o.id === orden.id ? { ...o, estado: "Cancelada" } : o)),
    );
    setACancelarOrden(null);
    setFormOpen(false);
    showToast("success", "Orden cancelada correctamente");
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
        codigoSolicitud(s.id).toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        s._articulos_solicitados.some((a) => {
          // BACKEND: nombre del artículo resuelto por JOIN del detalle.
          const nombre =
            articulosIniciales.find((x) => x.id === a.articulo_id)?.nombre ?? "";
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

  // ── Filtrado recepciones ─────────────────────────────────────────────
  const filtradasRec = useMemo(() => {
    const q = busquedaRec.trim().toLowerCase();
    const lista = recepciones.filter((r) => {
      const matchBusqueda =
        !q ||
        r.numero.toLowerCase().includes(q) ||
        r.ordenCompra.numero.toLowerCase().includes(q) ||
        r.ordenCompra.proveedor.razonSocial.toLowerCase().includes(q);
      const matchTipo =
        filtrosRec.tipo === "Todas" || r.tipo_recepcion === filtrosRec.tipo;
      const matchProveedor =
        !filtrosRec.proveedorId ||
        r.ordenCompra.proveedor.id === Number(filtrosRec.proveedorId);
      return matchBusqueda && matchTipo && matchProveedor;
    });
    return lista.sort((a, b) =>
      filtrosRec.ordenFecha === "antiguas"
        ? Date.parse(a.fecha_hora) - Date.parse(b.fecha_hora)
        : Date.parse(b.fecha_hora) - Date.parse(a.fecha_hora),
    );
  }, [recepciones, busquedaRec, filtrosRec]);

  const totalPagesRec = Math.max(1, Math.ceil(filtradasRec.length / pageSizeRec));
  const safePageRec = Math.min(pageRec, totalPagesRec);
  const pageItemsRec = filtradasRec.slice(
    (safePageRec - 1) * pageSizeRec,
    safePageRec * pageSizeRec,
  );
  const pageStartRec = filtradasRec.length === 0 ? 0 : (safePageRec - 1) * pageSizeRec + 1;
  const pageEndRec = Math.min(safePageRec * pageSizeRec, filtradasRec.length);
  const hasActiveFiltersRec =
    busquedaRec.trim() !== "" ||
    filtrosRec.tipo !== FILTROS_RECEPCION_VACIOS.tipo ||
    filtrosRec.proveedorId !== "";

  const handleBusquedaRec = (value: string) => {
    setBusquedaRec(value);
    setPageRec(1);
  };

  const handleFiltrosRec = (next: FiltrosRecepcion) => {
    setFiltrosRec(next);
    setPageRec(1);
  };

  const limpiarTodoRec = () => {
    setBusquedaRec("");
    setFiltrosRec(FILTROS_RECEPCION_VACIOS);
  };

  const handleSaveRecepcion = (recepcion: Recepcion) => {
    setRecepciones((prev) => [recepcion, ...prev]);
    setFormRecepcionOpen(false);
    showToast("success", "Recepción registrada correctamente");
  };

  const ordenesPendientes = useMemo(() => {
    const ocIds = new Set(recepciones.map((r) => r.orden_compra_id));
    return ordenesDisponibles.filter((oc) => !ocIds.has(oc.id));
  }, [recepciones]);

  const handleCrearSolicitud = (input: Parameters<typeof crearSolicitud>[0]) => {
    // BACKEND: POST /api/solicitudes-cotizacion (lo hace el provider).
    crearSolicitud(input);
    setFormSolicitudOpen(false);
    showToast("success", "Solicitud creada correctamente");
  };

  const handleGuardarCotizacion = (input: Parameters<typeof registrarCotizacion>[1]) => {
    if (!aCotizar) return;
    // BACKEND: POST /api/solicitudes-cotizacion/:id/cotizaciones.
    registrarCotizacion(aCotizar.id, input);
    setACotizar(null);
    showToast("success", "Cotización registrada correctamente");
  };

  const handleAdjudicar = (asignaciones: AsignacionArticulo[]) => {
    if (!aComparar) return;
    const solicitud = aComparar;

    // Agrupar por cotización: cada proveedor recibe su propia orden solo con
    // los artículos que le asignaron en la comparación (adjudicación split).
    const porCotizacion = new Map<number, AsignacionArticulo[]>();
    asignaciones.forEach((a) => {
      const grupo = porCotizacion.get(a.cotizacionId) ?? [];
      grupo.push(a);
      porCotizacion.set(a.cotizacionId, grupo);
    });

    // BACKEND: PATCH /api/solicitudes-cotizacion/:id/adjudicar. El back crea
    // las orden_compra en transacción (una por proveedor, cada una vinculada
    // por orden_compra.cotizacion_id) y registra la auditoría.
    adjudicarPorArticulo(solicitud.id);

    const depositoEntrega = depositosIniciales.find(
      (d) => d.id === DEPOSITO_ENTREGA_DEFAULT_ID,
    );

    setOrdenes((prev) => {
      let nuevoId = Math.max(0, ...prev.map((o) => o.id));
      let detalleId = Math.max(0, ...prev.flatMap((o) => o._detalles.map((d) => d.id)));
      const nuevas: OrdenCompra[] = [];
      porCotizacion.forEach((lineas, cotizacionId) => {
        const cotizacion = solicitud._cotizaciones.find((c) => c.id === cotizacionId);
        if (!cotizacion) return;
        const detallesBase = lineas.map((l) => {
          const solicitado = solicitud._articulos_solicitados.find(
            (x) => x.articulo_id === l.articuloId,
          );
          return {
            articulo_id: l.articuloId,
            cantidad: solicitado?.cantidad_estimada ?? 0,
            precio_acordado:
              cotizacion._detalles.find((d) => d.articulo_id === l.articuloId)?.precio ?? 0,
          };
        });
        const subtotal = round2(
          detallesBase.reduce((acc, d) => acc + d.cantidad * d.precio_acordado, 0),
        );
        nuevas.push({
          id: ++nuevoId,
          proveedor_id: cotizacion.proveedor_id,
          cotizacion_id: cotizacion.id,
          usuario_id: USUARIO_SESION.id,
          fecha: new Date().toISOString(),
          fecha_entrega: null,
          direccion_entrega: depositoEntrega?.ubicacion ?? "",
          condicion_pago: cotizacion.condicion_pago,
          notas:
            solicitud.notas ??
            `Generada desde la solicitud ${codigoSolicitud(solicitud.id)}.`,
          subtotal,
          descuento: 0,
          gastos_envio: 0,
          total: subtotal,
          estado: "Pendiente",
          _proveedor: { ...cotizacion._proveedor },
          _usuario: { id: USUARIO_SESION.id, nombre: USUARIO_SESION.nombre },
          _detalles: detallesBase.map((d) => ({
            id: ++detalleId,
            orden_compra_id: nuevoId,
            ...d,
          })),
        });
      });
      return [...nuevas, ...prev];
    });

    setAComparar(null);
    showToast(
      "success",
      `Se generaron ${porCotizacion.size} ${
        porCotizacion.size === 1 ? "orden de compra" : "órdenes de compra"
      } pendientes`,
    );
    setTab("ordenes");
  };

  const handleCancelarSolicitud = (solicitud: SolicitudCotizacion) => {
    // BACKEND: PATCH /api/solicitudes-cotizacion/:id/cancelar (baja lógica).
    cancelarSolicitud(solicitud.id);
    setACancelarSolicitud(null);
    showToast("success", "Solicitud cancelada correctamente");
  };

  const esOrdenes = tab === "ordenes";
  const esCotizaciones = tab === "cotizaciones";
  const esRecepciones = tab === "recepciones";

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
                {esRecepciones && (
                  <Button
                    onClick={() => setFormRecepcionOpen(true)}
                    disabled={loading || error}
                    size="lg"
                  >
                    <PackagePlus className="h-5 w-5" aria-hidden="true" />
                    Nueva
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

            {esRecepciones && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={busquedaRec}
                      onChange={(e) => handleBusquedaRec(e.target.value)}
                      placeholder="Buscar por N° de recepción, OC o proveedor..."
                      aria-label="Buscar por número de recepción, orden de compra o proveedor"
                      disabled={loading || error}
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </div>
                  <FiltrosRecepciones
                    filtros={filtrosRec}
                    onChange={handleFiltrosRec}
                    disabled={loading || error}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosChipsRecepciones filtros={filtrosRec} onChange={handleFiltrosRec} />
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
                  window.setTimeout(() => {
                    setOrdenes(SIMULAR_VACIO ? [] : ordenesCompraIniciales);
                    setLoading(false);
                  }, 900);
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

              {esRecepciones && (
                <div
                  id="panel-recepciones"
                  role="tabpanel"
                  aria-labelledby="tab-recepciones"
                  className="flex flex-col gap-6"
                >
                  <RecepcionesTable
                    recepciones={pageItemsRec}
                    loading={loading}
                    hasActiveFilters={hasActiveFiltersRec}
                    onClearFilters={limpiarTodoRec}
                    onNueva={() => setFormRecepcionOpen(true)}
                    onView={setAVerDetalleRec}
                  />
                  {!loading && pageItemsRec.length > 0 && (
                    <Pagination
                      page={safePageRec}
                      totalPages={totalPagesRec}
                      totalItems={filtradasRec.length}
                      pageStart={pageStartRec}
                      pageEnd={pageEndRec}
                      pageSize={pageSizeRec}
                      onPageChange={setPageRec}
                      onPageSizeChange={setPageSizeRec}
                      disabled={loading || error}
                      itemLabel="recepciones"
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
        open={formOpen}
        modo={formModo}
        orden={formOrden}
        ordenes={ordenes}
        cotizacionCodigo={(() => {
          if (!formOrden?.cotizacion_id) return null;
          const solicitud = solicitudes.find((s) =>
            s._cotizaciones.some((c) => c.id === formOrden.cotizacion_id),
          );
          return solicitud ? codigoSolicitud(solicitud.id) : null;
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
        open={formSolicitudOpen}
        onClose={() => setFormSolicitudOpen(false)}
        onSave={handleCrearSolicitud}
      />
      <CotizacionFormModal
        solicitud={aCotizar}
        onClose={() => setACotizar(null)}
        onSave={handleGuardarCotizacion}
      />
      <CompararCotizacionesModal
        solicitud={aComparar}
        onClose={() => setAComparar(null)}
        onAdjudicar={handleAdjudicar}
      />
      <CancelarSolicitudModal
        solicitud={aCancelarSolicitud}
        onClose={() => setACancelarSolicitud(null)}
        onConfirm={handleCancelarSolicitud}
      />

      {/* ── Modales del tab Recepciones ── */}
      <RecepcionFormModal
        open={formRecepcionOpen}
        onClose={() => setFormRecepcionOpen(false)}
        onConfirm={handleSaveRecepcion}
        ordenes={ordenesPendientes}
        numeroSiguiente={recepciones.length + 1}
      />
      <RecepcionDetalleModal
        recepcion={aVerDetalleRec}
        onClose={() => setAVerDetalleRec(null)}
      />
    </div>
  );
}

export default function ComprasPage() {
  return (
    <ToastProvider>
      <ComprasScreen />
    </ToastProvider>
  );
}
