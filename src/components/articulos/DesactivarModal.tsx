"use client";

import { Trash2 } from "lucide-react";
import type { Articulo } from "@/data/articulos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface DesactivarModalProps {
  articulo: Articulo | null;
  onClose: () => void;
  onConfirm: (articulo: Articulo) => void;
}

export function DesactivarModal({ articulo, onClose, onConfirm }: DesactivarModalProps) {
  return (
    <Modal
      open={articulo !== null}
      onClose={onClose}
      title="Desactivar artículo"
      icon={<Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => articulo && onConfirm(articulo)}
          >
            Desactivar artículo
          </Button>
        </>
      }
    >
      {articulo && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold text-text-primary">
            ¿Está seguro que desea desactivar el artículo{" "}
            <span className="text-brand-900">“{articulo.nombre}”</span>?
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            El artículo quedará inactivo y no podrá usarse en nuevos movimientos, listas de precios
            ni órdenes de compra. Los registros históricos se conservarán.
          </p>
          <p className="rounded-sm bg-brand-900/10 px-4 py-3 text-sm font-semibold text-brand-900">
            Esta acción es reversible: podrás reactivarlo desde la edición del artículo.
          </p>
        </div>
      )}
    </Modal>
  );
}
