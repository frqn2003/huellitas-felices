// BACKEND: Este módulo es hardcodeado para el equipo de diseño UI/UX.
// Al integrar con backend, reemplazar los datos por llamadas a la API.
// Coherente con: proveedor.saldo_actual + comprobante_proveedor + pago + pago_imputacion.
// Convensión de signo: saldo positivo = adeudado al proveedor; negativo = crédito a favor.

export type EstadoCtaCte =
  | "Saldado"
  | "Pendiente"
  | "ProximoAVencer"
  | "Vencido"
  | "Credito";

export type FormaPago = "Efectivo" | "Transferencia" | "Cheque" | "Tarjeta";

export interface ProveedorCtaCte {
  id: number; // PK del back (proveedor.id)
  razonSocial: string;
  cuit: string;
  saldoActual: number; // proveedor.saldo_actual (neto)
  estadoCta: EstadoCtaCte; // derivado del peor estado de sus comprobantes
  proximoVencimiento: string | null; // ISO date del vencimiento más cercano (null si sin pendientes)
}

export interface ComprobantePendiente {
  id: number; // PK del back (comprobante_proveedor.id)
  numero: string; // formato AFIP: puntoVenta-numero
  tipo: string; // Factura A / Nota de Crédito A, etc.
  fechaVencimiento: string; // comprobante_proveedor.fecha_vencimiento (ISO date)
  saldoPendiente: number; // comprobante_proveedor.saldo_pendiente (negativo = NC a favor)
  estadoCta: EstadoCtaCte;
}

export interface ImputacionPago {
  comprobanteId: number;
  numero: string;
  monto: number; // pago_imputacion.monto_imputado
}

export interface PagoProveedor {
  id: number; // PK del back (pago.id)
  numero: string; // nro. de comprobante de pago
  fecha: string; // ISO date
  formaPago: FormaPago;
  monto: number;
  imputaciones: ImputacionPago[]; // pago_imputacion
}

// Umbral de alerta "próximo a vencer" = vencimiento dentro de ≤ 7 días (decisión de la HU).
export const DIAS_ALERTA_PROXIMO_VENCER = 7;

export const PROVEEDORES_CTA_CTE: ProveedorCtaCte[] = [
  { id: 1, razonSocial: "Distribuidora Vet SA", cuit: "30-71234567-8", saldoActual: 156255.0, estadoCta: "Vencido", proximoVencimiento: "2026-09-05" },
  { id: 2, razonSocial: "Insumos Veterinarios del Norte SRL", cuit: "30-70987654-3", saldoActual: 87400.0, estadoCta: "ProximoAVencer", proximoVencimiento: "2026-09-16" },
  { id: 3, razonSocial: "Juan Pérez Alimentos Balanceados", cuit: "20-25874196-5", saldoActual: -15000.0, estadoCta: "Credito", proximoVencimiento: null },
  { id: 4, razonSocial: "Pet Food SA", cuit: "30-71445566-7", saldoActual: 0, estadoCta: "Saldado", proximoVencimiento: null },
];

// BACKEND: reemplazar por GET /api/proveedores/{id}/cuenta-corriente
export const COMPROBANTES_POR_PROVEEDOR: Record<number, ComprobantePendiente[]> = {
  1: [
    { id: 101, numero: "0003-00001278", tipo: "Factura A", fechaVencimiento: "2026-09-05", saldoPendiente: 171255.0, estadoCta: "Vencido" },
    { id: 95, numero: "0003-00000034", tipo: "Nota de Crédito A", fechaVencimiento: "2026-09-05", saldoPendiente: -15000.0, estadoCta: "Credito" },
  ],
  2: [
    { id: 98, numero: "0001-00000542", tipo: "Factura B", fechaVencimiento: "2026-09-16", saldoPendiente: 87400.0, estadoCta: "ProximoAVencer" },
  ],
  3: [
    { id: 97, numero: "0001-00000110", tipo: "Nota de Crédito B", fechaVencimiento: "2026-08-30", saldoPendiente: -15000.0, estadoCta: "Credito" },
  ],
  4: [],
};

// BACKEND: reemplazar por GET /api/pagos?tipo=pago-proveedor&proveedorId={id}
export const PAGOS_POR_PROVEEDOR: Record<number, PagoProveedor[]> = {
  1: [
    {
      id: 457,
      numero: "0001-00000457",
      fecha: "2026-09-02",
      formaPago: "Transferencia",
      monto: 100000.0,
      imputaciones: [{ comprobanteId: 101, numero: "0003-00001278", monto: 100000.0 }],
    },
    {
      id: 441,
      numero: "0001-00000441",
      fecha: "2026-08-28",
      formaPago: "Efectivo",
      monto: 50000.0,
      imputaciones: [{ comprobanteId: 101, numero: "0003-00001278", monto: 50000.0 }],
    },
  ],
  2: [],
  3: [],
  4: [],
};

export const FORMAS_PAGO: FormaPago[] = ["Efectivo", "Transferencia", "Cheque", "Tarjeta"];

// ─── Helpers de presentación ─────────────────────────────────────────────────

export function formatARS(monto: number) {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR");
}

/** Info de color/etiqueta de un saldo. Regla de la HU: rojo si ≠ 0 (deuda),
 *  verde si es crédito a favor (negativo), neutral si es 0. */
export function infoSaldo(saldo: number) {
  if (saldo < 0) return { tone: "text-status-success-strong", sign: "−", label: "Crédito a favor" };
  if (saldo > 0) return { tone: "text-destructive", sign: "", label: "Deuda" };
  return { tone: "text-text-secondary", sign: "", label: "Saldado" };
}
