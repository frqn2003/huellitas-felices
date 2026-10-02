"use client";

import { CalendarDays, CircleDollarSign, Eye, FileCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatearFecha } from "@/data/turnos";
import {
  esTurnoPagado,
  obtenerComprobanteTurno,
  type ComprobanteTurno,
} from "@/data/pagos";
import { ComprobanteTurnoModal } from "./ComprobanteTurnoModal";
import { EstadoTurnoBadge } from "./EstadoTurnoBadge";

// Fila de la tabla con los campos de display ya resueltos (el front los junta
// con los directorios; el backend los devuelve con JOIN). La columna "DNI" es
// del cliente y alimenta el buscador de FiltrosTurnos.
export interface TurnoRow {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  clienteNombre: string;
  dni: string;
  mascotaNombre: string;
  especie: string;
  profesionalNombre: string;
  practicaNombre: string;
  estadoId: number;
  /** dict: turno.notas (nullable) — para el detalle. */
  notas: string | null;
  /** dict: turno.fecha_creacion formateado ("20/09/2026 · 14:35") — para el detalle. */
  fechaCreacionHora: string;
}

interface TurnosTableProps {
  turnos: TurnoRow[];
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNuevo?: () => void;
  onVer?: (turno: TurnoRow) => void;
  onPagar?: (turno: TurnoRow) => void;
  renderActions?: (turno: TurnoRow) => React.ReactNode;
}

const HEADERS = [
  "Id",
  "Fecha",
  "Hora",
  "DNI",
  "Cliente",
  "Mascota",
  "Profesional",
  "Práctica",
  "Estado",
  "Acciones",
];

export function TurnosTable({
  turnos,
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onNuevo,
  onVer,
  onPagar,
  renderActions,
}: TurnosTableProps) {
  const router = useRouter();
  const [comprobanteActivo, setComprobanteActivo] = useState<ComprobanteTurno | null>(null);

  const pagadosMap = useMemo(() => {
    // BACKEND: se resolverá desde la API de turnos (JOIN con cobro / estado_facturacion)
    const map: Record<number, boolean> = {};
    for (const t of turnos) {
      if (t.estadoId === 4 && esTurnoPagado(t.id)) {
        map[t.id] = true;
      }
    }
    return map;
  }, [turnos]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-10 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
          {HEADERS.map((h) => (
            <span key={h} className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              {h}
            </span>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-4 w-8 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-cream-100" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-28 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded bg-cream-100 lg:block" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (turnos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <CalendarDays className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay turnos registrados"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay turnos que coincidan con la búsqueda o los filtros aplicados."
              : "Registrá el primer turno para organizar la agenda de la sucursal."}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            Limpiar filtros
          </button>
        ) : onNuevo ? (
          <button
            type="button"
            onClick={onNuevo}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Nuevo turno
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <caption className="sr-only">
            Listado de turnos con su estado y la acción para ver el detalle
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
            {turnos.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {String(t.id).padStart(4, "0")}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {formatearFecha(t.fecha)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-brand-900">
                  {t.horaInicio} – {t.horaFin}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">{t.dni}</td>
                <td className="px-4 py-3">
                  <span className="font-bold text-brand-900">{t.clienteNombre}</span>
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {t.mascotaNombre} <span className="text-text-secondary">· {t.especie}</span>
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {t.profesionalNombre}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">{t.practicaNombre}</td>
                <td className="px-4 py-3">
                  <EstadoTurnoBadge estadoId={t.estadoId} />
                </td>
                <td className="px-4 py-3">
                  {renderActions ? (
                    <div className="flex items-center gap-1">
                      {renderActions(t)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {onVer && (
                        <button
                          type="button"
                          onClick={() => onVer(t)}
                          aria-label={`Ver detalle del turno de ${t.clienteNombre}`}
                          title="Ver detalle"
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                        >
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                      {t.estadoId === 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (pagadosMap[t.id]) {
                              const comp = obtenerComprobanteTurno(t.id);
                              if (comp) {
                                setComprobanteActivo(comp);
                                return;
                              }
                            }
                            if (onPagar) {
                              onPagar(t);
                            } else {
                              router.push(`/turnos/${t.id}/pago`);
                            }
                          }}
                          aria-label={
                            pagadosMap[t.id]
                              ? `Ver comprobante de cobro del turno de ${t.clienteNombre}`
                              : `Pagar turno de ${t.clienteNombre}`
                          }
                          title={
                            pagadosMap[t.id]
                              ? "Ver comprobante de cobro (Pagado)"
                              : "Pagar turno"
                          }
                          className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
                            pagadosMap[t.id]
                              ? "text-status-success-strong hover:bg-status-success/15 hover:text-status-success-strong"
                              : "text-text-secondary hover:bg-brand-900/10 hover:text-brand-900"
                          }`}
                        >
                          {pagadosMap[t.id] ? (
                            <FileCheck className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comprobanteActivo && (
        <ComprobanteTurnoModal
          open={Boolean(comprobanteActivo)}
          onClose={() => setComprobanteActivo(null)}
          comprobante={comprobanteActivo}
        />
      )}
    </div>
  );
}