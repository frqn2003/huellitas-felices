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
  condicion_pago: string;
  fecha_recepcion: string;
  _proveedor: { id: number; razon_social: string };
  _detalles: CotizacionDetalle[];
}

export interface SolicitudCotizacion {
  id: number;
  usuario_id: number;
  fecha: string;
  estado: EstadoSolicitud;
  notas: string | null;
  /** FK a cotizacion.id elegida en la comparación (null hasta adjudicar). */
  cotizacion_id_adjudicada: number | null;
  _usuario: { id: number; nombre: string };
  _articulos_solicitados: SolicitudDetalle[];
  _cotizaciones: Cotizacion[];
}

export function codigoSolicitud(id: number): string {
  return `SC-${String(id).padStart(4, "0")}`;
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

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// BACKEND: reemplazar por GET /api/solicitudes-cotizacion (con cotizaciones y
// detalles resueltos por JOIN, como estos objetos).
export const solicitudesIniciales: SolicitudCotizacion[] = [
  {
    id: 1,
    usuario_id: 3,
    fecha: "2025-06-16T09:30:00Z",
    estado: "Abierta",
    notas: "Reponer antibióticos e insumos críticos del depósito Central.",
    cotizacion_id_adjudicada: null,
    _usuario: { id: 3, nombre: "Ana Martínez" },
    _articulos_solicitados: [
      {
        id: 1,
        solicitud_id: 1,
        articulo_id: 1,
        cantidad_estimada: 50,
        nota: "Presentación en cajas de 20 unidades.",
      },
      { id: 2, solicitud_id: 1, articulo_id: 2, cantidad_estimada: 100, nota: null },
      { id: 3, solicitud_id: 1, articulo_id: 5, cantidad_estimada: 200, nota: null },
    ],
    _cotizaciones: [
      {
        id: 1,
        solicitud_id: 1,
        proveedor_id: 5,
        condicion_pago: "Contado",
        fecha_recepcion: "2025-06-17T11:00:00Z",
        _proveedor: { id: 5, razon_social: "Laboratorios Pharma S.A." },
        _detalles: [
          { id: 1, cotizacion_id: 1, articulo_id: 1, precio: 850 },
          { id: 2, cotizacion_id: 1, articulo_id: 2, precio: 45 },
          { id: 3, cotizacion_id: 1, articulo_id: 5, precio: 60 },
        ],
      },
      {
        id: 2,
        solicitud_id: 1,
        proveedor_id: 8,
        condicion_pago: "Cta. cte. 30 días",
        fecha_recepcion: "2025-06-17T16:20:00Z",
        _proveedor: { id: 8, razon_social: "Vetmed Labs" },
        _detalles: [
          { id: 4, cotizacion_id: 2, articulo_id: 1, precio: 890 },
          { id: 5, cotizacion_id: 2, articulo_id: 2, precio: 44 },
          { id: 6, cotizacion_id: 2, articulo_id: 5, precio: 58 },
        ],
      },
      {
        id: 4,
        solicitud_id: 1,
        proveedor_id: 12,
        condicion_pago: "Cta. cte. 60 días",
        fecha_recepcion: "2025-06-18T10:05:00Z",
        _proveedor: { id: 12, razon_social: "Distribuidora Mascotas Felices" },
        _detalles: [
          { id: 10, cotizacion_id: 4, articulo_id: 1, precio: 875 },
          { id: 11, cotizacion_id: 4, articulo_id: 2, precio: 47 },
          { id: 12, cotizacion_id: 4, articulo_id: 5, precio: 55 },
        ],
      },
    ],
  },
  {
    id: 2,
    usuario_id: 3,
    fecha: "2025-06-18T14:00:00Z",
    estado: "Abierta",
    notas: null,
    cotizacion_id_adjudicada: null,
    _usuario: { id: 3, nombre: "Ana Martínez" },
    _articulos_solicitados: [
      { id: 4, solicitud_id: 2, articulo_id: 7, cantidad_estimada: 10, nota: null },
    ],
    _cotizaciones: [
      {
        id: 5,
        solicitud_id: 2,
        proveedor_id: 8,
        condicion_pago: "Contado",
        fecha_recepcion: "2025-06-19T09:40:00Z",
        _proveedor: { id: 8, razon_social: "Vetmed Labs" },
        _detalles: [{ id: 13, cotizacion_id: 5, articulo_id: 7, precio: 3200 }],
      },
    ],
  },
  {
    id: 3,
    // Adjudicada a Distribuidora Mascotas Felices: generó la OC-0002
    // (orden_compra.cotizacion_id = 3).
    usuario_id: 1,
    fecha: "2025-06-12T08:15:00Z",
    estado: "Adjudicada",
    notas: "Alimento para caniles de tránsito.",
    cotizacion_id_adjudicada: 3,
    _usuario: { id: 1, nombre: "Carlos García" },
    _articulos_solicitados: [
      { id: 5, solicitud_id: 3, articulo_id: 3, cantidad_estimada: 25, nota: null },
    ],
    _cotizaciones: [
      {
        id: 3,
        solicitud_id: 3,
        proveedor_id: 12,
        condicion_pago: "Cta. cte. 30 días",
        fecha_recepcion: "2025-06-13T10:30:00Z",
        _proveedor: { id: 12, razon_social: "Distribuidora Mascotas Felices" },
        _detalles: [{ id: 7, cotizacion_id: 3, articulo_id: 3, precio: 5140 }],
      },
      {
        id: 6,
        solicitud_id: 3,
        proveedor_id: 15,
        condicion_pago: "Contado",
        fecha_recepcion: "2025-06-13T15:45:00Z",
        _proveedor: { id: 15, razon_social: "Agroalimentos del Sur" },
        _detalles: [{ id: 8, cotizacion_id: 6, articulo_id: 3, precio: 5290 }],
      },
    ],
  },
  {
    // Abierta sin cotizaciones registradas todavía.
    id: 4,
    usuario_id: 3,
    fecha: "2025-06-19T08:00:00Z",
    estado: "Abierta",
    notas: "Sugerido por bajo stock de guantes; falta definir cantidades.",
    cotizacion_id_adjudicada: null,
    _usuario: { id: 3, nombre: "Ana Martínez" },
    _articulos_solicitados: [
      { id: 6, solicitud_id: 4, articulo_id: 5, cantidad_estimada: 150, nota: null },
    ],
    _cotizaciones: [],
  },
];
