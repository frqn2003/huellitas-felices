"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  tone?: "neutral" | "warning" | "danger";
}

interface ComboboxProps {
  id: string;
  label?: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  noResultsText?: string;
  maxResults?: number;
}

export function Combobox({
  id,
  label,
  requiredMark = false,
  error,
  hint,
  disabled = false,
  value,
  options,
  onChange,
  onBlur,
  placeholder = "",
  noResultsText = "Sin resultados",
  maxResults = 8,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const labelDeValue = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  // null = sin búsqueda activa: muestra el label de la opción seleccionada.
  const displayValue = query ?? labelDeValue;

  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    const toneOrder: Record<NonNullable<ComboboxOption["tone"]>, number> = {
      danger: 0,
      warning: 1,
      neutral: 2,
    };

    return [...options]
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          (toneOrder[a.tone ?? "neutral"] ?? 99) -
          (toneOrder[b.tone ?? "neutral"] ?? 99),
      )
      .slice(0, maxResults);
  }, [options, query, maxResults]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const listboxId = `${id}-listbox`;
  const describedBy = [error ? errorId : "", hint && !error ? hintId : ""]
    .filter(Boolean)
    .join(" ");

  const seleccionar = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        seleccionar(filtered[activeIndex]);
      } else {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      setQuery(null);
      onChange(value);
    } else if (e.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-text-primary">
          {label}
          {requiredMark && <span className="text-destructive"> *</span>}
        </label>
      )}
      <div className="relative" ref={rootRef}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          value={displayValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            const nuevo = e.target.value;
            setQuery(nuevo === "" ? null : nuevo);
            setActiveIndex(-1);
            setOpen(true);
            if (nuevo !== labelDeValue) onChange("");
          }}
          onFocus={() => {
            if (displayValue === labelDeValue) setQuery(null);
            setOpen(true);
          }}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          className="h-11 min-h-11 w-full cursor-text rounded-sm border bg-surface px-4 pr-11 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:bg-cream-100 disabled:opacity-70"
          style={{
            borderColor: error ? "var(--color-destructive)" : undefined,
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            if (!open) {
              if (displayValue === labelDeValue) setQuery(null);
              inputRef.current?.focus();
            }
          }}
          aria-hidden={true}
          className="pointer-events-none absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill text-text-secondary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-fast ease-out ${open ? "rotate-180" : ""}`}
            aria-hidden={true}
          />
        </button>
        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={label ?? id}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-md border border-border bg-surface shadow-card"
          >
            {filtered.length === 0 ? (
              <p
                role="status"
                className="px-4 py-3 text-sm font-medium text-text-secondary"
              >
                {noResultsText}
              </p>
            ) : (
              <ul className="max-h-64 overflow-y-auto py-1">
                {filtered.map((option, index) => {
                  const toneClass =
                    option.tone === "danger"
                      ? "bg-status-danger/10 text-status-danger-strong border-l-4 border-status-danger"
                      : option.tone === "warning"
                        ? "bg-status-warning/10 text-status-warning-strong border-l-4 border-status-warning"
                        : "bg-surface text-text-primary border-l-4 border-transparent";

                  return (
                    <li
                      key={option.value}
                      id={`${id}-opt-${index}`}
                      role="option"
                      aria-selected={option.value === value}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => seleccionar(option)}
                      className={`flex min-h-11 cursor-pointer items-center border-l-4 px-4 py-2 text-sm font-semibold transition-colors duration-fast ease-out hover:brightness-95 focus-visible:outline-none ${
                        toneClass
                      } ${index === activeIndex ? "ring-1 ring-brand-900/15" : ""}`}
                    >
                      {option.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs font-medium text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
