"use client";

import { Trash2 } from "lucide-react";
import type { Proveedor } from "@/data/proveedores";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface BajaProveedorModalProps {
  proveedor: Proveedor | null;
  onClose: () => void;
  onConfirm: (proveedor: Proveedor) => void;
}

export function BajaProveedorModal({ proveedor, onClose, onConfirm }: BajaProveedorModalProps) {
  return (
    <Modal
      open={proveedor !== null}
      onClose={onClose}
      title="Dar de baja proveedor"
      icon={<Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => proveedor && onConfirm(proveedor)}
          >
            Dar de baja
          </Button>
        </>
      }
    >
      {proveedor && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold text-text-primary">
            ¿Está seguro que desea dar de baja al proveedor{" "}
            <span className="text-brand-900">“{proveedor.razonSocial}”</span>?
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            El proveedor quedará inactivo y no podrá seleccionarse en nuevas órdenes de compra ni
            solicitudes de cotización. Sus registros históricos se conservarán.
          </p>
        </div>
      )}
    </Modal>
  );
}
