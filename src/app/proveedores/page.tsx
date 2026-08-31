"use client";

import { AlertTriangle, Building2, Download, Plus, RotateCcw, Search } from "lucide-react";
import { Suspense, useContext, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BajaProveedorModal } from "@/components/proveedores/BajaProveedorModal";
import {
  ComprobantesContent,
  type ComprobantesContentHandle,
  type TabView,
} from "@/components/comprobantes/ComprobantesContent";
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
    tabParam === "comprobantes" ? "comprobantes" : "proveedores",
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

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
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
            </div>
            <ProveedoresTabs active={tab} onChange={setTab} disabled={loading || error} />

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
                />
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