"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, Eye, EyeOff, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TwoFactorModal } from "./TwoFactorModal";
import { BlockedOverlay } from "./BlockedOverlay";
import { useToast } from "@/components/ui/Toast";

type View = "login" | "forgot" | "forgot_success";

export function LoginForm() {
  const { state, login, verificar2FA, reenviarCodigo, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const validate = (): boolean => {
    let ok = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("El email es obligatorio");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Ingresá un email válido");
      ok = false;
    }

    if (!password) {
      setPasswordError("La contraseña es obligatoria");
      ok = false;
    } else if (password.length < 6) {
      setPasswordError("Mínimo 6 caracteres");
      ok = false;
    }

    return ok;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    login(email, password);
  };

  const handleVerificar2FA = (codigo: string): boolean => {
    const ok = verificar2FA(codigo);
    if (ok) {
      showToast("success", "Bienvenido, Carlos García");
    }
    return ok;
  };

  const handleForgotPassword = () => {
    if (!forgotEmail.trim()) {
      setForgotEmailError("El email es obligatorio");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotEmailError("Ingresá un email válido");
      return;
    }
    setForgotLoading(true);
    // BACKEND: enviar notificación al administrador con POST /api/auth/recuperar
    setTimeout(() => {
      setForgotLoading(false);
      setView("forgot_success");
    }, 1000);
  };

  // Estados derivados
  const isLoading = state.status === "loading";
  const isError = state.status === "error";
  const isBlocked = state.status === "blocked";
  const is2FA = state.status === "2fa_required";
  const isAuthenticated = state.status === "authenticated";

  // Redirección post-login
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/articulos");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-accent-500">
            <PawPrint className="h-7 w-7 text-brand-900" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
            Huellitas Felices
          </h1>
        </div>

        {/* Formulario o Bloqueado */}
        {isBlocked ? (
          <BlockedOverlay bloqueadoHasta={state.bloqueadoHasta} />
        ) : view === "forgot" ? (
          /* ── Vista: Olvidaste tu contraseña ── */
          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-card">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900/10">
                  <Mail className="h-6 w-6 text-brand-900" aria-hidden="true" />
                </div>
                <p className="text-sm text-text-secondary">
                  Ingresá tu email y notificaremos al administrador para que resuelva el problema con tu contraseña.
                </p>
              </div>

              <Input
                label="Email"
                requiredMark
                type="email"
                placeholder="tu@email.com"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  setForgotEmailError("");
                }}
                error={forgotEmailError}
                autoComplete="email"
                autoFocus
              />

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-900 border-t-transparent" />
                    Enviando...
                  </span>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>

            <p className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setForgotEmail("");
                  setForgotEmailError("");
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-brand-900 underline underline-offset-2 transition-colors duration-fast ease-out hover:text-accent-600"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al login
              </button>
            </p>
          </div>
        ) : view === "forgot_success" ? (
          /* ── Vista: Solicitud enviada ── */
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-6 text-center shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success/10">
                <CheckCircle2 className="h-6 w-6 text-status-success" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-extrabold uppercase text-brand-900">
                  Solicitud enviada
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Se ha notificado al administrador para que resuelva el problema con tu contraseña. Recibirás una respuesta en tu email.
                </p>
              </div>
            </div>

            <p className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setForgotEmail("");
                  setForgotEmailError("");
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-brand-900 underline underline-offset-2 transition-colors duration-fast ease-out hover:text-accent-600"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al login
              </button>
            </p>
          </div>
        ) : (
          /* ── Vista: Login principal ── */
          <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-card">
              <Input
                label="Email"
                requiredMark
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                error={emailError}
                autoComplete="email"
                autoFocus
                disabled={isLoading}
              />

              <div className="relative">
                <Input
                  label="Contraseña"
                  requiredMark
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  error={passwordError}
                  autoComplete="current-password"
                  maxLength={16}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-[32px] flex h-8 w-8 items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {isError && (
                <div className="rounded-md bg-destructive/5 px-3 py-2" role="alert">
                  <p className="text-sm font-semibold text-destructive">
                    Email o contraseña incorrectos
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Intentos restantes: {state.intentosRestantes}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-900 border-t-transparent" />
                    Ingresando...
                  </span>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-text-secondary">
              <button
                type="button"
                onClick={() => {
                  setView("forgot");
                  setForgotEmail(email);
                  setForgotEmailError("");
                }}
                className="cursor-pointer font-bold text-brand-900 underline underline-offset-2 transition-colors duration-fast ease-out hover:text-accent-600"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>
          </form>
        )}
      </div>

      {/* Modal 2FA — solo para Administrador */}
      <TwoFactorModal
        open={is2FA}
        onVerificar={handleVerificar2FA}
        onReenviar={reenviarCodigo}
        onClose={logout}
      />
    </>
  );
}
