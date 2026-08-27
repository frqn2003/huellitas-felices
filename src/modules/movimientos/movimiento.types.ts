import type { TipoMovimiento } from "@/data/movimientos";

/**
 * Fila de la vista `v_movimiento_stock`, que aplana cabecera + detalle.
 *
 * ⚠️ `id` es el id del DETALLE, no del movimiento. El movimiento (la cabecera)
 *    es `movimiento_id`: es lo que agrupa las N líneas de una misma operación.
 */
export type MovimientoStockRow = {
    /** id del DETALLE (una línea = un artículo). */
    id: number;
    /** id de la CABECERA. Las líneas de un mismo movimiento lo comparten. */
    movimiento_id: number;
    /** MOV-000001, generado por el trigger `trg_generar_numero_movimiento`. */
    numero: string;
    ficha_stock_id: number;
    articulo_id: number;
    articulo_nombre: string;
    articulo_unidad: string;
    deposito_id: number;
    deposito_nombre: string;
    origen_id: number;
    origen_nombre: string;
    origen_entidad_id: number | null;
    /** El enum de la base solo tiene 'ingreso' | 'egreso'. */
    tipo: string;
    cantidad: number | string;
    fecha_hora: Date;
    usuario_id: number;
    usuario_nombre: string;
    usuario_apellido: string;
    motivo: string | null;
    movimiento_vinculado_id: number | null;
    created_at: Date;
};

export type FiltrosMovimiento = {
    busqueda?: string;
    tipo?: TipoMovimiento;
    depositoId?: number;
    articuloId?: number;
    desde?: string;
    hasta?: string;
};

export type FichaStockRow = {
    id: number;
    articulo_id: number;
    articulo_nombre: string;
    deposito_id: number;
    deposito_nombre: string;
    stock_actual: number | string;
    stock_minimo: number | string;
    stock_critico: number | string | null;
};

export type AlertaStock = {
    articuloId: number;
    articuloNombre: string;
    depositoId: number;
    depositoNombre: string;
    stockActual: number;
    stockMinimo: number;
    stockCritico: number | null;
    nivel: "bajo" | "critico";
};

/** Datos de la cabecera de un movimiento. */
export type CabeceraInput = {
    depositoId: number;
    tipo: "ingreso" | "egreso";
    origenId: number;
    origenEntidadId: number | null;
    usuarioId: number;
    motivo?: string | null;
    fechaHora?: string;
    movimientoVinculadoId?: number | null;
};
