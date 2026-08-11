"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const reduceMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-border bg-surface px-4 py-3 shadow-card"
            >
              {toast.type === "success" ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-brand-900"
                  aria-hidden="true"
                />
              ) : (
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              )}
              <p
                className={`flex-1 text-sm font-semibold ${toast.type === "success" ? "text-brand-900" : "text-destructive"}`}
              >
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar notificación"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
