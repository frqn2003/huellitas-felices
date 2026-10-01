"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { User, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface MovimientoCajaFormModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { tipo: "Ingreso" | "Egreso"; monto: number; motivo: string }) => void;
  cajeroNombre: string;
  loading?: boolean;
}

export function MovimientoCajaFormModal({
  open,
  onClose,
  onConfirm,
  cajeroNombre,
  loading,
}: MovimientoCajaFormModalProps) {
  const [tipo, setTipo] = useState<"Ingreso" | "Egreso">("Ingreso");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!monto || Number(monto) <= 0) newErrors.monto = "El monto debe ser mayor a 0";
    if (!motivo.trim()) newErrors.motivo = "El motivo es obligatorio";
    if (motivo.length > 255) newErrors.motivo = "El motivo no puede exceder 255 caracteres";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm({ tipo, monto: Number(monto), motivo: motivo.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo movimiento"
      icon={<Wallet className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cajero de la sesión: solo lectura (movimiento_caja.usuario_id). */}
        <div>
          <span className="text-sm font-bold text-text-primary">Cajero responsable</span>
          <div className="mt-1.5 flex items-center gap-2 rounded-sm border border-border bg-cream-50 px-3 py-2.5">
            <User className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-text-primary">
              {cajeroNombre}
            </span>
            <span className="shrink-0 rounded-pill bg-cream-100 px-2 py-0.5 text-xs font-bold text-text-secondary">
              Solo lectura
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo"
            requiredMark
            id="tipo-mov"
            value={tipo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setTipo(e.target.value as "Ingreso" | "Egreso")
            }
          >
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </Select>

          <Input
            label="Monto"
            requiredMark
            id="monto-mov"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="$ 0.00"
            value={monto}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setMonto(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.monto;
                return next;
              });
            }}
            error={errors.monto}
          />
        </div>

        <Textarea
          label="Motivo / concepto"
          requiredMark
          id="motivo-mov"
          rows={3}
          maxLength={255}
          placeholder="Ej: Fondo sencillo adicional para vueltos"
          value={motivo}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            setMotivo(e.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.motivo;
              return next;
            });
          }}
          error={errors.motivo}
          hint={`${motivo.length}/255`}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Registrando..." : "Registrar movimiento"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}