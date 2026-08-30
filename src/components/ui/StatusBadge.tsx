import type { LucideIcon } from "lucide-react";

// Etiqueta de estado del sistema (pill + punto/ícono + texto).
// Único punto de verdad para los colores de estado (tokens status-*).
// Regla: siempre texto + indicador visual, nunca color solo.
export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

const variantStyles: Record<StatusVariant, { chip: string; accent: string }> = {
  success: {
    chip: "bg-status-success/10 text-status-success-strong",
    accent: "bg-status-success",
  },
  warning: {
    chip: "bg-status-warning/10 text-status-warning-strong",
    accent: "bg-status-warning",
  },
  danger: {
    chip: "bg-status-danger/10 text-status-danger-strong",
    accent: "bg-status-danger",
  },
  info: {
    chip: "bg-status-info/10 text-status-info-strong",
    accent: "bg-status-info",
  },
  neutral: {
    chip: "bg-cream-100 text-text-secondary",
    accent: "bg-text-secondary",
  },
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  icon?: LucideIcon;
}

export function StatusBadge({ variant, label, icon: Icon }: StatusBadgeProps) {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${style.chip}`}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      ) : (
        <span className={`h-2 w-2 rounded-full ${style.accent}`} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
