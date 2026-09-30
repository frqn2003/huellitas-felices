"use client";

import { AlertTriangle, History, SearchX } from "lucide-react";
import type { FilaListaPrecio, HistorialPrecio } from "@/data/lista-precios";
import { formatFecha, formatMoney } from "@/data/ordenes-compra";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface HistorialPreciosContentProps {
  /** Artículo elegido; null = sin parámetro o no encontrado. */
  fila: FilaListaPrecio | null;
  rows: HistorialPrecio[];
  loading: boolean;
  error: boolean;
  onReintentar: () => void;
}

// "Estado" NO es una columna de `historial_precios`: es un badge derivado de
// `vigencia_hasta` (null = Vigente, con fecha = Finalizada). Ver `HistorialPrecio`.
const HEADERS = ["Vigencia desde", "Precio", "Vigencia hasta", "Usuario", "Estado"];

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Tabla de vigencias de un artículo (HU-STK-03). Solo lectura: la escribe el
 * trigger `fn_historial_precios`, nunca un formulario de la app.
 */
export function HistorialPreciosContent({
  fila,
  rows,
  loading,
  error,
  onReintentar,
}: HistorialPreciosContentProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-5 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
          {HEADERS.map((h) => (
            <span key={h} className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
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
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            No se pudo cargar el historial
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            Hubo un problema al consultar las vigencias del precio. Revisá tu conexión e intentá
            de nuevo.
          </p>
        </div>
        <button
          type="button"
          onClick={onReintentar}
          className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!fila) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            No encontramos el artículo
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            El enlace no tiene un artículo válido. Volvé a la lista y elegí uno desde la columna
            de acciones.
          </p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <History className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            Todavía no hay cambios registrados
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            Cuando se cargue o modifique el precio de este artículo, el cambio va a aparecer acá
            con el usuario responsable y la fecha.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-bold text-text-primary">
          <span className="rounded bg-brand-900/10 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
            {fila.codigo}
          </span>{" "}
          <span className="ml-1">{fila.nombre}</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">
            Historial de precios de {fila.nombre}, ordenado por el más reciente primero
          </caption>
          <thead>
            <tr className="border-b border-border bg-cream-50">
              {HEADERS.map((h) => (
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
            {rows.map((h) => (
              <tr
                key={h.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
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
                    variant={h.vigenciaHasta === null ? "success" : "neutral"}
                    label={h.vigenciaHasta === null ? "Vigente" : "Finalizada"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
