import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, requiredMark = false, error, hint, id, className = "", ...props },
    ref,
  ) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = [error ? errorId : "", hint && !error ? hintId : ""]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-bold text-text-primary"
          >
            {label}
            {requiredMark && <span className="text-destructive"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-11 min-h-11 rounded-sm border bg-surface px-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 disabled:opacity-70 ${error ? "border-destructive" : "border-border"} ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs font-medium text-text-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
