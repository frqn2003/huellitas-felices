"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface BajaClienteModalProps {
  open: boolean;
  nombreCliente: string;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmación de baja lógica de un cliente (HU-CLI-01). Se muestra cuando el
 * formulario se guarda con el toggle en "Inactivo" (patrón BajaProveedorModal).
 */
export function BajaClienteModal({ open, nombreCliente, onClose, onConfirm }: BajaClienteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar baja"
      icon={<Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Dar de baja
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-base font-bold text-text-primary">
          ¿Confirmás la baja del cliente <span className="text-brand-900">“{nombreCliente}”</span>?
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          El cliente quedará inactivo y no podrá registrar nuevos turnos. Su historial de compras,
          servicios y deudas se conservará.
        </p>
      </div>
    </Modal>
  );
}