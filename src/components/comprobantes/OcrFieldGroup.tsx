import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

type OcrConfianza = "alta" | "media" | "baja" | "no reconocido";

interface OcrFieldGroupProps {
  label: string;
  confianza?: OcrConfianza;
  requiredMark?: boolean;
  className?: string;
  children: ReactNode;
}

const confianzaStyles: Record<OcrConfianza, { border: string; message: string; icon: ReactNode }> = {
  alta: {
    border: "",
    message: "",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-status-success" aria-hidden="true" />,
  },
  media: {
    border: "[&>*]:border-status-warning",
    message: "Verificar — reconocido con baja confianza",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-status-warning-strong" aria-hidden="true" />,
  },
  baja: {
    border: "[&>*]:border-destructive",
    message: "Revisar — campo reconocido con baja confianza",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />,
  },
  "no reconocido": {
    border: "[&>*]:border-destructive",
    message: "Campo no reconocido — completar manualmente",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />,
  },
};

export function OcrFieldGroup({ label, confianza = "alta", requiredMark = false, className = "", children }: OcrFieldGroupProps) {
  const style = confianzaStyles[confianza];
  const hasWarning = confianza !== "alta";

  return (
    <div className={`flex flex-col gap-1.5 ${style.border} ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-text-primary">
          {label}
          {requiredMark && <span className="text-destructive"> *</span>}
        </span>
        {style.icon}
      </div>
      {children}
      {hasWarning && style.message && (
        <p role="alert" className={`text-xs font-semibold ${
          confianza === "media" ? "text-status-warning-strong" : "text-destructive"
        }`}>
          {style.message}
        </p>
      )}
    </div>
  );
}
