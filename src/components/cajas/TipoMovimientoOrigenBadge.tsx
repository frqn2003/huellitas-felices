import { ShoppingCart, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// El origen del movimiento se deduce de `venta_id`: NULL = carga manual, con
// valor = ingreso por el cobro en efectivo de una venta.
interface TipoMovimientoOrigenBadgeProps {
  ventaId: number | null;
}

const VARIANTES: Record<"venta" | "manual", { variant: StatusVariant; label: string; icon: LucideIcon }> = {
  venta: { variant: "info", label: "Venta", icon: ShoppingCart },
  manual: { variant: "neutral", label: "Manual", icon: User },
};

export function TipoMovimientoOrigenBadge({ ventaId }: TipoMovimientoOrigenBadgeProps) {
  const esVenta = ventaId !== null;
  const mapeo = VARIANTES[esVenta ? "venta" : "manual"];
  return (
    <StatusBadge
      variant={mapeo.variant}
      label={esVenta ? `${mapeo.label} #${ventaId}` : mapeo.label}
      icon={mapeo.icon}
    />
  );
}