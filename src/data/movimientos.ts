// Datos placeholder del módulo Movimientos de Stock (HU-STK-04).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

import { fichasStockIniciales, type FichaStock } from "./stock";

// Refleja la vista `v_movimiento_stock`, que aplana la cabecera
// (`movimiento_stock_cab`: numero, deposito, tipo, origen, fecha, usuario,
// motivo) con su detalle (`movimiento_stock_det`: ficha_stock_id, cantidad).
// REGLA DE NEGOCIO: cada registro = UN artículo. Un movimiento grupal con varios
// artículos genera N registros que comparten `numero` (agrupador visual).
//
// ⚠️ LA TRANSFERENCIA ES LA EXCEPCIÓN, y cambió respecto de este comentario
// original: son DOS movimientos con números DISTINTOS (MOV-000007 y MOV-000008),
// no dos líneas del mismo. El motivo es que el depósito vive en la cabecera y
// una transferencia toca dos depósitos, así que necesita dos cabeceras — y
// `numero` es UNIQUE.
// El agrupador de la transferencia es `movimiento_vinculado_id`, que enlaza el
// egreso del depósito de origen con el ingreso del de destino.
// REGLA DE ORIGEN: `origen_id` solo referencia documentos reales (Orden de
// Compra, Venta). En Transferencia y Ajuste el origen es implícito
// (el par vinculado / el ajuste mismo) y `origen_id` queda NULL.
export type TipoMovimiento = "Ingreso" | "Egreso" | "Transferencia" | "Ajuste";

export interface MovimientoStock {
  id: number;
  numero: string;
  fichaStockId: number;
  fichaStock: { articuloNombre: string; articuloUnidad: string; depositoNombre: string };
  origenId: number | null;
  origen: { nombre: string } | null;
  origenEntidadId: number | null;
  tipo: TipoMovimiento;
  cantidad: number;
  fechaHora: string;
  empleadoId: number;
  empleado: { nombre: string };
  motivo: string;
  movimientoVinculadoId: number | null;
  createdAt: string;
}

// BACKEND: reemplazar por la respuesta de GET /api/movimientos-stock
// (joins con ficha_stock, deposito, articulo, origen_movimiento y empleado).
// Los nombres de depósito se alinean con el catálogo existente
// (`depositosIniciales` de src/data/stock.ts): "Depósito Central" -> "Dep. Central",
// "Sucursal A" -> "Dep. Norte".
export const movimientosIniciales: MovimientoStock[] = [
  {
    id: 1,
    numero: "MOV-0001",
    fichaStockId: 1,
    fichaStock: { articuloNombre: "Amoxicilina 500mg", articuloUnidad: "Unidad", depositoNombre: "Dep. Central" },
    origenId: 1,
    origen: { nombre: "Orden de Compra" },
    origenEntidadId: 12,
    tipo: "Ingreso",
    cantidad: 20,
    fechaHora: "2026-08-15T09:30:00Z",
    empleadoId: 3,
    empleado: { nombre: "Carlos López" },
    motivo: "Recepción de orden de compra OC-0012",
    movimientoVinculadoId: null,
    createdAt: "2026-08-15T09:30:00Z",
  },
  {
    id: 2,
    numero: "MOV-0002",
    fichaStockId: 2,
    fichaStock: { articuloNombre: "Jeringa 5ml", articuloUnidad: "Unidad", depositoNombre: "Dep. Central" },
    origenId: 2,
    origen: { nombre: "Venta" },
    origenEntidadId: 45,
    tipo: "Egreso",
    cantidad: 50,
    fechaHora: "2026-08-15T11:15:00Z",
    empleadoId: 5,
    empleado: { nombre: "María García" },
    motivo: "Venta a cliente #45",
    movimientoVinculadoId: null,
    createdAt: "2026-08-15T11:15:00Z",
  },
  {
    id: 3,
    numero: "MOV-0003",
    fichaStockId: 5,
    fichaStock: { articuloNombre: "Alimento Premium", articuloUnidad: "Kg", depositoNombre: "Dep. Norte" },
    origenId: null,
    origen: null,
    origenEntidadId: null,
    tipo: "Ingreso",
    cantidad: 10,
    fechaHora: "2026-08-16T10:00:00Z",
    empleadoId: 3,
    empleado: { nombre: "Carlos López" },
    motivo: "Transferencia desde Dep. Central",
    movimientoVinculadoId: 4,
    createdAt: "2026-08-16T10:00:00Z",
  },
  {
    id: 4,
    numero: "MOV-0004",
    fichaStockId: 3,
    fichaStock: { articuloNombre: "Alimento Premium", articuloUnidad: "Kg", depositoNombre: "Dep. Central" },
    origenId: null,
    origen: null,
    origenEntidadId: null,
    tipo: "Egreso",
    cantidad: 10,
    fechaHora: "2026-08-16T10:00:00Z",
    empleadoId: 3,
    empleado: { nombre: "Carlos López" },
    motivo: "Transferencia a Dep. Norte",
    movimientoVinculadoId: 3,
    createdAt: "2026-08-16T10:00:00Z",
  },
];

// Catálogo `tipo_movimiento` (tabla de referencia).
// BACKEND: poblar desde GET /api/tipos-movimiento.
export const tiposMovimiento: { id: number; nombre: TipoMovimiento }[] = [
  { id: 1, nombre: "Ingreso" },
  { id: 2, nombre: "Egreso" },
  { id: 3, nombre: "Transferencia" },
  { id: 4, nombre: "Ajuste" },
];

// Catálogo `origen_movimiento` (tabla de referencia): SOLO documentos reales.
// Transferencia y Ajuste NO tienen origen documental (ver REGLA DE ORIGEN).
// BACKEND: poblar desde GET /api/origenes-movimiento.
export const origenesMovimiento: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Orden de Compra" },
  { id: 2, nombre: "Venta" },
];

// Orígenes válidos según el tipo de movimiento (combos inválidos no se ofrecen).
// - Ingreso: llega stock por una Orden de Compra.
// - Egreso: sale stock por una Venta.
// - Transferencia: sin origen documental (el par vinculado egreso/ingreso hace
//   de origen y destino; `origen_id` queda NULL).
// - Ajuste: sin origen documental (corrección manual; `origen_id` queda NULL).
export const origenesPorTipo: Record<TipoMovimiento, number[]> = {
  Ingreso: [1],
  Egreso: [2],
  Transferencia: [],
  Ajuste: [],
};

// Empleados que aparecen en los movimientos de ejemplo + el usuario logueado.
// BACKEND: poblar desde GET /api/empleados.
export const EMPLEADOS: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Ana Martínez" },
  { id: 3, nombre: "Carlos López" },
  { id: 5, nombre: "María García" },
];

// Empleado asignado automáticamente a los movimientos nuevos (usuario logueado).
// BACKEND: reemplazar por el empleado de la sesión (GET /api/auth/sesion -> empleado_id).
export const EMPLEADO_ACTUAL = { id: 1, nombre: "Ana Martínez" };

// Fichas de stock usadas por el formulario "Nuevo movimiento": solo fichas con
// artículo activo. El código de ficha `FIC-XXX` se deriva del id (no se persiste).
// BACKEND: reemplazar por GET /api/fichas-stock?estado=activo.
export const fichasMovimientos: FichaStock[] = fichasStockIniciales.filter(
  (f) => f.articulo.estado === "activo",
);

export function codigoFicha(fichaId: number): string {
  return `FIC-${String(fichaId).padStart(3, "0")}`;
}

// Convierte la cantidad del formulario a número: acepta coma o punto decimal
// (teclados es-AR) y redondea a 2 decimales (la DB usa decimal(12,2)).
export function parseCantidad(raw: string): number {
  const normalizado = raw.trim().replace(",", ".");
  const n = Number.parseFloat(normalizado);
  return Number.isNaN(n) ? NaN : Math.round(n * 100) / 100;
}

// Próximo número de movimiento: MOV-XXXX (agrupador de los N registros generados).
// BACKEND: el back genera `numero` en el POST /api/movimientos-stock (secuencia MOV-XXXX).
export function proximoNumeroMovimiento(movimientos: MovimientoStock[]): string {
  const max = movimientos.reduce((acc, m) => {
    const n = Number.parseInt(m.numero.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, 0);
  return `MOV-${String(max + 1).padStart(4, "0")}`;
}

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;