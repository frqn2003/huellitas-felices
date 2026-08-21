"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { SolicitudCotizacion } from "@/data/cotizaciones";
import { codigoSolicitud } from "@/data/cotizaciones";

interface CancelarSolicitudModalProps {
  solicitud: SolicitudCotizacion | null;
  onClose: () => void;
  onConfirm: (solicitud: SolicitudCotizacion) => void;
}

export function CancelarSolicitudModal({
  solicitud,
  onClose,
  onConfirm,
}: CancelarSolicitudModalProps) {
  if (!solicitud) return null;

  return (
    <Modal
      open={!!solicitud}
      onClose={onClose}
      title="Cancelar solicitud de cotización"
      icon={<Trash2 className="h-5 w-5 text-destructive" aria-hidden="true" />}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(solicitud)}>
            Sí, cancelar solicitud
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-base text-text-primary">
          ¿Seguro que querés cancelar la solicitud{" "}
          <strong className="font-mono">{codigoSolicitud(solicitud.id)}</strong>?
        </p>
        <div className="flex flex-col gap-2 rounded-sm border border-border/60 bg-cream-50 px-4 py-3" role="note">
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Tener en cuenta
          </p>
          <ul className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
            <li>La solicitud deja de poder recibir cotizaciones.</li>
            <li>
              {solicitud._cotizaciones.length > 0
                ? `Las ${solicitud._cotizaciones.length} cotización(es) ya registradas quedan como historial.`
                : "Todavía no tiene cotizaciones registradas."}
            </li>
            <li>La acción no se puede deshacer.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
