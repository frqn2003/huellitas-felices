import type { Row } from "@/lib/db/schema.types";

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
export type SolicitudRow = Pick<
  Row<"solicitud_cotizacion">,
  "id" | "usuario_id" | "fecha" | "notas"
> & {
  /** Numero del documento (SC-000001), generado por la base. */
  cod_sol: string;
  /** Del JOIN con `usuario`. */
  usuario_nombre: string;
  usuario_apellido: string;
  /**
   * La columna es `varchar` libre en la base; el modulo la estrecha a los tres
   * valores que realmente usa. Es un estrechamiento deliberado, no una copia
   * del esquema.
   */
  estado: "Abierta" | "Adjudicada" | "Cancelada";
};

/** Fila de `solicitud_detalle`. */
export type SolicitudDetalleRow = Pick<
  Row<"solicitud_detalle">,
  "id" | "solicitud_id" | "articulo_id" | "cantidad_estimada" | "nota"
>;

/** Fila de `cotizacion` con proveedor y forma de pago resueltos. */
export type CotizacionRow = Pick<
  Row<"cotizacion">,
  "id" | "solicitud_id" | "proveedor_id" | "forma_pago_id" | "fecha_recepcion"
> & {
  /** Resuelto por los JOIN. */
  proveedor_razon_social: string;
  proveedor_estado: "activo" | "inactivo";
  forma_pago_nombre: string;
};

/** Fila de `cotizacion_detalle`. */
export type CotizacionDetalleRow = Pick<
  Row<"cotizacion_detalle">,
  "id" | "cotizacion_id" | "articulo_id" | "precio"
>;

/** Filtros del listado. Salen de FiltrosCotizaciones.tsx y del buscador. */
export type FiltrosSolicitud = {
  /** Busca por código (SC-XXXX), por id y por nombre de artículo pedido. */
  busqueda?: string;
  estado?: "Abierta" | "Adjudicada" | "Cancelada";
  ordenFecha?: "recientes" | "antiguas";
};
