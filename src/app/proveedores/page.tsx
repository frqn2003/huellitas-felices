"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Building2, Plus } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import type { FiltroEstado } from "@/components/proveedores/FiltrosProveedores";
import { FiltrosProveedores } from "@/components/proveedores/FiltrosProveedores";
import type { ProveedorModalMode } from "@/components/proveedores/ProveedorFormModal";
import { ProveedorFormModal } from "@/components/proveedores/ProveedorFormModal";
import { ProveedoresTable } from "@/components/proveedores/ProveedoresTable";
import { ProveedoresContext, ProveedoresProvider } from "@/context/ProveedoresContext";
import type { Proveedor } from "@/data/proveedores";

function ProveedoresPageContent() {
  const context = useContext(ProveedoresContext);
  if (!context) throw new Error("ProveedoresPageContent debe usarse dentro de ProveedoresProvider");

  const { proveedores, agregarProveedor, actualizarProveedor, darDeBaja } = context;

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>("Todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ProveedorModalMode>("crear");
  const [proveedorActivo, setProveedorActivo] = useState<Proveedor | null>(null);

  const filtrados = useMemo(() => {
    return proveedores.filter((prov) => {
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

  const hasActiveFilters = busqueda !== "" || estadoFiltro !== "Todos";

  const handleClearFilters = () => {
    setBusqueda("");
    setEstadoFiltro("Todos");
  };

  const abrirModal = (modo: ProveedorModalMode, prov?: Proveedor) => {
    setModalMode(modo);
    setProveedorActivo(prov || null);
    setModalOpen(true);
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

        <button
          type="button"
          onClick={() => abrirModal("crear")}
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nuevo proveedor
        </button>
      </header>

      <section className="flex flex-col gap-5">
        <FiltrosProveedores
          busqueda={busqueda}
          onBusquedaChange={setBusqueda}
          estado={estadoFiltro}
          onEstadoChange={setEstadoFiltro}
        />

        <ProveedoresTable
          proveedores={filtrados}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          onNueva={() => abrirModal("crear")}
          onVer={(prov) => abrirModal("ver", prov)}
          onEditar={(prov) => abrirModal("editar", prov)}
          onBaja={(prov) => darDeBaja(prov.id)}
        />
      </section>

      <ProveedorFormModal
        open={modalOpen}
        modo={modalMode}
        proveedor={proveedorActivo}
        onClose={() => setModalOpen(false)}
        onSave={(input) => {
          if (modalMode === "crear") {
            return agregarProveedor(input);
          }
          if (modalMode === "editar" && proveedorActivo) {
            return actualizarProveedor(proveedorActivo.id, input);
          }
          return {};
        }}
      />
    </div>
  );
}

export default function ProveedoresPage() {
  return (
    <ProveedoresProvider>
      <div className="flex min-h-screen bg-cream-50">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <ProveedoresPageContent />
        </main>
      </div>
    </ProveedoresProvider>
  );
}
