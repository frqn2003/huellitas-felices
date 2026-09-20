"use client";

import { AlertTriangle, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { BajaClienteModal } from "@/components/clientes/BajaClienteModal";
import { EstadoClienteBadge } from "@/components/clientes/EstadoClienteBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { useCamposSecuenciales } from "@/hooks/useCamposSecuenciales";
import type { Cliente, ClienteDraft, EstadoCliente, Mascota } from "@/data/clientes";
import { validaciones } from "@/data/clientes";
import { apiGet } from "@/lib/api-client";

// Secuencia de desbloqueo de obligatorios SOLO en el alta (crear), en orden
// visual: nombre → apellido → documento → teléfono → email. Los opcionales
// (fecha de nacimiento, dirección, estado) quedan siempre habilitados.
const CLIENTE_SECUENCIA = ["nombre", "apellido", "documento", "telefono", "email"] as const;
const CLIENTE_ETIQUETA: Record<(typeof CLIENTE_SECUENCIA)[number], string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  documento: "Documento",
  telefono: "Teléfono",
  email: "Email",
};

/** Fecha máxima de nacimiento: hoy menos 18 años (mayor de 18). */
function fechaMaxima18Anios(): string {
  const f = new Date();
  f.setFullYear(f.getFullYear() - 18);
  return f.toISOString().slice(0, 10);
}

/** Verifica que la persona tenga al menos 18 años. */
function esMayorDeEdad(fechaISO: string): boolean {
  const nac = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(nac.getTime())) return false;
  const hoy = new Date();
  const limite = new Date(hoy);
  limite.setFullYear(hoy.getFullYear() - 18);
  return nac <= limite;
}

export type ClienteModalMode = "crear" | "editar" | "ver";

interface ClienteFormModalProps {
  open: boolean;
  modo: ClienteModalMode;
  cliente: Cliente | null;
  /** Lista completa (para validar duplicados activos y advertencias inactivos). */
  clientes: Cliente[];
  /** Mascotas vinculadas para el modo lectura (tabla `mascota`, sección 8 del esquema). */
  mascotas: Mascota[];
  onClose: () => void;
  onSave: (draft: ClienteDraft, reactivarId?: number) => Promise<{ error?: string; campo?: string }>;
}

// El draft del formulario es todo string (son inputs). Dirección y fecha de
// nacimiento viajan como string vacío en el form y se traducen a null al enviar
// (nullable en el dict); `ClienteFormValues` es asignable a `ClienteDraft`.
type ClienteFormValues = Omit<ClienteDraft, "direccion" | "fecha_nacimiento"> & {
  direccion: string;
  fecha_nacimiento: string;
  estado: EstadoCliente;
};

/** Convierte el form a lo que viaja al backend (nullables como null, no ""). */
function aDraft(values: ClienteFormValues): ClienteDraft {
  return {
    ...values,
    direccion: values.direccion.trim() || null,
    fecha_nacimiento: values.fecha_nacimiento || null,
  };
}

function initialDraft(cliente: Cliente | null): ClienteFormValues {
  if (cliente) {
    return {
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      documento: cliente.documento,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion ?? "",
      fecha_nacimiento: cliente.fecha_nacimiento ?? "",
      estado: cliente.estado,
    };
  }
  // El alta arranca con el estado por defecto del dict: activo (el union
  // check del enum exige un valor; "activo" es el sensible).
  return {
    nombre: "",
    apellido: "",
    documento: "",
    telefono: "",
    email: "",
    direccion: "",
    fecha_nacimiento: "",
    estado: "activo",
  };
}

function validateDraft(
  d: ClienteFormValues,
  clientes: Cliente[],
  propioId: number | undefined,
): Partial<Record<keyof ClienteFormValues, string>> {
  const next: Partial<Record<keyof ClienteFormValues, string>> = {};

  if (!d.nombre.trim()) {
    next.nombre = "El nombre es obligatorio.";
  } else if (/\d/.test(d.nombre)) {
    next.nombre = "El nombre no admite números.";
  }
  if (!d.apellido.trim()) {
    next.apellido = "El apellido es obligatorio.";
  } else if (/\d/.test(d.apellido)) {
    next.apellido = "El apellido no admite números.";
  }

  if (!d.documento.trim()) {
    next.documento = "El documento es obligatorio.";
  } else if (/\D/.test(d.documento.trim())) {
    next.documento = "El documento solo acepta números.";
  } else if (!validaciones.documento.test(d.documento.trim())) {
    next.documento = "El documento debe tener 7 u 8 dígitos.";
  } else if (
    clientes.some(
      (c) =>
        c.estado === "activo" &&
        c.documento === d.documento.trim() &&
        c.id !== propioId,
    )
  ) {
    next.documento = "Ya existe un cliente activo con ese documento.";
  }

  if (!d.telefono.trim()) {
    next.telefono = "El teléfono es obligatorio.";
  } else if (!validaciones.telefono.test(d.telefono.trim())) {
    next.telefono = "El teléfono debe tener entre 8 y 15 dígitos.";
  }

  if (!d.email.trim()) {
    next.email = "El email es obligatorio.";
  } else if (!validaciones.email.test(d.email.trim())) {
    next.email = "Ingresá un email válido.";
  } else if (
    clientes.some(
      (c) =>
        c.estado === "activo" &&
        c.email.toLowerCase() === d.email.trim().toLowerCase() &&
        c.id !== propioId,
    )
  ) {
    next.email = "Ya existe un cliente activo con ese email.";
  }

  if (d.fecha_nacimiento) {
    if (!validaciones.fecha_nacimiento.test(d.fecha_nacimiento)) {
      next.fecha_nacimiento = "La fecha debe estar en formato YYYY-MM-DD.";
    } else if (!esMayorDeEdad(d.fecha_nacimiento)) {
      next.fecha_nacimiento = "El cliente debe ser mayor de 18 años.";
    }
  }

  return next;
}



function MascotasVinculadas({ mascotas }: { mascotas: Mascota[] }) {
  if (mascotas.length === 0) {
    return (
      <p className="rounded-sm bg-cream-50 px-4 py-3 text-sm text-text-secondary">
        Este cliente todavía no tiene mascotas registradas.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-cream-50">
            <th scope="col" className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              Nombre
            </th>
            <th scope="col" className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              Especie
            </th>
            <th scope="col" className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {mascotas.map((m) => (
            <tr key={m.id} className="border-b border-border/60 last:border-b-0">
              <td className="px-4 py-3 text-sm font-bold text-brand-900">{m.nombre}</td>
              <td className="px-4 py-3 text-sm text-text-primary">{m.especie}</td>
              <td className="px-4 py-3">
                <EstadoClienteBadge estado={m.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClienteFormFields({
  open,
  cliente,
  clientes,
  mascotas,
  modo,
  onClose,
  onSave,
}: {
  open: boolean;
  cliente: Cliente | null;
  clientes: Cliente[];
  mascotas: Mascota[];
  modo: ClienteModalMode;
  onClose: () => void;
  onSave: (draft: ClienteDraft, reactivarId?: number) => Promise<{ error?: string; campo?: string }>;
}) {
  const isLectura = modo === "ver";

  const [draft, setDraft] = useState<ClienteFormValues>(() => initialDraft(cliente));
  const [errors, setErrors] = useState<Partial<Record<keyof ClienteFormValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ClienteFormValues, boolean>>>({});
  const [errorGlobal, setErrorGlobal] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Advertencia de duplicados inactivos al dar de alta (HU: antes de confirmar el alta).
  const [advertenciaDuplicados, setAdvertenciaDuplicados] = useState<Cliente[] | null>(null);
  // Confirmación de baja lógica al guardar con el toggle en inactivo.
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  // Mascotas vinculadas cargadas de forma dinámica
  const [mascotasLista, setMascotasLista] = useState<Mascota[]>(mascotas);

  useEffect(() => {
    if (isLectura && cliente?.id) {
      void apiGet<Mascota[]>(`/api/clientes/${cliente.id}/mascotas`)
        .then((data) => setMascotasLista(data))
        .catch(() => { });
    }
  }, [isLectura, cliente?.id]);

  // Desbloqueo progresivo de obligatorios: solo en ALTA (crear). Los campos
  // bloqueados llevan disabled + hint "Completá primero: X"; una vez
  // desbloqueado, un campo queda habilitado para siempre (corregir es posible).
  const secuencial = useCamposSecuenciales(CLIENTE_SECUENCIA, draft);
  const secuencialActivo = modo === "crear";
  const bloqueado = (campo: (typeof CLIENTE_SECUENCIA)[number]) =>
    secuencialActivo && secuencial.bloqueado(campo);
  const pendienteCampo = secuencial.pendiente;
  const hintBloqueado = (campo: (typeof CLIENTE_SECUENCIA)[number]) =>
    bloqueado(campo) && pendienteCampo
      ? `Completá primero: ${CLIENTE_ETIQUETA[pendienteCampo]}`
      : undefined;

  const showError = (field: keyof ClienteFormValues) => (touched[field] ? errors[field] : undefined);

  const setField = <K extends keyof ClienteFormValues>(field: K, value: ClienteFormValues[K]) => {
    // Nombre y apellido no admiten dígitos: se filtran al escribir para que el
    // usuario no pueda ingresar números (ej. "123").
    let final = value;
    if (field === "nombre" || field === "apellido") {
      final = (value as string).replace(/\d+/g, "") as ClienteFormValues[K];
    }
    const next = { ...draft, [field]: final };
    setDraft(next);
    if (touched[field]) {
      setErrors(validateDraft(next, clientes, cliente?.id));
    }
  };

  const confirmarGuardado = async (reactivarId?: number) => {
    const res = await onSave(aDraft(draft), reactivarId);
    setGuardando(false);
    if (res.error) {
      if (res.campo && res.campo in draft) {
        setErrors((prev) => ({ ...prev, [res.campo as keyof ClienteFormValues]: res.error }));
      } else {
        setErrorGlobal(res.error);
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLectura) return;

    const nextErrors = validateDraft(draft, clientes, cliente?.id);
    setErrors(nextErrors);
    setTouched({
      nombre: true,
      apellido: true,
      documento: true,
      telefono: true,
      email: true,
      fecha_nacimiento: true,
    });
    if (Object.keys(nextErrors).length > 0) return;

    if (modo === "crear") {
      setGuardando(true);
      try {
        const doc = encodeURIComponent(draft.documento.trim());
        const em = encodeURIComponent(draft.email.trim());
        const coincidencias = await apiGet<Cliente[]>(
          `/api/clientes/duplicados-inactivos?documento=${doc}&email=${em}`,
        );
        if (coincidencias && coincidencias.length > 0) {
          setAdvertenciaDuplicados(coincidencias);
          setGuardando(false);
          return;
        }
      } catch {
        // Si falla la búsqueda de inactivos, continúa con el guardado normal
      }
      setGuardando(false);
    }

    // Baja lógica: se guarda con estado inactivo, se pide confirmación
    // (patrón BajaProveedorModal; el toggle lo habilita en alta y edición).
    if (draft.estado === "inactivo") {
      setConfirmandoBaja(true);
      return;
    }

    setGuardando(true);
    void confirmarGuardado();
  };

  const nombreCompleto = `${draft.nombre.trim() || "cliente"} ${draft.apellido.trim() || ""}`.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isLectura ? "Ver cliente" : modo === "editar" ? "Editar cliente" : "Nuevo cliente"
      }
      icon={<Users className="h-5 w-5 text-brand-900" aria-hidden="true" />}
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
            <Button type="submit" form="cliente-form" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </>
        )
      }
    >
      <form id="cliente-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errorGlobal && (
          <div className="rounded-sm border border-status-danger/40 bg-status-danger/10 px-4 py-3 text-sm font-bold text-status-danger-strong" role="alert">
            {errorGlobal}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="cli-nombre"
            label="Nombre"
            requiredMark
            value={draft.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
            error={showError("nombre")}
            readOnly={isLectura}
            disabled={bloqueado("nombre")}
            hint={hintBloqueado("nombre")}
          />
          <Input
            id="cli-apellido"
            label="Apellido"
            requiredMark
            value={draft.apellido}
            onChange={(e) => setField("apellido", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, apellido: true }))}
            error={showError("apellido")}
            readOnly={isLectura}
            disabled={bloqueado("apellido")}
            hint={hintBloqueado("apellido")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="cli-documento"
            label="Documento"
            requiredMark={!isLectura}
            value={draft.documento}
            onChange={(e) => setField("documento", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, documento: true }))}
            error={showError("documento")}
            readOnly={isLectura}
            disabled={bloqueado("documento")}
            hint={
              hintBloqueado("documento") ?? (!isLectura ? "Ej: 45115839" : undefined)
            }
          />
          <Input
            id="cli-fecha-nacimiento"
            label="Fecha de nacimiento"
            type="date"
            value={draft.fecha_nacimiento}
            onChange={(e) => setField("fecha_nacimiento", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, fecha_nacimiento: true }))}
            error={showError("fecha_nacimiento")}
            readOnly={isLectura}
            max={fechaMaxima18Anios()}
            hint={isLectura ? undefined : "Opcional · mayor de 18 años"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="cli-telefono"
            label="Teléfono"
            requiredMark={!isLectura}
            value={draft.telefono}
            onChange={(e) => setField("telefono", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, telefono: true }))}
            error={showError("telefono")}
            readOnly={isLectura}
            disabled={bloqueado("telefono")}
            hint={
              hintBloqueado("telefono") ?? (!isLectura ? "Ej: 3875122693" : undefined)
            }
          />
          <Input
            id="cli-email"
            label="Email"
            type="email"
            requiredMark={!isLectura}
            value={draft.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={showError("email")}
            readOnly={isLectura}
            disabled={bloqueado("email")}
            hint={hintBloqueado("email")}
          />
        </div>

        <Textarea
          id="cli-direccion"
          label="Dirección"
          value={draft.direccion}
          onChange={(e) => setField("direccion", e.target.value)}
          readOnly={isLectura}
          hint="Opcional"
        />

        <div className="flex items-center gap-3">
          <Switch
            checked={draft.estado === "activo"}
            onChange={(v) => setField("estado", v ? "activo" : "inactivo")}
            disabled={isLectura}
            ariaLabel={draft.estado === "activo" ? "Cliente activo" : "Cliente inactivo"}
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary">Estado</span>
            <span className="text-xs font-medium text-text-secondary">
              {draft.estado === "activo"
                ? "Activo · puede registrar turnos"
                : "Inactivo · no registra nuevos turnos (conserva su historial)"}
            </span>
          </div>
        </div>

        {isLectura && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-text-primary">Mascotas vinculadas</p>
            <MascotasVinculadas mascotas={mascotasLista} />
          </div>
        )}
      </form>

      {/* Advertencia al dar de alta: documento/email ya usados por un inactivo. */}
      <Modal
        open={advertenciaDuplicados !== null}
        onClose={() => setAdvertenciaDuplicados(null)}
        title="Cliente inactivo con esos datos"
        icon={<AlertTriangle className="h-5 w-5 text-status-warning-strong" aria-hidden="true" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setAdvertenciaDuplicados(null)}>
              Volver al formulario
            </Button>
            <Button
              onClick={() => {
                const primerDuplicado = advertenciaDuplicados?.[0];
                setAdvertenciaDuplicados(null);
                setGuardando(true);
                void confirmarGuardado(primerDuplicado?.id);
              }}
            >
              Reactivar este cliente
            </Button>
          </>
        }
      >
        {advertenciaDuplicados && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-text-secondary">
              Ya existe un cliente <strong>inactivo</strong> con este documento o email.
              ¿Deseás reactivar su registro con los nuevos datos ingresados?
            </p>
            <ul className="flex flex-col gap-2">
              {advertenciaDuplicados.map((c) => (
                <li
                  key={c.id}
                  className="rounded-sm border border-border bg-cream-50 px-4 py-2.5 text-sm text-text-primary"
                >
                  <span className="font-bold text-brand-900">
                    {c.nombre} {c.apellido}
                  </span>{" "}
                  · {c.documento} · {c.email}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      {/* Confirmación de baja lógica (se dispara al guardar con inactivo). */}
      <BajaClienteModal
        open={confirmandoBaja}
        nombreCliente={nombreCompleto}
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

export function ClienteFormModal({
  open,
  modo,
  cliente,
  clientes,
  mascotas,
  onClose,
  onSave,
}: ClienteFormModalProps) {
  const formKey = `${modo}-${cliente?.id ?? "nuevo"}`;

  return (
    <ClienteFormFields
      key={formKey}
      open={open}
      cliente={cliente}
      clientes={clientes}
      mascotas={mascotas}
      modo={modo}
      onSave={onSave}
      onClose={onClose}
    />
  );
}