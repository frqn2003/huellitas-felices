import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TipoMovimientoCaja } from "@/data/cajas";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Mapea el enum `tipo_movimiento_caja` a la variante de StatusBadge. El signo va
// en el texto (regla Pet Bliss: nunca color solo).
interface TipoMovimientoCajaBadgeProps {
  tipo: TipoMovimientoCaja;
}

const VARIANTES: Record<TipoMovimientoCaja, { variant: StatusVariant; label: string; icon: LucideIcon }> = {
  Ingreso: { variant: "success", label: "+ Ingreso", icon: ArrowUpRight },
  Egreso: { variant: "danger", label: "− Egreso", icon: ArrowDownLeft },
};

export function TipoMovimientoCajaBadge({ tipo }: TipoMovimientoCajaBadgeProps) {
  const mapeo = VARIANTES[tipo];
  return <StatusBadge variant={mapeo.variant} label={mapeo.label} icon={mapeo.icon} />;
}