import type { TextareaHTMLAttributes } from "react";
import { forwardRef, useEffect, useRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  id?: string;
}

/**
 * Textarea del sistema. Crece automáticamente hacia abajo hasta un máximo
 * (con scroll) para que el texto largo se pueda leer sin cortarse —
 * ver HU-CLI-01: campo Dirección.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, requiredMark = false, error, hint, id, className = "", rows = 2, ...props },
    ref,
  ) {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;
    const describedBy = [error ? errorId : "", hint && !error ? hintId : ""]
      .filter(Boolean)
      .join(" ");

    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    // Auto-crecimiento: se ajusta a la altura del contenido (hasta el máximo).
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
    }, [props.value]);

    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-bold text-text-primary"
          >
            {label}
            {requiredMark && <span className="text-destructive"> *</span>}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={textareaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`min-h-11 resize-none overflow-y-auto rounded-sm border bg-surface px-4 py-2.5 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 disabled:opacity-70 ${error ? "border-destructive" : "border-border"} ${className}`}
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