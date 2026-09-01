"use client";

import { AlertTriangle, Building2, Download, Plus, RotateCcw, Search } from "lucide-react";
import { Suspense, useContext, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { CtaCorrienteCardHeader } from "@/components/proveedores/CtaCorrienteCardHeader";
import { CtaCorrienteDetalle } from "@/components/proveedores/CtaCorrienteDetalle";
import { CtaCorrienteList } from "@/components/proveedores/CtaCorrienteList";
import {
  FiltrosCtaCorrienteList,
  FiltrosCtaCorrienteListChips,
  FILTROS_CTA_LISTA_VACIOS,
  type FiltrosCtaCorrienteListValues,
} from "@/components/proveedores/FiltrosCtaCorriente";
import {
  RegistrarPagoModal,
  type PagoNuevo,
} from "@/components/proveedores/RegistrarPagoModal";
import { BajaProveedorModal } from "@/components/proveedores/BajaProveedorModal";
import {
  ComprobantesContent,
  type ComprobantesContentHandle,
  type TabView,
} from "@/components/comprobantes/ComprobantesContent";
import type { ComprobanteRow } from "@/components/comprobantes/ComprobantesTable";
import type { FiltroEstado } from "@/components/proveedores/FiltrosProveedores";
import { FiltrosProveedores } from "@/components/proveedores/FiltrosProveedores";
import {
  FiltrosComprobantes,
  FiltrosComprobantesChips,
  FILTROS_COMPROBANTES_VACIOS,
  type FiltrosComprobanteValues,
} from "@/components/comprobantes/FiltrosComprobantes";
import type { ProveedorModalMode } from "@/components/proveedores/ProveedorFormModal";
import { ProveedorFormModal } from "@/components/proveedores/ProveedorFormModal";
import { ProveedoresTable } from "@/components/proveedores/ProveedoresTable";
import { ProveedoresTabs, type TabProveedores } from "@/components/proveedores/ProveedoresTabs";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ProveedoresContext, ProveedoresProvider } from "@/context/ProveedoresContext";
import type { NuevoProveedorInput } from "@/context/ProveedoresContext";
import type { Proveedor } from "@/data/proveedores";
import {
  COMPROBANTES_POR_PROVEEDOR,
  DIAS_ALERTA_PROXIMO_VENCER,
  PAGOS_POR_PROVEEDOR,
  PROVEEDORES_CTA_CTE,
  type ComprobantePendiente,
  type EstadoCtaCte,
  type PagoProveedor,
  type ProveedorCtaCte,
} from "@/data/cuentas-corrientes";

function exportarCSV(proveedores: Proveedor[]) {
  const cabeceras = [
    "Razon Social",
    "CUIT",
    "Direccion",
    "Telefono",
    "Email",
    "Contacto",
    "FormasPago",
    "PlazoEntregaDias",
    "Estado",
  ];
  const filas = proveedores.map((p) =>
    [
      `"${p.razonSocial.replace(/"/g, '""')}"`,
      p.cuit,
      `"${p.direccion.replace(/"/g, '""')}"`,
      p.telefono,
      p.email,
      `"${p.contacto.replace(/"/g, '""')}"`,
      `"${p.formasPago.join(" / ").replace(/"/g, '""')}"`,
      String(p.plazoEntregaDias),
      p.estado,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "proveedores.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function exportarCSVCtaCte(listado: ProveedorCtaCte[]) {
  const cabeceras = ["Proveedor", "CUIT", "Deuda total", "Proximo vencimiento", "Estado"];
  const filas = listado.map((p) =>
    [
      `"${p.razonSocial.replace(/"/g, '""')}"`,
      p.cuit,
      String(p.saldoActual),
      p.proximoVencimiento ?? "",
      p.estadoCta,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cuentas-corrientes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function proveedorPorRazonSocial(listado: ProveedorCtaCte[], razonSocial: string) {
  return (
    listado.find(
      (p) => p.razonSocial.toLowerCase() === razonSocial.trim().toLowerCase(),
    ) ??
    null
  );
}

/** Deriva el estado cta.cte. de un proveedor a partir de su saldo y vencimiento. */
function derivarEstadoCta(saldoActual: number, proximoVencimiento: string | null): EstadoCtaCte {
  if (saldoActual < 0) return "Credito";
  if (saldoActual === 0) return "Saldado";
  if (!proximoVencimiento) return "Pendiente";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vto = new Date(`${proximoVencimiento}T00:00:00`);
  const diffDias = Math.round((vto.getTime() - hoy.getTime()) / 86400000);
  if (diffDias < 0) return "Vencido";
  if (diffDias <= DIAS_ALERTA_PROXIMO_VENCER) return "ProximoAVencer";
  return "Pendiente";
}

function ProveedoresScreen() {
  const { showToast } = useToast();

  const context = useContext(ProveedoresContext);
  if (!context) throw new Error("ProveedoresScreen debe usarse dentro de ProveedoresProvider");

  const {
    proveedores,
    formasPago,
    loading,
    error,
    recargar,
    agregarProveedor,
    actualizarProveedor,
    darDeBaja,
  } = context;

  // La pestaña inicial sale de la URL: /proveedores?tab=comprobantes viene del
  // redirect de la vieja ruta /proveedores/comprobantes.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<TabProveedores>(
    tabParam === "comprobantes" ? "comprobantes" : tabParam === "cta-corriente" ? "cta-corriente" : "proveedores",
  );

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("Todos");
  const [formaPagoFiltro, setFormaPagoFiltro] = useState("");

  // Historial de comprobantes — la búsqueda y los filtros viven en el header de la pantalla.
  const [busquedaComprobantes, setBusquedaComprobantes] = useState("");
  const [filtrosComprobantes, setFiltrosComprobantes] = useState<FiltrosComprobanteValues>(FILTROS_COMPROBANTES_VACIOS);

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ProveedorModalMode>("crear");
  const [proveedorActivo, setProveedorActivo] = useState<Proveedor | null>(null);
  const [aDarDeBaja, setADarDeBaja] = useState<Proveedor | null>(null);

  // El header abre el flujo "Nuevo comprobante" (vive dentro de ComprobantesContent).
  const comprobantesRef = useRef<ComprobantesContentHandle>(null);
  const [vistaComprobantes, setVistaComprobantes] = useState<TabView>("historial");

  // ── Cuenta corriente (tab "Cta. Cte.") ──────────────────────────────────────
  const [ctaCteBusqueda, setCtaCteBusqueda] = useState("");
  const [filtrosCtaCteLista, setFiltrosCtaCteLista] =
    useState<FiltrosCtaCorrienteListValues>(FILTROS_CTA_LISTA_VACIOS);
  const [ctaCteLoading, setCtaCteLoading] = useState(false);
  const [ctaCteError, setCtaCteError] = useState(false);
  // Listado y detalle viven en estado local para poder reflejar los pagos en tiempo real.
  const [ctaCteListado, setCtaCteListado] = useState<ProveedorCtaCte[]>(PROVEEDORES_CTA_CTE);
  const [ctaCteComprobantes, setCtaCteComprobantes] =
    useState<Record<number, ComprobantePendiente[]>>(COMPROBANTES_POR_PROVEEDOR);
  const [ctaCtePagos, setCtaCtePagos] =
    useState<Record<number, PagoProveedor[]>>(PAGOS_POR_PROVEEDOR);
  const [vistaCtaCte, setVistaCtaCte] = useState<"lista" | "detalle">("lista");
  const [proveedorCtaCte, setProveedorCtaCte] = useState<ProveedorCtaCte | null>(null);
  const [comprobanteResaltado, setComprobanteResaltado] = useState<number | null>(null);
  const [registrarPagoOpen, setRegistrarPagoOpen] = useState(false);
  // Paginación de la lista de cuentas corrientes.
  const [ctaCtePage, setCtaCtePage] = useState(1);
  const [ctaCtePageSize, setCtaCtePageSize] = useState(10);

  const filtrados = useMemo(() => {
    const base = proveedores;
    return base.filter((prov) => {
      if (estadoFiltro !== "Todos" && prov.estado !== estadoFiltro) return false;
      if (formaPagoFiltro && !prov.formasPago.includes(formaPagoFiltro)) return false;
      if (busqueda) {
        const query = busqueda.toLowerCase();
        return (
          prov.razonSocial.toLowerCase().includes(query) ||
          prov.cuit.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [proveedores, busqueda, estadoFiltro, formaPagoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);

  const hasActiveFilters = busqueda !== "" || estadoFiltro !== "Todos" || formaPagoFiltro !== "";

  const handleClearFilters = () => {
    setBusqueda("");
    setEstadoFiltro("Todos");
    setFormaPagoFiltro("");
    setPage(1);
  };

  const handleBusqueda = (q: string) => {
    setBusqueda(q);
    setPage(1);
  };

  const handleEstado = (e: FiltroEstado) => {
    setEstadoFiltro(e);
    setPage(1);
  };

  const handleFormaPago = (f: string) => {
    setFormaPagoFiltro(f);
    setPage(1);
  };

  const handleBusquedaComprobantes = (q: string) => {
    setBusquedaComprobantes(q);
    comprobantesRef.current?.resetPaginacion();
  };

  const handleFiltrosComprobantes = (f: FiltrosComprobanteValues) => {
    setFiltrosComprobantes(f);
    comprobantesRef.current?.resetPaginacion();
  };

  // ── Handlers de cuenta corriente ─────────────────────────────────────────────

  const ctaCteFiltrados = useMemo(() => {
    return ctaCteListado.filter((p) => {
      if (filtrosCtaCteLista.estado !== "Todos" && p.estadoCta !== filtrosCtaCteLista.estado) return false;
      if (
        filtrosCtaCteLista.vencimientoDesde &&
        p.proximoVencimiento &&
        p.proximoVencimiento < filtrosCtaCteLista.vencimientoDesde
      ) return false;
      if (
        filtrosCtaCteLista.vencimientoHasta &&
        p.proximoVencimiento &&
        p.proximoVencimiento > filtrosCtaCteLista.vencimientoHasta
      ) return false;
      if (filtrosCtaCteLista.montoMin && p.saldoActual < Number(filtrosCtaCteLista.montoMin)) return false;
      if (filtrosCtaCteLista.montoMax && p.saldoActual > Number(filtrosCtaCteLista.montoMax)) return false;
      if (ctaCteBusqueda) {
        const q = ctaCteBusqueda.toLowerCase();
        return (
          p.razonSocial.toLowerCase().includes(q) || p.cuit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ctaCteListado, ctaCteBusqueda, filtrosCtaCteLista]);

  const hasActiveFiltersCtaCte =
    ctaCteBusqueda !== "" || Object.values(filtrosCtaCteLista).some((v) => v !== "" && v !== "Todos");

  // Paginación de la lista de cuentas corrientes (mismo cálculo que en proveedores).
  const ctaCteTotalPages = Math.max(1, Math.ceil(ctaCteFiltrados.length / ctaCtePageSize));
  const ctaCteSafePage = Math.min(ctaCtePage, ctaCteTotalPages);
  const ctaCtePageItems = ctaCteFiltrados.slice(
    (ctaCteSafePage - 1) * ctaCtePageSize,
    ctaCteSafePage * ctaCtePageSize,
  );
  const ctaCtePageStart = ctaCteFiltrados.length === 0 ? 0 : (ctaCteSafePage - 1) * ctaCtePageSize + 1;
  const ctaCtePageEnd = Math.min(ctaCteSafePage * ctaCtePageSize, ctaCteFiltrados.length);

  const handleClearCtaCte = () => {
    setCtaCteBusqueda("");
    setFiltrosCtaCteLista(FILTROS_CTA_LISTA_VACIOS);
    setCtaCtePage(1);
  };

  const handleCtaCteBusqueda = (q: string) => {
    setCtaCteBusqueda(q);
    setCtaCtePage(1);
  };

  const handleFiltrosCtaCteLista = (f: FiltrosCtaCorrienteListValues) => {
    setFiltrosCtaCteLista(f);
    setCtaCtePage(1);
  };

  const abrirDetalleCta = (prov: ProveedorCtaCte) => {
    setProveedorCtaCte(prov);
    setComprobanteResaltado(null);
    setVistaCtaCte("detalle");
  };

  const abrirRegistrarPago = () => {
    if (!proveedorCtaCte) return;
    setRegistrarPagoOpen(true);
  };

  const handleRegistrarPago = (pago: PagoNuevo) => {
    // BACKEND: reemplazar por POST /api/pagos con { numero, formaPago, fecha, monto, imputaciones }
    if (!proveedorCtaCte) return;
    const provId = proveedorCtaCte.id;

    // Registrar el nuevo pago.
    setCtaCtePagos((prev) => ({
      ...prev,
      [provId]: [
        ...(prev[provId] ?? []),
        {
          id: Math.max(0, ...(ctaCtePagos[provId] ?? []).map((p) => p.id)) + 1,
          numero: pago.numero,
          fecha: pago.fecha,
          formaPago: pago.formaPago,
          monto: pago.monto,
          imputaciones: pago.imputaciones.map((i) => ({
            comprobanteId: i.comprobanteId,
            numero:
              ctaCteComprobantes[provId]?.find((c) => c.id === i.comprobanteId)?.numero ?? "",
            monto: i.monto,
          })),
        },
      ],
    }));

    // Bajar el saldo pendiente de cada comprobante imputado y recalcular el saldo
    // actual del proveedor y su estado.
    setCtaCteComprobantes((prevComps) => {
      const comps = (prevComps[provId] ?? []).map((c) => {
        const imp = pago.imputaciones.find((i) => i.comprobanteId === c.id);
        if (!imp) return c;
        const nuevoSaldo = c.saldoPendiente - imp.monto;
        const estado: EstadoCtaCte = nuevoSaldo <= 0 ? "Saldado" : c.estadoCta;
        return { ...c, saldoPendiente: nuevoSaldo, estadoCta: estado };
      });
      const nuevoSaldo = comps.reduce((acc, c) => acc + c.saldoPendiente, 0);
      setCtaCteListado((prev) =>
        prev.map((p) =>
          p.id === provId
            ? {
                ...p,
                saldoActual: nuevoSaldo,
                estadoCta: derivarEstadoCta(nuevoSaldo, p.proximoVencimiento),
              }
            : p,
        ),
      );
      setProveedorCtaCte((prevProv) =>
        prevProv
          ? {
              ...prevProv,
              saldoActual: nuevoSaldo,
              estadoCta: derivarEstadoCta(nuevoSaldo, prevProv.proximoVencimiento),
            }
          : prevProv,
      );
      return { ...prevComps, [provId]: comps };
    });

    setRegistrarPagoOpen(false);
    showToast("success", "Pago registrado correctamente. Se actualizó el saldo del proveedor.");
  };

  // Cross-navegación: botón "Ver en Cta. Cte." del historial de comprobantes.
  const handleVerCtaCte = (fila: ComprobanteRow) => {
    const prov = proveedorPorRazonSocial(ctaCteListado, fila.proveedor);
    if (!prov) {
      showToast("error", "No se encontró una cuenta corriente para ese proveedor.");
      return;
    }
    setTab("cta-corriente");
    setVistaCtaCte("detalle");
    setProveedorCtaCte(prov);
    setComprobanteResaltado(fila.id);
  };

  const handleReintentarCtaCte = () => {
    setCtaCteError(false);
    setCtaCteLoading(true);
    // BACKEND: reemplazar por GET /api/proveedores/cuenta-corriente
    window.setTimeout(() => {
      setCtaCteLoading(false);
    }, 600);
  };

  const abrirModal = (modo: ProveedorModalMode, prov?: Proveedor) => {
    setModalMode(modo);
    setProveedorActivo(prov || null);
    setModalOpen(true);
  };

  const handleSave = async (input: NuevoProveedorInput) => {
    if (modalMode === "crear") {
      const res = await agregarProveedor(input);
      if (!res.error) showToast("success", "Proveedor creado correctamente");
      return res;
    }
    if (modalMode === "editar" && proveedorActivo) {
      const res = await actualizarProveedor(proveedorActivo.id, input);
      if (!res.error) showToast("success", "Proveedor guardado correctamente");
      return res;
    }
    return {};
  };

  const confirmarBaja = async (prov: Proveedor) => {
    // El back rechaza la baja si el proveedor tiene órdenes de compra abiertas.
    const res = await darDeBaja(prov.id);
    setADarDeBaja(null);

    // El toast de éxito va DESPUÉS del early return: antes se mostraba
    // "dado de baja correctamente" aunque el back hubiera rechazado la baja.
    if (res.error) {
      showToast("error", res.error);
      return;
    }
    showToast("success", `${prov.razonSocial} fue dado de baja correctamente`);
  };

  const handleReintentar = () => recargar();

  const esProveedores = tab === "proveedores";
  const esComprobantes = tab === "comprobantes";
  const esCtaCorriente = tab === "cta-corriente";

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-900/10">
                    <Building2 className="h-6 w-6 text-brand-900" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col">
                    <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
                      Proveedores
                    </h1>
                    <p className="text-sm font-medium text-text-secondary">
                      Directorio, estado de cuentas y comprobantes de proveedores
                    </p>
                  </div>
                </div>

                <ProveedoresTabs active={tab} onChange={setTab} disabled={loading || error} />
              </div>

              {esProveedores && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg" onClick={() => abrirModal("crear")} disabled={loading || error}>
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    Nuevo proveedor
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      exportarCSV(filtrados);
                      showToast("success", "Exportación completada: el listado filtrado se descargó en CSV");
                    }}
                    disabled={loading || error || filtrados.length === 0}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar
                  </Button>
                </div>
              )}

              {esComprobantes && vistaComprobantes === "historial" && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="lg"
                    onClick={() => { comprobantesRef.current?.irANuevo(); setVistaComprobantes("nuevo"); }}
                    aria-label="Subir nuevo comprobante"
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    Nuevo comprobante
                  </Button>
                </div>
              )}

              {esCtaCorriente && vistaCtaCte === "lista" && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      exportarCSVCtaCte(ctaCteFiltrados);
                      showToast("success", "Exportación completada: el resumen se descargó en CSV");
                    }}
                    disabled={ctaCteLoading || ctaCteError || ctaCteFiltrados.length === 0}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar
                  </Button>
                </div>
              )}

              {esCtaCorriente && vistaCtaCte === "detalle" && proveedorCtaCte && (
                <CtaCorrienteCardHeader
                  proveedor={proveedorCtaCte}
                  onExportar={() => {
                    showToast("success", "Exportación completada: el detalle se descargó en PDF");
                  }}
                  onRegistrarPago={abrirRegistrarPago}
                />
              )}
            </div>

            {esProveedores && !error && (
              <FiltrosProveedores
                busqueda={busqueda}
                onBusquedaChange={handleBusqueda}
                estado={estadoFiltro}
                onEstadoChange={handleEstado}
                formaPago={formaPagoFiltro}
                onFormaPagoChange={handleFormaPago}
              />
            )}

            {esComprobantes && vistaComprobantes === "historial" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={busquedaComprobantes}
                      onChange={(e) => handleBusquedaComprobantes(e.target.value)}
                      placeholder="Buscar por nro. de comprobante, OC o proveedor..."
                      aria-label="Buscar por número de comprobante, OC o proveedor"
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                    />
                  </div>
                  <FiltrosComprobantes
                    values={filtrosComprobantes}
                    onChange={handleFiltrosComprobantes}
                    hideChips
                  />
                </div>
                <div className="flex flex-wrap items-center">
                  <FiltrosComprobantesChips
                    filtros={filtrosComprobantes}
                    onChange={handleFiltrosComprobantes}
                  />
                </div>
              </div>
            )}

            {esCtaCorriente && vistaCtaCte === "lista" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={ctaCteBusqueda}
                      onChange={(e) => handleCtaCteBusqueda(e.target.value)}
                      placeholder="Buscar por proveedor o CUIT..."
                      aria-label="Buscar por proveedor o CUIT"
                      className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                    />
                  </div>
                  <FiltrosCtaCorrienteList
                    values={filtrosCtaCteLista}
                    onChange={handleFiltrosCtaCteLista}
                    disabled={ctaCteLoading || ctaCteError}
                    hideChips
                  />
                </div>
                <FiltrosCtaCorrienteListChips
                  values={filtrosCtaCteLista}
                  onChange={handleFiltrosCtaCteLista}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          {esProveedores && (
            <section
              id="panel-proveedores"
              role="tabpanel"
              aria-labelledby="tab-proveedores"
              className="flex flex-col gap-5"
            >
              {error ? (
                <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                    <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                      No se pudieron cargar los proveedores
                    </h3>
                    <p className="max-w-sm text-sm text-text-secondary">
                      Hubo un problema al consultar el directorio. Revisá tu conexión e intentá de nuevo.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleReintentar}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                  </Button>
                </div>
              ) : (
                <>
                  <ProveedoresTable
                    proveedores={pageItems}
                    loading={loading}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={handleClearFilters}
                    onNueva={() => abrirModal("crear")}
                    onVer={(prov) => abrirModal("ver", prov)}
                    onEditar={(prov) => abrirModal("editar", prov)}
                    onBaja={setADarDeBaja}
                  />

                  {!loading && pageItems.length > 0 && (
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      totalItems={filtrados.length}
                      pageStart={pageStart}
                      pageEnd={pageEnd}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      disabled={error}
                    />
                  )}
                </>
              )}
            </section>
          )}

          {esComprobantes && (
            <div
              id="panel-comprobantes"
              role="tabpanel"
              aria-labelledby="tab-comprobantes"
              className="flex flex-col"
            >
<ComprobantesContent
                  ref={comprobantesRef}
                  tab={vistaComprobantes}
                  onTabChange={setVistaComprobantes}
                  busqueda={busquedaComprobantes}
                  filtros={filtrosComprobantes}
                  onBusquedaChange={handleBusquedaComprobantes}
                  onFiltrosChange={handleFiltrosComprobantes}
                  onVerCtaCte={handleVerCtaCte}
                />
            </div>
          )}

          {esCtaCorriente && (
            <div
              id="panel-cta-corriente"
              role="tabpanel"
              aria-labelledby="tab-cta-corriente"
              className="flex flex-col"
            >
              {ctaCteError ? (
                <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                    <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                      No se pudieron cargar las cuentas corrientes
                    </h3>
                    <p className="max-w-sm text-sm text-text-secondary">
                      Hubo un problema al consultar los saldos de los proveedores. Revisá tu conexión e intentá de nuevo.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleReintentarCtaCte}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                  </Button>
                </div>
              ) : vistaCtaCte === "lista" ? (
                <>
                  <CtaCorrienteList
                    proveedores={ctaCtePageItems}
                    loading={ctaCteLoading}
                    hasActiveFilters={hasActiveFiltersCtaCte}
                    onClearFilters={handleClearCtaCte}
                    onVer={abrirDetalleCta}
                  />

                  {!ctaCteLoading && ctaCtePageItems.length > 0 && (
                    <Pagination
                      page={ctaCteSafePage}
                      totalPages={ctaCteTotalPages}
                      totalItems={ctaCteFiltrados.length}
                      pageStart={ctaCtePageStart}
                      pageEnd={ctaCtePageEnd}
                      pageSize={ctaCtePageSize}
                      onPageChange={setCtaCtePage}
                      onPageSizeChange={setCtaCtePageSize}
                      disabled={ctaCteError}
                      itemLabel="cuentas corrientes"
                    />
                  )}
                </>
              ) : proveedorCtaCte ? (
                <CtaCorrienteDetalle
                  proveedor={proveedorCtaCte}
                  comprobantes={ctaCteComprobantes[proveedorCtaCte.id] ?? []}
                  pagos={ctaCtePagos[proveedorCtaCte.id] ?? []}
                  comprobanteResaltado={comprobanteResaltado}
                  onVolver={() => setVistaCtaCte("lista")}
                  onExportar={() => {
                    // BACKEND: reemplazar por POST /api/proveedores/{id}/cta-corriente/pdf
                    showToast("success", "Exportación completada: el detalle se descargó en PDF");
                  }}
                  onRegistrarPago={abrirRegistrarPago}
                />
              ) : null}
            </div>
          )}
        </div>
      </main>

      <ProveedorFormModal
        open={modalOpen}
        modo={modalMode}
        proveedor={proveedorActivo}
        formasPagoDisponibles={formasPago}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <BajaProveedorModal
        proveedor={aDarDeBaja}
        onClose={() => setADarDeBaja(null)}
        onConfirm={confirmarBaja}
      />

      <RegistrarPagoModal
        open={registrarPagoOpen}
        proveedor={proveedorCtaCte}
        comprobantes={proveedorCtaCte ? (ctaCteComprobantes[proveedorCtaCte.id] ?? []) : []}
        pagosExistentes={proveedorCtaCte ? (ctaCtePagos[proveedorCtaCte.id] ?? []) : []}
        onClose={() => setRegistrarPagoOpen(false)}
        onConfirm={handleRegistrarPago}
      />
    </div>
  );
}

export default function ProveedoresPage() {
  return (
    <ToastProvider>
      <ProveedoresProvider>
        {/* useSearchParams necesita un límite de Suspense: durante el prerender
            la query todavía no se conoce. */}
        <Suspense fallback={null}>
          <ProveedoresScreen />
        </Suspense>
      </ProveedoresProvider>
    </ToastProvider>
  );
}