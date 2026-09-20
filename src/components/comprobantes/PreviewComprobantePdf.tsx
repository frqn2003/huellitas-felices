"use client";

import { useEffect, useMemo } from "react";

interface PreviewComprobantePdfProps {
  file: File | null;
}

export function PreviewComprobantePdf({ file }: PreviewComprobantePdfProps) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (!file || !url) return null;

  const esPdf = file.type === "application/pdf";

  return (
    <div className="flex min-h-[400px] items-stretch justify-center overflow-hidden rounded-md border border-border bg-surface shadow-card">
      {esPdf ? (
        <iframe
          src={url}
          title="Vista previa del comprobante"
          className="h-[70vh] w-full"
        />
      ) : (
        <div className="flex w-full items-center justify-center p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Vista previa de ${file.name}`}
            className="max-h-[60vh] max-w-full rounded-sm shadow-card"
          />
        </div>
      )}
    </div>
  );
}