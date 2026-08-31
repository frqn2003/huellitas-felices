"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface LineaComprobante {
  id: number;
  articuloCodigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  alicuotaIVA: number | null;
  subtotal: number;
}

interface DetalleLineasTableProps {
  lineas: LineaComprobante[];
  onChange: (lineas: LineaComprobante[]) => void;
}

const ALICUOTAS = ["0", "10.5", "21", "27"];

export function DetalleLineasTable({ lineas, onChange }: DetalleLineasTableProps) {
  const updateLinea = (id: number, field: keyof LineaComprobante, value: string | number | null) => {
    onChange(
      lineas.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.subtotal = updated.cantidad * updated.precioUnitario;
        return updated;
      }),
    );
  };

  const addLinea = () => {
    const newId = Math.max(0, ...lineas.map((l) => l.id)) + 1;
    onChange([
      ...lineas,
      { id: newId, articuloCodigo: "", descripcion: "", cantidad: 1, precioUnitario: 0, alicuotaIVA: null, subtotal: 0 },
    ]);
  };

  const removeLinea = (id: number) => {
    onChange(lineas.filter((l) => l.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm" aria-label="Detalle de líneas del comprobante">
          <thead>
            <tr className="border-b border-border bg-background">
              {["Artículo", "Descripción", "Cantidad", "Precio unit.", "IVA %", "Subtotal", ""].map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-text-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea) => (
              <tr key={linea.id} className="border-b border-border last:border-0 hover:bg-background/60">
                <td className="px-3 py-2">
                  <Input
                    value={linea.articuloCodigo}
                    onChange={(e) => updateLinea(linea.id, "articuloCodigo", e.target.value)}
                    className="h-9 min-h-9 w-24 text-sm"
                    aria-label="Código de artículo"
                    placeholder="Código"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={linea.descripcion}
                    onChange={(e) => updateLinea(linea.id, "descripcion", e.target.value)}
                    className="h-9 min-h-9 min-w-[140px] text-sm"
                    aria-label="Descripción"
                    placeholder="Descripción"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min="1"
                    value={linea.cantidad}
                    onChange={(e) => updateLinea(linea.id, "cantidad", Number(e.target.value))}
                    className="h-9 min-h-9 w-20 text-sm"
                    aria-label="Cantidad"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linea.precioUnitario}
                    onChange={(e) => updateLinea(linea.id, "precioUnitario", Number(e.target.value))}
                    className="h-9 min-h-9 w-28 text-sm"
                    aria-label="Precio unitario"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={linea.alicuotaIVA?.toString() ?? ""}
                      onChange={(e) => updateLinea(linea.id, "alicuotaIVA", e.target.value ? Number(e.target.value) : null)}
                      className="h-9 min-h-9 w-20 text-sm"
                      aria-label="Alícuota IVA"
                    >
                      <option value="">—</option>
                      {ALICUOTAS.map((a) => (
                        <option key={a} value={a}>{a}%</option>
                      ))}
                    </Select>
                    {linea.alicuotaIVA === null && (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-label="Alícuota no reconocida" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-text-primary">
                  {linea.subtotal.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLinea(linea.id)}
                    aria-label="Eliminar línea"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={lineas.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addLinea} className="self-start">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Agregar línea
      </Button>
    </div>
  );
}
