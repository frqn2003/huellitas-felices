import { Eye, SearchX, Trash2 } from "lucide-react";
import { EstadoComprobanteBadge } from "./EstadoComprobanteBadge";

export interface ComprobanteRow {
  id: number;
  proveedor: string;
  tipo: string;
  numero: string;
  oc: string;
  fecha: string;
  monto: number;
  estado: "Vigente" | "Anulado";
  comprobanteOriginal?: string;
  comprobanteAnulador?: string;
}

interface ComprobantesTableProps {
  filas: ComprobanteRow[];
  onVer: (id: number) => void;
  onAnular: (id: number) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const HEADERS = ["N° Comprobante", "Fecha", "Tipo", "OC vinculada", "Proveedor", "Monto", "Estado", "Acciones"];

export function ComprobantesTable({
  filas,
  onVer,
  onAnular,
  hasActiveFilters,
  onClearFilters,
}: ComprobantesTableProps) {
  if (filas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <SearchX className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay comprobantes registrados"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay comprobantes que coincidan con la búsqueda o los filtros aplicados."
              : "El historial de comprobantes aparecerá acá cuando cargues el primero."}
          </p>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">
            Historial de comprobantes con acciones para ver y anular
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
            {filas.map((f) => (
              <tr
                key={f.id}
                className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-brand-900">{f.numero}</span>
                    {f.comprobanteOriginal && (
                      <span className="text-xs font-medium text-text-secondary">Ref: {f.comprobanteOriginal}</span>
                    )}
                    {f.comprobanteAnulador && (
                      <span className="text-xs font-medium text-text-secondary">Anulado por: {f.comprobanteAnulador}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">
                  {new Date(f.fecha).toLocaleDateString("es-AR")}
                </td>
                <td className="px-4 py-3 text-sm text-text-primary">{f.tipo}</td>
                <td className="px-4 py-3 text-sm text-text-primary">{f.oc}</td>
                <td className="px-4 py-3 text-sm font-medium text-text-primary">{f.proveedor}</td>
                <td className={`px-4 py-3 text-sm font-semibold ${
                  f.monto < 0 ? "text-destructive" : "text-text-primary"
                }`}>
                  {f.monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </td>
                <td className="px-4 py-3">
                  <EstadoComprobanteBadge estado={f.estado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onVer(f.id)}
                      aria-label={`Ver comprobante ${f.numero}`}
                      title="Ver detalles"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                    >
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {f.estado === "Vigente" && (
                      <button
                        type="button"
                        onClick={() => onAnular(f.id)}
                        aria-label={`Anular comprobante ${f.numero}`}
                        title="Anular comprobante"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-status-danger/10 hover:text-status-danger-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}