"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfiguracionForm } from "@/components/configuracion/ConfiguracionForm";

function ConfiguracionScreen() {
  const { state } = useAuth();
  const authenticated = state.status === "authenticated";
  const nombreCompleto = authenticated
    ? `${state.usuario.nombre} ${state.usuario.apellido}`
    : "";

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              Administración
            </p>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
              Configuración
            </h1>
            {authenticated && (
              <p className="text-sm text-text-secondary">
                Hola, {nombreCompleto}. Esta es tu cuenta personal.
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          <ConfiguracionForm />
        </div>
      </main>
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <ToastProvider>
      <ConfiguracionScreen />
    </ToastProvider>
  );
}
