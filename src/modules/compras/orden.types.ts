/**
 * HU-COMP-02 — tipos del módulo Compras (lado órdenes).
 *
 * Igual que en los otros módulos, dos mundos separados:
 *  · *Row  → lo que devuelve Postgres (snake_case, decimales como string)
 *  · el shape público lo define el FRONT en src/data/ordenes-compra.ts y lo
 *    produce el mapper. No se redefine acá para que no se desincronicen.
 *
 * OJO con el naming: este módulo es el único del proyecto donde el front usa
 * snake_case (`proveedor_id`, `_detalles`). No es un descuido del back: es el
 * contrato que ya existe. Ver GUIA-IMPLEMENTACION §7.
 */

/** Fila de `orden_compra` con los JOIN ya resueltos. */
export type OrdenRow = {
  id: number;
  cod_ord: string;
  proveedor_id: number;
  proveedor_razon_social: string;
  proveedor_estado: "activo" | "inactivo";
  cotizacion_id: number | null;
  usuario_id: number;
  usuario_nombre: string;
  usuario_apellido: string;
  fecha: Date;
  fecha_entrega: Date | null;
  deposito_id: number | null;
  deposito_ubicacion: string | null;
  forma_pago_id: number;
  forma_pago_nombre: string;
  notas: string | null;
  // decimal(12,2) → el driver `pg` los entrega como string para no perder
  // precisión. El mapper los pasa a number; acá quedan como vienen.
  subtotal: string | null;
  descuento: string | null;
  gastos_envio: string | null;
  total: string;
  estado_id: number;
  estado_nombre: string;
  es_final: boolean;
};

/** Fila de `orden_compra_detalle`. */
export type OrdenDetalleRow = {
  id: number;
  orden_compra_id: number;
  articulo_id: number;
  cantidad: string;
  precio_acordado: string;
};

/** Fila de `estado_orden_compra`. */
export type EstadoOrdenRow = {
  id: number;
  nombre: string;
  es_final: boolean;
};

/**
 * Filtros del listado. Salen de FiltrosOrdenes.tsx y del buscador de
 * src/app/ordenes-compra/page.tsx:176.
 */
export type FiltrosOrden = {
  /** Busca en el código de orden y en la razón social del proveedor. */
  busqueda?: string;
  proveedorId?: number;
  /** Nombre del estado tal cual lo muestra el front ("Pendiente", "Enviada"...). */
  estado?: string;
  desde?: string;
  hasta?: string;
  totalMin?: number;
  totalMax?: number;
  /** "recientes" (default) | "antiguas" — el ORDER BY lo resuelve el SQL. */
  ordenFecha?: "recientes" | "antiguas";
};

/** Una línea del detalle, ya validada. */
export type LineaOrden = {
  articuloId: number;
  cantidad: number;
  precioAcordado: number;
};

/** Datos para insertar la cabecera (ya validados y con los totales recalculados). */
export type CabeceraOrdenInput = {
  proveedorId: number;
  usuarioId: number;
  estadoId: number;
  formaPagoId: number;
  depositoId: number | null;
  cotizacionId: number | null;
  fechaEntrega: string | null;
  notas: string | null;
  subtotal: number;
  descuento: number;
  gastosEnvio: number;
  total: number;
};
