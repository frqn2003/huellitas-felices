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
  medioPago: "efectivo" | "transferencia";
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
];

// BACKEND: GET /api/ventas
export function obtenerVentas(): Venta[] {
  if (typeof window === "undefined") return VENTAS_INICIALES;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_VENTAS);
    if (!raw) return VENTAS_INICIALES;
    const guardadas: Venta[] = JSON.parse(raw);
    const combinadas = [...guardadas];
    for (const init of VENTAS_INICIALES) {
      if (!combinadas.some((v) => v.id === init.id)) {
        combinadas.push(init);
      }
    }
    return combinadas;
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
    sessionStorage.setItem(STORAGE_KEY_VENTAS, JSON.stringify([nuevaVenta, ...filtradas]));
  } catch (err) {
    console.error("Error al persistir venta en sessionStorage:", err);
  }
}
