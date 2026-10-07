"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface LineaComprobante {
  id: number;
  /**
   * FK a `articulo`. Es lo que la API necesita para guardar la línea.
   *
   * Antes solo existía `articuloCodigo`, un texto libre: el usuario tecleaba
   * "VAC-001" y nadie verificaba que ese artículo existiera. El PO pidió
   * justamente esto — "el usuario debe poder buscar y cargar manualmente los
   * ítems en base al código de producto interno del sistema" —, así que el
   * campo pasó a ser un select del catálogo real.
   */
  articuloId?: number;
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
  /** Catálogo real, de GET /api/articulos?estado=activo. */
  articulos: { id: number; codigo: string; nombre: string }[];
}

const ALICUOTAS = ["0", "10.5", "21", "27"];

export function DetalleLineasTable({ lineas, onChange, articulos }: DetalleLineasTableProps) {
  /**
   * Elegir el artículo llena también código y descripción.
   *
   * Son datos del catálogo, no del comprobante: dejarlos editables permitiría
   * facturar "VAC-001" con la descripción de otra cosa.
   */
  const elegirArticulo = (lineaId: number, articuloId: string) => {
    const art = articulos.find((a) => a.id === Number(articuloId));
    onChange(
      lineas.map((l) =>
        l.id === lineaId
          ? {
              ...l,
              articuloId: art?.id,
              articuloCodigo: art?.codigo ?? "",
              descripcion: art?.nombre ?? "",
            }
          : l,
      ),
    );
  };

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
                  {/*
                    Era un <Input> de texto libre. El usuario tecleaba un código
                    y nadie verificaba que el artículo existiera — y la API
                    necesita el `articuloId`, no un string.
                  */}
                  <select
                    value={linea.articuloId ?? ""}
                    onChange={(e) => elegirArticulo(linea.id, e.target.value)}
                    aria-label="Artículo"
                    className="h-9 min-w-[200px] cursor-pointer rounded-sm border border-border bg-surface px-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  >
                    <option value="">Elegí el artículo…</option>
                    {articulos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} — {a.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {/* Solo lectura: sale del catálogo, no se factura con otro nombre. */}
                  <span className="block min-w-[140px] text-sm text-text-secondary">
                    {linea.descripcion || "—"}
                  </span>
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
