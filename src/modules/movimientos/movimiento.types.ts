import type { TipoMovimiento } from "@/data/movimientos";

/** Fila resultante del SELECT con JOINs a artículo, depósito, origen y usuario. */
export type MovimientoStockRow = {
    id: number;
    numero: string | null;
    ficha_stock_id: number;
    articulo_id: number;
    articulo_nombre: string;
    articulo_unidad: string;
    deposito_id: number;
    deposito_nombre: string;
    origen_id: number | null;
    origen_nombre: string | null;
    origen_entidad_id: number | null;
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
