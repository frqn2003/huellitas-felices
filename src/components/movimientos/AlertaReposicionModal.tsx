"use client";

import { AlertTriangle } from "lucide-react";
import type { FichaStock } from "@/data/stock";
import { codigoFicha } from "@/data/movimientos";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface AlertaReposicionModalProps {
  ficha: FichaStock | null;
  onClose: () => void;
}

function formatCantidad(valor: number, unidad: string) {
  return `${valor.toFixed(2)} ${unidad}`;
}

export function AlertaReposicionModal({ ficha, onClose }: AlertaReposicionModalProps) {
  return (
    <Modal
      open={ficha !== null}
      onClose={onClose}
      title="Alerta de stock"
      icon={
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </span>
      }
      footer={
        <Button variant="secondary" size="lg" type="button" onClick={onClose}>
          Entendido
        </Button>
      }
    >
      {ficha && (
        <div className="flex flex-col gap-4">
          <p className="text-base font-semibold text-text-primary">
            El artículo{" "}
            <span className="font-extrabold text-brand-900">{ficha.articulo.nombre}</span>{" "}
            (ficha {codigoFicha(ficha.id)}) alcanzó o superó su stock mínimo.
          </p>
          <dl className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1 rounded-sm border border-border bg-cream-50 px-3 py-3">
              <dt className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Stock actual
              </dt>
              <dd className="font-display text-xl font-extrabold text-brand-900">
                {formatCantidad(ficha.stockActual, ficha.articulo.unidadMedida)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-sm border border-border bg-cream-50 px-3 py-3">
              <dt className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Stock mínimo
              </dt>
              <dd className="font-display text-xl font-extrabold text-brand-900">
                {formatCantidad(ficha.stockMinimo, ficha.articulo.unidadMedida)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-sm border border-border bg-cream-50 px-3 py-3">
              <dt className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Stock crítico
              </dt>
              <dd className="font-display text-xl font-extrabold text-brand-900">
                {ficha.stockCritico !== null
                  ? formatCantidad(ficha.stockCritico, ficha.articulo.unidadMedida)
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-text-secondary">
            Considerá registrar una orden de compra o una transferencia para reponer el artículo.
          </p>
        </div>
      )}
    </Modal>
  );
}