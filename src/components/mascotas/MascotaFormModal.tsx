"use client";

import { PawPrint } from "lucide-react";
import { useState } from "react";
import type { Cliente, EstadoCliente } from "@/data/clientes";
import type { Mascota, MascotaDraft } from "@/data/mascotas";
import { especies, sexos, razasSugeridas, validacionesMascota } from "@/data/mascotas";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";

export type MascotaModalMode = "crear" | "editar" | "ver";

interface MascotaFormModalProps {
  open: boolean;
  modo: MascotaModalMode;
  mascota: Mascota | null;
  /** Directorio completo de clientes (alimenta el buscador de dueño obligatorio). */
  clientes: Cliente[];
  onClose: () => void;
  onSave: (draft: MascotaDraft) => Promise<{ error?: string }>;
}

// El draft del formulario es todo string (son inputs/textareas). Los nullables
// (raza, peso, fecha, señas) viajan como string vacío en el form y se traducen
// a null al enviar. El dueño viaja como String(id) porque el Combobox trabaja
// con strings (value interno), igual que el patrón multi-campo de compras.
type MascotaFormValues = {
  duenoId: string;
  nombre: string;
  especie: string;
  sexo: string;
  raza: string;
  peso: string;
  fechaNacimiento: string;
  senasParticulares: string;
  estado: EstadoCliente;
};

/** Convierte el form a lo que viaja al backend (nullables como null, no ""). */
function aDraft(values: MascotaFormValues): MascotaDraft {
  return {
    clienteId: Number(values.duenoId),
    nombre: values.nombre.trim(),
    especie: values.especie,
    sexo: values.sexo,
    raza: values.raza.trim() || null,
    peso: values.peso.trim() ? Number(values.peso.trim()) : null,
    fechaNacimiento: values.fechaNacimiento || null,
    senasParticulares: values.senasParticulares.trim() || null,
    estado: values.estado,
  };
}

function initialDraft(mascota: Mascota | null): MascotaFormValues {
  if (mascota) {
    return {
      duenoId: String(mascota.clienteId),
      nombre: mascota.nombre,
      especie: mascota.especie,
      sexo: mascota.sexo,
      raza: mascota.raza ?? "",
      peso: mascota.peso?.toString() ?? "",
      fechaNacimiento: mascota.fechaNacimiento ?? "",
      senasParticulares: mascota.senasParticulares ?? "",
      estado: mascota.estado,
    };
  }
  // El alta arranca con el estado por defecto del dict: activo.
  return {
    duenoId: "",
    nombre: "",
    especie: "",
    sexo: "",
    raza: "",
    peso: "",
    fechaNacimiento: "",
    senasParticulares: "",
    estado: "activo",
  };
}

function validateDraft(d: MascotaFormValues): Partial<Record<keyof MascotaFormValues, string>> {
  const next: Partial<Record<keyof MascotaFormValues, string>> = {};

  if (!d.duenoId) {
    next.duenoId = "El dueño es obligatorio.";
  }

  if (!d.nombre.trim()) {
    next.nombre = "El nombre es obligatorio.";
  } else if (!validacionesMascota.nombre.test(d.nombre.trim())) {
    next.nombre = "El nombre debe tener hasta 100 caracteres.";
  } else if (/\d/.test(d.nombre)) {
    next.nombre = "El nombre no admite números.";
  }

  if (!d.especie) {
    next.especie = "Seleccioná una especie.";
  }
  if (!d.sexo) {
    next.sexo = "Seleccioná el sexo.";
  }

  if (d.peso.trim()) {
    if (!validacionesMascota.peso.test(d.peso.trim())) {
      next.peso = "El peso debe ser un número (ej: 20 o 4.5).";
    } else if (Number(d.peso) <= 0) {
      next.peso = "El peso debe ser mayor a 0.";
    }
  }

  if (d.fechaNacimiento && !validacionesMascota.fechaNacimiento.test(d.fechaNacimiento)) {
    next.fechaNacimiento = "La fecha debe estar en formato YYYY-MM-DD.";
  }

  return next;
}

function MascotaFormFields({
  open,
  mascota,
  clientes,
  modo,
  onClose,
  onSave,
}: {
  open: boolean;
  mascota: Mascota | null;
  clientes: Cliente[];
  modo: MascotaModalMode;
  onClose: () => void;
  onSave: (draft: MascotaDraft) => Promise<{ error?: string }>;
}) {
  const isLectura = modo === "ver";

  const [draft, setDraft] = useState<MascotaFormValues>(() => initialDraft(mascota));
  const [errors, setErrors] = useState<Partial<Record<keyof MascotaFormValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof MascotaFormValues, boolean>>>({});
  const [errorGlobal, setErrorGlobal] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Confirmación de baja lógica al guardar con el toggle en inactivo.
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  // Raza: modo desplegable (sugerencias) o texto libre al elegir "Otra (escribirla)".
  // Arranca en texto libre si la raza existente no está en las sugerencias.
  const [razaEsOtra, setRazaEsOtra] = useState(
    () => Boolean(mascota?.raza) && !razasSugeridas.includes(mascota?.raza ?? ""),
  );

  // Opciones del buscador de dueño: label compuesto `documento · nombre apellido`
  // (el Combobox filtra por substring del label → matchea DNI y nombre).
  // BACKEND: poblar desde GET /api/clientes (clientes activos para titular).
  const duenoOptions = clientes
    .filter((c) => c.estado === "activo")
    .map((c) => ({
      value: String(c.id),
      label: `${c.documento} · ${c.nombre} ${c.apellido}`,
    }));

  const showError = (field: keyof MascotaFormValues) => (touched[field] ? errors[field] : undefined);

  const setField = <K extends keyof MascotaFormValues>(field: K, value: MascotaFormValues[K]) => {
    // El nombre no admite dígitos: se filtran al escribir para que el usuario
    // no pueda ingresar números (ej. "123").
    let final = value;
    if (field === "nombre") {
      final = (value as string).replace(/\d+/g, "") as MascotaFormValues[K];
    }
    const next = { ...draft, [field]: final };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next));
    }
  };

  const confirmarGuardado = async () => {
    const res = await onSave(aDraft(draft));
    setGuardando(false);
    if (res.error) {
      // El modal queda ABIERTO con los datos cargados (ej. cliente_id inexistente).
      setErrorGlobal(res.error);
    } else {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLectura) return;

    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    setTouched({
      duenoId: true,
      nombre: true,
      especie: true,
      sexo: true,
      peso: true,
      fechaNacimiento: true,
      senasParticulares: true,
    });
    if (Object.keys(nextErrors).length > 0) return;

    // Baja lógica: se guarda con estado inactivo, se pide confirmación
    // (patrón BajaClienteModal; el toggle lo habilita en alta y edición).
    if (draft.estado === "inactivo") {
      setConfirmandoBaja(true);
      return;
    }

    setGuardando(true);
    void confirmarGuardado();
  };

  const nombreMascota = draft.nombre.trim() || "mascota";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isLectura ? "Ver mascota" : modo === "editar" ? "Editar mascota" : "Nueva mascota"
      }
      icon={<PawPrint className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-2xl"
      footer={
        isLectura ? (
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form="mascota-form" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </>
        )
      }
    >
      <form id="mascota-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errorGlobal && (
          <div className="rounded-sm border border-status-danger/40 bg-status-danger/10 px-4 py-3 text-sm font-bold text-status-danger-strong" role="alert">
            {errorGlobal}
          </div>
        )}

        {/* BACKEND: GET /api/clientes/:id/mascotas y la selección del dueño viajan
            como mascota.cliente_id en el POST/PUT (FK obligatoria). */}
        <Combobox
          id="mas-dueno"
          label="Dueño"
          requiredMark
          value={draft.duenoId}
          options={duenoOptions}
          onChange={(value) => setField("duenoId", value)}
          onBlur={() => setTouched((t) => ({ ...t, duenoId: true }))}
          error={showError("duenoId")}
          disabled={isLectura}
          placeholder="Buscar por DNI o nombre"
          maxResults={20}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="mas-nombre"
            label="Nombre"
            requiredMark={!isLectura}
            value={draft.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
            error={showError("nombre")}
            readOnly={isLectura}
          />
          <Select
            id="mas-especie"
            label="Especie"
            requiredMark={!isLectura}
            value={draft.especie}
            onChange={(e) => setField("especie", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, especie: true }))}
            error={showError("especie")}
            disabled={isLectura}
          >
            {/* BACKEND: sin tabla catálogo — especie es varchar NOT NULL; la UI restringe */}
            <option value="" disabled>
              Seleccionar especie
            </option>
            {especies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Raza: mismo desplegable que Especie (Select con sugerencias) + opción
              "Otra (escribirla)" que revela texto libre. El Select es nativo (como
              especie/sexo), el datalist se descartó porque se posiciona mal dentro
              del modal animado (transform). BACKEND: sin tabla catálogo — raza es
              varchar nullable; las sugerencias solo orientan. */}
          {isLectura ? (
            <Input
              id="mas-raza"
              label="Raza"
              value={draft.raza}
              readOnly
            />
          ) : razaEsOtra ? (
            <Input
              id="mas-raza"
              label="Raza"
              value={draft.raza}
              onChange={(e) => setField("raza", e.target.value)}
              hint="Opcional · texto libre"
              placeholder="Escribí la raza"
            />
          ) : (
            <Select
              id="mas-raza"
              label="Raza"
              value={razasSugeridas.includes(draft.raza) ? draft.raza : ""}
              onChange={(e) => {
                if (e.target.value === "__otra__") {
                  setRazaEsOtra(true);
                  setField("raza", "");
                } else {
                  setField("raza", e.target.value);
                }
              }}
              hint="Opcional"
            >
              <option value="" disabled>
                Seleccionar raza
              </option>
              {razasSugeridas.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="__otra__">Otra (escribirla)</option>
            </Select>
          )}
          <Select
            id="mas-sexo"
            label="Sexo"
            requiredMark={!isLectura}
            value={draft.sexo}
            onChange={(e) => setField("sexo", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, sexo: true }))}
            error={showError("sexo")}
            disabled={isLectura}
          >
            <option value="" disabled>
              Seleccionar sexo
            </option>
            {sexos.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="mas-peso"
            label="Peso (kg)"
            inputMode="decimal"
            value={draft.peso}
            onChange={(e) => setField("peso", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, peso: true }))}
            error={showError("peso")}
            readOnly={isLectura}
            hint={isLectura ? undefined : "Opcional"}
          />
          <Input
            id="mas-fecha-nacimiento"
            label="Fecha de nacimiento"
            type="date"
            value={draft.fechaNacimiento}
            onChange={(e) => setField("fechaNacimiento", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, fechaNacimiento: true }))}
            error={showError("fechaNacimiento")}
            readOnly={isLectura}
            hint={isLectura ? undefined : "Opcional"}
          />
        </div>

        <Textarea
          id="mas-senas"
          label="Señas particulares"
          value={draft.senasParticulares}
          onChange={(e) => setField("senasParticulares", e.target.value)}
          readOnly={isLectura}
          hint="Opcional"
          placeholder="Marcas, cicatrices, temperamento..."
        />

        <div className="flex items-center gap-3">
          <Switch
            checked={draft.estado === "activo"}
            onChange={(v) => setField("estado", v ? "activo" : "inactivo")}
            disabled={isLectura}
            ariaLabel={draft.estado === "activo" ? "Mascota activa" : "Mascota inactiva"}
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary">Estado</span>
            <span className="text-xs font-medium text-text-secondary">
              {draft.estado === "activo"
                ? "Activa · disponible para reservar turnos"
                : "Inactiva · conserva su ficha e historial de turnos"}
            </span>
          </div>
        </div>
      </form>

      {/* Confirmación de baja lógica (se dispara al guardar con inactivo). */}
      <ConfirmarDialog
        open={confirmandoBaja}
        title="Confirmar baja"
        description={`¿Querés dar de baja a la mascota "${nombreMascota}"? Conservará su ficha y su historial de turnos.`}
        confirmLabel="Dar de baja"
        cancelLabel="Cancelar"
        onClose={() => setConfirmandoBaja(false)}
        onConfirm={() => {
          setConfirmandoBaja(false);
          setGuardando(true);
          void confirmarGuardado();
        }}
      />
    </Modal>
  );
}

export function MascotaFormModal({
  open,
  modo,
  mascota,
  clientes,
  onClose,
  onSave,
}: MascotaFormModalProps) {
  const formKey = `${modo}-${mascota?.id ?? "nuevo"}`;

  return (
    <MascotaFormFields
      key={formKey}
      open={open}
      mascota={mascota}
      clientes={clientes}
      modo={modo}
      onSave={onSave}
      onClose={onClose}
    />
  );
}