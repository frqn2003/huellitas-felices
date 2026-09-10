// Datos placeholder del módulo Stock (HU-STK-02).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

/** Opción de sucursal para los selects. Viene de GET /api/sucursales. */
export type SucursalOpcion = { id: number; nombre: string };

export interface Sucursal {
  id: number;
  nombre: string;
}

// Acá vivían SUCURSALES, depositosIniciales y fichasStockIniciales: tres arrays
// de datos inventados. Los reemplazan GET /api/sucursales (que desde el
// 2026-09-10 lee la tabla), /api/depositos y /api/fichas-stock.
//
// El de SUCURSALES no era inofensivo: decía "Centro" / "Norte" / "Sur" mientras
// la base dice "Sucursal Centro" / "Sucursal Norte" / "Sucursal Sur", y el
// filtro de stock comparaba esos nombres. Elegir una sucursal devolvía la lista
// vacía.


// Refleja la tabla `deposito`: id, sucursal_id, nombre, ubicacion.
// NOTA: la tabla `deposito` NO tiene campo `activo`; los depósitos no se dan de baja lógica.
export interface Deposito {
  id: number;
  sucursalId: number;
  sucursal: string;
  nombre: string;
  ubicacion: string;
}


export type EstadoStock = "normal" | "bajo" | "critico";

// Refleja la tabla `ficha_stock`: id, articulo_id, deposito_id, stock_actual (decimal 12,2),
// stock_minimo (decimal 10,2, obligatorio), stock_critico (decimal 10,2, OPCIONAL).
// `unidadMedida` viene por join con articulo.unidad_medida (no se almacena en la ficha).
// `estadoCalculado` es un valor CALCULADO en el front, no se persiste.
export interface FichaStock {
  id: number;
  articuloId: number;
  depositoId: number;
  /**
   * `sucursalId` es lo que usa el filtro; `sucursal` es solo para mostrar.
   *
   * El filtro comparaba el NOMBRE contra el de un array hardcodeado del front,
   * y como la base dice "Sucursal Centro" y el array decía "Centro", no
   * matcheaba nunca: elegir una sucursal vaciaba la lista. Comparar ids saca
   * los strings de la ecuación.
   */
  deposito: { id: number; nombre: string; sucursalId: number; sucursal: string };
  articulo: { id: number; codigo: string; nombre: string; unidadMedida: string; estado: "activo" | "inactivo" };
  stockActual: number;
  stockMinimo: number;
  stockCritico: number | null;
  estadoCalculado: EstadoStock;
}


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