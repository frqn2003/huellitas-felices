import type { EstadoSolicitud } from "@/data/cotizaciones";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Mapeo estado → colores de estado del sistema (pill + punto, igual que órdenes).
// Siempre punto + texto (nunca solo color).
const variantes: Record<EstadoSolicitud, StatusVariant> = {
  Abierta: "warning",
  Adjudicada: "success",
  Cancelada: "danger",
};

export function EstadoSolicitudBadge({ estado }: { estado: EstadoSolicitud }) {
  return <StatusBadge variant={variantes[estado]} label={estado} />;
}
