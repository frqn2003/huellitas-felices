"use client";

import { AlertTriangle, BadgeDollarSign, Download, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { PreciosTable } from "@/components/precios/PreciosTable";
import { PrecioFormModal, type PrecioDraft } from "@/components/precios/PrecioFormModal";
import {
  FiltrosArticulos,
  FiltrosChips,
  type Filtros,
  type GrupoFiltro,
} from "@/components/articulos/FiltrosArticulos";
import type { FormModo } from "@/components/articulos/ArticuloFormModal";
import type { FilaListaPrecio } from "@/data/lista-precios";
import { guardarPrecio, listarListaPrecios, SIMULAR_ERROR, SIMULAR_VACIO } from "@/data/lista-precios";
import { parseImporte } from "@/data/ordenes-compra";
import { useAuth } from "@/context/AuthContext";

// Panel de filtros: unidad de medida y proveedor no aplican a precios.
const GRUPOS_FILTRO: GrupoFiltro[] = ["categoria", "estado"];

function exportarCSV(filas: FilaListaPrecio[]) {
  const cabeceras = [
    "Codigo",
    "Nombre",
    "Categoria",
    "UnidadMedida",
    "CostoRefOC",
    "PrecioVigente",
    "VigenteDesde",
    "Estado",
  ];
  const filasCsv = filas.map((f) =>
    [
      f.codigo,
      `"${f.nombre.replace(/"/g, '""')}"`,
      f.categoria,
      f.unidadMedida,
      f.costoRefOc !== null ? String(f.costoRefOc) : "",
      f.precio !== null ? String(f.precio) : "",
      f.vigenciaDesde ?? "",
      f.estado === "activo" ? "Activo" : "Inactivo",
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filasCsv].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lista-precios.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ListaPreciosScreen() {
  const { showToast } = useToast();
  const router = useRouter();
  const { state } = useAuth();
  const usuario = state.status === "authenticated" ? state.usuario : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filas, setFilas] = useState<FilaListaPrecio[]>([]);

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
  const [formFila, setFormFila] = useState<FilaListaPrecio | null>(null);

  // `recargar` es un contador: subirlo vuelve a disparar el efecto (lo usa
  // "Reintentar"). El setLoading va dentro del timeout: un setState síncrono
  // en el cuerpo del efecto encadena renders (regla del log de errores).
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(() => {
      if (cancelado) return;
      // BACKEND: GET /api/lista-precios → tabla lista_precio LEFT JOIN articulo
      //          (+ categoria, unidad_medida, fabricante). Hoy se sirve el
      //          dataset hardcodeado de src/data/lista-precios.ts.
      if (SIMULAR_ERROR) {
        setError(true);
        setLoading(false);
        return;
      }
      setFilas(SIMULAR_VACIO ? [] : listarListaPrecios());
      setError(false);
      setLoading(false);
    }, 700);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [recargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      const matchBusqueda =
        !q || f.codigo.toLowerCase().includes(q) || f.nombre.toLowerCase().includes(q);
      const matchCategoria = !filtros.categoria || f.categoria === filtros.categoria;
      // Estado crudo del enum (C3): el filtro se compara en minúscula.
      let matchEstado = true;
      if (filtros.estado === "Activo") matchEstado = f.estado === "activo";
      else if (filtros.estado === "Inactivo") matchEstado = f.estado === "inactivo";
      return matchBusqueda && matchCategoria && matchEstado;
    });
  }, [filas, busqueda, filtros]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);
  // "Activo" es la vista por defecto (criterio de la HU), no un filtro elegido.
  const hasActiveFilters =
    busqueda.trim() !== "" || filtros.categoria !== "" || filtros.estado !== "Activo";

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const handleFiltros = (value: Filtros) => {
    setFiltros(value);
    setPage(1);
  };

  const openNuevo = (fila: FilaListaPrecio | null = null) => {
    setFormFila(fila);
    setFormModo("INSERCION");
    setFormOpen(true);
  };

  const openEdicion = (fila: FilaListaPrecio) => {
    setFormFila(fila);
    setFormModo("EDICION");
    setFormOpen(true);
  };

  const openLectura = (fila: FilaListaPrecio) => {
    setFormFila(fila);
    setFormModo("LECTURA");
    setFormOpen(true);
  };

  const handleHistorial = (fila: FilaListaPrecio) => {
    router.push(`/lista-precios/historial?articuloId=${fila.articuloId}`);
  };

  /**
   * Alta y edición del precio vigente.
   *
   * El usuario responsable NUNCA es un input: sale de la sesión. En la base,
   * fn_abm_lista_precio recibe modo/id/articulo_id/precio/usuario_id y el
   * trigger trg_historial_precios archiva la vigencia anterior.
   */
  const handleSave = async (draft: PrecioDraft) => {
    if (!usuario) {
      showToast("error", "No hay una sesión activa: volvé a iniciar sesión para guardar.");
      return;
    }
    try {
      // BACKEND: INSERCIÓN → POST /api/lista-precios; EDICIÓN → PATCH /api/lista-precios/:id.
      //          Ambos delegan en fn_abm_lista_precio(modo, id, articulo_id, precio, usuario_id).
      //          Sin campo `motivo`: el esquema no define tal columna.
      const actualizadas = guardarPrecio({
        articuloId: Number(draft.articuloId),
        precio: parseImporte(draft.precio),
        usuario: { id: usuario.id, nombre: `${usuario.nombre} ${usuario.apellido}` },
      });
      setFilas([...actualizadas]);
      setFormOpen(false);
      showToast(
        "success",
        formModo === "INSERCION"
          ? "Precio guardado correctamente"
          : "Precio actualizado correctamente",
      );
    } catch {
      // El modal queda abierto con los datos cargados: se corrige y se reintenta.
      showToast("error", "Error al guardar el precio. Intentá de nuevo.");
    }
  };

  const handleExportar = () => {
    exportarCSV(filtrados);
    showToast("success", "Exportación completada: la lista filtrada se descargó en CSV");
  };

  const limpiarTodo = () => {
    setBusqueda("");
    setFiltros({ categoria: "", estado: "Activo", unidadMedida: "", proveedorId: "" });
    setPage(1);
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
                  Gestión de precios
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Lista de precios
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => openNuevo()}
                  disabled={loading || error}
                  size="lg"
                >
                  <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
                  Nuevo precio
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportar}
                  disabled={loading || error || filtrados.length === 0}
                >
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
                  grupos={GRUPOS_FILTRO}
                />
              </div>
              <div className="flex flex-wrap items-center">
                <FiltrosChips filtros={filtros} onChange={handleFiltros} grupos={GRUPOS_FILTRO} />
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
                  No se pudo cargar la lista de precios
                </h3>
                <p className="max-w-sm text-sm text-text-secondary">
                  Hubo un problema al consultar los precios vigentes. Revisá tu conexión e
                  intentá de nuevo.
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
              <PreciosTable
                filas={pageItems}
                loading={loading}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={limpiarTodo}
                onView={openLectura}
                onEdit={openEdicion}
                onAlta={openNuevo}
                onHistorial={handleHistorial}
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

      <PrecioFormModal
        open={formOpen}
        modo={formModo}
        fila={formFila}
        filas={filas}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        onEditFromRead={() => setFormModo("EDICION")}
      />
    </div>
  );
}

export default function ListaPreciosPage() {
  return (
    <ToastProvider>
      <ListaPreciosScreen />
    </ToastProvider>
  );
}
