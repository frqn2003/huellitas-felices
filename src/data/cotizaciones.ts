// Datos hardcodeados de Solicitudes de Cotización (HU-COMP-02).
// La estructura replica las tablas `solicitud_cotizacion`, `cotizacion` y sus
// detalles; los campos `_usuario`, `_proveedor`, `_articulos_solicitados` y
// `_detalles` son la información relacionada que el back obtiene con JOINs.

// Estados del ciclo de vida: Abierta (esperando cotizaciones) →
// Adjudicada | Cancelada.
export type EstadoSolicitud = "Abierta" | "Adjudicada" | "Cancelada";

export interface SolicitudDetalle {
  id: number;
  solicitud_id: number;
  articulo_id: number;
  cantidad_estimada: number;
  /** Aclaración opcional para el proveedor sobre este artículo. */
  nota: string | null;
}

export interface CotizacionDetalle {
  id: number;
  cotizacion_id: number;
  articulo_id: number;
  precio: number;
}

export interface Cotizacion {
  id: number;
  solicitud_id: number;
  proveedor_id: number;
  /** PK de la condición de pago: preselecciona el select. */
  forma_pago_id: number;
  condicion_pago: string;
  fecha_recepcion: string;
  _proveedor: { id: number; razon_social: string };
  _detalles: CotizacionDetalle[];
}

export interface SolicitudCotizacion {
  id: number;
  /** "SC-000001". Lo genera la secuencia de la base. */
  cod_sol: string;
  usuario_id: number;
  fecha: string;
  estado: EstadoSolicitud;
  notas: string | null;
  _usuario: { id: number; nombre: string };
  _articulos_solicitados: SolicitudDetalle[];
  _cotizaciones: Cotizacion[];
}

// Total de una cotización: precio de cada artículo × cantidad estimada pedida.
export function totalCotizacion(
  cotizacion: Cotizacion,
  solicitud: Pick<SolicitudCotizacion, "_articulos_solicitados">,
): number {
  return Math.round(
    cotizacion._detalles.reduce((acc, d) => {
      const item = solicitud._articulos_solicitados.find(
        (a) => a.articulo_id === d.articulo_id,
      );
      return acc + d.precio * (item?.cantidad_estimada ?? 0);
    }, 0) * 100,
  ) / 100;
}

// Cotización más conveniente por total (empate: la primera recibida).
export function mejorCotizacion(solicitud: SolicitudCotizacion): Cotizacion | null {
  if (solicitud._cotizaciones.length === 0) return null;
  return solicitud._cotizaciones.reduce((mejor, actual) =>
    totalCotizacion(actual, solicitud) < totalCotizacion(mejor, solicitud) ? actual : mejor,
  );
}

/**
 * Catálogos que necesitan los formularios de cotización.
 *
 * `fichas` alimenta el resaltado de bajo stock del selector de artículos:
 * viene de GET /api/fichas-stock, no de un mock.
 */
export interface CatalogosCotizacion {
  articulos: { id: number; codigo: string; nombre: string; unidadMedida: string }[];
  proveedores: { id: number; nombre: string }[];
  fichas: { articuloId: number; stockActual: number; estadoCalculado: string }[];
}
