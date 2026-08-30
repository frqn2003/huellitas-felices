"use client";

import { Building2, Pencil } from "lucide-react";
import { useState } from "react";
import { SUCURSALES, type Deposito } from "@/data/stock";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";

export interface DepositoDraft {
  sucursalId: string;
  nombre: string;
  ubicacion: string;
}

interface DepositoFormModalProps {
  open: boolean;
  deposito: Deposito | null;
  depositos: Deposito[];
  onClose: () => void;
  onSave: (draft: DepositoDraft) => void;
}

function initialDraft(deposito: Deposito | null): DepositoDraft {
  if (deposito) {
    return {
      sucursalId: String(deposito.sucursalId),
      nombre: deposito.nombre,
      ubicacion: deposito.ubicacion,
    };
  }
  return { sucursalId: "", nombre: "", ubicacion: "" };
}

function validateDraft(
  d: DepositoDraft,
  depositos: Deposito[],
  propioId: number | undefined,
): Partial<Record<keyof DepositoDraft, string>> {
  const next: Partial<Record<keyof DepositoDraft, string>> = {};
  if (!d.sucursalId) {
    next.sucursalId = "Seleccioná una sucursal.";
  }
  if (!d.nombre.trim()) {
    next.nombre = "El nombre es obligatorio.";
  } else if (
    depositos.some(
      (dep) =>
        dep.sucursalId === Number(d.sucursalId) &&
        dep.nombre.toLowerCase() === d.nombre.trim().toLowerCase() &&
        dep.id !== propioId,
    )
  ) {
    next.nombre = "Ya existe un depósito con ese nombre en la sucursal elegida.";
  }
  if (!d.ubicacion.trim()) {
    next.ubicacion = "La ubicación es obligatoria.";
  }
  return next;
}

function DepositoFormFields({
  deposito,
  depositos,
  onSave,
}: {
  deposito: Deposito | null;
  depositos: Deposito[];
  onSave: (draft: DepositoDraft) => void;
}) {
  const [draft, setDraft] = useState<DepositoDraft>(() => initialDraft(deposito));
  const [errors, setErrors] = useState<Partial<Record<keyof DepositoDraft, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof DepositoDraft, boolean>>>({});

  const showError = (field: keyof DepositoDraft) => (touched[field] ? errors[field] : undefined);

  const setField = (field: keyof DepositoDraft, value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next, depositos, deposito?.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateDraft(draft, depositos, deposito?.id);
    setErrors(nextErrors);
    setTouched({ sucursalId: true, nombre: true, ubicacion: true });
    if (Object.keys(nextErrors).length > 0) return;
    onSave(draft);
  };

  return (
    <form id="deposito-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* BACKEND: poblar sucursales desde GET /api/sucursales. */}
      <Select
        id="sucursalDep"
        label="Sucursal"
        requiredMark
        value={draft.sucursalId}
        onChange={(e) => setField("sucursalId", e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, sucursalId: true }))}
        error={showError("sucursalId")}
      >
        <option value="">[ Seleccionar ]</option>
        {SUCURSALES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </Select>
      <Input
        id="nombreDep"
        label="Nombre"
        requiredMark
        value={draft.nombre}
        onChange={(e) => setField("nombre", e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
        error={showError("nombre")}
        hint="Ej: Dep. Central"
      />
      <Input
        id="ubicacion"
        label="Ubicación"
        requiredMark
        value={draft.ubicacion}
        onChange={(e) => setField("ubicacion", e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, ubicacion: true }))}
        error={showError("ubicacion")}
        hint="Ej: Av. Principal 123"
      />
    </form>
  );
}

export function DepositoFormModal({
  open,
  deposito,
  depositos,
  onClose,
  onSave,
}: DepositoFormModalProps) {
  const formKey = `deposito-${deposito?.id ?? "nuevo"}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={deposito ? "Editar depósito" : "Nuevo depósito"}
      icon={
        deposito ? (
          <Pencil className="h-5 w-5 text-brand-900" aria-hidden="true" />
        ) : (
          <Building2 className="h-5 w-5 text-brand-900" aria-hidden="true" />
        )
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="deposito-form">
            Guardar
          </Button>
        </>
      }
    >
      <DepositoFormFields
        key={formKey}
        deposito={deposito}
        depositos={depositos}
        onSave={onSave}
      />
    </Modal>
  );
}