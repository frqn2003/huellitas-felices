/**
 * Tipos del cobro y del comprobante (HU-VTA-01). El comprobante se arma con la
 * venta que devuelve /api/ventas: no se guarda en el navegador.
 */

/** Valor `medio` de la API → tipo conocido (lo desconocido se muestra como transferencia). */
export function aTipoMedio(valor: string): TipoMedioPago {
  return valor in ETIQUETA_MEDIO ? (valor as TipoMedioPago) : "transferencia";
}

export interface ItemCobroComprobante {
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

/** Los cuatro medios de cobro (HU-VTA-02). Coinciden con `tipo` de GET /api/medios-pago. */
export type TipoMedioPago = "efectivo" | "transferencia" | "tarjeta" | "billetera_virtual";

export const ETIQUETA_MEDIO: Record<TipoMedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia / QR",
  tarjeta: "Tarjeta",
  billetera_virtual: "Billetera virtual",
};

export interface MedioPagoItem {
  id: string;
  medio: TipoMedioPago;
  monto: number;
  referencia?: string;
}

export interface ComprobanteTurno {
  numero: string;
  fechaHora: string;
  turnoId: number;
  clienteNombre: string;
  clienteDoc?: string;
  clienteTel?: string;
  mascotaNombre: string;
  mascotaEspecie: string;
  mascotaRaza?: string | null;
  profesional: string;
  practicaNombre: string;
  arancel: number;
  productos: ItemCobroComprobante[];
  total: number;
  medioPago: TipoMedioPago | "mixto";
  mediosPago?: MedioPagoItem[];
  referencia?: string;
  observaciones?: string;
}
