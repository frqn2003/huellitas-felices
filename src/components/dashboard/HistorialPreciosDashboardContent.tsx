"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Download,
  History,
  RotateCcw,
  SearchX,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EstadoBadge } from "@/components/articulos/EstadoBadge";
import type { EstadoFiltro } from "@/components/articulos/FiltrosArticulos";
import type { FilaListaPrecio, HistorialPrecio } from "@/data/lista-precios";
import { formatFecha, formatMoney } from "@/data/ordenes-compra";
import { apiGet } from "@/lib/api-client";
import { RUTA_LISTA_PRECIOS, rutaHistorialArticulo } from "@/contracts/lista-precios";

interface HistorialPreciosDashboardContentProps {
  busqueda: string;
  categoria: string;
  estado?: EstadoFiltro;
}

const HEADERS_HISTORIAL = ["Vigencia desde", "Precio", "Vigencia hasta", "Usuario", "Estado"];

const HEADERS_PRODUCTOS = [
  "Código",
  "Nombre",
  "Categoría",
  "Costo ref. OC",
  "Precio vigente",
  "Estado",
  "Acciones",
];

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function exportarCSV(rows: HistorialPrecio[], codigo: string, nombre: string) {
  const cabeceras = ["VigenciaDesde", "Precio", "VigenciaHasta", "Usuario", "Estado"];
  const filasCsv = rows.map((h) =>
    [
      h.vigenciaDesde,
      String(h.precio),
      h.vigenciaHasta ?? "",
      `"${h.usuarioNombre.replace(/"/g, '""')}"`,
      h.vigenciaHasta === null ? "Vigente" : "Finalizada",
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filasCsv].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historial-precios-${codigo}-${nombre.toLowerCase().replace(/\s+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function HistorialPreciosDashboardContent({
  busqueda,
  categoria,
  estado = "Todos",
}: HistorialPreciosDashboardContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parámetro de artículo en la URL para permitir enlaces directos
  const articuloIdParam = searchParams.get("articuloId");
  const articuloIdSeleccionado = articuloIdParam ? Number(articuloIdParam) : null;

  const [articulos, setArticulos] = useState<FilaListaPrecio[]>([]);
  const [loadingArticulos, setLoadingArticulos] = useState(true);

  const [historial, setHistorial] = useState<HistorialPrecio[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const [recargar, setRecargar] = useState(0);

  // 1. Cargar lista de artículos con precios
  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      if (cancelado) return;
      setLoadingArticulos(true);
      try {
        const data = await apiGet<FilaListaPrecio[]>(RUTA_LISTA_PRECIOS);
        if (cancelado) return;
        setArticulos(data);
      } catch {
        if (!cancelado) setArticulos([]);
      } finally {
        if (!cancelado) setLoadingArticulos(false);
      }
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, []);

  // 2. Derivar el artículo activo a partir de la URL
  const articuloActivo = useMemo(() => {
    if (!articuloIdSeleccionado) return null;
    return articulos.find((a) => a.articuloId === articuloIdSeleccionado) ?? null;
  }, [articulos, articuloIdSeleccionado]);

  // 3. Cargar historial del artículo seleccionado
  useEffect(() => {
    if (!articuloActivo) {
      return;
    }

    const articuloId = articuloActivo.articuloId;
    let cancelado = false;
    const t = setTimeout(async () => {
      if (cancelado) return;
      setLoadingHistorial(true);
      setErrorHistorial(null);
      try {
        const data = await apiGet<HistorialPrecio[]>(
          rutaHistorialArticulo(articuloId),
        );
        if (cancelado) return;
        setHistorial(data);
      } catch {
        if (!cancelado) {
          setErrorHistorial("No se pudo cargar el historial del producto seleccionado.");
        }
      } finally {
        if (!cancelado) setLoadingHistorial(false);
      }
    }, 0);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [articuloActivo, recargar]);

  // Selección de producto
  const handleSeleccionarArticulo = (art: FilaListaPrecio) => {
    router.push(`/dashboard?tab=historial-precios&articuloId=${art.articuloId}`);
  };

  const handleVolverAlListado = () => {
    router.push("/dashboard?tab=historial-precios");
  };

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [prevFilter, setPrevFilter] = useState({ busqueda, categoria, estado });

  if (
    prevFilter.busqueda !== busqueda ||
    prevFilter.categoria !== categoria ||
    prevFilter.estado !== estado
  ) {
    setPrevFilter({ busqueda, categoria, estado });
    setPage(1);
  }

  // Filtrado de artículos
  const articulosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return articulos.filter((a) => {
      const matchBusqueda =
        !q || a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q);
      const matchCategoria = !categoria || a.categoria === categoria;
      let matchEstado = true;
      if (estado === "Activo") matchEstado = a.estado === "activo";
      else if (estado === "Inactivo") matchEstado = a.estado === "inactivo";
      return matchBusqueda && matchCategoria && matchEstado;
    });
  }, [articulos, busqueda, categoria, estado]);

  const totalPages = Math.max(1, Math.ceil(articulosFiltrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = articulosFiltrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = articulosFiltrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, articulosFiltrados.length);

  // Si hay un artículo activo, mostramos directamente su tabla de historial
  if (articuloActivo) {
    return (
      <div className="flex flex-col gap-4">
        {/* Barra superior de acciones para volver y exportar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleVolverAlListado}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a la lista
            </Button>
            <div className="flex items-center gap-2">
              <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                {articuloActivo.codigo}
              </span>
              <span className="text-sm font-extrabold uppercase tracking-tight text-brand-900">
                {articuloActivo.nombre}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportarCSV(historial, articuloActivo.codigo, articuloActivo.nombre)
            }
            disabled={loadingHistorial || historial.length === 0}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        </div>

        {/* Tabla de historial con la fila actual contrastada en verde */}
        {loadingHistorial ? (
          <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
            <div className="hidden grid-cols-5 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
              {HEADERS_HISTORIAL.map((h) => (
                <span
                  key={h}
                  className="text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                >
                  {h}
                </span>
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
                aria-hidden="true"
              >
                <div className="h-4 w-32 animate-pulse rounded bg-cream-100" />
                <div className="h-4 w-20 animate-pulse rounded bg-cream-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-cream-100" />
                <div className="h-4 w-36 animate-pulse rounded bg-cream-100" />
                <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
              </div>
            ))}
          </div>
        ) : errorHistorial ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                No se pudo cargar el historial
              </h3>
              <p className="max-w-sm text-sm text-text-secondary">{errorHistorial}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setErrorHistorial(null);
                setRecargar((r) => r + 1);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : historial.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
              <History className="h-7 w-7 text-brand-900" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                Todavía no hay cambios registrados
              </h3>
              <p className="max-w-sm text-sm text-text-secondary">
                Cuando se asigne o actualice el precio de este artículo, las vigencias históricas
                aparecerán acá.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">
                  Historial de precios de {articuloActivo.nombre}, ordenado por el más reciente
                </caption>
                <thead>
                  <tr className="border-b border-border bg-cream-50">
                    {HEADERS_HISTORIAL.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => {
                    const esVigente = h.vigenciaHasta === null;
                    return (
                      <tr
                        key={h.id}
                        className={`border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 ${
                          esVigente
                            ? "bg-status-success/15 font-semibold border-l-4 border-l-status-success-strong hover:bg-status-success/20"
                            : "hover:bg-cream-50/60"
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-text-primary tabular-nums">
                          {formatFecha(h.vigenciaDesde)} {horaLocal(h.fechaHora)}
                        </td>
                        <td className="px-4 py-3 text-sm font-extrabold text-brand-900 tabular-nums">
                          {formatMoney(h.precio)}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                          {formatFecha(h.vigenciaHasta)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-text-primary">
                          {h.usuarioNombre}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={esVigente ? "success" : "neutral"}
                            label={esVigente ? "Vigente" : "Finalizada"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Si no hay artículo seleccionado, mostramos directamente la tabla de productos (reutilizando estilos de /lista-precios)
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        {loadingArticulos ? (
          <div className="p-8 text-center text-sm font-bold text-text-secondary">
            Cargando catálogo de productos…
          </div>
        ) : articulosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
              <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h4 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
                Sin resultados
              </h4>
              <p className="max-w-sm text-xs text-text-secondary">
                No se encontraron productos que coincidan con la búsqueda o filtro aplicado.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <caption className="sr-only">
                Lista de artículos y precios de venta para consulta histórica
              </caption>
              <thead>
                <tr className="border-b border-border bg-cream-50">
                  {HEADERS_PRODUCTOS.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((art) => (
                  <tr
                    key={art.articuloId}
                    className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
                        {art.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary">{art.nombre}</span>
                        <span className="max-w-64 truncate text-xs text-text-secondary">
                          {art.descripcion}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">
                      {art.categoria}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                      {art.costoRefOc !== null ? formatMoney(art.costoRefOc) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {art.precio !== null ? (
                        <span className="text-sm font-extrabold text-brand-900 tabular-nums">
                          {formatMoney(art.precio)}
                        </span>
                      ) : (
                        <StatusBadge variant="warning" label="Sin precio" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={art.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSeleccionarArticulo(art)}
                          aria-label={`Ver historial de ${art.nombre}`}
                          title="Ver historial de precios"
                          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-pill border border-brand-900 px-3 text-xs font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                        >
                          <History className="h-4 w-4" aria-hidden="true" />
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loadingArticulos && articulosFiltrados.length > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={articulosFiltrados.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="artículos"
        />
      )}
    </div>
  );
}
