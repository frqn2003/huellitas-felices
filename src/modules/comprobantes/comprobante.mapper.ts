import type { ComprobanteRow, ComprobanteDetalleRow } from "./comprobante.types";

/**
 * El enum de la base -> el vocabulario del front.
 *
 * ⚠️ ANTES ESTO DEJABA PASAR `pagado` EN CRUDO, y eso ROMPÍA LA PANTALLA.
 *    `EstadoComprobanteBadge` hace `map[estado]` y después destructura el
 *    resultado: con una clave que no conoce, `map["pagado"]` es undefined y
 *    destructurar undefined tira un TypeError que se lleva puesto el render de
 *    toda la tabla.
 *
 *    No era un caso raro: los dos comprobantes de la base están en `pagado`.
 */
const ESTADOS_API = {
  vigente: "Vigente",
  anulado: "Anulado",
  pagado: "Pagado",
} as const;

function aEstadoApi(estado: string): "Vigente" | "Anulado" | "Pagado" {
  // El `??` cubre el día que la DBA agregue un cuarto valor al enum: mejor
  // mostrar "Vigente" que romper la tabla entera.
  return ESTADOS_API[estado as keyof typeof ESTADOS_API] ?? "Vigente";
}

export function toComprobanteDTO(row: ComprobanteRow, detalles: ComprobanteDetalleRow[] = []) {
  const pv = String(row.punto_venta).padStart(4, "0");
  const num = String(row.numero_comprobante).padStart(8, "0");
  const comprobanteNumero = `${row.letra}-${pv}-${num}`;

  return {
    id: row.id,
    proveedorId: row.proveedor_id,
    proveedor: row.proveedor_razon_social || "N/A",
    proveedorNombre: row.proveedor_razon_social || "N/A",
    cuit: row.proveedor_cuit || "N/A",
    proveedorCuit: row.proveedor_cuit || "N/A",
    tipoComprobanteId: row.tipo_comprobante_id,
    tipo: row.tipo_comprobante_nombre || "N/A",
    letra: row.letra,
    puntoVenta: pv,
    numero: comprobanteNumero,
    numeroComprobante: num,
    comprobanteNumero,
    fecha: typeof row.fecha_emision === "string" ? row.fecha_emision : (row.fecha_emision instanceof Date ? row.fecha_emision.toISOString().slice(0, 10) : String(row.fecha_emision)),
    fechaEmision: row.fecha_emision,
    fechaVencimiento: row.fecha_vencimiento,
    ocId: row.orden_compra_id,
    ordenCompraId: row.orden_compra_id,
    oc: row.orden_compra_cod || row.orden_compra_numero || `OC #${row.orden_compra_id}`,
    comprobanteOriginalId: row.comprobante_corregido_id,
    comprobanteOriginal: row.comprobante_corregido_numero || null,
    comprobanteAnuladorId: row.anula_comprobante_id,
    comprobanteAnulador: row.anula_comprobante_numero || null,
    monto: Number(row.monto_total),
    montoTotal: Number(row.monto_total),
    estado: aEstadoApi(row.estado),
    lineas: detalles.map((d) => ({
      id: d.id,
      articuloId: d.articulo_id,
      articuloCodigo: d.articulo_codigo || `ART-${d.articulo_id}`,
      descripcion: d.articulo_nombre || d.articulo_descripcion || `Artículo #${d.articulo_id}`,
      cantidad: Number(d.cantidad),
      precioUnitario: Number(d.precio_facturado),
      precioFacturado: Number(d.precio_facturado),
      subtotal: Number(d.subtotal),
    })),
  };
}

export type ComprobanteApi = ReturnType<typeof toComprobanteDTO>;