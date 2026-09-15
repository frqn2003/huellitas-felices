"use client";

import { AlertTriangle, CalendarDays, PawPrint, Plus, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { ClienteModalMode } from "@/components/clientes/ClienteFormModal";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { ClientesTable } from "@/components/clientes/ClientesTable";
import type { FiltroEstado } from "@/components/clientes/FiltrosClientes";
import { FiltrosClientes } from "@/components/clientes/FiltrosClientes";
import { Sidebar } from "@/components/layout/Sidebar";
import type { TabRecepcion } from "@/components/recepcion/RecepcionTabs";
import { RecepcionTabs } from "@/components/recepcion/RecepcionTabs";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import type { Cliente, ClienteDraft } from "@/data/clientes";
import { clientesIniciales, SIMULAR_ERROR, SIMULAR_VACIO } from "@/data/clientes";
import { mascotasPorCliente } from "@/data/clientes";

function ClientesScreen() {
  const { showToast } = useToast();

  // El tab inicial sale de la URL: ?tab=mascotas o ?tab=turnos viene del item
  // de la nueva ruta (patrón Compras). Por defecto, Clientes.
  const searchParams = useSearchParams();
  const tabInicial: TabRecepcion =
    searchParams.get("tab") === "mascotas"
      ? "mascotas"
      : searchParams.get("tab") === "turnos"
        ? "turnos"
        : "clientes";
  const [tab, setTab] = useState<TabRecepcion>(tabInicial);

  // BACKEND: reemplazar por GET /api/clientes (con su estado de carga/error
  // compartido); el alta/edición/baja pasan a POST/PUT/PATCH en ClientesContext.
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(SIMULAR_ERROR);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("Activo");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ClienteModalMode>("crear");
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);

  // El listado muestra por defecto SÓLO activos (criterio HU-CLI-01): el
  // filtro arranca en "Activo" y el usuario lo amplía a "Inactivos"/"Todos".
  const filtrados = useMemo(() => {
    const base = SIMULAR_VACIO ? [] : clientes;
    return base.filter((cli) => {
      if (estadoFiltro !== "Todos" && cli.estado !== estadoFiltro.toLowerCase()) return false;
      if (busqueda) {
        const query = busqueda.toLowerCase();
        return (
          cli.nombre.toLowerCase().includes(query) ||
          cli.apellido.toLowerCase().includes(query) ||
          `${cli.nombre} ${cli.apellido}`.toLowerCase().includes(query) ||
          cli.documento.toLowerCase().includes(query) ||
          cli.telefono.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [clientes, busqueda, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);

  const hasActiveFilters = busqueda !== "" || estadoFiltro !== "Activo";

  const handleClearFilters = () => {
    setBusqueda("");
    setEstadoFiltro("Activo");
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

  const abrirModal = (modo: ClienteModalMode, cli?: Cliente) => {
    setModalMode(modo);
    setClienteActivo(cli || null);
    setModalOpen(true);
  };

  // BACKEND: los draft viajan al POST/PUT; el toggle a Inactivo → PATCH
  // /api/clientes/:id/inactivar. El id numérico lo genera la base.
  const handleSave = async (draft: ClienteDraft): Promise<{ error?: string }> => {
    if (modalMode === "crear") {
      const nuevo: Cliente = { ...draft, id: Math.max(0, ...clientes.map((c) => c.id)) + 1 };
      setClientes((prev) => [...prev, nuevo]);
      showToast("success", "Cliente creado correctamente");
      return {};
    }
    if (modalMode === "editar" && clienteActivo) {
      const actualizado: Cliente = { ...draft, id: clienteActivo.id };
      setClientes((prev) => prev.map((c) => (c.id === clienteActivo.id ? actualizado : c)));
      showToast(
        "success",
        actualizado.estado === "inactivo"
          ? `${actualizado.nombre} ${actualizado.apellido} fue dado de baja correctamente`
          : "Cliente guardado correctamente",
      );
      return {};
    }
    return {};
  };

  const handleReintentar = () => {
    setError(false);
    setCargando(true);
    // BACKEND: acá iría el fetch real (recargar() del context).
    window.setTimeout(() => {
      setCargando(false);
    }, 400);
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
                  Gestión de recepción
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Recepción
                </h1>
              </div>
              {tab === "clientes" && (
                <Button size="lg" onClick={() => abrirModal("crear")} disabled={cargando || error}>
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Nuevo cliente
                </Button>
              )}
            </div>

            <RecepcionTabs active={tab} onChange={setTab} disabled={cargando || error} />

            {tab === "clientes" && !error && (
              <FiltrosClientes
                busqueda={busqueda}
                onBusquedaChange={handleBusqueda}
                estado={estadoFiltro}
                onEstadoChange={handleEstado}
              />
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          {tab === "clientes" && (
            <>
              {error ? (
                <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                    <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                      No se pudieron cargar los clientes
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
                  <ClientesTable
                    clientes={pageItems}
                    // BACKEND: reemplazar por el mapa de mascotas de la API
                    // (GET /api/clientes/:id/mascotas por cliente, tabla mascota).
                    mascotasPorCliente={mascotasPorCliente}
                    loading={cargando}
                    hasActiveFilters={hasActiveFilters}
                    onClearFilters={handleClearFilters}
                    onNuevo={() => abrirModal("crear")}
                    onVer={(cli) => abrirModal("ver", cli)}
                    onEditar={(cli) => abrirModal("editar", cli)}
                  />

                  {!cargando && pageItems.length > 0 && (
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      totalItems={filtrados.length}
                      pageStart={pageStart}
                      pageEnd={pageEnd}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      itemLabel="clientes"
                    />
                  )}
                </>
              )}
            </>
          )}

          {(tab === "mascotas" || tab === "turnos") && (
            <div
              role="tabpanel"
              id={`panel-recepcion-${tab}`}
              aria-labelledby={`tab-recepcion-${tab}`}
              className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
                {tab === "mascotas" ? (
                  <PawPrint className="h-7 w-7 text-brand-900" aria-hidden="true" />
                ) : (
                  <CalendarDays className="h-7 w-7 text-brand-900" aria-hidden="true" />
                )}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                  {tab === "mascotas" ? "Mascotas" : "Turnos"}
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  {tab === "mascotas"
                    ? "El listado de mascotas llega en una próxima entrega (HU-MAS)."
                    : "La agenda de turnos llega en una próxima entrega (HU-TUR)."}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <ClienteFormModal
        open={modalOpen}
        modo={modalMode}
        cliente={clienteActivo}
        clientes={clientes}
        // BACKEND: reemplazar por GET /api/clientes/:id/mascotas (tabla mascota).
        mascotas={clienteActivo ? mascotasPorCliente[clienteActivo.id] ?? [] : []}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default function ClientesPage() {
  return (
    <ToastProvider>
      <ClientesScreen />
    </ToastProvider>
  );
}