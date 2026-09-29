/**
 * Datos y helpers de cobro y comprobantes de turnos (HU-TUR-01 / Mostrador).
 * BACKEND: Reemplazar por GET /api/caja/comprobantes?turno_id=:id y POST /api/caja/cobros.
 */

export interface ItemCobroComprobante {
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
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
  subtotalNeto?: number;
  impuestosIva?: number;
  total: number;
  medioPago: "efectivo" | "transferencia";
  referencia?: string;
  observaciones?: string;
}

const STORAGE_KEY = "huellitas_comprobantes_turnos";

/**
 * Comprobantes iniciales precargados (Turno #3 ya fue atendido y pagado en el historial de demo).
 */
export const COMPROBANTES_INICIALES: Record<number, ComprobanteTurno> = {
  3: {
    numero: "REC-2026-000003",
    fechaHora: "08/09/2026 16:45",
    turnoId: 3,
    clienteNombre: "Pablo Celaya",
    clienteDoc: "32456789",
    clienteTel: "+54 9 387 411-2233",
    mascotaNombre: "Poppi",
    mascotaEspecie: "Canino",
    mascotaRaza: "Mestizo",
    profesional: "Dra. Laura Gómez",
    practicaNombre: "Cirugía",
    arancel: 65000,
    productos: [
      {
        codigo: "MED-001",
        nombre: "Amoxicilina 500mg suspensión",
        unidad: "Frasco",
        cantidad: 1,
        precioUnitario: 4500,
      },
      {
        codigo: "INS-014",
        nombre: "Jeringa descartable 5ml c/ aguja",
        unidad: "Unidad",
        cantidad: 2,
        precioUnitario: 950,
      },
    ],
    subtotalNeto: 59008,
    impuestosIva: 12392,
    total: 71400,
    medioPago: "transferencia",
    referencia: "TRX-789123",
    observaciones: "Cirugía de castración programada abonada con QR en mostrador",
  },
};

export function obtenerComprobanteTurno(turnoId: number): ComprobanteTurno | null {
  if (typeof window === "undefined") {
    return COMPROBANTES_INICIALES[turnoId] || null;
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const map: Record<number, ComprobanteTurno> = raw ? JSON.parse(raw) : {};
    return map[turnoId] || COMPROBANTES_INICIALES[turnoId] || null;
  } catch {
    return COMPROBANTES_INICIALES[turnoId] || null;
  }
}

export function esTurnoPagado(turnoId: number): boolean {
  return obtenerComprobanteTurno(turnoId) !== null;
}

export function guardarComprobanteTurno(comprobante: ComprobanteTurno): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const map: Record<number, ComprobanteTurno> = raw ? JSON.parse(raw) : {};
    map[comprobante.turnoId] = comprobante;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Error guardando comprobante en sessionStorage:", e);
  }
}
