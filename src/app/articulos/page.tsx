"use client";

import { AlertTriangle, Download, PackagePlus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ArticulosTable } from "@/components/articulos/ArticulosTable";
import { ArticuloFormModal, type ArticuloDraft, type FormModo } from "@/components/articulos/ArticuloFormModal";
import { DesactivarModal } from "@/components/articulos/DesactivarModal";
import { FiltrosArticulos, type Filtros } from "@/components/articulos/FiltrosArticulos";
import type { Articulo } from "@/data/articulos";
import { PROVEEDORES, SIMULAR_ERROR, SIMULAR_VACIO, articulosIniciales } from "@/data/articulos";

const PROVEEDORES_FIND = (id: number) =>
  PROVEEDORES.find((p) => p.id === id) ?? null;

const TITULO_ACCIONES: Record<FormModo, string> = {
  INSERCION: "Artículo creado correctamente",
  EDICION: "Artículo guardado correctamente",
  LECTURA: "",
};

function exportarCSV(articulos: Articulo[]) {
  const cabeceras = ["Codigo", "Nombre", "Descripcion", "Categoria", "UnidadMedida", "Proveedor", "Estado"];
  const filas = articulos.map((a) =>
    [
      a.codigo,
      `"${a.nombre.replace(/"/g, '""')}"`,
      `"${a.descripcion.replace(/"/g, '""')}"`,
      a.categoria,
      a.unidadMedida,
      a.proveedorPreferido ? `"${a.proveedorPreferido.nombre.replace(/"/g, '""')}"` : "",
      a.estado,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "articulos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ArticulosScreen() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [articulos, setArticulos] = useState<Articulo[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<Filtros>({ categoria: "", estado: "Activo" });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formModo, setFormModo] = useState<FormModo>("INSERCION");
  const [formArticulo, setFormArticulo] = useState<Articulo | null>(null);
  const [aDesactivar, setADesactivar] = useState<Articulo | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (SIMULAR_ERROR) {
        setError(true);
      } else {
        setArticulos(SIMULAR_VACIO ? [] : articulosIniciales);
      }
      setLoading(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return articulos.filter((a) => {
      const matchBusqueda =
        !q || a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q);
      const matchCategoria = !filtros.categoria || a.categoria === filtros.categoria;
      let matchEstado = true;
      if (filtros.estado === "Activo") matchEstado = a.activo;
      else if (filtros.estado === "Inactivo") matchEstado = !a.activo;
      else if (filtros.estado === "Próximo a vencer") matchEstado = a.proximoaVencer === true;
      return matchBusqueda && matchCategoria && matchEstado;
    });
  }, [articulos, busqueda, filtros]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);
  const hasActiveFilters =
    busqueda.trim() !== "" || filtros.categoria !== "" || filtros.estado !== "Todos";

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const handleFiltros = (value: Filtros) => {
    setFiltros(value);
    setPage(1);
  };

  const openNuevo = () => {
    setFormArticulo(null);
    setFormModo("INSERCION");
    setFormOpen(true);
  };

  const openEdicion = (articulo: Articulo) => {
    setFormArticulo(articulo);
    setFormModo("EDICION");
    setFormOpen(true);
  };

  const openLectura = (articulo: Articulo) => {
    setFormArticulo(articulo);
    setFormModo("LECTURA");
    setFormOpen(true);
  };

  const handleSave = (draft: ArticuloDraft) => {
    const proveedorId = Number(draft.proveedorId) || 0;
    const proveedor = PROVEEDORES_FIND(proveedorId);
    const ahora = new Date().toISOString();

    if (formModo === "INSERCION") {
      const nuevo: Articulo = {
        id: Math.max(0, ...articulos.map((a) => a.id)) + 1,
        codigo: draft.codigo.trim().toUpperCase(),
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        unidadMedida: draft.unidadMedida,
        categoria: draft.categoria,
        proveedorPreferido: proveedor,
        estado: "Activo",
        imagen: "",
        createdAt: ahora,
        updatedAt: ahora,
        activo: true,
      };
      setArticulos((prev) => [nuevo, ...prev]);
      setFormOpen(false);
      showToast("success", TITULO_ACCIONES.INSERCION);
    } else if (formModo === "EDICION" && formArticulo) {
      setArticulos((prev) =>
        prev.map((a) =>
          a.id === formArticulo.id
            ? {
                ...a,
                nombre: draft.nombre.trim(),
                descripcion: draft.descripcion.trim(),
                unidadMedida: draft.unidadMedida,
                categoria: draft.categoria,
                proveedorPreferido: proveedor,
                activo: draft.activo,
                estado: draft.activo
                  ? a.proximoaVencer
                    ? "Próximo a vencer"
                    : "Activo"
                  : "Inactivo",
                updatedAt: ahora,
              }
            : a,
        ),
      );
      setFormOpen(false);
      showToast("success", TITULO_ACCIONES.EDICION);
    }
  };

  const handleDesactivar = (articulo: Articulo) => {
    setArticulos((prev) =>
      prev.map((a) =>
        a.id === articulo.id
          ? { ...a, activo: false, estado: "Inactivo", updatedAt: new Date().toISOString() }
          : a,
      ),
    );
    setADesactivar(null);
    showToast("success", "Artículo desactivado correctamente");
  };

  const handleExportar = () => {
    exportarCSV(filtrados);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  const limpiarTodo = () => {
    setBusqueda("");
    setFiltros({ categoria: "", estado: "Activo" });
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
                  Stock · Catálogo
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Artículos
                </h1>
              </div>
              <Button onClick={openNuevo} disabled={loading || error} size="lg">
                <PackagePlus className="h-5 w-5" aria-hidden="true" />
                Nuevo artículo
              </Button>
            </div>

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
                  placeholder="Buscar por código o nombre..."
                  aria-label="Buscar por código o nombre"
                  disabled={loading || error}
                  className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <FiltrosArticulos
                  filtros={filtros}
                  onChange={handleFiltros}
                  disabled={loading || error}
                />
                <Button variant="outline" onClick={handleExportar} disabled={loading || error || filtrados.length === 0}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar
                </Button>
              </div>
            </div>
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
                  No se pudieron cargar los artículos
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  Hubo un problema al consultar el catálogo. Revisá tu conexión e intentá de nuevo.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setError(false);
                  setLoading(true);
                  window.setTimeout(() => {
                    setArticulos(SIMULAR_VACIO ? [] : articulosIniciales);
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
              <ArticulosTable
                articulos={pageItems}
                loading={loading}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={limpiarTodo}
                onView={openLectura}
                onEdit={openEdicion}
                onDeactivate={setADesactivar}
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
                  disabled={loading || error}
                />
              )}
            </>
          )}
        </div>
      </main>

      <ArticuloFormModal
        open={formOpen}
        modo={formModo}
        articulo={formArticulo}
        articulos={articulos}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        onEditFromRead={() => {
          setFormModo("EDICION");
        }}
      />
      <DesactivarModal
        articulo={aDesactivar}
        onClose={() => setADesactivar(null)}
        onConfirm={handleDesactivar}
      />
    </div>
  );
}

export default function ArticulosPage() {
  return (
    <ToastProvider>
      <ArticulosScreen />
    </ToastProvider>
  );
}
