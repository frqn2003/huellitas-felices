"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

const BLOQUEO_MS = 15 * 60 * 1000;

interface BlockedOverlayProps {
  bloqueadoHasta: number;
}

export function BlockedOverlay({ bloqueadoHasta }: BlockedOverlayProps) {
  const [restante, setRestante] = useState(() => {
    if (typeof window === "undefined") return BLOQUEO_MS;
    return Math.max(0, bloqueadoHasta - Date.now());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, bloqueadoHasta - Date.now());
      if (remaining <= 0) {
        clearInterval(interval);
        window.location.reload();
      }
      setRestante(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [bloqueadoHasta]);

  const minutos = Math.floor(restante / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);
  const formato = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-900/10">
        <Lock className="h-8 w-8 text-brand-900" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-display text-xl font-extrabold uppercase text-brand-900">
          Cuenta bloqueada
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Demasiados intentos fallidos. Tu cuenta está bloqueada por 15 minutos.
        </p>
      </div>
      <div className="rounded-md bg-brand-900/5 px-6 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Tiempo restante
        </p>
        <p className="font-display text-3xl font-extrabold text-brand-900" aria-live="polite">
          {formato}
        </p>
      </div>
    </div>
  );
}
