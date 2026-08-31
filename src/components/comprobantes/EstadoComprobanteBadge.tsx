import { StatusBadge } from "@/components/ui/StatusBadge";

type EstadoComprobante = "Vigente" | "Anulado";

interface EstadoComprobanteBadgeProps {
  estado: EstadoComprobante;
}

export function EstadoComprobanteBadge({ estado }: EstadoComprobanteBadgeProps) {
  const map: Record<EstadoComprobante, { variant: "success" | "danger"; label: string }> = {
    Vigente: { variant: "success", label: "Vigente" },
    Anulado: { variant: "danger", label: "Anulado" },
  };
  const { variant, label } = map[estado];
  return <StatusBadge variant={variant} label={label} />;
}
