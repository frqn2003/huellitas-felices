import type {
  Cotizacion,
  CotizacionDetalle,
  EstadoSolicitud,
  SolicitudCotizacion,
  SolicitudDetalle,
} from "@/data/cotizaciones";
import type {
  CotizacionDetalleRow,
  CotizacionRow,
  SolicitudDetalleRow,
  SolicitudRow,
} from "./cotizacion.types";

/**
 * HU-COMP-02 — filas de Postgres → shape que espera src/data/cotizaciones.ts.
 *
 * Las traducciones son las mismas de siempre: decimal (string del driver) →
 * number, Date → ISO, y la FK `forma_pago_id` → el string `condicion_pago` que
 * el front muestra en la tabla comparativa.
 *
 * La solicitud llega ARMADA con todo adentro (`_articulos_solicitados`,
 * `_cotizaciones`, y dentro de cada una sus `_detalles`) porque la pantalla de
 * comparación necesita las tres cosas a la vez: sin los artículos pedidos no se
 * pueden calcular los totales por proveedor (total = precio × cantidad pedida).
 */

/**
 * Contrato del front + los campos que le faltan declarar
 * (ver docs/backend/PENDIENTE-FRONT.md):
 *
 *  · `cod_sol` — el número de la solicitud (SC-000001), generado por la base.
 *    Reemplaza a `codigoSolicitud(id)`, que lo derivaba del id.
 *  · `forma_pago_id` en cada cotización — para que el select pueda
 *    preseleccionar la condición sin buscar por texto.
 */
export type CotizacionApi = Cotizacion & { forma_pago_id: number };

export type SolicitudCotizacionApi = Omit<SolicitudCotizacion, "_cotizaciones"> & {
  cod_sol: string;
  _cotizaciones: CotizacionApi[];
};

export function toApi(
  row: SolicitudRow,
  detalles: SolicitudDetalleRow[],
  cotizaciones: CotizacionRow[],
  cotizacionDetalles: CotizacionDetalleRow[],
): SolicitudCotizacionApi {
  const detallesPorCotizacion = agrupar(cotizacionDetalles, (d) => d.cotizacion_id);

  return {
    id: row.id,
    cod_sol: row.cod_sol,
    usuario_id: row.usuario_id,
    fecha: row.fecha.toISOString(),
    estado: row.estado as EstadoSolicitud,
    notas: row.notas,
    cotizacion_id_adjudicada: row.cotizacion_id_adjudicada,
    _usuario: {
      id: row.usuario_id,
      nombre: `${row.usuario_nombre} ${row.usuario_apellido}`.trim(),
    },
    _articulos_solicitados: detalles.map(toApiDetalle),
    _cotizaciones: cotizaciones.map((c) =>
      toApiCotizacion(c, detallesPorCotizacion.get(c.id) ?? []),
    ),
  };
}

function toApiDetalle(row: SolicitudDetalleRow): SolicitudDetalle {
  return {
    id: row.id,
    solicitud_id: row.solicitud_id,
    articulo_id: row.articulo_id,
    cantidad_estimada: Number(row.cantidad_estimada),
    nota: row.nota,
  };
}

function toApiCotizacion(
  row: CotizacionRow,
  detalles: CotizacionDetalleRow[],
): CotizacionApi {
  return {
    id: row.id,
    solicitud_id: row.solicitud_id,
    proveedor_id: row.proveedor_id,
    forma_pago_id: row.forma_pago_id,
    condicion_pago: row.forma_pago_nombre,
    fecha_recepcion: row.fecha_recepcion.toISOString(),
    _proveedor: { id: row.proveedor_id, razon_social: row.proveedor_razon_social },
    _detalles: detalles.map(toApiCotizacionDetalle),
  };
}

function toApiCotizacionDetalle(row: CotizacionDetalleRow): CotizacionDetalle {
  return {
    id: row.id,
    cotizacion_id: row.cotizacion_id,
    articulo_id: row.articulo_id,
    precio: Number(row.precio),
  };
}

/**
 * Arma el listado repartiendo detalles y cotizaciones entre sus solicitudes.
 *
 * Recibe todo junto (así lo trae el repo: cuatro consultas para N solicitudes,
 * no cuatro por solicitud) y agrupa en memoria.
 */
export function toApiList(
  rows: SolicitudRow[],
  detalles: SolicitudDetalleRow[],
  cotizaciones: CotizacionRow[],
  cotizacionDetalles: CotizacionDetalleRow[],
): SolicitudCotizacionApi[] {
  const detallesPorSolicitud = agrupar(detalles, (d) => d.solicitud_id);
  const cotizacionesPorSolicitud = agrupar(cotizaciones, (c) => c.solicitud_id);

  return rows.map((row) =>
    toApi(
      row,
      detallesPorSolicitud.get(row.id) ?? [],
      cotizacionesPorSolicitud.get(row.id) ?? [],
      cotizacionDetalles,
    ),
  );
}

function agrupar<T>(items: T[], clave: (item: T) => number): Map<number, T[]> {
  const mapa = new Map<number, T[]>();
  for (const item of items) {
    const k = clave(item);
    const grupo = mapa.get(k);
    if (grupo) grupo.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}
