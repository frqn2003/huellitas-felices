// Datos hardcodeados de Órdenes de Compra (HU-COMP-01 / HU-COMP-02).
// La estructura replica la tabla `orden_compra` de la BD; los campos `_proveedor`,
// `_usuario` y `_detalles` son la información relacionada que el back obtiene con JOINs.

// Tabla fija de estados (criterio HU-COMP-02): Recibida Parcial/Total solo se
// alcanza desde la recepción de stock (back); el front nunca las emite.
export type EstadoOrden =
  | "Pendiente"
  | "Enviada"
  | "Recibida Parcial"
  | "Recibida Total"
  | "Cancelada";

// El catálogo de condiciones de pago vive en la base (tabla `forma_pago`) y se
// consume con GET /api/condiciones-pago. La constante que estaba acá tenía
// valores que no existen en la base y le faltaban otros.
//
// Al GUARDAR se manda el `id`; para MOSTRAR se usa `condicion_pago`, que la API
// devuelve ya resuelto.
export interface CondicionPago {
  id: number;
  nombre: string;
}

export interface OrdenCompraDetalle {
  id: number;
  orden_compra_id: number;
  articulo_id: number;
  cantidad: number;
  precio_acordado: number;
}

export interface OrdenCompra {
  id: number;
  /** "OC-000001". Lo genera la secuencia de la base, no se deriva del id. */
  cod_ord: string;
  proveedor_id: number;
  /** PK de la condición de pago: preselecciona el select al editar. */
  forma_pago_id: number;
  /** PK del depósito de entrega: preselecciona el select al editar. */
  deposito_id: number | null;
  /** FK a cotizacion.id cuando la orden nace de una adjudicación (HU-COMP-02). */
  cotizacion_id: number | null;
  usuario_id: number;
  fecha: string;
  fecha_entrega: string | null;
  direccion_entrega: string;
  /** Condición de pago acordada con el proveedor (catálogo fijo). */
  condicion_pago: string;
  notas: string | null;
  subtotal: number;
  /** Porcentaje de descuento aplicado (0-100). El monto se calcula sobre el subtotal. */
  descuento: number;
  gastos_envio: number;
  total: number;
  estado: EstadoOrden;
  _proveedor: { id: number; razon_social: string };
  _usuario: { id: number; nombre: string };
  _detalles: OrdenCompraDetalle[];
}

// Formateadores compartidos por tabla, modales y exportación.

export function formatMoney(valor: number): string {
  const entero = Number.isInteger(valor);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: entero ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [fecha] = iso.split("T");
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

// Convierte un importe del formulario a número: acepta coma o punto decimal
// (teclados es-AR) y redondea a 2 decimales (la DB usa decimal(12,2)).
export function parseImporte(raw: string): number {
  const normalizado = raw.trim().replace(",", ".");
  const n = Number.parseFloat(normalizado);
  return Number.isNaN(n) ? NaN : Math.round(n * 100) / 100;
}

// Inverso: muestra un número en un input con coma decimal (convención es-AR).
export function importeAInput(n: number): string {
  return String(n).replace(".", ",");
}
