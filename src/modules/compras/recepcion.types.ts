/**
 * HU-COMP-03 — tipos del módulo Compras (lado recepciones).
 *
 * Dos mundos separados, como en el resto del proyecto:
 *  · *Row  → lo que devuelve Postgres (snake_case, decimales como string)
 *  · el shape público lo define el FRONT en src/data/recepciones.ts y lo produce
 *    el mapper. No se redefine acá para que no se desincronicen.
 *
 * OJO con el naming del front en este módulo: `src/data/recepciones.ts` MEZCLA
 * los dos estilos —`orden_compra_id`, `tipo_recepcion`, `_detalles` en snake y
 * `articuloNombre`, `cantidadRecibida` en camel—. Es feo, pero es el contrato
 * que ya existe y el mapper lo respeta tal cual (GUIA-IMPLEMENTACION §7:
 * unificarlo es trabajo del front).
 */

import type { ObservacionRecepcion, TipoRecepcion } from "@/data/recepciones";

// ---------------------------------------------------------
// Filas de la base
// ---------------------------------------------------------

/**
 * Fila de `recepcion_mercaderia` con los JOIN ya resueltos.
 *
 * Se traen por JOIN y no con una consulta por recepción porque el front espera
 * `ordenCompra`, `deposito` y `usuario` ya armados.
 */
export type RecepcionRow = {
  id: number;
  /** REC-000001, lo genera `trg_generar_numero_recepcion`. */
  numero: string;
  orden_compra_id: number;
  orden_cod_ord: string;
  proveedor_id: number;
  proveedor_razon_social: string;
  deposito_id: number;
  deposito_nombre: string;
  /** DERIVADO por el backend (D-1): es una etiqueta histórica, no un input. */
  tipo_recepcion: TipoRecepcion;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  fecha_hora: Date;
  observacion_general: string | null;
};

/**
 * Fila de `recepcion_mercaderia_detalle` con el artículo resuelto.
 *
 * Los numeric(12,2) llegan como STRING: el driver `pg` no los convierte para no
 * perder precisión. El mapper los pasa a number.
 */
export type RecepcionDetalleRow = {
  id: number;
  recepcion_id: number;
  orden_compra_detalle_id: number;
  articulo_id: number;
  articulo_nombre: string;
  /** PENDIENTE AL MOMENTO de la entrega, no el total de la OC (D-4). */
  cantidad_solicitada: string;
  cantidad_recibida: string;
  /** Columna generada: cantidad_solicitada - cantidad_recibida. */
  diferencia: string;
  observacion: ObservacionRecepcion | null;
  observacion_detalle: string | null;
};

/**
 * La OC bloqueada con `FOR UPDATE`, con lo justo que el service necesita para
 * decidir: si admite recepciones, a quién notificar y cómo nombrarla.
 */
export type OrdenParaRecepcionRow = {
  id: number;
  cod_ord: string;
  proveedor_id: number;
  proveedor_razon_social: string;
  /** Quien EMITIÓ la orden. Es a quien se le notifican las diferencias (D-3). */
  usuario_id: number;
  deposito_id: number | null;
  estado_id: number;
  estado_nombre: string;
  es_final: boolean;
};

/**
 * Una línea de la OC con su acumulado de recepciones previas.
 *
 * Sale de UNA consulta con LEFT JOIN + GROUP BY para todas las líneas de la
 * orden, no de un loop por línea (eso sería un N+1).
 */
export type LineaPendienteRow = {
  orden_compra_detalle_id: number;
  articulo_id: number;
  articulo_nombre: string;
  cantidad_pedida: string;
  /** Suma de lo recibido en TODAS las recepciones anteriores de esta orden. */
  cantidad_recibida_acumulada: string;
};

export type NotificacionCompraRow = {
  id: number;
  recepcion_detalle_id: number;
  usuario_responsable_id: number;
  mensaje: string;
  fecha_hora: Date;
  leida: boolean;
};

// ---------------------------------------------------------
// Filtros y entradas ya validadas
// ---------------------------------------------------------

/**
 * Filtros del listado. Salen de FiltrosRecepciones.tsx.
 *
 * `pagina` / `porPagina` no son un filtro del front: los agrega el back porque
 * el historial de recepciones crece sin techo y no se manda entero al navegador
 * para filtrarlo ahí.
 */
export type FiltrosRecepcion = {
  /** Busca en el número de recepción y en la razón social del proveedor. */
  busqueda?: string;
  proveedorId?: number;
  ordenCompraId?: number;
  tipoRecepcion?: TipoRecepcion;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  porPagina?: number;
};

/** Datos para insertar la cabecera (ya validados). */
export type CabeceraRecepcionInput = {
  ordenCompraId: number;
  depositoId: number;
  tipoRecepcion: TipoRecepcion;
  usuarioId: number;
  observacionGeneral: string | null;
};

/**
 * Una línea lista para insertar.
 *
 * `cantidadSolicitada` NO viene del body: la calculó el service a partir del
 * pendiente real, con la OC bloqueada (D-4).
 */
export type LineaRecepcionInsert = {
  ordenCompraDetalleId: number;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  observacion: ObservacionRecepcion | null;
  observacionDetalle: string | null;
};

// ---------------------------------------------------------
// Respuesta del POST
// ---------------------------------------------------------

/**
 * Ficha de stock creada al vuelo por la recepción (D-2).
 *
 * Nace con `stock_minimo = 0`, así que NUNCA dispara alerta de reposición. Por
 * eso se devuelve: la pantalla avisa "se crearon N fichas nuevas, configurá sus
 * umbrales" con link a HU-STK-02. Sin ese aviso quedan artículos silenciosamente
 * fuera del control de stock mínimo.
 */
export type FichaCreada = {
  articuloId: number;
  articuloNombre: string;
  depositoId: number;
};

/** Lo que alimenta el toast de alerta del front. */
export type NotificacionGenerada = {
  usuarioResponsableId: number;
  mensaje: string;
};

/** Línea del formulario de alta: qué falta recibir de cada línea de la OC. */
export type LineaPendienteApi = {
  ordenCompraDetalleId: number;
  articuloId: number;
  articuloNombre: string;
  cantidadPedida: number;
  cantidadRecibidaAcumulada: number;
  cantidadPendiente: number;
};

/** Página del listado. */
export type ListadoRecepciones<T> = {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
};
