"use client";

import { useState } from "react";
import { ListOrdered } from "lucide-react";
import type { ReporteVentasResultado } from "@/modules/reportes/reportes.types";
import { ReportKPIs } from "./ReportKPIs";
import { TrendChart } from "./TrendChart";
import { ExportActions } from "./ExportActions";
import { Pagination } from "@/components/ui/Pagination";

interface ReportResultsProps {
  resultado: ReporteVentasResultado;
  desde: string;
  hasta: string;
}

const formatMoneda = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export function ReportResults({ resultado, desde, hasta }: ReportResultsProps) {
  const { totalVentas, ticketPromedio, cantidadOperaciones, tendencia, filas } = resultado;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.max(1, Math.ceil(filas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filas.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filas.length);
  const filasPaginadas = filas.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex flex-col gap-6">
      {/* Barra superior de acciones de exportación */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3 print:hidden">
        <div>
          <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            Resultados del Período
          </h2>
          <p className="text-xs font-semibold text-text-secondary">
            Mostrando {filas.length} {filas.length === 1 ? "registro encontrado" : "registros encontrados"}
          </p>
        </div>

        <ExportActions filas={filas} desde={desde} hasta={hasta} />
      </div>

      {/* Tarjetas superiores de KPIs */}
      <ReportKPIs
        totalVentas={totalVentas}
        ticketPromedio={ticketPromedio}
        cantidadOperaciones={cantidadOperaciones}
      />

      {/* Gráfico de tendencia */}
      {tendencia.length > 0 && <TrendChart data={tendencia} />}

      {/* Tabla detallada de transacciones */}
      <div className="rounded-md border border-border bg-surface shadow-card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border bg-cream-50/50">
          <ListOrdered className="h-5 w-5 text-brand-900" aria-hidden="true" />
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Detalle de Ventas Registradas
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead className="border-b border-border bg-cream-50/70 text-xs font-extrabold uppercase tracking-wider text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Comprobante
                </th>
                <th scope="col" className="px-4 py-3">
                  Fecha y Hora
                </th>
                <th scope="col" className="px-4 py-3">
                  Sucursal
                </th>
                <th scope="col" className="px-4 py-3">
                  Cliente
                </th>
                <th scope="col" className="px-4 py-3">
                  Artículos / Servicios
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-text-secondary">
                    No se registraron ventas en el período seleccionado.
                  </td>
                </tr>
              ) : (
                filasPaginadas.map((fila) => (
                  <tr key={fila.id} className="hover:bg-cream-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-900 whitespace-nowrap">
                      {fila.comprobante}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs whitespace-nowrap">
                      {fila.fecha}
                    </td>
                    <td className="px-4 py-3 font-semibold text-text-primary whitespace-nowrap">
                      {fila.sucursalNombre}
                    </td>
                    <td className="px-4 py-3 font-semibold text-text-primary">
                      {fila.clienteNombre}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary max-w-xs truncate" title={fila.itemsResumen}>
                      {fila.itemsResumen}
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-brand-900 text-right whitespace-nowrap">
                      {formatMoneda(fila.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filas.length > 0 && (
          <div className="border-t border-border px-4 py-2 bg-cream-50/20">
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filas.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="ventas"
            />
          </div>
        )}
      </div>
    </div>
  );
}
