// Datos placeholder del módulo Stock (HU-STK-02).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

/** Opción de sucursal para los selects. Viene de GET /api/sucursales. */
export type SucursalOpcion = { id: number; nombre: string };

export interface Sucursal {
  id: number;
  nombre: string;
}

// BACKEND: poblar desde GET /api/sucursales (catálogo externo a este módulo).
export const SUCURSALES: Sucursal[] = [
  { id: 1, nombre: "Centro" },
  { id: 2, nombre: "Norte" },
  { id: 3, nombre: "Sur" },
];

// Refleja la tabla `deposito`: id, sucursal_id, nombre, ubicacion.
// NOTA: la tabla `deposito` NO tiene campo `activo`; los depósitos no se dan de baja lógica.
export interface Deposito {
  id: number;
  sucursalId: number;
  sucursal: string;
  nombre: string;
  ubicacion: string;
}

// BACKEND: reemplazar por la respuesta de GET /api/depositos (join con sucursales).
export const depositosIniciales: Deposito[] = [
  { id: 1, sucursalId: 1, sucursal: "Centro", nombre: "Dep. Central", ubicacion: "Av. Principal 123" },
  { id: 2, sucursalId: 2, sucursal: "Norte", nombre: "Dep. Norte", ubicacion: "Calle Norte 456" },
  { id: 3, sucursalId: 3, sucursal: "Sur", nombre: "Dep. Sur", ubicacion: "Av. Sur 789" },
  { id: 4, sucursalId: 1, sucursal: "Centro", nombre: "Dep. Auxiliar", ubicacion: "Av. Principal 123 - Subsuelo" },
  { id: 5, sucursalId: 3, sucursal: "Sur", nombre: "Dep. Vacunas", ubicacion: "Av. Sur 789 - Ala este" },
];

export type EstadoStock = "normal" | "bajo" | "critico";

// Refleja la tabla `ficha_stock`: id, articulo_id, deposito_id, stock_actual (decimal 12,2),
// stock_minimo (decimal 10,2, obligatorio), stock_critico (decimal 10,2, OPCIONAL).
// `unidadMedida` viene por join con articulo.unidad_medida (no se almacena en la ficha).
// `estadoCalculado` es un valor CALCULADO en el front, no se persiste.
export interface FichaStock {
  id: number;
  articuloId: number;
  depositoId: number;
  deposito: { id: number; nombre: string; sucursal: string };
  articulo: { id: number; codigo: string; nombre: string; unidadMedida: string; estado: "activo" | "inactivo" };
  stockActual: number;
  stockMinimo: number;
  stockCritico: number | null;
  estadoCalculado: EstadoStock;
}

// BACKEND: reemplazar por la respuesta de GET /api/fichas-stock (joins con deposito y articulo).
// El campo `estadoCalculado` NO viene de la API: se calcula con calcularEstadoStock().
export const fichasStockIniciales: FichaStock[] = [
  {
    id: 1,
    articuloId: 1,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 1, codigo: "ART001", nombre: "Amoxicilina 500mg", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 45,
    stockMinimo: 20,
    stockCritico: 5,
    estadoCalculado: "normal",
  },
  {
    id: 2,
    articuloId: 2,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 2, codigo: "ART002", nombre: "Jeringa 5ml", unidadMedida: "Unidad", estado: "inactivo" },
    stockActual: 12,
    stockMinimo: 30,
    stockCritico: 10,
    estadoCalculado: "bajo",
  },
  {
    id: 3,
    articuloId: 3,
    depositoId: 2,
    deposito: { id: 2, nombre: "Dep. Norte", sucursal: "Norte" },
    articulo: { id: 3, codigo: "ART003", nombre: "Alimento Premium para Perros", unidadMedida: "Kg", estado: "activo" },
    stockActual: 8,
    stockMinimo: 15,
    stockCritico: 5,
    // Corrección al wireframe: 8 > crítico (5) pero 8 < mínimo (15) => "bajo", no "critico".
    estadoCalculado: "bajo",
  },
  {
    id: 4,
    articuloId: 1,
    depositoId: 2,
    deposito: { id: 2, nombre: "Dep. Norte", sucursal: "Norte" },
    articulo: { id: 1, codigo: "ART001", nombre: "Amoxicilina 500mg", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 25,
    stockMinimo: 20,
    stockCritico: 5,
    estadoCalculado: "normal",
  },
  {
    id: 5,
    articuloId: 4,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 4, codigo: "ART004", nombre: "Ivermectina 1%", unidadMedida: "mL", estado: "activo" },
    stockActual: 3,
    stockMinimo: 10,
    stockCritico: 5,
    estadoCalculado: "critico",
  },
  {
    id: 6,
    articuloId: 5,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 5, codigo: "ART005", nombre: "Guantes de látex talla M", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 40,
    stockMinimo: 15,
    stockCritico: 5,
    estadoCalculado: "normal",
  },
  {
    id: 7,
    articuloId: 6,
    depositoId: 2,
    deposito: { id: 2, nombre: "Dep. Norte", sucursal: "Norte" },
    articulo: { id: 6, codigo: "ART006", nombre: "Comida Húmeda para Gatos", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 60,
    stockMinimo: 20,
    stockCritico: 8,
    estadoCalculado: "normal",
  },
  {
    id: 8,
    articuloId: 7,
    depositoId: 3,
    deposito: { id: 3, nombre: "Dep. Sur", sucursal: "Sur" },
    articulo: { id: 7, codigo: "ART007", nombre: "Vitamina B12", unidadMedida: "mL", estado: "activo" },
    stockActual: 25,
    stockMinimo: 20,
    stockCritico: 10,
    estadoCalculado: "normal",
  },
  {
    id: 9,
    articuloId: 8,
    depositoId: 3,
    deposito: { id: 3, nombre: "Dep. Sur", sucursal: "Sur" },
    articulo: { id: 8, codigo: "ART008", nombre: "Algodón quirúrgico", unidadMedida: "Kg", estado: "activo" },
    stockActual: 4,
    stockMinimo: 12,
    stockCritico: 6,
    estadoCalculado: "critico",
  },
  {
    id: 10,
    articuloId: 10,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 10, codigo: "ART010", nombre: "Pipeta antipulgas 40kg", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 9,
    stockMinimo: 12,
    stockCritico: 3,
    estadoCalculado: "bajo",
  },
  {
    id: 11,
    articuloId: 11,
    depositoId: 2,
    deposito: { id: 2, nombre: "Dep. Norte", sucursal: "Norte" },
    articulo: { id: 11, codigo: "ART011", nombre: "Snack hipoalergénico", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 18,
    stockMinimo: 20,
    stockCritico: 10,
    estadoCalculado: "bajo",
  },
  {
    id: 12,
    articuloId: 12,
    depositoId: 3,
    deposito: { id: 3, nombre: "Dep. Sur", sucursal: "Sur" },
    articulo: { id: 12, codigo: "ART012", nombre: "Gasas estériles 10x10", unidadMedida: "Unidad", estado: "activo" },
    stockActual: 30,
    stockMinimo: 10,
    stockCritico: 4,
    estadoCalculado: "normal",
  },
  {
    id: 13,
    articuloId: 3,
    depositoId: 3,
    deposito: { id: 3, nombre: "Dep. Sur", sucursal: "Sur" },
    articulo: { id: 3, codigo: "ART003", nombre: "Alimento Premium para Perros", unidadMedida: "Kg", estado: "activo" },
    stockActual: 100,
    stockMinimo: 30,
    stockCritico: 10,
    estadoCalculado: "normal",
  },
];

// Regla de cálculo del estado visual (no se persiste):
// - critico: hay stock_critico definido y stock_actual <= stock_critico.
// - bajo: stock_actual < stock_minimo (incluye fichas sin stock_critico).
// - normal: el resto.
export function calcularEstadoStock(ficha: {
  stockActual: number;
  stockMinimo: number;
  stockCritico: number | null;
}): EstadoStock {
  if (ficha.stockCritico !== null && ficha.stockActual <= ficha.stockCritico) {
    return "critico";
  }
  if (ficha.stockActual < ficha.stockMinimo) {
    return "bajo";
  }
  return "normal";
}

// Ejemplo de par de movimientos generados por una transferencia, reflejando `movimiento_stock_cab`
// (id, ficha_stock_id, origen_id -> catálogo origen_movimiento, origen_entidad_id, tipo,
// cantidad, fecha_hora, empleado_id, motivo, movimiento_vinculado_id).
// BACKEND: al confirmar una transferencia, el back genera este par vía POST /api/transferencias
// y lo registra en la bitácora de auditoría. Se deja como referencia para el equipo de back.
export interface MovimientoTransferencia {
  id: number;
  fichaStockId: number;
  origenId: number;
  origenEntidadId: number;
  tipo: "egreso" | "ingreso";
  cantidad: number;
  fechaHora: string;
  empleadoId: number;
  motivo: string;
  movimientoVinculadoId: number;
}

export const movimientosTransferencia: MovimientoTransferencia[] = [
  {
    id: 101,
    fichaStockId: 1,
    origenId: 2,
    origenEntidadId: 55,
    tipo: "egreso",
    cantidad: 10,
    fechaHora: "2025-08-10T09:15:00Z",
    empleadoId: 7,
    motivo: "Transferencia a Dep. Norte",
    movimientoVinculadoId: 102,
  },
  {
    id: 102,
    fichaStockId: 3,
    origenId: 2,
    origenEntidadId: 55,
    tipo: "ingreso",
    cantidad: 10,
    fechaHora: "2025-08-10T09:15:00Z",
    empleadoId: 7,
    motivo: "Transferencia desde Dep. Central",
    movimientoVinculadoId: 101,
  },
];

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;