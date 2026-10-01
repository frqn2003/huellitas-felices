import { CheckCircle2, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

// Mapea el boolean de `caja_apertura.estado` a la variante de StatusBadge.
// Nunca define colores propios (regla: los badges van sobre StatusBadge).
interface EstadoCajaBadgeProps {
  abierto: boolean;
}

const VARIANTES: Record<"abierto" | "cerrado", { variant: StatusVariant; label: string; icon: LucideIcon }> = {
  abierto: { variant: "success", label: "Abierta", icon: CheckCircle2 },
  cerrado: { variant: "neutral", label: "Cerrada", icon: Lock },
};

export function EstadoCajaBadge({ abierto }: EstadoCajaBadgeProps) {
  const mapeo = VARIANTES[abierto ? "abierto" : "cerrado"];
  return <StatusBadge variant={mapeo.variant} label={mapeo.label} icon={mapeo.icon} />;
}