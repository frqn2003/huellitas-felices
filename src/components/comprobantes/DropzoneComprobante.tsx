"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, FileText, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";

interface DropzoneComprobanteProps {
  onFile: (file: File) => void;
  isUploading?: boolean;
  error?: string;
}

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPTED_EXT = ".pdf, .jpg, .png";

export function DropzoneComprobante({ onFile, isUploading = false, error }: DropzoneComprobanteProps) {
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED.includes(file.type)) return;
      onFile(file);
    },
    [onFile],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="dropzone-input"
        className={`group relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed bg-surface p-8 shadow-card transition-colors duration-normal ease-out ${
          dragging
            ? "border-brand-900 bg-brand-900/5"
            : error
              ? "border-destructive"
              : "border-brand-900/30 hover:border-brand-900/60"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-describedby={error ? "dropzone-error" : undefined}
      >
        <input
          id="dropzone-input"
          type="file"
          accept={ACCEPTED_EXT}
          className="sr-only"
          onChange={onInputChange}
          disabled={isUploading}
          aria-label="Seleccionar comprobante"
        />
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className="flex flex-col items-center gap-3"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-900/20 border-t-brand-900" aria-hidden="true" />
              <p className="text-sm font-semibold text-text-secondary">Procesando OCR…</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              className="flex flex-col items-center gap-3 text-center"
            >
              {error ? (
                <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
              ) : (
                <UploadCloud
                  className={`h-10 w-10 transition-colors duration-fast ${
                    dragging ? "text-brand-900" : "text-brand-900/50 group-hover:text-brand-900"
                  }`}
                  aria-hidden="true"
                />
              )}
              <div>
                <p className="text-base font-bold text-text-primary">
                  {dragging ? "Soltá el archivo aquí" : "Arrastrá el documento o seleccioná"}
                </p>
                <p className="mt-1 text-sm text-text-secondary">PDF, JPG o PNG</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-brand-900 px-4 py-2 text-sm font-bold text-brand-900">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Seleccionar archivo
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </label>
      {error && (
        <p id="dropzone-error" role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}