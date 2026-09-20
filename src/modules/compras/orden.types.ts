import type { Row } from "@/lib/db/schema.types";

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
export type OrdenRow = Pick<
  // Columnas de `orden_compra`, derivadas del esquema (`npm run db:types`).
  // Los decimal(12,2) salen tipados como string: es lo que devuelve el driver
  // `pg` para no perder precisión. El mapper los pasa a number.
  Row<"orden_compra">,
  | "id"
  | "cod_ord"
  | "proveedor_id"
  | "cotizacion_id"
  | "usuario_id"
  | "fecha"
  | "fecha_entrega"
  | "deposito_id"
  | "forma_pago_id"
  | "notas"
  | "subtotal"
  | "descuento"
  | "gastos_envio"
  | "total"
  | "estado_id"
> & {
  // Resuelto por los JOIN, no son columnas de `orden_compra`.
  proveedor_razon_social: string;
  proveedor_estado: "activo" | "inactivo";
  usuario_nombre: string;
  usuario_apellido: string;
  deposito_ubicacion: string | null;
  forma_pago_nombre: string;
  estado_nombre: string;
  es_final: boolean;
};

/** Fila de `orden_compra_detalle`. */
export type OrdenDetalleRow = Pick<
  Row<"orden_compra_detalle">,
  "id" | "orden_compra_id" | "articulo_id" | "cantidad" | "precio_acordado"
>;

/** Fila de `estado_orden_compra`. */
export type EstadoOrdenRow = Row<"estado_orden_compra">;

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
