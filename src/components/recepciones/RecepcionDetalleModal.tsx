"use client";

import { PackageOpen } from "lucide-react";
import type { Recepcion } from "@/data/recepciones";
import { formatFecha, numeroRecepcion } from "@/data/recepciones";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EstadoRecepcionBadge } from "./EstadoRecepcionBadge";

interface RecepcionDetalleModalProps {
  recepcion: Recepcion | null;
  onClose: () => void;
}

function formatoDiferencia(solicitada: number, recibida: number): string {
  const diff = solicitada - recibida;
  if (diff === 0) return "0";
  return String(diff);
}

function textoObservacion(
  observacion: string | null,
  detalle: string | null,
  solicitada: number,
  recibida: number,
): string {
  if (solicitada === recibida) return "—";
  if (!observacion) return "—";
  const label =
    observacion === "faltante"
      ? "Faltante"
      : observacion === "danado"
        ? "Dañado"
        : "Error";
  return detalle ? `${label}: ${detalle}` : label;
}

export function RecepcionDetalleModal({
  recepcion,
  onClose,
}: RecepcionDetalleModalProps) {
  if (!recepcion) return null;

  return (
    <Modal
      open={!!recepcion}
      onClose={onClose}
      title={`Detalle Recepción ${numeroRecepcion(recepcion.id)}`}
      icon={<PackageOpen className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Info general */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              OC
            </span>
            <span className="font-mono text-sm font-bold text-brand-900">
              {recepcion.ordenCompra.numero}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Proveedor
            </span>
            <span className="text-sm font-bold text-text-primary">
              {recepcion.ordenCompra.proveedor.razonSocial}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Sucursal
            </span>
            <span className="text-sm font-medium text-text-primary">
              {recepcion.sucursal}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Tipo
            </span>
            <EstadoRecepcionBadge tipo={recepcion.tipo_recepcion} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Depósito
            </span>
            <span className="text-sm font-medium text-text-primary">
              {recepcion.deposito.nombre}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Fecha
            </span>
            <span className="text-sm font-medium text-text-primary">
              {formatFecha(recepcion.fecha_hora)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Registró
            </span>
            <span className="text-sm font-medium text-text-primary">
              {recepcion.usuario.nombre}
            </span>
          </div>
        </div>

        {/* Detalle */}
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-extrabold uppercase tracking-wide text-text-secondary">
            Detalle
          </legend>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-cream-50">
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                  >
                    Artículo
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                  >
                    Solicitado
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                  >
                    Recibido
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                  >
                    Diferencia
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                  >
                    Observación
                  </th>
                </tr>
              </thead>
              <tbody>
                {recepcion._detalles.map((det) => (
                  <tr
                    key={det.id}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm font-bold text-text-primary">
                      {det.articuloNombre}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-text-secondary">
                      {det.cantidadSolicitada}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-text-primary">
                      {det.cantidadRecibida}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-bold ${
                          det.cantidadSolicitada - det.cantidadRecibida === 0
                            ? "text-text-secondary"
                            : "text-destructive"
                        }`}
                      >
                        {formatoDiferencia(
                          det.cantidadSolicitada,
                          det.cantidadRecibida,
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {textoObservacion(
                        det.observacion,
                        det.observacionDetalle,
                        det.cantidadSolicitada,
                        det.cantidadRecibida,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        {/* Observaciones generales */}
        {recepcion.observacion_general && (
          <div className="rounded-md border border-border bg-cream-50 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Observaciones generales:{" "}
            </span>
            <span className="text-sm text-text-primary">
              {recepcion.observacion_general}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
