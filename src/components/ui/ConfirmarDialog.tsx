"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// Dialog de confirmación (regla Pet Bliss: acciones destructivas y cambios
// irreversibles siempre con confirmación). `tone` ajusta la semántica del
// botón de confirmar: danger (borrados/inhabilitaciones), success (estados que
// avanzan, ej: turno atendido), neutral (cambios de estado sin riesgo).
// Default "danger": mismo icono y variante que la versión original, para no
// romper a los consumidores existentes (NuevoTurnoModal, MascotaFormModal,
// ComprobantesContent, RegistrarPagoCtaCteModal).
export type ConfirmarTone = "danger" | "success" | "neutral";

interface ConfirmarDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmarTone;
  onClose: () => void;
  onConfirm: () => void;
}

const TONES: Record<
  ConfirmarTone,
  { icon: ReactNode; variant: "destructive" | "primary" | "secondary"; iconClass: string }
> = {
  danger: {
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
    variant: "destructive",
    iconClass: "text-destructive",
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
    variant: "primary",
    iconClass: "text-status-success-strong",
  },
  neutral: {
    icon: <Info className="h-5 w-5" aria-hidden="true" />,
    variant: "secondary",
    iconClass: "text-text-secondary",
  },
};

export function ConfirmarDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Volver",
  tone = "danger",
  onClose,
  onConfirm,
}: ConfirmarDialogProps) {
  const style = TONES[tone];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={<span className={style.iconClass}>{style.icon}</span>}
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button type="button" variant={style.variant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{description}</p>
    </Modal>
  );
}