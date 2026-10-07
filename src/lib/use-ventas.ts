"use client";

import { useCallback, useMemo, useState } from "react";
import type { FilaListaPrecio } from "@/data/lista-precios";
import type { TipoMedioPago } from "@/data/pagos";
import { useCatalogo } from "@/lib/use-catalogo";

/**
 * Datos de apoyo de las pantallas de cobro (HU-VTA-01 y HU-VTA-02): catálogo de
 * artículos con su precio vigente y los medios de pago. Salen de la base.
 */

/** Artículo vendible: activo y con precio cargado en la Lista de Precios. */
export interface ArticuloVendible {
  /** articulo.id: es lo que viaja a la API. */
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  /** Solo para mostrar: el precio real lo toma la base al confirmar. */
  precioUnitario: number;
}

export function useArticulosVendibles(): ArticuloVendible[] {
  const filas = useCatalogo<FilaListaPrecio>("/api/lista-precios?conPrecio=true&estado=activo");
  return useMemo(
    () =>
      filas
        .filter((f) => f.precio !== null)
        .map((f) => ({
          id: f.articuloId,
          codigo: f.codigo,
          nombre: f.nombre,
          categoria: f.categoria,
          unidad: f.unidadMedida,
          precioUnitario: f.precio as number,
        })),
    [filas],
  );
}

// ---------------------------------------------------------------------------
// Medios de pago (HU-VTA-02)
// ---------------------------------------------------------------------------

/** Una fila de GET /api/medios-pago. El `id` es el `formaPagoId` de la API de ventas. */
export interface MedioCobro {
  id: number;
  nombre: string;
  tipo: TipoMedioPago;
}

/** Los medios con los que se puede cobrar: efectivo, transferencia, tarjeta, billetera virtual. */
export function useMediosCobro(): MedioCobro[] {
  return useCatalogo<MedioCobro>("/api/medios-pago");
}

/** Un medio elegido para esta venta, con lo que paga el cliente por ahí. */
export interface PagoLinea {
  formaPagoId: number;
  monto: number;
  /** N° de operación / comprobante: solo para el comprobante, la base no lo guarda. */
  referencia: string;
}

const centavos = (n: number) => Math.round(n * 100);

/**
 * Estado de los medios de pago de una venta.
 *
 *  · Arranca con efectivo elegido (si está en el catálogo).
 *  · Con UN solo medio, paga el total completo (no se tipea).
 *  · Con varios, cada uno lleva su monto y la suma tiene que dar el total
 *    (el back y la base lo vuelven a validar).
 */
export function usePagos(medios: MedioCobro[], total: number) {
  // null = el usuario todavía no tocó nada: rige la selección por defecto.
  const [elegidos, setElegidos] = useState<PagoLinea[] | null>(null);

  const pagos = useMemo<PagoLinea[]>(() => {
    const base =
      elegidos ??
      (() => {
        const efectivo = medios.find((m) => m.tipo === "efectivo");
        return efectivo ? [{ formaPagoId: efectivo.id, monto: 0, referencia: "" }] : [];
      })();
    return base.length === 1 ? [{ ...base[0], monto: total }] : base;
  }, [elegidos, medios, total]);

  const asignado = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);
  const restante = total - asignado;
  const valido =
    total > 0 &&
    pagos.length > 0 &&
    pagos.every((p) => (Number(p.monto) || 0) > 0) &&
    centavos(asignado) === centavos(total);

  const reiniciar = useCallback(() => setElegidos(null), []);

  return { pagos, setPagos: setElegidos, asignado, restante, valido, reiniciar };
}
