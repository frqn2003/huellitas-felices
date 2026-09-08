"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { Proveedor } from "@/data/proveedores";
import type { FormaPago, NuevoProveedorInput } from "@/context/ProveedoresContext";

export type ProveedorModalMode = "crear" | "editar" | "ver";

interface ProveedorFormModalProps {
  open: boolean;
  modo: ProveedorModalMode;
  proveedor?: Proveedor | null;
  /** Catálogo `forma_pago` (placeholder compartido FORMAS_PAGO, C2/D4; la API
      lo expone por GET /api/formas-pago), vía ProveedoresContext. */
  formasPagoDisponibles: FormaPago[];
  onClose: () => void;
  onSave: (input: NuevoProveedorInput) => Promise<{ error?: string }>;
}

// La lista hardcodeada se eliminó: tenía valores que no existen en la base
// ("Cheque a 60 días") y le faltaban otros que sí. Ahora el catálogo es el
// placeholder compartido FORMAS_PAGO (src/data/formas-pago.ts) que baja el
// ProveedoresContext. El formulario elige UNA sola forma de pago (dict:
// proveedor.forma_pago_id NOT NULL), reemplazando la N:M de chips.

export function ProveedorFormModal({
  open,
  modo,
  proveedor,
  formasPagoDisponibles,
  onClose,
  onSave,
}: ProveedorFormModalProps) {
  const [razon_social, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [contacto, setContacto] = useState("");
  const [formaPagoId, setFormaPagoId] = useState("");
  const [plazo_entrega_dias, setPlazoEntregaDias] = useState("1");
  const [calificacion, setCalificacion] = useState("");
  const [errorGlobal, setErrorGlobal] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorGlobal("");
      if (proveedor && modo !== "crear") {
        setRazonSocial(proveedor.razon_social);
        setCuit(proveedor.cuit);
        setDireccion(proveedor.direccion);
        setTelefono(proveedor.telefono);
        setEmail(proveedor.email);
        setContacto(proveedor.contacto);
        // forma_pago_id es NOT NULL en el dict: si el proveedor aún no lo trae
        // (wire intermedio), se preselecciona la primera del catálogo.
        setFormaPagoId(
          proveedor.forma_pago_id !== undefined
            ? String(proveedor.forma_pago_id)
            : String(formasPagoDisponibles[0]?.id ?? ""),
        );
        setPlazoEntregaDias(String(proveedor.plazo_entrega_dias));
        setCalificacion(
          proveedor.calificacion !== undefined ? String(proveedor.calificacion) : "",
        );
      } else {
        setRazonSocial("");
        setCuit("");
        setDireccion("");
        setTelefono("");
        setEmail("");
        setContacto("");
        setFormaPagoId(String(formasPagoDisponibles[0]?.id ?? ""));
        setPlazoEntregaDias("1");
        setCalificacion("");
      }
    }
  }, [open, proveedor, modo, formasPagoDisponibles]);

  const soloLectura = modo === "ver";
  const title =
    modo === "crear"
      ? "Nuevo proveedor"
      : modo === "editar"
        ? "Editar proveedor"
        : "Detalles del proveedor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (soloLectura) return;

    if (!razon_social.trim() || !cuit.trim()) {
      setErrorGlobal("La razón social y el CUIT son obligatorios.");
      return;
    }

    if (!formaPagoId) {
      setErrorGlobal("Seleccioná una forma de pago.");
      return;
    }

    const plazo = parseInt(plazo_entrega_dias, 10);
    if (isNaN(plazo) || plazo < 0) {
      setErrorGlobal("El plazo de entrega debe ser un número válido.");
      return;
    }

    // Calificación 0-10, opcional (dict: numeric(3,1)).
    const nota = Number(calificacion);
    if (calificacion.trim() !== "" && (isNaN(nota) || nota < 0 || nota > 10)) {
      setErrorGlobal("La calificación debe ser un número entre 0 y 10.");
      return;
    }

    // La forma de pago elegida (Select único) satisface los DOS contratos: el
    // nuevo `forma_pago_id` (dict, NOT NULL) y el `formasPago: string[]` del
    // wire actual que el context sigue traduciendo a ids (formaPagoIds).
    const formaPagoElegida = formasPagoDisponibles.find(
      (f) => f.id === Number(formaPagoId),
    );

    const input: NuevoProveedorInput = {
      razon_social: razon_social.trim(),
      cuit: cuit.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      contacto: contacto.trim(),
      formasPago: formaPagoElegida ? [formaPagoElegida.nombre] : [],
      forma_pago_id: formaPagoElegida?.id,
      plazo_entrega_dias: plazo,
      // BACKEND: el dict guarda calificacion en el proveedor; la API todavía
      // no lo persiste (schemas no estrictos: se ignora hasta que el back lo
      // implemente).
      calificacion: calificacion.trim() !== "" ? nota : undefined,
    };

    setGuardando(true);
    const res = await onSave(input);
    setGuardando(false);

    if (res.error) {
      // El modal queda ABIERTO con los datos cargados: si el CUIT está
      // duplicado, el usuario corrige y reintenta sin volver a tipear todo.
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
            <Button variant="outline" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            {/* Deshabilitado mientras el POST/PUT está en vuelo: si no, un doble
                clic manda dos altas y crea dos proveedores. */}
            <Button type="submit" form="proveedor-form" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
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
            placeholder="Veterinaria del Valle S.R.L."
            value={razon_social}
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

        <Input
          id="prov-plazo"
          label="Plazo de entrega (días)"
          type="number"
          min="0"
          value={plazo_entrega_dias}
          onChange={(e) => setPlazoEntregaDias(e.target.value)}
          disabled={soloLectura}
        />

        <Input
          id="prov-calificacion"
          label="Calificación (0 a 10)"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={calificacion}
          onChange={(e) => setCalificacion(e.target.value)}
          disabled={soloLectura}
          hint="Opcional · evaluación de desempeño del proveedor"
        />

        {/* Forma de pago única (dict: proveedor.forma_pago_id NOT NULL). La N:M del
            wire actual (`formasPago: string[]`) se conserva en el payload
            traduciendo el nombre elegido (ver comentario en el submit). */}
        <Select
          id="prov-forma-pago"
          label="Forma de pago"
          requiredMark={!soloLectura}
          value={formaPagoId}
          onChange={(e) => setFormaPagoId(e.target.value)}
          disabled={soloLectura}
        >
          {formasPagoDisponibles.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
