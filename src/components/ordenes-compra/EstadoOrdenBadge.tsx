import type { EstadoOrden } from "@/data/ordenes-compra";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Mapeo tabla fija de estados → colores de estado del sistema
// (ver design-system/huellitas-felices/pages/ordenes-compra.md).
// Siempre punto + texto (nunca solo color).
const variantes: Record<EstadoOrden, StatusVariant> = {
  Pendiente: "warning",
  Enviada: "info",
  "Recibida Parcial": "warning",
  "Recibida Total": "success",
  Cancelada: "danger",
};

export function EstadoOrdenBadge({ estado }: { estado: EstadoOrden }) {
  return <StatusBadge variant={variantes[estado]} label={estado} />;
}
