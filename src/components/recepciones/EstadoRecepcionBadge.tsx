import type { TipoRecepcion } from "@/data/recepciones";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Mapeo tipo de recepción → colores de estado del sistema
// Total = success (completado), Parcial = warning (atenção).
// Siempre punto + texto (nunca solo color).
const variantes: Record<TipoRecepcion, StatusVariant> = {
  total: "success",
  parcial: "warning",
};

const labels: Record<TipoRecepcion, string> = {
  total: "Total",
  parcial: "Parcial",
};

export function EstadoRecepcionBadge({ tipo }: { tipo: TipoRecepcion }) {
  return <StatusBadge variant={variantes[tipo]} label={labels[tipo]} />;
}
