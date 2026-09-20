import type { Row } from "@/lib/db/schema.types";

/**
 * HU-PROV-04 — Tipos para comprobante_proveedor y su detalle.
 */

/**
 * Los TRES valores del enum `estado_documento` de la base.
 *
 * ⚠️ `pagado` se agregó el 2026-09-09 junto con el trigger
 *    `fn_actualiza_estado_comprobante_por_pago`, que marca el comprobante
 *    apenas su saldo llega a cero. Este módulo no lo contemplaba, y como el
 *    tipo terminaba en `| string` TypeScript no avisó de nada.
 *
 *    El `| string` se fue justamente por eso: volvía inútil la unión.
 */
export type EstadoDocumento = "vigente" | "anulado" | "pagado";

/** Fila real de comprobante_proveedor con JOINs resueltos */
export type ComprobanteRow = Pick<
  // Columnas de `comprobante_proveedor`, derivadas del esquema real.
  Row<"comprobante_proveedor">,
  | "id"
  | "tipo_comprobante_id"
  | "letra"
  | "punto_venta"
  | "numero_comprobante"
  | "fecha_emision"
  | "fecha_vencimiento"
  | "proveedor_id"
  | "orden_compra_id"
  | "comprobante_corregido_id"
  | "anula_comprobante_id"
  | "monto_total"
  | "estado"
  | "usuario_id"
  | "fecha_registro"
> & {
  // Resuelto por los JOIN. Son opcionales porque no todas las consultas del
  // repo los piden: el listado sí, algunas lecturas puntuales no.
  tipo_comprobante_nombre?: string;
  proveedor_razon_social?: string;
  proveedor_cuit?: string;
  orden_compra_cod?: string;
  orden_compra_numero?: string;
  comprobante_corregido_numero?: string | null;
  anula_comprobante_numero?: string | null;
};

/** Fila real de comprobante_proveedor_detalle */
export type ComprobanteDetalleRow = Pick<
  Row<"comprobante_proveedor_detalle">,
  "id" | "comprobante_id" | "articulo_id" | "cantidad" | "precio_facturado"
> & {
  /**
   * La columna es nullable en la base (la completa un trigger), pero el SELECT
   * del repo la trae siempre calculada. Se estrecha a `string`.
   */
  subtotal: string;
  /** Del JOIN con `articulo`. */
  articulo_codigo?: string;
  articulo_nombre?: string;
  articulo_descripcion?: string;
};

/** Fila de la tabla tipo_comprobante */
export type TipoComprobanteRow = Row<"tipo_comprobante">;

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
