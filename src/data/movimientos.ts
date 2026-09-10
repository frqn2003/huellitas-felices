// Datos placeholder del módulo Movimientos de Stock (HU-STK-04).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).


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
// REGLA DE ORIGEN (dict DBA): `origen_id` es NOT NULL y categoriza TODO
// movimiento: venta, receta, internacion, urgencia, cirugia, practica,
// recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion,
// desparasitacion, merma. La transferencia y el ajuste manual usan SU origen
// del catálogo (no quedan NULL).
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
  /** dict: movimiento_stock_cab.usuario_id FK NOT NULL (quién registró el
      movimiento). La vista plana de la API lo expone como `usuario`. */
  usuario_id: number;
  usuario: { nombre: string };
  motivo: string;
  movimientoVinculadoId: number | null;
}

// BACKEND: reemplazar por la respuesta de GET /api/movimientos-stock
// (joins con ficha_stock, deposito, articulo, origen_movimiento y usuario;
// la vista plana de la API lo expone como `usuario`).
// Los nombres de depósito se alinean con el catálogo existente
// (`depositosIniciales` de src/data/stock.ts): "Depósito Central" -> "Dep. Central",
// "Sucursal A" -> "Dep. Norte".
export const movimientosIniciales: MovimientoStock[] = [
  {
    id: 1,
    numero: "MOV-0001",
    fichaStockId: 1,
    fichaStock: { articuloNombre: "Amoxicilina 500mg", articuloUnidad: "Unidad", depositoNombre: "Dep. Central" },
    origenId: 7,
    origen: { nombre: "recepcion_compra" },
    origenEntidadId: 12,
    tipo: "Ingreso",
    cantidad: 20,
    fechaHora: "2026-08-15T09:30:00Z",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    motivo: "Recepción de orden de compra OC-0012",
    movimientoVinculadoId: null,
  },
  {
    id: 2,
    numero: "MOV-0002",
    fichaStockId: 2,
    fichaStock: { articuloNombre: "Jeringa 5ml", articuloUnidad: "Unidad", depositoNombre: "Dep. Central" },
    origenId: 1,
    origen: { nombre: "venta" },
    origenEntidadId: 45,
    tipo: "Egreso",
    cantidad: 50,
    fechaHora: "2026-08-15T11:15:00Z",
    usuario_id: 5,
    usuario: { nombre: "María García" },
    motivo: "Venta a cliente #45",
    movimientoVinculadoId: null,
  },
  {
    id: 3,
    numero: "MOV-0003",
    fichaStockId: 5,
    fichaStock: { articuloNombre: "Alimento Premium", articuloUnidad: "Kg", depositoNombre: "Dep. Norte" },
    origenId: 8,
    origen: { nombre: "transferencia_sucursal" },
    origenEntidadId: null,
    tipo: "Ingreso",
    cantidad: 10,
    fechaHora: "2026-08-16T10:00:00Z",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    motivo: "Transferencia desde Dep. Central",
    movimientoVinculadoId: 4,
  },
  {
    id: 4,
    numero: "MOV-0004",
    fichaStockId: 3,
    fichaStock: { articuloNombre: "Alimento Premium", articuloUnidad: "Kg", depositoNombre: "Dep. Central" },
    origenId: 8,
    origen: { nombre: "transferencia_sucursal" },
    origenEntidadId: null,
    tipo: "Egreso",
    cantidad: 10,
    fechaHora: "2026-08-16T10:00:00Z",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    motivo: "Transferencia a Dep. Norte",
    movimientoVinculadoId: 3,
  },
];

// Catálogo `tipo_movimiento` — el dict define el enum ingreso/egreso.
// Transferencia/Ajuste se conservan SOLO como tipo del contrato HTTP actual
// (normalizarTipo de la API); el front ya no los crea: se deriva del ORIGEN
// (ver origenesPorTipo y el POST de stock/page.tsx).
// BACKEND: poblar desde GET /api/tipos-movimiento.
export const tiposMovimiento: { id: number; nombre: TipoMovimiento }[] = [
  { id: 1, nombre: "Ingreso" },
  { id: 2, nombre: "Egreso" },
];

// Catálogo `origen_movimiento` (dict DBA): `origen_id` es NOT NULL, todo
// movimiento lleva un origen. TRANSFERENCIA y AJUSTE MANUAL usan su origen
// propio (transferencia_sucursal / ajuste_manual) — no son "sin documento".
// BACKEND: poblar desde GET /api/origenes-movimiento.
export const origenesMovimiento: { id: number; nombre: string }[] = [
  { id: 1, nombre: "venta" },
  { id: 2, nombre: "receta" },
  { id: 3, nombre: "internacion" },
  { id: 4, nombre: "urgencia" },
  { id: 5, nombre: "cirugia" },
  { id: 6, nombre: "practica" },
  { id: 7, nombre: "recepcion_compra" },
  { id: 8, nombre: "transferencia_sucursal" },
  { id: 9, nombre: "ajuste_manual" },
  { id: 10, nombre: "vacunacion" },
  { id: 11, nombre: "desparasitacion" },
  { id: 12, nombre: "merma" },
];

// Orígenes válidos según el tipo de movimiento (combos inválidos no se ofrecen).
// Los ids referencian `origenesMovimiento`:
// - Ingreso: recepción de compra o ajuste manual que SUMA stock.
// - Egreso: venta, recetas, internación, cirugías, prácticas, vacunación,
//   desparasitación, merma, transferencia y ajuste manual que RESTA.
// - Transferencia/Ajuste: entradas de compatibilidad con el contrato HTTP
//   (el front las resuelve como ORIGEN, no como tipo).
export const origenesPorTipo: Record<TipoMovimiento, number[]> = {
  Ingreso: [7, 9],
  Egreso: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
  Transferencia: [8],
  Ajuste: [9],
};

// Usuarios que aparecen en los movimientos de ejemplo + el usuario logueado.
// BACKEND: poblar desde GET /api/usuarios.
export const USUARIOS: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Ana Martínez" },
  { id: 3, nombre: "Carlos López" },
  { id: 5, nombre: "María García" },
];

// Usuario asignado automáticamente a los movimientos nuevos (usuario logueado).
// BACKEND: reemplazar por el usuario de la sesión
// (GET /api/auth/sesion -> usuario_id).
export const USUARIO_ACTUAL = { id: 1, nombre: "Ana Martínez" };

// Acá vivía `fichasMovimientos`, derivado del array hardcodeado
// `fichasStockIniciales`. Ya no lo usaba nadie: la pantalla de stock arma esa
// lista con las fichas que trae GET /api/fichas-stock, filtrando por artículo
// activo (ver `fichasMov` en src/app/stock/page.tsx).

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

// `proximoNumeroMovimiento` se eliminó (PENDIENTE-FRONT): el `numero` lo
// genera la secuencia del back en POST /api/movimientos-stock. La página /stock
// solo deriva el "siguiente" para la demo del modal (GET /api/movimientos-stock).

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;