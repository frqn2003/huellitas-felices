"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AbrirCajaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { cajaId: number; cajeroId: number; montoInicial: number }) => void;
  sucursales: { id: number; nombre: string; cajaId: number }[];
  cajeros: { id: number; nombre: string; apellido: string }[];
  loading?: boolean;
}

export function AbrirCajaModal({
  open,
  onClose,
  onConfirm,
  sucursales,
  cajeros,
  loading,
}: AbrirCajaModalProps) {
  const [sucursalId, setSucursalId] = useState("");
  const [cajeroId, setCajeroId] = useState("");
  const [montoInicial, setMontoInicial] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!sucursalId) newErrors.sucursalId = "Seleccione una sucursal";
    if (!cajeroId) newErrors.cajeroId = "Seleccione un cajero responsable";
    // Esquema y brief HU-VTA-03: monto_inicial >= 0 (el 0 está permitido).
    const montoNum = Number(montoInicial);
    if (montoInicial.trim() === "" || Number.isNaN(montoNum))
      newErrors.montoInicial = "Ingresá el monto inicial";
    else if (montoNum < 0)
      newErrors.montoInicial = "El monto inicial no puede ser negativo";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const selectedSucursal = sucursales.find((s) => String(s.id) === sucursalId);
    onConfirm({
      cajaId: selectedSucursal?.cajaId ?? Number(sucursalId),
      cajeroId: Number(cajeroId),
      montoInicial: Number(montoInicial),
    });
  };

  const handleSucursalChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSucursalId(e.target.value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.sucursalId;
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir caja"
      icon={<Wallet className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Select
          label="Sucursal"
          requiredMark
          value={sucursalId}
          onChange={handleSucursalChange}
          error={errors.sucursalId}
        >
          <option value="">Seleccione...</option>
          {sucursales.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.nombre}
            </option>
          ))}
        </Select>

        <Select
          label="Cajero responsable"
          requiredMark
          value={cajeroId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            setCajeroId(e.target.value);
            setErrors((prev) => {
              const next = { ...prev };
              delete next.cajeroId;
              return next;
            });
          }}
          error={errors.cajeroId}
        >
          <option value="">Seleccione...</option>
          {cajeros.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.nombre} {c.apellido}
            </option>
          ))}
        </Select>

        <div>
          <Input
            label="Monto inicial declarado"
            requiredMark
            id="monto-inicial"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="$ 0.00"
            value={montoInicial}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setMontoInicial(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.montoInicial;
                return next;
              });
            }}
            error={errors.montoInicial}
          />
          <p className="mt-1 text-xs font-medium text-text-secondary">
            Fecha y hora: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} (automática)
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Abriendo..." : "Confirmar y abrir"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}