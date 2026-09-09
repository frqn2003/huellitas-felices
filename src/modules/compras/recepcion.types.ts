import type { TipoRecepcion } from "@/data/recepciones";

/**
 * HU-COMP-03 — tipos de la Recepción de Mercadería.
 *
 * ⚠️ ESTE MÓDULO SE REESCRIBIÓ ENTERO (2026-09-08).
 *
 * La versión anterior modelaba `recepcion_mercaderia` + `recepcion_mercaderia_detalle`,
 * dos tablas que **no existen en la base**. El Product Owner pidió lo contrario:
 * *"tratar la recepción como un tipo de movimiento de stock general en un
 * único lugar/tabla"*, y la DBA ya lo implementó así.
 *
 * QUÉ ES UNA RECEPCIÓN AHORA
 *
 *   movimiento_stock_cab con:
 *     tipo              = 'ingreso'
 *     origen_id         = origen_movimiento 'recepcion_compra'
 *     origen_entidad_id = orden_compra.id
 *
 *   y sus `movimiento_stock_det`, uno por artículo recibido.
 *
 * No hay una entidad "recepción" separada: **la recepción ES el movimiento**.
 * Por eso este módulo casi no tiene reglas propias — cuatro triggers de la base
 * hacen el trabajo pesado:
 *
 *   fn_valida_mov_recepcion_compra      valida la cabecera contra la OC
 *   fn_valida_mov_det_recepcion_compra  valida que el artículo esté en la OC
 *   fn_actualizar_stock_det             suma el stock
 *   fn_actualiza_oc_por_recepcion       mueve la OC a recibida_parcial/total
 *   fn_notificar_diferencia_compra      escribe/borra `notificacion_compra`
 *
 * QUÉ SE PERDIÓ EN EL CAMBIO, Y POR QUÉ NO SE PUEDE RECUPERAR ACÁ
 *
 *   `movimiento_stock_det` tiene tres columnas: movimiento, ficha y cantidad.
 *   No hay dónde guardar la observación por línea ("faltante", "2 envases
 *   rotos"). Ver la nota de `RecepcionDetalleRow.observacion` y
 *   `docs/backend/HU-COMP-03.md`.
 */

// ---------------------------------------------------------
// Filtros y listado
// ---------------------------------------------------------

export type FiltrosRecepcion = {
  /** Busca en el número del movimiento, el código de la OC y el proveedor. */
  busqueda?: string;
  proveedorId?: number;
  ordenCompraId?: number;
  tipoRecepcion?: TipoRecepcion;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  porPagina?: number;
};

export type ListadoRecepciones<T> = {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
};

// ---------------------------------------------------------
// Filas
// ---------------------------------------------------------

/**
 * Una recepción = una fila de `movimiento_stock_cab`, con los JOIN resueltos.
 */
export type RecepcionRow = {
  /** `movimiento_stock_cab.id`. */
  id: number;
  /**
   * `MOV-000123`, lo genera `fn_generar_numero_movimiento`.
   *
   * ⚠️ Antes era `REC-0001`. Cambió porque el número ahora lo emite la
   *    secuencia de movimientos de stock, que es lo que la recepción es. Un
   *    correlativo `REC-` propio implicaría una secuencia aparte para numerar
   *    un subconjunto de la misma tabla, y dos movimientos podrían compartir
   *    número según desde qué pantalla se los mire.
   */
  numero: string;
  /** `origen_entidad_id`: la OC contra la que se recibió. */
  orden_compra_id: number;
  orden_cod_ord: string;
  proveedor_id: number;
  proveedor_razon_social: string;
  deposito_id: number;
  deposito_nombre: string;
  /** Sale de `deposito.sucursal_id`: el depósito ya determina la sucursal. */
  sucursal_nombre: string;
  /**
   * DERIVADO, no almacenado (decisión D-1, ahora sin columna donde guardarlo).
   *
   * Responde: *después de esta entrega, ¿quedó alguna línea de la OC sin
   * completar?* Es una etiqueta histórica —"esta fue la entrega que cerró la
   * orden"—, no algo que el usuario elija.
   */
  tipo_recepcion: TipoRecepcion;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  fecha_hora: Date;
  /** `movimiento_stock_cab.motivo`. */
  observacion_general: string | null;
};

/**
 * Una línea = una fila de `movimiento_stock_det`, con el artículo resuelto.
 *
 * Los `numeric(12,2)` llegan como STRING: el driver `pg` no los convierte para
 * no perder precisión. El mapper los pasa a number.
 */
export type RecepcionDetalleRow = {
  id: number;
  /** El id de la cabecera; el front lo conoce como `recepcion_id`. */
  movimiento_id: number;
  /**
   * Resuelto por artículo dentro de la OC.
   *
   * Puede venir NULL si el artículo no está en ninguna línea de la orden. En la
   * práctica no pasa —`fn_valida_mov_det_recepcion_compra` lo rechaza al
   * insertar—, pero podría en datos cargados a mano desde el SQL Editor.
   */
  orden_compra_detalle_id: number | null;
  articulo_id: number;
  articulo_nombre: string;
  /**
   * El PENDIENTE que había justo ANTES de esta entrega (decisión D-4).
   *
   * No es la cantidad total de la OC: en una segunda entrega parcial, lo que la
   * pantalla tiene que mostrar en "Solicitado" es lo que faltaba entonces.
   *
   * Antes era una columna. Ahora se calcula en el SELECT restando, de lo pedido
   * en la línea de la OC, todo lo recibido en movimientos ANTERIORES a este. El
   * resultado es el mismo y no hay una copia que pueda desincronizarse.
   */
  cantidad_solicitada: string;
  /** `movimiento_stock_det.cantidad`. Siempre positiva. */
  cantidad_recibida: string;
};

// ---------------------------------------------------------
// La OC, para validar y para armar el formulario
// ---------------------------------------------------------

export type OrdenParaRecepcionRow = {
  id: number;
  cod_ord: string;
  proveedor_id: number;
  proveedor_razon_social: string;
  /** Quien emitió la OC: es a quien se le notifica la diferencia (D-3). */
  usuario_id: number;
  deposito_id: number | null;
  estado_id: number;
  estado_nombre: string;
  es_final: boolean;
};

/** Cuánto se pidió y cuánto se lleva recibido, por línea de la OC. */
export type LineaPendienteRow = {
  orden_compra_detalle_id: number;
  articulo_id: number;
  articulo_nombre: string;
  cantidad_pedida: string;
  cantidad_recibida_acumulada: string;
};

/** Lo que consume el formulario de alta. */
export type LineaPendienteApi = {
  ordenCompraDetalleId: number;
  articuloId: number;
  articuloNombre: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  cantidadPendiente: number;
};

/** Una línea validada, lista para insertar. */
export type LineaRecepcionInsert = {
  ordenCompraDetalleId: number;
  articuloId: number;
  articuloNombre: string;
  cantidadRecibida: number;
  /** El pendiente al momento, para el mensaje de la diferencia. */
  cantidadSolicitada: number;
};

/**
 * Ficha de stock que no existía y se creó al vuelo (D-2).
 *
 * Nace con `stock_minimo = 0`, así que nunca dispara alerta de reposición: la
 * pantalla avisa que hay que configurar los umbrales.
 */
export type FichaCreada = {
  articuloId: number;
  articuloNombre: string;
  fichaStockId: number;
};

/**
 * Diferencia detectada, tal como la dejó `fn_notificar_diferencia_compra`.
 *
 * Se LEE después de insertar, no se escribe desde acá: el trigger es el único
 * que ve el acumulado completo de la OC en el momento exacto de la entrega.
 */
export type NotificacionGenerada = {
  id: number;
  ordenCompraDetalleId: number;
  usuarioResponsableId: number;
  mensaje: string;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  diferencia: number;
};
