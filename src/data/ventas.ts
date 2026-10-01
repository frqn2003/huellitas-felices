// Datos placeholder del módulo Ventas en Mostrador (HU-VTA-01).
// Refleja las tablas `venta`, `venta_detalle` y `venta_medio_pago` descriptas en docs/esquema-bd-front.md.
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

export interface VentaItemDetalle {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: number; // PK de la tabla `venta`
  numeroComprobante: string;
  clienteId: number; // FK → cliente.id
  clienteNombre: string;
  clienteDoc?: string;
  sucursalId: number; // FK → sucursal.id
  consultaId: number | null; // FK → consulta_medica.id
  turnoId: number | null; // FK → turno.id
  usuarioId: number; // FK → usuario.id (cajero/recepcionista)
  fecha: string; // ISO 8601
  conceptoServicio: string;
  arancelServicio: number;
  items: VentaItemDetalle[];
  subtotalNeto: number; // Base imponible antes de impuestos
  impuestosIva: number; // 21% IVA
  total: number;
  medioPago: string;
  mediosPago?: {
    formaPagoId?: number;
    medio: string;
    monto: number;
    referencia?: string;
  }[];
  estado: "vigente" | "anulada";
}

const STORAGE_KEY_VENTAS = "huellitas_ventas_vta01";

// Ventas precargadas de ejemplo para el historial de clientes en Recepción
export const VENTAS_INICIALES: Venta[] = [
  {
    id: 1,
    numeroComprobante: "REC-2026-000003",
    clienteId: 1, // Pablo Celaya
    clienteNombre: "Pablo Celaya",
    clienteDoc: "34.567.890",
    sucursalId: 1,
    consultaId: 1,
    turnoId: 3,
    usuarioId: 2,
    fecha: "2026-09-21 11:30",
    conceptoServicio: "Cirugía de mediana/alta complejidad",
    arancelServicio: 65000,
    items: [
      {
        id: 1,
        codigo: "MED-001",
        nombre: "Amoxicilina 500mg suspensión",
        categoria: "Medicamentos",
        unidad: "Frasco",
        cantidad: 1,
        precioUnitario: 4500,
        subtotal: 4500,
      },
      {
        id: 2,
        codigo: "INS-014",
        nombre: "Jeringa descartable 5ml c/ aguja",
        categoria: "Insumos",
        unidad: "Unidad",
        cantidad: 2,
        precioUnitario: 950,
        subtotal: 1900,
      },
      {
        id: 3,
        codigo: "ACC-001",
        nombre: "Collar Isabelino Postquirúrgico Regulable N° 3",
        categoria: "Accesorios",
        unidad: "Unidad",
        cantidad: 1,
        precioUnitario: 4200,
        subtotal: 4200,
      },
    ],
    subtotalNeto: 62479,
    impuestosIva: 13121,
    total: 75600,
    medioPago: "transferencia",
    estado: "vigente",
  },
  {
    id: 2,
    numeroComprobante: "REC-2026-000010",
    clienteId: 2, // María Fernández
    clienteNombre: "María Fernández",
    clienteDoc: "32.145.879",
    sucursalId: 1,
    consultaId: 2,
    turnoId: 11,
    usuarioId: 2,
    fecha: "2026-09-22 16:45",
    conceptoServicio: "Consulta médica general",
    arancelServicio: 15000,
    items: [
      {
        id: 4,
        codigo: "VAC-001",
        nombre: "Vacuna Antirrábica Obligatoria",
        categoria: "Medicamentos",
        unidad: "Dosis",
        cantidad: 1,
        precioUnitario: 5500,
        subtotal: 5500,
      },
      {
        id: 5,
        codigo: "ALI-003",
        nombre: "Cat Chow Gatitos Carne y Leche 3kg",
        categoria: "Alimentos",
        unidad: "Bolsa",
        cantidad: 1,
        precioUnitario: 14200,
        subtotal: 14200,
      },
    ],
    subtotalNeto: 28678,
    impuestosIva: 6022,
    total: 34700,
    medioPago: "efectivo",
    estado: "vigente",
  },
  // Las ventas 1 y 2 (21 y 22/09) son de días previos a las jornadas de caja
  // (aperturas 1 y 2: 25 y 26/09): no entran en el "Cobrado fuera de caja".
  // La venta 3 cae dentro de la ventana de la apertura 1 (25/09 08:00 → 18:30)
  // y la 4 dentro de la apertura 2 (26/09 08:05 → +24h).
  {
    id: 3,
    numeroComprobante: "REC-2026-000011",
    clienteId: 1, // Pablo Celaya (clientes.ts)
    clienteNombre: "Pablo Celaya",
    clienteDoc: "45115839",
    sucursalId: 1,
    consultaId: null,
    turnoId: null,
    usuarioId: 4, // Ana Martínez, recepcionista (usuarios.ts)
    fecha: "2026-09-25T14:20:00",
    conceptoServicio: "Venta en mostrador",
    arancelServicio: 0,
    items: [],
    subtotalNeto: 13500,
    impuestosIva: 0,
    total: 13500,
    medioPago: "transferencia",
    estado: "vigente",
  },
  {
    id: 4,
    numeroComprobante: "REC-2026-000012",
    clienteId: 3, // Nicolás Celaya (clientes.ts)
    clienteNombre: "Nicolás Celaya",
    clienteDoc: "46115839",
    sucursalId: 1,
    consultaId: null,
    turnoId: null,
    usuarioId: 4, // Ana Martínez, recepcionista (usuarios.ts)
    fecha: "2026-09-26T10:15:00",
    conceptoServicio: "Venta en mostrador",
    arancelServicio: 0,
    items: [],
    subtotalNeto: 22000,
    impuestosIva: 0,
    total: 22000,
    medioPago: "transferencia",
    estado: "vigente",
  },
];

let cachedVentasSnapshot: Venta[] | null = null;
let lastRawStorage: string | null = null;
const listeners = new Set<() => void>();

export function subscribeVentas(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notificarVentas(): void {
  listeners.forEach((listener) => listener());
}

// BACKEND: GET /api/ventas
export function obtenerVentas(): Venta[] {
  if (typeof window === "undefined") return VENTAS_INICIALES;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_VENTAS);
    if (!raw) {
      if (!cachedVentasSnapshot || lastRawStorage !== null) {
        cachedVentasSnapshot = VENTAS_INICIALES;
        lastRawStorage = null;
      }
      return cachedVentasSnapshot;
    }
    if (raw === lastRawStorage && cachedVentasSnapshot) {
      return cachedVentasSnapshot;
    }
    const guardadas: Venta[] = JSON.parse(raw);
    const combinadas = [...guardadas];
    for (const init of VENTAS_INICIALES) {
      if (!combinadas.some((v) => v.id === init.id)) {
        combinadas.push(init);
      }
    }
    lastRawStorage = raw;
    cachedVentasSnapshot = combinadas;
    return cachedVentasSnapshot;
  } catch {
    return VENTAS_INICIALES;
  }
}

// BACKEND: GET /api/ventas?cliente_id=:clienteId
export function obtenerVentasPorCliente(clienteId: number): Venta[] {
  return obtenerVentas().filter((v) => v.clienteId === clienteId);
}

// BACKEND: POST /api/ventas
// Body: { cliente_id, sucursal_id, consulta_id, usuario_id, lineas: [...], medios_pago: [...] }
// En la base de datos:
// - trg_venta_crear_movimiento_stock + trg_venta_detalle_descontar_stock descuentan stock automáticamente.
// - trg_auditoria_venta registra la operación en la bitácora de auditoría.
export function guardarVenta(nuevaVenta: Venta): void {
  if (typeof window === "undefined") return;
  try {
    const actuales = obtenerVentas();
    const filtradas = actuales.filter((v) => v.id !== nuevaVenta.id);
    const nuevas = [nuevaVenta, ...filtradas];
    const raw = JSON.stringify(nuevas);
    sessionStorage.setItem(STORAGE_KEY_VENTAS, raw);
    lastRawStorage = raw;
    cachedVentasSnapshot = nuevas;
    notificarVentas();
  } catch (err) {
    console.error("Error al persistir venta en sessionStorage:", err);
  }
}
