import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EstadoStock } from "@/data/stock";

const badgeStyles: Record<
  EstadoStock,
  { chip: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  normal: {
    chip: "bg-brand-900/10 text-brand-900",
    icon: CheckCircle2,
  },
  bajo: {
    chip: "bg-accent-500/15 text-brand-900",
    icon: AlertTriangle,
  },
  critico: {
    chip: "bg-destructive/10 text-destructive",
    icon: AlertCircle,
  },
};

const LABELS: Record<EstadoStock, string> = {
  normal: "Normal",
  bajo: "Bajo",
  critico: "Crítico",
};

export function EstadoStockBadge({ estado }: { estado: EstadoStock }) {
  const style = badgeStyles[estado];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${style.chip}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      {LABELS[estado]}
    </span>
  );
}