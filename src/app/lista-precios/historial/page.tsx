"use client";

import { ArrowLeft, Download } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { HistorialPreciosContent } from "@/components/precios/HistorialPreciosContent";
import type { FilaListaPrecio, HistorialPrecio } from "@/data/lista-precios";
import {
  historialDe,
  listarListaPrecios,
  SIMULAR_ERROR,
} from "@/data/lista-precios";

function exportarCSV(rows: HistorialPrecio[], codigo: string) {
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
  link.download = `historial-precios-${codigo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function HistorialScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const articuloIdParam = searchParams.get("articuloId");
  const articuloId = articuloIdParam ? Number(articuloIdParam) : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fila, setFila] = useState<FilaListaPrecio | null>(null);
  const [rows, setRows] = useState<HistorialPrecio[]>([]);
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(() => {
      if (cancelado) return;
      // BACKEND: GET /api/lista-precios/historial?articuloId= → tabla
      //          historial_precios (solo lectura, la escribe el trigger
      //          fn_historial_precios) + datos del artículo para el encabezado.
      if (SIMULAR_ERROR) {
        setError(true);
        setLoading(false);
        return;
      }
      const encontrada = articuloId
        ? listarListaPrecios().find((f) => f.articuloId === articuloId) ?? null
        : null;
      setFila(encontrada);
      setRows(encontrada ? historialDe(encontrada.articuloId) : []);
      setError(false);
      setLoading(false);
    }, 500);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [articuloId, recargar]);

  const handleExportar = () => {
    if (!fila) return;
    exportarCSV(rows, fila.codigo);
    showToast("success", "Exportación completada: el historial se descargó en CSV");
  };

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Lista de precios
              </p>
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                Historial de precios
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => router.push("/lista-precios")}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a la lista
              </Button>
              <Button
                variant="outline"
                onClick={handleExportar}
                disabled={loading || error || rows.length === 0 || !fila}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          <HistorialPreciosContent
            fila={fila}
            rows={rows}
            loading={loading}
            error={error}
            onReintentar={() => {
              setError(false);
              setLoading(true);
              setRecargar((n) => n + 1);
            }}
          />
        </div>
      </main>
    </div>
  );
}

/**
 * useSearchParams obliga a envolver el componente en <Suspense> (regla activa
 * del equipo): sin eso, en el render del servidor Next tira el error de
 * "missing suspense boundary" y la pantalla no hidrata.
 */
export default function HistorialPreciosPage() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="flex min-h-screen bg-cream-50">
            <Sidebar />
            <main className="flex flex-1 items-center justify-center px-4">
              <p role="status" className="text-sm font-bold text-text-secondary">
                Cargando historial…
              </p>
            </main>
          </div>
        }
      >
        <HistorialScreen />
      </Suspense>
    </ToastProvider>
  );
}
