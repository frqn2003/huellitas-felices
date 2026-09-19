"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Etiqueta accesible para lectores de pantalla (el estado visible está en el texto al lado). */
  ariaLabel: string;
}

/**
 * Toggle de estado: lo usa el formulario de Clientes (HU-CLI-01) para la baja
 * lógica "Activo/Inactivo". No existía un switch en ui/, se crea con semántica
 * ARIA de switch (role + aria-checked). Touch target ≥ 44px.
 */
export function Switch({ checked, onChange, disabled = false, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex h-11 min-h-11 w-11 min-w-11 cursor-pointer items-center justify-center rounded-pill transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-fast ease-out ${
          checked ? "bg-brand-900" : "bg-text-secondary/40"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow-sm transition-transform duration-fast ease-out ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}