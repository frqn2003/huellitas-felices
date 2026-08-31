import { AlertTriangle, BadgeCheck, CircleDollarSign, Clock4, ReceiptText } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import type { EstadoCtaCte } from "@/data/cuentas-corrientes";

// Badge de estado de cuenta corriente. Mapea el estado de negocio a una
// variante + label + ícono de StatusBadge (única fuente de color de estado).
const MAP: Record<EstadoCtaCte, { variant: StatusVariant; label: string; icon: typeof Clock4 }> = {
  Vencido: { variant: "danger", label: "Vencido", icon: AlertTriangle },
  ProximoAVencer: { variant: "warning", label: "Próximo a vencer", icon: Clock4 },
  Pendiente: { variant: "warning", label: "Pendiente", icon: ReceiptText },
  Credito: { variant: "success", label: "Crédito a favor", icon: CircleDollarSign },
  Saldado: { variant: "neutral", label: "Saldado", icon: BadgeCheck },
};

interface EstadoCtaCteBadgeProps {
  estado: EstadoCtaCte;
}

export function EstadoCtaCteBadge({ estado }: EstadoCtaCteBadgeProps) {
  const { variant, label, icon } = MAP[estado];
  return <StatusBadge variant={variant} label={label} icon={icon} />;
}
