"use client";

import { Eye } from "lucide-react";
import { formatearFecha } from "@/data/turnos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { TurnoRow } from "./TurnosTable";
import { EstadoTurnoBadge } from "./EstadoTurnoBadge";

const RECEPCIONISTA = "Ana Martínez";

interface TurnoDetalleModalProps {
  open: boolean;
  turno: TurnoRow | null;
  onClose: () => void;
}

function DatoDetalle({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="text-sm font-bold text-brand-900">{valor}</span>
    </div>
  );
}

export function TurnoDetalleModal({ open, turno, onClose }: TurnoDetalleModalProps) {
  return (
    <Modal
      open={open && turno !== null}
      onClose={onClose}
      title="Detalle del turno"
      icon={<Eye className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Volver
        </Button>
      }
    >
      {turno && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 rounded-sm border border-border bg-cream-50 p-4 sm:grid-cols-2">
            <DatoDetalle label="Cliente" valor={turno.clienteNombre} />
            <DatoDetalle label="DNI" valor={turno.dni} />
            <DatoDetalle label="Mascota" valor={`${turno.mascotaNombre} · ${turno.especie}`} />
            <DatoDetalle
              label="Fecha y hora"
              valor={`${formatearFecha(turno.fecha)} · ${turno.horaInicio} – ${turno.horaFin}`}
            />
            <DatoDetalle label="Profesional" valor={turno.profesionalNombre} />
            <DatoDetalle label="Especialidad" valor={turno.especialidad} />
            <DatoDetalle
              label="Práctica"
              valor={turno.practicaNombre}
            />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                Estado
              </span>
              <EstadoTurnoBadge estadoId={turno.estadoId} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Creado por
            </span>
            <span className="text-sm font-medium text-text-primary">
              {RECEPCIONISTA} (Recepcionista)
            </span>
            {/* BACKEND: expone turno.fecha_creacion + usuario (quien cargó). */}
            <span className="text-xs text-text-secondary">
              {turno.fechaCreacionHora}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Notas
            </span>
            <p className="text-sm text-text-primary">
              {turno.notas || <span className="text-text-secondary">Sin notas</span>}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}