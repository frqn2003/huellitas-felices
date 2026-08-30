"use client";

import { Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOMBRE_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s'-]+$/;
const TELEFONO_RE = /^[0-9+\s-]*$/;
const MIN_PASSWORD = 6;

function formatFechaIngreso(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function enmascararDni(dni: string) {
  if (dni.length <= 4) return dni;
  return `${"·".repeat(dni.length - 4)}${dni.slice(-4)}`;
}

interface Errores {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

type ModalTipo = "guardar" | "contrasena" | null;

export function ConfiguracionForm() {
  const { state, actualizarUsuario } = useAuth();
  const { showToast } = useToast();

  const usuarioInicial = state.status === "authenticated" ? state.usuario : null;

  const [nombre, setNombre] = useState(usuarioInicial?.nombre ?? "");
  const [apellido, setApellido] = useState(usuarioInicial?.apellido ?? "");
  const [email, setEmail] = useState(usuarioInicial?.email ?? "");
  const [telefono, setTelefono] = useState(usuarioInicial?.telefono ?? "");
  const [errores, setErrores] = useState<Errores>({});

  const [modal, setModal] = useState<ModalTipo>(null);

  // Modal "guardar"
  const [contraGuardar, setContraGuardar] = useState("");
  const [errorContraGuardar, setErrorContraGuardar] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [mostrarGuardar, setMostrarGuardar] = useState(false);

  // Modal "cambiar contraseña"
  const [contraActual, setContraActual] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarNueva, setConfirmarNueva] = useState("");
  const [erroresContrasena, setErroresContrasena] = useState<{
    actual?: string;
    nueva?: string;
    confirmar?: string;
  }>({});
  const [guardandoContra, setGuardandoContra] = useState(false);
  const [mostrarActualModal, setMostrarActualModal] = useState(false);
  const [mostrarNuevaModal, setMostrarNuevaModal] = useState(false);
  const [mostrarConfirmarModal, setMostrarConfirmarModal] = useState(false);

  const sesion = useMemo(
    () => (state.status === "authenticated" ? { usuario: state.usuario, rol: state.rol } : null),
    [state],
  );

  const hayCambios = useMemo(
    () =>
      !sesion ||
      nombre !== sesion.usuario.nombre ||
      apellido !== sesion.usuario.apellido ||
      email !== sesion.usuario.email ||
      (telefono ?? "") !== (sesion.usuario.telefono ?? ""),
    [sesion, nombre, apellido, email, telefono],
  );

  const validarDatos = (): Errores => {
    const e: Errores = {};
    if (!nombre.trim()) e.nombre = "Ingresá tu nombre.";
    else if (!NOMBRE_RE.test(nombre.trim())) e.nombre = "El nombre solo puede contener letras.";
    if (!apellido.trim()) e.apellido = "Ingresá tu apellido.";
    else if (!NOMBRE_RE.test(apellido.trim()))
      e.apellido = "El apellido solo puede contener letras.";
    if (!email.trim()) e.email = "Ingresá tu email.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Ingresá un email válido.";
    if (telefono.trim() !== "") {
      if (!TELEFONO_RE.test(telefono.trim()))
        e.telefono = "El teléfono solo puede incluir números, espacios, guiones o +.";
      else if (telefono.replace(/\D/g, "").length < 8)
        e.telefono = "El teléfono debe tener al menos 8 dígitos.";
    }
    return e;
  };

  const handleBlur = (campo: keyof Errores) => {
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, ...validarDatos() }));
    }
  };

  const abrirModalGuardar = () => {
    const e = validarDatos();
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setContraGuardar("");
    setErrorContraGuardar("");
    setModal("guardar");
  };

  const confirmarGuardado = () => {
    if (!sesion) return;
    if (contraGuardar !== sesion.usuario.password) {
      setErrorContraGuardar("La contraseña es incorrecta.");
      return;
    }
    setVerificando(true);
    // BACKEND: enviar PUT /api/usuarios/:id con { nombre, apellido, email, telefono }
    // y confirmar identidad contra el token/cookie de sesión.
    window.setTimeout(() => {
      actualizarUsuario({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        telefono: (telefono ?? "").trim(),
      });
      setVerificando(false);
      setModal(null);
      showToast("success", "Datos actualizados correctamente");
    }, 600);
  };

  const validarCambioContrasena = () => {
    const e: { actual?: string; nueva?: string; confirmar?: string } = {};
    if (!contraActual.trim()) e.actual = "Ingresá tu contraseña actual.";
    if (nuevaContrasena.length < MIN_PASSWORD)
      e.nueva = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
    if (confirmarNueva !== nuevaContrasena) e.confirmar = "Las contraseñas no coinciden.";
    return e;
  };

  const confirmarCambioContrasena = () => {
    if (!sesion) return;
    if (contraActual !== sesion.usuario.password) {
      setErroresContrasena({ actual: "La contraseña actual es incorrecta." });
      return;
    }
    const e = validarCambioContrasena();
    setErroresContrasena(e);
    if (Object.keys(e).length > 0) return;
    setGuardandoContra(true);
    // BACKEND: enviar POST /api/usuarios/:id/cambiar-password con
    // { password_actual, password_nueva }.
    window.setTimeout(() => {
      actualizarUsuario({
        nombre: sesion.usuario.nombre,
        apellido: sesion.usuario.apellido,
        email: sesion.usuario.email,
        telefono: sesion.usuario.telefono,
        password: nuevaContrasena,
      });
      setGuardandoContra(false);
      setModal(null);
      showToast("success", "Tu contraseña fue cambiada correctamente");
    }, 600);
  };

  const cerrarModal = () => {
    if (verificando || guardandoContra) return;
    setModal(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* INFORMACIÓN DE CUENTA (solo lectura) — primero arriba */}
      <section
        aria-labelledby="configuracion-info"
        className="rounded-md border border-border bg-surface p-5 shadow-card sm:p-6"
      >
        <h2
          id="configuracion-info"
          className="mb-4 font-display text-lg font-extrabold uppercase tracking-tight text-brand-900"
        >
          Información de cuenta
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <ItemCuenta etiqueta="Rol">{sesion?.rol?.nombre ?? "—"}</ItemCuenta>
          <ItemCuenta etiqueta="DNI">{sesion ? enmascararDni(sesion.usuario.dni) : "—"}</ItemCuenta>
          <ItemCuenta etiqueta="Estado">
            {sesion ? (
              <StatusBadge
                variant={sesion.usuario.estado === "Activo" ? "success" : "neutral"}
                label={sesion.usuario.estado}
              />
            ) : (
              "—"
            )}
          </ItemCuenta>
          <ItemCuenta etiqueta="Ingreso">
            {sesion ? formatFechaIngreso(sesion.usuario.fecha_creacion) : "—"}
          </ItemCuenta>
        </dl>
      </section>

      {/* TU CUENTA (editable, pre-cargada) */}
      <section
        aria-labelledby="configuracion-cuenta"
        className="rounded-md border border-border bg-surface p-5 shadow-card sm:p-6"
      >
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-900/10">
            <UserRound className="h-5 w-5 text-brand-900" aria-hidden="true" />
          </span>
          <h2
            id="configuracion-cuenta"
            className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900"
          >
            Tu cuenta
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="cfg-nombre"
            label="Nombre"
            requiredMark
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => handleBlur("nombre")}
            error={errores.nombre}
            autoComplete="given-name"
          />
          <Input
            id="cfg-apellido"
            label="Apellido"
            requiredMark
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            onBlur={() => handleBlur("apellido")}
            error={errores.apellido}
            autoComplete="family-name"
          />
          <Input
            id="cfg-email"
            label="Email"
            type="email"
            requiredMark
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
            error={errores.email}
            hint="Si cambiás el email, tu próximo ingreso será con el nuevo."
            autoComplete="email"
          />
          <Input
            id="cfg-telefono"
            label="Teléfono"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            onBlur={() => handleBlur("telefono")}
            error={errores.telefono}
            hint="Opcional. Solo números, espacios, guiones o +."
            autoComplete="tel"
          />
        </div>
      </section>

      {/* ACCIONES */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={abrirModalGuardar} disabled={!hayCambios || !sesion}>
          Guardar cambios
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => setModal("contrasena")} disabled={!sesion}>
          <KeyRound className="h-5 w-5" aria-hidden="true" />
          Cambiar contraseña
        </Button>
        {!hayCambios && sesion && (
          <span className="text-sm text-text-secondary">No hay cambios para guardar.</span>
        )}
      </div>

      {/* MODAL: confirmar guardado con contraseña */}
      <Modal
        open={modal === "guardar"}
        onClose={cerrarModal}
        title="Confirmar cambios"
        icon={
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-900/10">
            <ShieldCheck className="h-5 w-5 text-brand-900" aria-hidden="true" />
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={cerrarModal} disabled={verificando}>
              Cancelar
            </Button>
            <Button onClick={confirmarGuardado} disabled={verificando || contraGuardar.trim() === ""}>
              {verificando ? "Guardando…" : "Confirmar"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-text-secondary">
          Ingresá tu contraseña actual para confirmar los cambios en tu cuenta.
        </p>
        <ContrasenaInput
          id="cfg-modal-guardar"
          label="Contraseña actual"
          value={contraGuardar}
          onChange={(e) => {
            setContraGuardar(e.target.value);
            if (errorContraGuardar) setErrorContraGuardar("");
          }}
          error={errorContraGuardar}
          visible={mostrarGuardar}
          onToggle={() => setMostrarGuardar((v) => !v)}
          autoComplete="current-password"
          disabled={verificando}
        />
      </Modal>

      {/* MODAL: cambiar contraseña */}
      <Modal
        open={modal === "contrasena"}
        onClose={cerrarModal}
        title="Cambiar contraseña"
        icon={
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-900/10">
            <KeyRound className="h-5 w-5 text-brand-900" aria-hidden="true" />
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={cerrarModal} disabled={guardandoContra}>
              Cancelar
            </Button>
            <Button onClick={confirmarCambioContrasena} disabled={guardandoContra}>
              {guardandoContra ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ContrasenaInput
            id="cfg-modal-actual"
            label="Contraseña actual"
            requiredMark
            value={contraActual}
            onChange={(e) => setContraActual(e.target.value)}
            error={erroresContrasena.actual}
            visible={mostrarActualModal}
            onToggle={() => setMostrarActualModal((v) => !v)}
            autoComplete="current-password"
            disabled={guardandoContra}
          />
          <ContrasenaInput
            id="cfg-modal-nueva"
            label="Nueva contraseña"
            requiredMark
            value={nuevaContrasena}
            onChange={(e) => setNuevaContrasena(e.target.value)}
            error={erroresContrasena.nueva}
            hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
            visible={mostrarNuevaModal}
            onToggle={() => setMostrarNuevaModal((v) => !v)}
            autoComplete="new-password"
            disabled={guardandoContra}
          />
          <ContrasenaInput
            id="cfg-modal-confirmar"
            label="Confirmar nueva contraseña"
            requiredMark
            value={confirmarNueva}
            onChange={(e) => setConfirmarNueva(e.target.value)}
            error={erroresContrasena.confirmar}
            visible={mostrarConfirmarModal}
            onToggle={() => setMostrarConfirmarModal((v) => !v)}
            autoComplete="new-password"
            disabled={guardandoContra}
          />
        </div>
      </Modal>
    </div>
  );
}

function ItemCuenta({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-bold uppercase tracking-widest text-text-secondary">{etiqueta}</dt>
      <dd className="text-base font-bold text-brand-900">{children}</dd>
    </div>
  );
}

interface ContrasenaInputProps {
  id: string;
  label: string;
  requiredMark?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  visible: boolean;
  onToggle: () => void;
  autoComplete?: string;
  disabled?: boolean;
}

// Inputs de contraseña con toggle mostrar/ocultar.
function ContrasenaInput({
  id,
  label,
  requiredMark,
  value,
  onChange,
  error,
  hint,
  visible,
  onToggle,
  autoComplete,
  disabled,
}: ContrasenaInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        label={label}
        requiredMark={requiredMark}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        error={error}
        hint={hint}
        autoComplete={autoComplete}
        disabled={disabled}
        className="pr-12"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        disabled={disabled}
        className="absolute right-1.5 top-[26px] flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {visible ? (
          <EyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
