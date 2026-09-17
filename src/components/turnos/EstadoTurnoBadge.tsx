import {
  CalendarX2,
  CheckCircle2,
  Clock,
  Stethoscope,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { estadosTurno } from "@/data/turnos";
import {
  StatusBadge,
  type StatusVariant,
} from "@/components/ui/StatusBadge";

// Mapea el catálogo estado_turno (1..5) a la variante de StatusBadge. Nunca
// define colores propios (regla: los badges van sobre StatusBadge). El estado
// desconocido cae en neutral con el nombre crudo del catálogo.
interface EstadoTurnoBadgeProps {
  estadoId: number;
}

const VARIANTES: Record<number, { variant: StatusVariant; label: string; icon: LucideIcon }> = {
  1: { variant: "warning", label: "Pendiente", icon: Clock },
  2: { variant: "success", label: "Confirmado", icon: CheckCircle2 },
  3: { variant: "danger", label: "Cancelado", icon: CalendarX2 },
  4: { variant: "info", label: "Atendido", icon: Stethoscope },
  5: { variant: "neutral", label: "No asistió", icon: UserX },
};

export function EstadoTurnoBadge({ estadoId }: EstadoTurnoBadgeProps) {
  const estado = estadosTurno.find((e) => e.id === estadoId);
  const mapeo = VARIANTES[estadoId] ?? { variant: "neutral" as const, label: estado?.nombre ?? "Desconocido", icon: undefined };

  return (
    <StatusBadge variant={mapeo.variant} label={mapeo.label} icon={mapeo.icon} />
  );
}