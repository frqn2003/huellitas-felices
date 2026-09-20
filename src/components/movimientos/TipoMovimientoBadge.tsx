import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { TipoMovimiento } from "@/data/movimientos";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Ingreso/Egreso son los tipos del enum (dict). Transferencia/Ajuste se
// conservan por compatibilidad con datos viejos del contrato HTTP (el front ya
// no los crea: el tipo se deriva del ORIGEN). Se mantienen las 4 claves para
// cubrir el tipo completo con StatusBadge.
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
