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

// Catálogo fijo de condiciones de pago (compartido con Cotizaciones).
// BACKEND: si pasa a tabla de catálogo, poblar desde GET /api/condiciones-pago.
export const CONDICIONES_PAGO = [
  "Contado",
  "Cta. cte. 30 días",
  "Cta. cte. 60 días",
] as const;

export interface OrdenCompraDetalle {
  id: number;
  orden_compra_id: number;
  articulo_id: number;
  cantidad: number;
  precio_acordado: number;
}

export interface OrdenCompra {
  id: number;
  proveedor_id: number;
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

export function numeroOrden(id: number): string {
  return `OC-${String(id).padStart(4, "0")}`;
}

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

// Depósito de entrega por defecto para nuevas órdenes (criterio: "por defecto
// dirección del depósito"). La dirección se resuelve desde el catálogo de
// depósitos de src/data/stock.ts (`depositosIniciales`); la BD guarda solo el
// varchar `direccion_entrega`, sin FK a `deposito`.
// BACKEND: poblar el catálogo desde GET /api/depositos.
export const DEPOSITO_ENTREGA_DEFAULT_ID = 1;

// Usuario responsable de nuevas órdenes.
// BACKEND: el usuario viene del token de sesión; el front no lo envía.
export const USUARIO_SESION = { id: 3, nombre: "Ana Martínez" };

// Último precio de compra de un artículo según las órdenes existentes
// (criterio: el precio unitario "se carga automáticamente del último precio de compra").
// BACKEND: reemplazar por GET /api/articulos/:id/ultimo-precio-compra.
export function ultimoPrecioCompra(articuloId: number, ordenes: OrdenCompra[]): number | null {
  let mejor: { fecha: string; precio: number } | null = null;
  for (const o of ordenes) {
    for (const d of o._detalles) {
      if (d.articulo_id !== articuloId) continue;
      if (!mejor || o.fecha > mejor.fecha) mejor = { fecha: o.fecha, precio: d.precio_acordado };
    }
  }
  return mejor?.precio ?? null;
}

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// BACKEND: reemplazar por GET /api/ordenes-compra (la respuesta debe incluir
// proveedor, usuario y detalles resueltos con JOIN, como estos objetos).
export const ordenesCompraIniciales: OrdenCompra[] = [
  {
    id: 1,
    proveedor_id: 5,
    cotizacion_id: null,
    usuario_id: 1,
    fecha: "2025-06-15T10:30:00Z",
    fecha_entrega: "2025-06-22T10:00:00Z",
    direccion_entrega: "Av. Principal 123", // Dep. Central (depositosIniciales)
    condicion_pago: "Contado",
    notas: "Entregar en horario de mañana",
    subtotal: 47000,
    descuento: 0,
    gastos_envio: 0,
    total: 47000,
    estado: "Pendiente",
    _proveedor: { id: 5, razon_social: "Farmacia XYZ S.A." },
    _usuario: { id: 1, nombre: "Carlos García" },
    _detalles: [
      { id: 1, orden_compra_id: 1, articulo_id: 1, cantidad: 50, precio_acordado: 850 },
      { id: 2, orden_compra_id: 1, articulo_id: 2, cantidad: 100, precio_acordado: 45 },
    ],
  },
  {
    id: 2,
    // Nació de la adjudicación de SC-0003 (cotización 3 de Distribuidora Mascotas).
    proveedor_id: 12,
    cotizacion_id: 3,
    usuario_id: 1,
    fecha: "2025-06-14T09:00:00Z",
    fecha_entrega: "2025-06-20T14:00:00Z",
    direccion_entrega: "Calle Norte 456", // Dep. Norte (depositosIniciales)
    condicion_pago: "Cta. cte. 30 días",
    notas: null,
    subtotal: 128500,
    // 10% del subtotal (12.850). El brief original usaba un monto fijo de 5.000;
    // al pasar el descuento a porcentaje se adapta la muestra.
    descuento: 10,
    gastos_envio: 0,
    total: 115650,
    estado: "Enviada",
    _proveedor: { id: 12, razon_social: "Distribuidora Mascotas Felices" },
    _usuario: { id: 1, nombre: "Carlos García" },
    _detalles: [
      { id: 3, orden_compra_id: 2, articulo_id: 3, cantidad: 25, precio_acordado: 5140 },
    ],
  },
  {
    id: 3,
    proveedor_id: 8,
    cotizacion_id: null,
    usuario_id: 2,
    fecha: "2025-06-13T14:15:00Z",
    fecha_entrega: "2025-06-18T10:00:00Z",
    direccion_entrega: "Av. Sur 789", // Dep. Sur (depositosIniciales)
    condicion_pago: "Contado",
    notas: "Confirmar disponibilidad antes de despachar",
    subtotal: 32100,
    descuento: 0,
    gastos_envio: 1500,
    total: 33600,
    estado: "Cancelada",
    _proveedor: { id: 8, razon_social: "Laboratorios Pharma S.A." },
    _usuario: { id: 2, nombre: "María López" },
    _detalles: [
      { id: 4, orden_compra_id: 3, articulo_id: 5, cantidad: 30, precio_acordado: 1070 },
    ],
  },
  {
    id: 4,
    proveedor_id: 8,
    cotizacion_id: null,
    usuario_id: 3,
    fecha: "2025-06-10T11:00:00Z",
    fecha_entrega: "2025-06-17T09:00:00Z",
    direccion_entrega: "Av. Principal 123", // Dep. Central (depositosIniciales)
    condicion_pago: "Cta. cte. 60 días",
    notas: "Recepción parcial: falta el 50% de las pipetas",
    subtotal: 88000,
    descuento: 0,
    gastos_envio: 2000,
    total: 90000,
    estado: "Recibida Parcial",
    _proveedor: { id: 8, razon_social: "Vetmed Labs" },
    _usuario: { id: 3, nombre: "Ana Martínez" },
    _detalles: [
      { id: 5, orden_compra_id: 4, articulo_id: 7, cantidad: 10, precio_acordado: 3200 },
      { id: 6, orden_compra_id: 4, articulo_id: 10, cantidad: 20, precio_acordado: 2800 },
    ],
  },
];
