"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ConsultaInsumo } from "@/data/consultas";

interface InsumoRowProps {
  insumo: ConsultaInsumo;
  onRemove: (articuloId: number) => void;
  readOnly?: boolean;
}

/** Fila de un insumo ya agregado a la consulta. */
export function InsumoRow({ insumo, onRemove, readOnly = false }: InsumoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 transition-colors duration-fast ease-out">
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {insumo.nombre}
        </span>
        <span className="text-xs text-text-secondary">{insumo.codigo}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-text-primary">{insumo.cantidad}</span>
        <span className="text-sm text-text-secondary">{insumo.unidadMedida}</span>
      </div>
      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(insumo.articuloId)}
          aria-label={`Quitar ${insumo.nombre}`}
          className="shrink-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
