"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TwoFactorModalProps {
  open: boolean;
  onVerificar: (codigo: string) => boolean;
  onReenviar: () => void;
  onClose: () => void;
}

export function TwoFactorModal({
  open,
  onVerificar,
  onReenviar,
  onClose,
}: TwoFactorModalProps) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleVerificar = () => {
    if (codigo.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }
    setCargando(true);
    setError("");

    setTimeout(() => {
      const ok = onVerificar(codigo);
      if (!ok) {
        setError("Código incorrecto. Intentá de nuevo.");
        setCargando(false);
      }
    }, 500);
  };

  const handleReenviar = () => {
    setCodigo("");
    setError("");
    onReenviar();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && codigo.length === 6) {
      handleVerificar();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Verificación de seguridad"
      icon={<ShieldCheck className="h-6 w-6 text-brand-900" aria-hidden="true" />}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Se ha enviado un código de verificación a tu email registrado.
        </p>

        <Input
          label="Código de verificación"
          requiredMark
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          onKeyDown={handleKeyDown}
          error={error}
          placeholder="000000"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
        />

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={handleReenviar}>
            Reenviar código
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleVerificar}
            disabled={codigo.length !== 6 || cargando}
          >
            {cargando ? "Verificando..." : "Verificar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
