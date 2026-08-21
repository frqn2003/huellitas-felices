import { AlertCircle, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import type { EstadoStock } from "@/data/stock";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

const config: Record<EstadoStock, { variant: StatusVariant; icon: LucideIcon }> = {
  normal: { variant: "success", icon: CheckCircle2 },
  bajo: { variant: "warning", icon: AlertTriangle },
  critico: { variant: "danger", icon: AlertCircle },
};

const LABELS: Record<EstadoStock, string> = {
  normal: "Normal",
  bajo: "Bajo",
  critico: "Crítico",
};

export function EstadoStockBadge({ estado }: { estado: EstadoStock }) {
  const { variant, icon } = config[estado];
  return <StatusBadge variant={variant} label={LABELS[estado]} icon={icon} />;
}
