"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface AnularComprobanteModalProps {
  open: boolean;
  onClose: () => void;
  numeroComprobante: string;
  onConfirm: (motivo: string) => void;
}

export function AnularComprobanteModal({ open, onClose, numeroComprobante, onConfirm }: AnularComprobanteModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!motivo.trim()) {
      setError("Ingresá el motivo de anulación.");
      return;
    }
    onConfirm(motivo.trim());
    setMotivo("");
    setError("");
  };

  const handleClose = () => {
    setMotivo("");
    setError("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Anular comprobante ${numeroComprobante}`}
      icon={<AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />}
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>Confirmar anulación</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Se generará un nuevo comprobante de anulación que referencia a este. El original se conserva en el historial.
        </p>
        <Input
          label="Motivo de anulación"
          requiredMark
          id="motivo-anulacion"
          placeholder="Describí el motivo…"
          value={motivo}
          onChange={(e) => { setMotivo(e.target.value); setError(""); }}
          error={error}
          aria-required="true"
        />
      </div>
    </Modal>
  );
}
