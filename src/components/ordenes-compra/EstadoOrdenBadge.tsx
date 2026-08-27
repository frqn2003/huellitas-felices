import type { EstadoOrden } from "@/data/ordenes-compra";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Mapeo tabla fija de estados → colores de estado del sistema
// (ver design-system/huellitas-felices/pages/ordenes-compra.md).
// Siempre punto + texto (nunca solo color).
const variantes: Record<EstadoOrden, StatusVariant> = {
  pendiente: "warning",
  enviada: "info",
  recibida_parcial: "warning",
  recibida_total: "success",
  cancelada: "danger",
};

export function EstadoOrdenBadge({ estado }: { estado: EstadoOrden }) {
  return <StatusBadge variant={variantes[estado]} label={estado} />;
}
