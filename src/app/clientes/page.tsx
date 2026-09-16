"use client";

import { AlertTriangle, Plus, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { ClienteModalMode } from "@/components/clientes/ClienteFormModal";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { ClientesTable } from "@/components/clientes/ClientesTable";
import type { FiltroEstado as FiltroEstadoCliente } from "@/components/clientes/FiltrosClientes";
import { FiltrosClientes } from "@/components/clientes/FiltrosClientes";
import { Sidebar } from "@/components/layout/Sidebar";
import type { FiltroEspecie as FiltroEspecieMascota } from "@/components/mascotas/FiltrosMascotas";
import type { FiltroSexo as FiltroSexoMascota } from "@/components/mascotas/FiltrosMascotas";
import { FiltrosMascotas } from "@/components/mascotas/FiltrosMascotas";
import type { MascotaModalMode } from "@/components/mascotas/MascotaFormModal";
import { MascotaFormModal } from "@/components/mascotas/MascotaFormModal";
import { MascotasTable } from "@/components/mascotas/MascotasTable";
import type { TabRecepcion } from "@/components/recepcion/RecepcionTabs";
import { RecepcionTabs } from "@/components/recepcion/RecepcionTabs";
import { TurnosContent } from "@/components/turnos/TurnosContent";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import type { Cliente, ClienteDraft } from "@/data/clientes";
import { clientesIniciales, mascotasPorCliente } from "@/data/clientes";
import type { Mascota, MascotaDraft } from "@/data/mascotas";
import {
  mascotasIniciales,
  SIMULAR_ERROR as SIMULAR_ERROR_MASCOTA,
  SIMULAR_VACIO as SIMULAR_VACIO_MASCOTA,
} from "@/data/mascotas";
import type { Turno } from "@/data/turnos";
import { turnosIniciales } from "@/data/turnos";

function ClientesScreen() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // El CTA "Nuevo turno" del header abre el wizard que vive en TurnosContent.
  // La apertura está controlada acá (open + remount-key por apertura, técnica de
  // MascotaFormModal) para que cada alta arranque siempre en el Paso 1.
  const [turnoWizardOpen, setTurnoWizardOpen] = useState(false);
  const [turnoWizardSession, setTurnoWizardSession] = useState(0);
  const solicitarNuevoTurno = () => {
    setTurnoWizardSession((s) => s + 1);
    setTurnoWizardOpen(true);
  };

  // El tab y el dueño se DERIVAN de la URL (?tab= / ?dueno=): vienen de la
  // patita de ClientesTable y de la navegación interna. Cambiar de tab o quitar
  // el chip actualiza la URL con router.replace (patrón ?tab= de Compras), sin
  // estado duplicado ni efectos.
  // El tab, el dueño y la búsqueda de clientes se DERIVAN de la URL
  // (?tab= / ?dueno= / ?busqueda=): vienen de la patita de ClientesTable, del
  // icono "Ver dueño" de MascotasTable (que navega a la ficha del cliente
  // pre-filtrada) y de la navegación interna. Cambiar cualquiera actualiza la
  // URL con router.replace (patrón ?tab= de Compras), sin estado duplicado ni
  // efectos.
  const tab: TabRecepcion =
    searchParams.get("tab") === "mascotas"
      ? "mascotas"
      : searchParams.get("tab") === "turnos"
        ? "turnos"
        : "clientes";
  const dueno: number | null = useMemo(() => {
    const raw = searchParams.get("dueno");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }, [searchParams]);
  const busquedaClientes = searchParams.get("busqueda") ?? "";

  // BACKEND: reemplazar por GET /api/clientes (con su estado de carga/error
  // compartido); el alta/edición/baja pasan a POST/PUT/PATCH en ClientesContext.
  const [clientes, setClientes] = useState<Cliente[]>(clientesIniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  // --- Estado de la tab Mascotas (HU-MAS-01) ---
  // BACKEND: reemplazar por GET /api/mascotas (tabla mascota, contrato sección 8).
  const [mascotas, setMascotas] = useState<Mascota[]>(mascotasIniciales);
  const [cargandoMascotas, setCargandoMascotas] = useState(false);
  const [errorMascotas, setErrorMascotas] = useState(SIMULAR_ERROR_MASCOTA);

  const [estadoFiltroClientes, setEstadoFiltroClientes] = useState<FiltroEstadoCliente>("Activo");

  const [busquedaMascotas, setBusquedaMascotas] = useState("");
  const [estadoFiltroMascotas, setEstadoFiltroMascotas] = useState<FiltroEstadoCliente>("Activo");
  const [especieFiltroMascotas, setEspecieFiltroMascotas] = useState<FiltroEspecieMascota>("Todas");
  const [sexoFiltroMascotas, setSexoFiltroMascotas] = useState<FiltroSexoMascota>("Todos");

  const [pageSizeClientes, setPageSizeClientes] = useState(10);
  const [pageClientes, setPageClientes] = useState(1);
  const [pageSizeMascotas, setPageSizeMascotas] = useState(10);
  const [pageMascotas, setPageMascotas] = useState(1);

  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalClienteMode, setModalClienteMode] = useState<ClienteModalMode>("crear");
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);

  const [modalMascotaOpen, setModalMascotaOpen] = useState(false);
  const [modalMascotaMode, setModalMascotaMode] = useState<MascotaModalMode>("crear");
  const [mascotaActiva, setMascotaActiva] = useState<Mascota | null>(null);

  // --- Estado de la tab Turnos (HU-TUR-01) ---
  // BACKEND: reemplazar por GET /api/turnos (tabla turno, contrato sección 8).
  // Vive a nivel página (como clientes/mascotas) para persistir al cambiar de tab.
  const [turnos, setTurnos] = useState<Turno[]>(turnosIniciales);

  // Mapa cliente por id: resuelve el dueño de cada mascota (columna "Ver dueño"
  // y el chip pre-filtrado desde la patita).
  const clientePorId = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])) as Record<number, Cliente>,
    [clientes],
  );

  // El listado de clientes muestra por defecto SÓLO activos (criterio HU-CLI-01).
  const filtradosClientes = useMemo(() => {
    const base = clientes;
    return base.filter((cli) => {
      if (estadoFiltroClientes !== "Todos" && cli.estado !== estadoFiltroClientes.toLowerCase()) return false;
      if (busquedaClientes) {
        const query = busquedaClientes.toLowerCase();
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
  }, [clientes, busquedaClientes, estadoFiltroClientes]);

  const totalPagesClientes = Math.max(1, Math.ceil(filtradosClientes.length / pageSizeClientes));
  const safePageClientes = Math.min(pageClientes, totalPagesClientes);
  const pageItemsClientes = filtradosClientes.slice((safePageClientes - 1) * pageSizeClientes, safePageClientes * pageSizeClientes);
  const pageStartClientes = filtradosClientes.length === 0 ? 0 : (safePageClientes - 1) * pageSizeClientes + 1;
  const pageEndClientes = Math.min(safePageClientes * pageSizeClientes, filtradosClientes.length);

  // El listado de mascotas muestra por defecto SÓLO activas (criterio HU-MAS-01),
  // con búsqueda por nombre de mascota, nombre del dueño o documento del dueño,
  // y filtros de especie y sexo (lo que busca un recepcionista en el mostrador).
  const filtradasMascotas = useMemo(() => {
    const base = SIMULAR_VACIO_MASCOTA ? [] : mascotas;
    return base.filter((m) => {
      if (dueno !== null && m.clienteId !== dueno) return false;
      if (estadoFiltroMascotas !== "Todos" && m.estado !== estadoFiltroMascotas.toLowerCase()) return false;
      if (especieFiltroMascotas !== "Todas" && m.especie !== especieFiltroMascotas) return false;
      if (sexoFiltroMascotas !== "Todos" && m.sexo !== sexoFiltroMascotas) return false;
      if (busquedaMascotas) {
        const query = busquedaMascotas.toLowerCase();
        const duenoMascota = clientePorId[m.clienteId];
        return (
          m.nombre.toLowerCase().includes(query) ||
          m.especie.toLowerCase().includes(query) ||
          m.raza?.toLowerCase().includes(query) ||
          (duenoMascota?.nombre.toLowerCase().includes(query) ?? false) ||
          (duenoMascota?.apellido.toLowerCase().includes(query) ?? false) ||
          (duenoMascota?.documento.toLowerCase().includes(query) ?? false)
        );
      }
      return true;
    });
  }, [mascotas, dueno, estadoFiltroMascotas, especieFiltroMascotas, sexoFiltroMascotas, busquedaMascotas, clientePorId]);

  const totalPagesMascotas = Math.max(1, Math.ceil(filtradasMascotas.length / pageSizeMascotas));
  const safePageMascotas = Math.min(pageMascotas, totalPagesMascotas);
  const pageItemsMascotas = filtradasMascotas.slice((safePageMascotas - 1) * pageSizeMascotas, safePageMascotas * pageSizeMascotas);
  const pageStartMascotas = filtradasMascotas.length === 0 ? 0 : (safePageMascotas - 1) * pageSizeMascotas + 1;
  const pageEndMascotas = Math.min(safePageMascotas * pageSizeMascotas, filtradasMascotas.length);

  const hasActiveFiltersClientes = busquedaClientes !== "" || estadoFiltroClientes !== "Activo";
  const hasActiveFiltersMascotas =
    busquedaMascotas !== "" ||
    estadoFiltroMascotas !== "Activo" ||
    especieFiltroMascotas !== "Todas" ||
    sexoFiltroMascotas !== "Todos" ||
    dueno !== null;

  const duenoNombre = dueno !== null ? clientePorId[dueno] ? `${clientePorId[dueno].nombre} ${clientePorId[dueno].apellido}` : null : null;

  // Limpiar filtros de clientes: vuelve a la tab Clientes sin búsqueda en la URL
  // (el estado vuelve a Activo, criterio por defecto).
  const handleClearFiltersClientes = () => {
    setEstadoFiltroClientes("Activo");
    setPageClientes(1);
    router.replace("/clientes?tab=clientes");
  };

  const handleClearFiltersMascotas = () => {
    setBusquedaMascotas("");
    setEstadoFiltroMascotas("Activo");
    setEspecieFiltroMascotas("Todas");
    setSexoFiltroMascotas("Todos");
    setPageMascotas(1);
  };

  // Quitar el chip "Dueño: …" limpia el pre-filtro de la URL (dueno derivado).
  const handleQuitarDueno = () => {
    setPageMascotas(1);
    router.replace("/clientes?tab=mascotas");
  };

  const abrirModalCliente = (modo: ClienteModalMode, cli?: Cliente) => {
    setModalClienteMode(modo);
    setClienteActivo(cli || null);
    setModalClienteOpen(true);
  };

  // 👤 "Ver dueño" (MascotasTable): reusa ClienteFormModal en modo lectura con
  // el cliente titular — sin código duplicado del perfil.
  // 👤 "Ver dueño" (MascotasTable): navega a la tab Clientes con la búsqueda
  // pre-cargada con el nombre completo del titular — la tabla filtra y muestra
  // la fila del cliente (simétrico a la patita del listado de clientes).
  const abrirVerDueno = (mascota: Mascota) => {
    const titular = clientePorId[mascota.clienteId];
    if (!titular) return;
    router.push(
      `/clientes?tab=clientes&busqueda=${encodeURIComponent(`${titular.nombre} ${titular.apellido}`)}`,
    );
  };

  const abrirModalMascota = (modo: MascotaModalMode, m?: Mascota) => {
    setModalMascotaMode(modo);
    setMascotaActiva(m || null);
    setModalMascotaOpen(true);
  };

  const handleCrearTurno = (nuevo: Turno) => {
    setTurnos((prev) => [nuevo, ...prev]);
  };

  // BACKEND: los draft viajan al POST/PUT; el toggle a Inactivo → PATCH
  // /api/mascotas/:id/inactivar. El id numérico lo genera la base. Cada alta y
  // modificación registra public.auditoria (operacion INSERT/UPDATE, valores
  // anterior y nuevo en jsonb).
  const handleSaveCliente = async (draft: ClienteDraft): Promise<{ error?: string }> => {
    if (modalClienteMode === "crear") {
      const nuevo: Cliente = { ...draft, id: Math.max(0, ...clientes.map((c) => c.id)) + 1 };
      setClientes((prev) => [...prev, nuevo]);
      showToast("success", "Cliente creado correctamente");
      return {};
    }
    if (modalClienteMode === "editar" && clienteActivo) {
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

  const handleSaveMascota = async (draft: MascotaDraft): Promise<{ error?: string }> => {
    if (modalMascotaMode === "crear") {
      const nuevo: Mascota = { ...draft, id: Math.max(0, ...mascotas.map((m) => m.id)) + 1 };
      setMascotas((prev) => [...prev, nuevo]);
      showToast("success", "Mascota creada correctamente");
      return {};
    }
    if (modalMascotaMode === "editar" && mascotaActiva) {
      const actualizada: Mascota = { ...draft, id: mascotaActiva.id };
      setMascotas((prev) => prev.map((m) => (m.id === mascotaActiva.id ? actualizada : m)));
      showToast(
        "success",
        actualizada.estado === "inactivo"
          ? `${actualizada.nombre} fue dada de baja correctamente`
          : "Mascota guardada correctamente",
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

  const handleReintentarMascotas = () => {
    setErrorMascotas(false);
    setCargandoMascotas(true);
    // BACKEND: acá iría el fetch real (recargar() del context).
    window.setTimeout(() => {
      setCargandoMascotas(false);
    }, 400);
  };

  // El CTA del header es UNA sola acción clara por viewport (regla Pet Bliss):
  // cambia según la tab activa (Nuevo cliente / Nueva mascota / Nuevo turno),
  // nunca las dos a la vez.
  const accionPrincipal =
    tab === "clientes" ? { label: "Nuevo cliente", onOpen: () => abrirModalCliente("crear") }
    : tab === "mascotas" ? { label: "Nueva mascota", onOpen: () => abrirModalMascota("crear") }
    : tab === "turnos" ? { label: "Nuevo turno", onOpen: solicitarNuevoTurno }
    : null;
  const ctaDisabled = tab === "clientes" ? cargando || error : false;

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
              {accionPrincipal && (
                <Button size="lg" onClick={accionPrincipal.onOpen} disabled={ctaDisabled}>
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  {accionPrincipal.label}
                </Button>
              )}
            </div>

            <RecepcionTabs
              active={tab}
              onChange={(t) => {
                // El tab se deriva de la URL: cambiar de tab la actualiza
                // (patrón ?tab= de Compras, lo lee también la patita).
                router.replace(`/clientes?tab=${t}`);
              }}
              disabled={cargando || error}
            />

            {tab === "clientes" && !error && (
              <FiltrosClientes
                busqueda={busquedaClientes}
                onBusquedaChange={(q) => {
                  // La búsqueda se deriva de la URL (?busqueda=): cada tecla
                  // navega con router.replace (patrón ?tab= de Compras).
                  setPageClientes(1);
                  router.replace(`/clientes?tab=clientes&busqueda=${encodeURIComponent(q)}`);
                }}
                estado={estadoFiltroClientes}
                onEstadoChange={(e) => {
                  setEstadoFiltroClientes(e);
                  setPageClientes(1);
                }}
              />
            )}

            {tab === "mascotas" && !errorMascotas && (
              <FiltrosMascotas
                busqueda={busquedaMascotas}
                onBusquedaChange={(q) => {
                  setBusquedaMascotas(q);
                  setPageMascotas(1);
                }}
                estado={estadoFiltroMascotas}
                onEstadoChange={(e) => {
                  setEstadoFiltroMascotas(e);
                  setPageMascotas(1);
                }}
                especie={especieFiltroMascotas}
                onEspecieChange={(e) => {
                  setEspecieFiltroMascotas(e);
                  setPageMascotas(1);
                }}
                sexo={sexoFiltroMascotas}
                onSexoChange={(s) => {
                  setSexoFiltroMascotas(s);
                  setPageMascotas(1);
                }}
                duenoNombre={duenoNombre}
                onQuitarDueno={handleQuitarDueno}
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
                    clientes={pageItemsClientes}
                    // BACKEND: reemplazar por el mapa de mascotas de la API
                    // (GET /api/clientes/:id/mascotas por cliente, tabla mascota).
                    mascotasPorCliente={mascotasPorCliente}
                    loading={cargando}
                    hasActiveFilters={hasActiveFiltersClientes}
                    onClearFilters={handleClearFiltersClientes}
                    onNuevo={() => abrirModalCliente("crear")}
                    onVer={(cli) => abrirModalCliente("ver", cli)}
                    onEditar={(cli) => abrirModalCliente("editar", cli)}
                    // HU-MAS-01: la patita navega a la tab Mascotas pre-filtrada.
                    onVerMascotas={(cli) => router.push(`/clientes?tab=mascotas&dueno=${cli.id}`)}
                  />

                  {!cargando && pageItemsClientes.length > 0 && (
                    <Pagination
                      page={safePageClientes}
                      totalPages={totalPagesClientes}
                      totalItems={filtradosClientes.length}
                      pageStart={pageStartClientes}
                      pageEnd={pageEndClientes}
                      pageSize={pageSizeClientes}
                      onPageChange={setPageClientes}
                      onPageSizeChange={setPageSizeClientes}
                      itemLabel="clientes"
                    />
                  )}
                </>
              )}
            </>
          )}

          {tab === "mascotas" && (
            <>
              {errorMascotas ? (
                <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
                  <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                    <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                      No se pudieron cargar las mascotas
                    </h3>
                    <p className="max-w-sm text-sm text-text-secondary">
                      Hubo un problema al consultar las fichas. Revisá tu conexión e intentá de nuevo.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleReintentarMascotas}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                  </Button>
                </div>
              ) : (
                <>
                  <MascotasTable
                    mascotas={pageItemsMascotas}
                    clientePorId={clientePorId}
                    loading={cargandoMascotas}
                    hasActiveFilters={hasActiveFiltersMascotas}
                    onClearFilters={handleClearFiltersMascotas}
                    onNuevo={() => abrirModalMascota("crear")}
                    onVer={(m) => abrirModalMascota("ver", m)}
                    onVerDueno={abrirVerDueno}
                    onEditar={(m) => abrirModalMascota("editar", m)}
                  />

                  {!cargandoMascotas && pageItemsMascotas.length > 0 && (
                    <Pagination
                      page={safePageMascotas}
                      totalPages={totalPagesMascotas}
                      totalItems={filtradasMascotas.length}
                      pageStart={pageStartMascotas}
                      pageEnd={pageEndMascotas}
                      pageSize={pageSizeMascotas}
                      onPageChange={setPageMascotas}
                      onPageSizeChange={setPageSizeMascotas}
                      itemLabel="mascotas"
                    />
                  )}
                </>
              )}
            </>
          )}

          {tab === "turnos" && (
            <div
              role="tabpanel"
              id={`panel-recepcion-${tab}`}
              aria-labelledby={`tab-recepcion-${tab}`}
              className="flex flex-col gap-6"
            >
              <TurnosContent
                clientes={clientes}
                mascotas={mascotas}
                turnos={turnos}
                onCrearTurno={handleCrearTurno}
                nuevoTurnoOpen={turnoWizardOpen}
                nuevoTurnoSession={turnoWizardSession}
                onSolicitarNuevoTurno={solicitarNuevoTurno}
                onCerrarNuevoTurno={() => setTurnoWizardOpen(false)}
              />
            </div>
          )}
        </div>
      </main>

      <ClienteFormModal
        open={modalClienteOpen}
        modo={modalClienteMode}
        cliente={clienteActivo}
        clientes={clientes}
        // BACKEND: reemplazar por GET /api/clientes/:id/mascotas (tabla mascota).
        mascotas={clienteActivo ? mascotasPorCliente[clienteActivo.id] ?? [] : []}
        onClose={() => setModalClienteOpen(false)}
        onSave={handleSaveCliente}
      />

      <MascotaFormModal
        open={modalMascotaOpen}
        modo={modalMascotaMode}
        mascota={mascotaActiva}
        clientes={clientes}
        onClose={() => setModalMascotaOpen(false)}
        onSave={handleSaveMascota}
      />
    </div>
  );
}

export default function ClientesPage() {
  return (
    <ToastProvider>
      {/* useSearchParams necesita un límite de Suspense: durante el prerender
          la query todavía no se conoce. */}
      <Suspense fallback={null}>
        <ClientesScreen />
      </Suspense>
    </ToastProvider>
  );
}