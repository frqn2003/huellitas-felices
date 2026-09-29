"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";

interface NotaConsultaModalProps {
  open: boolean;
  profesional: string;
  onClose: () => void;
  onGuardar: (nota: string) => void;
}

export function NotaConsultaModal({
  open,
  profesional,
  onClose,
  onGuardar,
}: NotaConsultaModalProps) {
  const [nota, setNota] = useState("");
  const [touched, setTouched] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const error = touched && nota.trim() === "" ? "La nota es obligatoria." : undefined;

  function handleClose() {
    setNota("");
    setTouched(false);
    onClose();
  }

  function handleGuardar() {
    setTouched(true);
    if (!nota.trim()) return;
    setGuardando(true);
    // Simula async — en producción sería await POST /api/consultas/:id/notas
    setTimeout(() => {
      onGuardar(nota.trim());
      setNota("");
      setTouched(false);
      setGuardando(false);
    }, 400);
  }

  const ahora = new Date().toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Agregar nota aclaratoria"
      icon={
        <MessageSquarePlus className="h-5 w-5 text-brand-900" aria-hidden="true" />
      }
      maxWidth="max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleGuardar}
            disabled={guardando || !nota.trim()}
          >
            {guardando ? "Guardando…" : "Guardar nota"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Textarea
          id="nota-aclaratoria"
          label="Nota"
          requiredMark
          placeholder="Escribí la nota aclaratoria…"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => setTouched(true)}
          error={error}
          rows={4}
        />
        <div className="flex flex-col gap-1 rounded-md border border-border bg-cream-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Profesional
            </span>
            <span className="text-sm font-semibold text-text-primary">{profesional}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Fecha y hora
            </span>
            <span className="text-sm font-semibold text-text-primary">{ahora}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
