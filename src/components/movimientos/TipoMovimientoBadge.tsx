import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Scale } from "lucide-react";
import type { TipoMovimiento } from "@/data/movimientos";

const badgeStyles: Record<
  TipoMovimiento,
  { chip: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  Ingreso: {
    chip: "bg-brand-900/10 text-brand-900",
    icon: ArrowDownToLine,
  },
  Egreso: {
    chip: "bg-destructive/10 text-destructive",
    icon: ArrowUpFromLine,
  },
  Transferencia: {
    chip: "border border-border bg-surface text-text-secondary",
    icon: ArrowLeftRight,
  },
  Ajuste: {
    chip: "bg-cream-100 text-brand-900",
    icon: Scale,
  },
};

export function TipoMovimientoBadge({ tipo }: { tipo: TipoMovimiento }) {
  const style = badgeStyles[tipo];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${style.chip}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      {tipo}
    </span>
  );
}