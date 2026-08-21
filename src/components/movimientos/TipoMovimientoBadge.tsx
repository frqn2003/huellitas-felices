import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { TipoMovimiento } from "@/data/movimientos";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

const config: Record<TipoMovimiento, { variant: StatusVariant; icon: LucideIcon }> = {
  Ingreso: { variant: "success", icon: ArrowDownToLine },
  Egreso: { variant: "danger", icon: ArrowUpFromLine },
  Transferencia: { variant: "info", icon: ArrowLeftRight },
  Ajuste: { variant: "warning", icon: Scale },
};

export function TipoMovimientoBadge({ tipo }: { tipo: TipoMovimiento }) {
  const { variant, icon } = config[tipo];
  return <StatusBadge variant={variant} label={tipo} icon={icon} />;
}
