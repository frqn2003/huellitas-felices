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
import { FiltrosArticulos, FiltrosChips, type Filtros } from "@/components/articulos/FiltrosArticulos";
import type { Articulo, CatalogosArticulo } from "@/data/articulos";
import { apiGet, apiSend, mensajeDeError } from "@/lib/api-client";

const CATALOGOS_VACIOS: CatalogosArticulo = {
  categorias: [],
  unidadesMedida: [],
  fabricantes: [],
  proveedores: [],
};

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
  const [filtros, setFiltros] = useState<Filtros>({
    categoria: "",
    estado: "Activo",
    unidadMedida: "",
    proveedorId: "",
  });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formModo, setFormModo] = useState<FormModo>("INSERCION");
  const [formArticulo, setFormArticulo] = useState<Articulo | null>(null);
  const [aDesactivar, setADesactivar] = useState<Articulo | null>(null);

  const [catalogos, setCatalogos] = useState<CatalogosArticulo>(CATALOGOS_VACIOS);

  // Carga inicial: el listado y los catálogos del formulario, en paralelo.
  // `recargar` es un contador: subirlo vuelve a disparar el efecto (lo usa el
  // botón "Reintentar" del estado de error).
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let cancelado = false;

    // Sin setState síncrono acá: `loading` ya arranca en true, y el botón
    // "Reintentar" resetea el estado antes de subir el contador. Llamar a
    // setState directo en el cuerpo de un efecto dispara renders en cascada.
    Promise.all([
      apiGet<Articulo[]>("/api/articulos"),
      apiGet<CatalogosArticulo>("/api/articulos/catalogos"),
    ])
      .then(([lista, cat]) => {
        // Si el componente se desmontó mientras esperábamos, no tocamos estado:
        // React avisaría por actualizar algo que ya no existe.
        if (cancelado) return;
        setArticulos(lista);
        setCatalogos(cat);
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
  }, [recargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return articulos.filter((a) => {
      const matchBusqueda =
        !q || a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q);
      const matchCategoria = !filtros.categoria || a.categoria === filtros.categoria;
      const matchUnidad = !filtros.unidadMedida || a.unidadMedida === filtros.unidadMedida;
      const matchProveedor =
        !filtros.proveedorId || a.proveedorPreferido?.id === Number(filtros.proveedorId);
      let matchEstado = true;
      if (filtros.estado === "Activo") matchEstado = a.activo;
      else if (filtros.estado === "Inactivo") matchEstado = !a.activo;
      return matchBusqueda && matchCategoria && matchUnidad && matchProveedor && matchEstado;
    });
  }, [articulos, busqueda, filtros]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);
  const hasActiveFilters =
    busqueda.trim() !== "" ||
    filtros.categoria !== "" ||
    filtros.estado !== "Todos" ||
    filtros.unidadMedida !== "" ||
    filtros.proveedorId !== "";

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

  /**
   * Alta y edición contra la API.
   *
   * El draft del formulario se traduce al cuerpo que espera el backend:
   * los ids de catálogo viajan como number, y `proveedorId` vacío se manda
   * como null (el campo es opcional).
   *
   * Ojo con lo que NO se manda: `codigo` (lo genera un trigger de la base) ni
   * `createdAt`/`updatedAt` (los pone la base). El artículo que se agrega a la
   * lista es EL QUE DEVUELVE LA API, no uno armado acá — así el código
   * generado y las fechas reales aparecen en pantalla sin recargar.
   */
  const handleSave = async (draft: ArticuloDraft) => {
    const body = {
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion.trim(),
      categoriaId: Number(draft.categoriaId),
      unidadMedidaId: Number(draft.unidadMedidaId),
      fabricanteId: Number(draft.fabricanteId),
      proveedorPreferidoId: draft.proveedorId ? Number(draft.proveedorId) : null,
      imagen: draft.imagen || null,
      activo: draft.activo,
    };

    try {
      if (formModo === "INSERCION") {
        const creado = await apiSend<Articulo>("POST", "/api/articulos", body);
        setArticulos((prev) => [creado, ...prev]);
        setFormOpen(false);
        showToast("success", `${TITULO_ACCIONES.INSERCION} (${creado.codigo})`);
      } else if (formModo === "EDICION" && formArticulo) {
        const actualizado = await apiSend<Articulo>(
          "PUT",
          `/api/articulos/${formArticulo.id}`,
          body,
        );
        setArticulos((prev) =>
          prev.map((a) => (a.id === actualizado.id ? actualizado : a)),
        );
        setFormOpen(false);
        showToast("success", TITULO_ACCIONES.EDICION);
      }
    } catch (e) {
      // El modal queda ABIERTO con los datos cargados: si el nombre está
      // duplicado, el usuario corrige y reintenta sin volver a tipear todo.
      showToast("error", mensajeDeError(e));
    }
  };

  const handleDesactivar = async (articulo: Articulo) => {
    try {
      const actualizado = await apiSend<Articulo>(
        "PATCH",
        `/api/articulos/${articulo.id}`,
      );
      setArticulos((prev) => prev.map((a) => (a.id === actualizado.id ? actualizado : a)));
    } catch (e) {
      showToast("error", mensajeDeError(e));
      setADesactivar(null);
      return;
    }
    setADesactivar(null);
    showToast("success", "Artículo desactivado correctamente");
  };

  const handleExportar = () => {
    exportarCSV(filtrados);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  const limpiarTodo = () => {
    setBusqueda("");
    setFiltros({ categoria: "", estado: "Activo", unidadMedida: "", proveedorId: "" });
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
                  Gestión de catálogo
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Artículos
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={openNuevo} disabled={loading || error} size="lg">
                  <PackagePlus className="h-5 w-5" aria-hidden="true" />
                  Nuevo artículo
                </Button>
                <Button variant="outline" onClick={handleExportar} disabled={loading || error || filtrados.length === 0}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar
                </Button>
              </div>
            </div>

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
                    placeholder="Buscar por código o nombre..."
                    aria-label="Buscar por código o nombre"
                    disabled={loading || error}
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </div>
                <FiltrosArticulos
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
                  setRecargar((n) => n + 1);
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
        catalogos={catalogos}
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
