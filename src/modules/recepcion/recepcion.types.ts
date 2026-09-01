export type RecepcionRow = {
    id: number;
    numero: string;
    orden_compra_id: number;
    deposito_id: number;
    tipo_recepcion:  "total" | "parcial";
    usuario_id: number;
    fecha_hora: Date;
    observacion_general: string | null;
}

export type RecepcionDetalleRow = {
    id: number;
    recepcion_id: number;
    orden_compra_detalle_id: number;
    cantidad_solicitada: string;
    cantidad_recibida: string;
    diferencia: string;
    observacion: string | null;
    observacion_detalle: string | null;
}

export type NotificacionCompraRow = {
    id: number;
    recepcion_detalle_id: number;
    usuario_responsable_id: number;
    mensaje: string;
    fecha_hora: Date;
    leida: boolean;
}

export type FiltrosRecepcion = {
    proveedorId?: number;
    ordenCompraId?: number;
    tipoRecepcion?: "total" | "parcial";
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
}

export type LineaRecepcionInput = {
    ordenCompraDetalleId: number;
    cantidadRecibida: string;
    observacion: string | null;
    observacionDetalle: string | null;
}

export type RecepcionInput = {
    ordenId: number;
    depositoId: number;
    observacionGeneral: string | null;
    items: LineaRecepcionInput[];
}