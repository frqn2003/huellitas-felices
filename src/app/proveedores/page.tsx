"use client";

import { AlertTriangle, Building2, Download, Plus, RotateCcw } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BajaProveedorModal } from "@/components/proveedores/BajaProveedorModal";
import type { FiltroEstado } from "@/components/proveedores/FiltrosProveedores";
import { FiltrosProveedores } from "@/components/proveedores/FiltrosProveedores";
import type { ProveedorModalMode } from "@/components/proveedores/ProveedorFormModal";
import { ProveedorFormModal } from "@/components/proveedores/ProveedorFormModal";
import { ProveedoresTable } from "@/components/proveedores/ProveedoresTable";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ProveedoresContext, ProveedoresProvider } from "@/context/ProveedoresContext";
import type { NuevoProveedorInput } from "@/context/ProveedoresContext";
import type { Proveedor } from "@/data/proveedores";
import { SIMULAR_ERROR, SIMULAR_VACIO } from "@/data/proveedores";

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

function ProveedoresPageContent() {
  const { showToast } = useToast();

  const context = useContext(ProveedoresContext);
  if (!context) throw new Error("ProveedoresPageContent debe usarse dentro de ProveedoresProvider");

  const { proveedores, agregarProveedor, actualizarProveedor, darDeBaja } = context;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("Todos");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ProveedorModalMode>("crear");
  const [proveedorActivo, setProveedorActivo] = useState<Proveedor | null>(null);
  const [aDarDeBaja, setADarDeBaja] = useState<Proveedor | null>(null);

  useEffect(() => {
    // BACKEND: reemplazar la simulación por GET /api/proveedores.
    // Las banderas SIMULAR_VACIO / SIMULAR_ERROR de src/data/proveedores.ts controlan esta demo.
    const timer = window.setTimeout(() => {
      if (SIMULAR_ERROR) setError(true);
      setLoading(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const filtrados = useMemo(() => {
    const base = SIMULAR_VACIO ? [] : proveedores;
    return base.filter((prov) => {
      if (estadoFiltro !== "Todos" && prov.estado !== estadoFiltro) return false;
      if (busqueda) {
        const query = busqueda.toLowerCase();
        return (
          prov.razonSocial.toLowerCase().includes(query) ||
          prov.cuit.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [proveedores, busqueda, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);

  const hasActiveFilters = busqueda !== "" || estadoFiltro !== "Todos";

  const handleClearFilters = () => {
    setBusqueda("");
    setEstadoFiltro("Todos");
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

  const abrirModal = (modo: ProveedorModalMode, prov?: Proveedor) => {
    setModalMode(modo);
    setProveedorActivo(prov || null);
    setModalOpen(true);
  };

  const handleSave = (input: NuevoProveedorInput) => {
    // BACKEND: POST /api/proveedores (alta) o PUT /api/proveedores/:id (edición).
    if (modalMode === "crear") {
      const res = agregarProveedor(input);
      if (!res.error) showToast("success", "Proveedor creado correctamente");
      return res;
    }
    if (modalMode === "editar" && proveedorActivo) {
      const res = actualizarProveedor(proveedorActivo.id, input);
      if (!res.error) showToast("success", "Proveedor guardado correctamente");
      return res;
    }
    return {};
  };

  const confirmarBaja = (prov: Proveedor) => {
    // BACKEND: PATCH /api/proveedores/:id/inactivar
    darDeBaja(prov.id);
    setADarDeBaja(null);
    showToast("success", `${prov.razonSocial} fue dado de baja correctamente`);
  };

  const handleReintentar = () => {
    setError(false);
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
    }, 900);
  };

  return (
    <div className="mx-auto flex w-full max-w-[min(1200px,calc(100%-48px))] flex-col gap-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-900/10">
            <Building2 className="h-6 w-6 text-brand-900" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
              Proveedores
            </h1>
            <p className="text-sm font-medium text-text-secondary">
              Directorio y estado de cuentas de proveedores
            </p>
          </div>
        </div>

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
      </header>

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
        <section className="flex flex-col gap-5">
          <FiltrosProveedores
            busqueda={busqueda}
            onBusquedaChange={handleBusqueda}
            estado={estadoFiltro}
            onEstadoChange={handleEstado}
          />

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
        </section>
      )}

      <ProveedorFormModal
        open={modalOpen}
        modo={modalMode}
        proveedor={proveedorActivo}
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
        <div className="flex min-h-screen bg-cream-50">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col">
            <ProveedoresPageContent />
          </main>
        </div>
      </ProveedoresProvider>
    </ToastProvider>
  );
}
