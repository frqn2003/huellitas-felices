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


// Catálogo `tipo_movimiento` — el dict define el enum ingreso/egreso.
// Transferencia/Ajuste se conservan SOLO como tipo del contrato HTTP actual
// (normalizarTipo de la API); el front ya no los crea: se deriva del ORIGEN
// (ver origenesPorTipo y el POST de stock/page.tsx).
// BACKEND: poblar desde GET /api/tipos-movimiento.
export const tiposMovimiento: { id: number; nombre: TipoMovimiento }[] = [
  { id: 1, nombre: "Ingreso" },
  { id: 2, nombre: "Egreso" },
];

// Orígenes válidos según el tipo de movimiento (los combos inválidos no se
// ofrecen). Se listan por NOMBRE y no por id a propósito.
//
// Antes esto era `Record<TipoMovimiento, number[]>` con ids, apuntando a un
// catálogo `origenesMovimiento` hardcodeado acá mismo cuyos ids estaban
// CORRIDOS respecto de la tabla `origen_movimiento` (front 1 = "venta",
// base 1 = "recepcion_compra"). Como el back usa el `origenId` que manda el
// front tal cual, cada movimiento se guardaba con el origen equivocado.
//
// El catálogo ahora se pide a GET /api/origenes-movimiento. Esta tabla queda
// porque SÍ es una regla de negocio del front (qué ofrecer según el tipo), pero
// referencia nombres: si mañana cambian los ids de la tabla, no se rompe nada.
export const origenesPorTipo: Record<TipoMovimiento, string[]> = {
  // Ingreso: ajuste que SUMA stock (la recepción de compra la genera su módulo).
  Ingreso: ["ajuste"],
  // Egreso: consumo real, transferencia de salida y ajuste que RESTA.
  Egreso: [
    "venta",
    "receta",
    "internacion",
    "urgencia",
    "cirugia",
    "practica",
    "transferencia_sucursal",
    "ajuste",
    "vacunacion",
    "desparasitacion",
    "merma",
  ],
  // Entradas de compatibilidad con el contrato HTTP: el front resuelve la
  // transferencia y el ajuste como ORIGEN, no como tipo.
  Transferencia: ["transferencia_sucursal"],
  Ajuste: ["ajuste"],
};

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