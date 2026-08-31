"use client";

import { FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EstadoComprobanteBadge } from "@/components/comprobantes/EstadoComprobanteBadge";
import { OcrFieldGroup } from "@/components/comprobantes/OcrFieldGroup";
import type { ComprobanteRow } from "@/components/comprobantes/ComprobantesTable";

const FORMATO_ARS = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

interface VerComprobanteModalProps {
  open: boolean;
  comprobante: ComprobanteRow | null;
  onClose: () => void;
  onModificar: (comprobante: ComprobanteRow) => void;
}

export function VerComprobanteModal({ open, comprobante, onClose, onModificar }: VerComprobanteModalProps) {
  if (!comprobante) return null;
  const esNcNd = comprobante.tipo.startsWith("Nota de");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Comprobante ${comprobante.numero}`}
      icon={<FileText className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={() => onModificar(comprobante)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modificar datos
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Panel visor del documento */}
        <div className="flex flex-col gap-3 lg:w-[50%]">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">Documento</h3>
          {/* BACKEND: reemplazar por GET /api/comprobantes/{id}/pdf — acá se renderiza el PDF del comprobante. */}
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-cream-50 px-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
              <FileText className="h-7 w-7 text-brand-900" aria-hidden="true" />
            </span>
            <p className="max-w-xs text-sm font-medium text-text-secondary">
              El visor del documento se habilita cuando el backend provea el PDF del comprobante.
            </p>
          </div>
        </div>

        {/* Panel datos cargados */}
        <div className="flex flex-col gap-5 lg:w-[50%]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">Datos cargados</h3>
            <EstadoComprobanteBadge estado={comprobante.estado} />
          </div>

          <div className="grid grid-cols-2 items-start gap-3">
            <OcrFieldGroup label="Tipo">
              <Input id="ver-tipo" value={comprobante.tipo} readOnly className="bg-background" />
            </OcrFieldGroup>
            <OcrFieldGroup label="Proveedor">
              <Input id="ver-proveedor" value={comprobante.proveedor} readOnly className="bg-background" />
            </OcrFieldGroup>
          </div>

          <div className="grid grid-cols-2 items-start gap-3">
            <OcrFieldGroup label="N° de comprobante">
              <Input id="ver-numero" value={comprobante.numero} readOnly className="bg-background" />
            </OcrFieldGroup>
            <OcrFieldGroup label="OC vinculada">
              <Input id="ver-oc" value={comprobante.oc} readOnly className="bg-background" />
            </OcrFieldGroup>
          </div>

          <div className="grid grid-cols-2 items-start gap-3">
            <OcrFieldGroup label="Fecha de emisión">
              <Input id="ver-fecha" value={comprobante.fecha} readOnly className="bg-background" />
            </OcrFieldGroup>
            <OcrFieldGroup label="Monto total">
              <Input id="ver-monto" value={FORMATO_ARS(comprobante.monto)} readOnly className="bg-background" />
            </OcrFieldGroup>
          </div>

          {esNcNd && comprobante.comprobanteOriginal && (
            <OcrFieldGroup label="Factura original que corrige">
              <Input id="ver-original" value={comprobante.comprobanteOriginal} readOnly className="bg-background" />
            </OcrFieldGroup>
          )}
        </div>
      </div>
    </Modal>
  );
}
