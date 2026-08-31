"use client";

import { FileDown, Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  formatARS,
  infoSaldo,
  type ProveedorCtaCte,
} from "@/data/cuentas-corrientes";

interface CtaCorrienteCardHeaderProps {
  proveedor: ProveedorCtaCte;
  onExportar: () => void;
  onRegistrarPago: () => void;
}

export function CtaCorrienteCardHeader({
  proveedor,
  onExportar,
  onRegistrarPago,
}: CtaCorrienteCardHeaderProps) {
  const saldo = infoSaldo(proveedor.saldoActual);

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-border bg-surface p-3.5 shadow-card min-w-[280px] max-w-sm shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900 truncate">
            {proveedor.razonSocial}
          </h3>
          <p className="text-xs font-medium text-text-secondary">CUIT {proveedor.cuit}</p>
        </div>

        <div className="flex flex-col items-end text-right shrink-0">
          <p className={`font-display text-base font-extrabold leading-tight ${saldo.tone}`}>
            {saldo.sign}
            {formatARS(Math.abs(proveedor.saldoActual))}
          </p>
          <span className="text-[10px] font-semibold text-text-secondary">{saldo.label}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
        <Button variant="outline" size="sm" type="button" onClick={onExportar} className="h-8 text-xs px-3">
          <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
          Exportar PDF
        </Button>
        <Button size="sm" type="button" onClick={onRegistrarPago} className="h-8 text-xs px-3">
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          Registrar pago
        </Button>
      </div>
    </div>
  );
}
