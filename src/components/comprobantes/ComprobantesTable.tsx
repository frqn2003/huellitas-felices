import { Eye, Trash2 } from "lucide-react";
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
}

export function ComprobantesTable({ filas, onVer, onAnular }: ComprobantesTableProps) {
  if (filas.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-12 text-center">
        <p className="text-base font-semibold text-text-secondary">No hay comprobantes que coincidan con los filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-card">
      <table className="w-full text-sm" aria-label="Historial de comprobantes">
        <thead>
          <tr className="border-b border-border bg-background">
            {["N° Comprobante", "Fecha", "Tipo", "OC vinculada", "Proveedor", "Monto", "Estado", "Acciones"].map((h) => (
              <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-text-secondary">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-b border-border last:border-0 transition-colors duration-fast hover:bg-background/60">
              <td className="px-4 py-3 font-mono text-text-primary">
                <div className="flex flex-col">
                  <span>{f.numero}</span>
                  {f.comprobanteOriginal && (
                    <span className="text-xs text-text-secondary">Ref: {f.comprobanteOriginal}</span>
                  )}
                  {f.comprobanteAnulador && (
                    <span className="text-xs text-text-secondary">Anulado por: {f.comprobanteAnulador}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {new Date(f.fecha).toLocaleDateString("es-AR")}
              </td>
              <td className="px-4 py-3 text-text-primary">{f.tipo}</td>
              <td className="px-4 py-3 text-text-primary">{f.oc}</td>
              <td className="px-4 py-3 font-medium text-text-primary">{f.proveedor}</td>
              <td className={`px-4 py-3 font-semibold ${
                f.monto < 0 ? "text-destructive" : "text-text-primary"
              }`}>
                {f.monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
              </td>
              <td className="px-4 py-3">
                <EstadoComprobanteBadge estado={f.estado} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
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
  );
}
