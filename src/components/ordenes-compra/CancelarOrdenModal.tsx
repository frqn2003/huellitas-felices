"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { numeroOrden, type OrdenCompra } from "@/data/ordenes-compra";

interface CancelarOrdenModalProps {
  orden: OrdenCompra | null;
  onClose: () => void;
  onConfirm: (orden: OrdenCompra) => void;
}

export function CancelarOrdenModal({ orden, onClose, onConfirm }: CancelarOrdenModalProps) {
  return (
    <Modal
      open={orden !== null}
      onClose={onClose}
      title="Confirmar cancelación"
      icon={<AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (orden) onConfirm(orden);
            }}
            disabled={!orden}
          >
            Confirmar cancelación
          </Button>
        </>
      }
    >
      {orden && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold text-text-primary">
            ¿Está seguro que desea cancelar la orden {numeroOrden(orden.id)}?
          </p>
          <p className="text-sm text-text-secondary">
            Esta acción es irreversible. La orden quedará cancelada y no podrá editarse ni
            enviarse.
          </p>
          <p className="rounded-sm bg-cream-50 px-4 py-3 text-sm text-text-secondary">
            Los artículos no recepcionados volverán a estar disponibles para nuevas órdenes de
            compra.
          </p>
        </div>
      )}
    </Modal>
  );
}
