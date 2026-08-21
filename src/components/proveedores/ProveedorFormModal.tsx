"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Proveedor } from "@/data/proveedores";
import type { NuevoProveedorInput } from "@/context/ProveedoresContext";

export type ProveedorModalMode = "crear" | "editar" | "ver";

interface ProveedorFormModalProps {
  open: boolean;
  modo: ProveedorModalMode;
  proveedor?: Proveedor | null;
  onClose: () => void;
  onSave: (input: NuevoProveedorInput) => { error?: string };
}

const FORMAS_PAGO = [
  "Contado",
  "Cuenta Corriente",
  "Cheque a 30 días",
  "Cheque a 60 días",
  "Transferencia",
];

export function ProveedorFormModal({
  open,
  modo,
  proveedor,
  onClose,
  onSave,
}: ProveedorFormModalProps) {
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [contacto, setContacto] = useState("");
  const [formaPago, setFormaPago] = useState("Contado");
  const [plazoEntregaDias, setPlazoEntregaDias] = useState("1");
  const [errorGlobal, setErrorGlobal] = useState("");

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorGlobal("");
      if (proveedor && modo !== "crear") {
        setRazonSocial(proveedor.razonSocial);
        setCuit(proveedor.cuit);
        setDireccion(proveedor.direccion);
        setTelefono(proveedor.telefono);
        setEmail(proveedor.email);
        setContacto(proveedor.contacto);
        setFormaPago(proveedor.formaPago);
        setPlazoEntregaDias(String(proveedor.plazoEntregaDias));
      } else {
        setRazonSocial("");
        setCuit("");
        setDireccion("");
        setTelefono("");
        setEmail("");
        setContacto("");
        setFormaPago("Contado");
        setPlazoEntregaDias("1");
      }
    }
  }, [open, proveedor, modo]);

  const soloLectura = modo === "ver";
  const title =
    modo === "crear"
      ? "Nuevo proveedor"
      : modo === "editar"
        ? "Editar proveedor"
        : "Detalles del proveedor";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (soloLectura) return;

    if (!razonSocial.trim() || !cuit.trim()) {
      setErrorGlobal("La razón social y el CUIT son obligatorios.");
      return;
    }

    const plazo = parseInt(plazoEntregaDias, 10);
    if (isNaN(plazo) || plazo < 0) {
      setErrorGlobal("El plazo de entrega debe ser un número válido.");
      return;
    }

    const input: NuevoProveedorInput = {
      razonSocial: razonSocial.trim(),
      cuit: cuit.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      contacto: contacto.trim(),
      formaPago,
      plazoEntregaDias: plazo,
    };

    const res = onSave(input);
    if (res.error) {
      setErrorGlobal(res.error);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={<Building2 className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-2xl"
      footer={
        soloLectura ? (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="proveedor-form">
              Guardar
            </Button>
          </>
        )
      }
    >
      <form id="proveedor-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorGlobal && (
          <div className="rounded-sm border border-status-danger/40 bg-status-danger/10 px-4 py-3 text-sm font-bold text-status-danger-strong" role="alert">
            {errorGlobal}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="prov-razon-social"
            label="Razón social"
            requiredMark={!soloLectura}
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            disabled={soloLectura}
          />
          <Input
            id="prov-cuit"
            label="CUIT"
            requiredMark={!soloLectura}
            placeholder="XX-XXXXXXXX-X"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            disabled={soloLectura}
          />
        </div>

        <Input
          id="prov-direccion"
          label="Dirección"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          disabled={soloLectura}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="prov-telefono"
            label="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            disabled={soloLectura}
          />
          <Input
            id="prov-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={soloLectura}
          />
        </div>

        <Input
          id="prov-contacto"
          label="Contacto (Nombre)"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          disabled={soloLectura}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-text-primary">
              Forma de pago
            </span>
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              disabled={soloLectura}
              className="h-10 rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-50 disabled:opacity-80"
            >
              {FORMAS_PAGO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <Input
            id="prov-plazo"
            label="Plazo de entrega (días)"
            type="number"
            min="0"
            value={plazoEntregaDias}
            onChange={(e) => setPlazoEntregaDias(e.target.value)}
            disabled={soloLectura}
          />
        </div>
      </form>
    </Modal>
  );
}
