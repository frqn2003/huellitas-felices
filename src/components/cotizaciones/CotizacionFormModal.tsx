"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { articulosIniciales, PROVEEDORES } from "@/data/articulos";
import type { SolicitudCotizacion } from "@/data/cotizaciones";
import { codigoSolicitud } from "@/data/cotizaciones";
import { CONDICIONES_PAGO, formatFecha, parseImporte } from "@/data/ordenes-compra";
import type { NuevaCotizacionInput } from "@/context/CotizacionesContext";

interface CotizacionFormModalProps {
  solicitud: SolicitudCotizacion | null;
  onClose: () => void;
  onSave: (input: NuevaCotizacionInput) => void;
}

interface CotizacionErrors {
  proveedorId?: string;
  condicionPago?: string;
  fechaRecepcion?: string;
  precios?: Record<string, string>;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CotizacionFormModal({
  solicitud,
  onClose,
  onSave,
}: CotizacionFormModalProps) {
  const [proveedorId, setProveedorId] = useState("");
  const [condicionPago, setCondicionPago] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState(hoyISO());
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<CotizacionErrors>({});
  const [touched, setTouched] = useState(false);

  if (!solicitud) return null;

  // BACKEND: poblar desde GET /api/proveedores.
  const proveedorOptions = PROVEEDORES.filter(
    (p) => !solicitud._cotizaciones.some((c) => c.proveedor_id === p.id),
  ).map((p) => ({ value: String(p.id), label: p.nombre }));

  const validar = (
    over?: Partial<{
      proveedorId: string;
      condicionPago: string;
      fechaRecepcion: string;
      precios: Record<string, string>;
    }>,
  ): CotizacionErrors => {
    const vProveedor = over?.proveedorId ?? proveedorId;
    const vCondicion = over?.condicionPago ?? condicionPago;
    const vFecha = over?.fechaRecepcion ?? fechaRecepcion;
    const vPrecios = over?.precios ?? precios;
    const next: CotizacionErrors = {};
    if (!vProveedor) next.proveedorId = "Seleccioná un proveedor.";
    if (!vCondicion) next.condicionPago = "Seleccioná la condición de pago.";
    if (!vFecha) {
      next.fechaRecepcion = "Ingresá la fecha de recepción.";
    } else {
      const fecha = new Date(`${vFecha}T00:00:00`);
      const hoy = new Date(`${hoyISO()}T00:00:00`);
      if (Number.isNaN(fecha.getTime())) {
        next.fechaRecepcion = "Fecha inválida.";
      } else if (fecha > hoy) {
        next.fechaRecepcion = "No puede ser futura.";
      }
    }
    const preciosErrores: Record<string, string> = {};
    solicitud._articulos_solicitados.forEach((a) => {
      const valor = parseImporte(vPrecios[String(a.articulo_id)] ?? "");
      if ((vPrecios[String(a.articulo_id)] ?? "").trim() === "" || Number.isNaN(valor)) {
        preciosErrores[String(a.articulo_id)] = "Ingresá el precio cotizado.";
      } else if (valor <= 0) {
        preciosErrores[String(a.articulo_id)] = "Debe ser mayor a 0.";
      }
    });
    if (Object.keys(preciosErrores).length > 0) next.precios = preciosErrores;
    return next;
  };

  const showErrorPrecio = (articuloId: number) =>
    touched ? errors.precios?.[String(articuloId)] : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = validar();
    setErrors(next);
    setTouched(true);
    if (
      Object.keys(next).some((k) => k !== "precios" && next[k as keyof CotizacionErrors]) ||
      (next.precios && Object.keys(next.precios).length > 0)
    ) {
      return;
    }
    const preciosNumericos: Record<string, number> = {};
    Object.entries(precios).forEach(([k, v]) => {
      preciosNumericos[k] = parseImporte(v);
    });
    onSave({
      proveedorId,
      condicionPago,
      fechaRecepcion,
      precios: preciosNumericos,
    });
  };

  return (
    <Modal
      open={!!solicitud}
      onClose={onClose}
      title="Registrar cotización recibida"
      icon={<ClipboardList className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cotizacion-form">
            Guardar cotización
          </Button>
        </>
      }
    >
      <form id="cotizacion-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div
          className="flex flex-col gap-1 rounded-sm border border-border/60 bg-cream-50 px-4 py-3"
          role="note"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Solicitud
          </p>
          <p className="font-mono text-base font-bold text-brand-900">
            {codigoSolicitud(solicitud.id)}
          </p>
          <p className="text-xs font-medium text-text-secondary">
            Creada el {formatFecha(solicitud.fecha)} ·{" "}
            {solicitud._cotizaciones.length === 0
              ? "sin cotizaciones registradas"
              : `${solicitud._cotizaciones.length} ${
                  solicitud._cotizaciones.length === 1 ? "cotización" : "cotizaciones"
                }`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Combobox
            id="proveedor-cot"
            label="Proveedor"
            requiredMark
            value={proveedorId}
            options={proveedorOptions}
            onChange={(value) => {
              setProveedorId(value);
              if (touched) setErrors(validar({ proveedorId: value }));
            }}
            onBlur={() => setTouched(true)}
            error={touched ? errors.proveedorId : undefined}
            placeholder="Buscar proveedor..."
            noResultsText="Sin resultados"
          />
          <Select
            id="condicion-cot"
            label="Condición de pago"
            requiredMark
            value={condicionPago}
            onChange={(e) => {
              setCondicionPago(e.target.value);
              if (touched) setErrors(validar({ condicionPago: e.target.value }));
            }}
            onBlur={() => setTouched(true)}
            error={touched ? errors.condicionPago : undefined}
          >
            <option value="">Seleccionar...</option>
            {/* BACKEND: catálogo desde GET /api/condiciones-pago. */}
            {CONDICIONES_PAGO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <Input
          id="fecha-recepcion-cot"
          label="Fecha de recepción"
          requiredMark
          type="date"
          max={hoyISO()}
          value={fechaRecepcion}
          onChange={(e) => {
            setFechaRecepcion(e.target.value);
            if (touched) setErrors(validar({ fechaRecepcion: e.target.value }));
          }}
          onBlur={() => setTouched(true)}
          error={touched ? errors.fechaRecepcion : undefined}
        />

        <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-cream-50 p-4">
          <legend className="px-2 font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Precios cotizados
          </legend>
          <div className="flex flex-col gap-3">
            {solicitud._articulos_solicitados.map((a) => {
              // BACKEND: nombre del artículo resuelto por JOIN del detalle.
              const articulo = articulosIniciales.find((x) => x.id === a.articulo_id);
              return (
                <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_160px] items-start gap-3">
                  <div className="flex flex-col pt-6">
                    <span className="text-sm font-bold text-text-primary">
                      {articulo?.nombre ?? `Artículo #${a.articulo_id}`}
                    </span>
                    <span className="text-xs text-text-secondary">
                      Cantidad estimada: {a.cantidad_estimada}
                    </span>
                  </div>
                  <Input
                    id={`precio-cot-${a.articulo_id}`}
                    label="Precio unitario"
                    requiredMark
                    inputMode="decimal"
                    placeholder="$ 0,00"
                    value={precios[String(a.articulo_id)] ?? ""}
                    onChange={(e) => {
                      const nextPrecios = {
                        ...precios,
                        [String(a.articulo_id)]: e.target.value,
                      };
                      setPrecios(nextPrecios);
                      if (touched) setErrors(validar({ precios: nextPrecios }));
                    }}
                    onBlur={() => setTouched(true)}
                    error={showErrorPrecio(a.articulo_id)}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 rounded-sm border border-border/60 bg-cream-50 px-4 py-3" role="note">
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Validaciones
          </p>
          <ul className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
            <li>Un proveedor no puede tener dos cotizaciones para la misma solicitud.</li>
            <li>Todos los artículos solicitados necesitan un precio mayor a 0.</li>
            <li>La fecha de recepción no puede ser futura.</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
}
