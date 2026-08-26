/**
 * HU-COMP-02 — tipos del módulo Compras (lado cotizaciones).
 *
 * Cubren la parte del criterio que dice: "antes de adjudicar, permite registrar
 * y comparar cotizaciones de más de un proveedor para los mismos artículos
 * (precio y condiciones), como parte del proceso de selección".
 *
 * El shape público lo define el front en src/data/cotizaciones.ts y lo produce
 * el mapper. Igual que en órdenes, este módulo usa snake_case porque así está
 * escrito el contrato del front.
 */

/** Fila de `solicitud_cotizacion` con el usuario resuelto por JOIN. */
export type SolicitudRow = {
  id: number;
  /** Numero del documento (SC-000001), generado por la base. */
  cod_sol: string;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  fecha: Date;
  estado: "Abierta" | "Adjudicada" | "Cancelada";
  notas: string | null;
  cotizacion_id_adjudicada: number | null;
};

/** Fila de `solicitud_detalle`. */
export type SolicitudDetalleRow = {
  id: number;
  solicitud_id: number;
  articulo_id: number;
  cantidad_estimada: string;
  nota: string | null;
};

/** Fila de `cotizacion` con proveedor y forma de pago resueltos. */
export type CotizacionRow = {
  id: number;
  solicitud_id: number;
  proveedor_id: number;
  proveedor_razon_social: string;
  proveedor_estado: "activo" | "inactivo";
  forma_pago_id: number;
  forma_pago_nombre: string;
  fecha_recepcion: Date;
};

/** Fila de `cotizacion_detalle`. */
export type CotizacionDetalleRow = {
  id: number;
  cotizacion_id: number;
  articulo_id: number;
  precio: string;
};

/** Filtros del listado. Salen de FiltrosCotizaciones.tsx y del buscador. */
export type FiltrosSolicitud = {
  /** Busca por código (SC-XXXX), por id y por nombre de artículo pedido. */
  busqueda?: string;
  estado?: "Abierta" | "Adjudicada" | "Cancelada";
  ordenFecha?: "recientes" | "antiguas";
};
