/**
 * HU-PROV-04 — Tipos para comprobante_proveedor y su detalle.
 */

export type EstadoDocumento = "vigente" | "anulado" | string;

/** Fila real de comprobante_proveedor con JOINs resueltos */
export type ComprobanteRow = {
  id: number;
  tipo_comprobante_id: number;
  tipo_comprobante_nombre?: string;
  letra: string;
  punto_venta: string;
  numero_comprobante: string;
  fecha_emision: string | Date;
  fecha_vencimiento: string | Date;
  proveedor_id: number;
  proveedor_razon_social?: string;
  proveedor_cuit?: string;
  orden_compra_id: number;
  orden_compra_cod?: string;
  orden_compra_numero?: string;
  comprobante_corregido_id: number | null;
  comprobante_corregido_numero?: string | null;
  anula_comprobante_id: number | null;
  anula_comprobante_numero?: string | null;
  monto_total: string;
  estado: EstadoDocumento;
  usuario_id: number;
  fecha_registro: string | Date;
};

/** Fila real de comprobante_proveedor_detalle */
export type ComprobanteDetalleRow = {
  id: number;
  comprobante_id: number;
  articulo_id: number;
  articulo_codigo?: string;
  articulo_nombre?: string;
  articulo_descripcion?: string;
  cantidad: string;
  precio_facturado: string;
  subtotal: string;
};

/** Fila de la tabla tipo_comprobante */
export type TipoComprobanteRow = {
  id: number;
  nombre: string;
  afecta_saldo: number;
  prefijo: string;
};

/** Filtros para las consultas de historial */
export type FiltrosComprobante = {
  busqueda?: string;
  proveedorId?: number;
  tipoComprobanteId?: number;
  ordenCompraId?: number;
  ocId?: number;
  desde?: string;
  hasta?: string;
  estado?: string;
};

/** Datos para insertar la cabecera */
export type CabeceraComprobanteInput = {
  proveedorId: number;
  tipoComprobanteId: number;
  letra: string;
  puntoVenta: string;
  numeroComprobante: string;
  fechaEmision: string;
  fechaVencimiento: string;
  ordenCompraId: number;
  comprobanteCorregidoId?: number | null;
  anulaComprobanteId?: number | null;
  montoTotal: number;
  usuarioId?: number;
};

/** Alias de compatibilidad */
export type InsertCabeceraInput = CabeceraComprobanteInput;

/** Datos para insertar una línea de detalle */
export type LineaComprobanteInput = {
  comprobanteId?: number;
  articuloId: number;
  cantidad: number;
  precioFacturado: number;
  subtotal: number;
};

/** Alias de compatibilidad */
export type InsertLineaInput = LineaComprobanteInput;
