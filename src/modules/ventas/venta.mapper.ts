import type { Venta, VentaItemDetalle } from "@/data/ventas";
import type { DetalleRow, MedioPagoRow, TipoMedioCobro, VentaRow } from "./venta.types";

/**
 * HU-VTA-01 — filas de Postgres → `Venta` de src/data/ventas.ts.
 *
 *  · `numeric` llega como string → number.
 *  · `items` son solo los ARTÍCULOS; el servicio (consulta, cirugía…) viaja
 *    aparte en `conceptoServicio` / `arancelServicio`, como en el front.
 *  · Estado: la base tiene vigente | pagado | anulado; el front solo distingue
 *    vigente | anulada.
 */

/**
 * `forma_pago` es un catálogo compartido con las condiciones de compra; los
 * medios de cobro son los que se reconocen por nombre (HU-VTA-02).
 */
export function tipoDeMedio(nombre: string): TipoMedioCobro | null {
  const n = nombre.trim().toLowerCase();
  if (n === "efectivo") return "efectivo";
  if (n.startsWith("transferencia")) return "transferencia";
  if (n.includes("tarjeta")) return "tarjeta";
  if (n.includes("billetera")) return "billetera_virtual";
  return null;
}

/** Clave estable del medio para el front: el tipo, o el nombre en minúscula si no es un medio de cobro. */
const claveMedio = (nombre: string) => tipoDeMedio(nombre) ?? nombre.toLowerCase();

export function toItem(d: DetalleRow): VentaItemDetalle {
  return {
    id: d.id,
    codigo: d.codigo ?? "",
    nombre: d.nombre,
    categoria: d.categoria ?? "",
    unidad: d.unidad ?? "",
    cantidad: Number(d.cantidad),
    precioUnitario: Number(d.precio_unitario),
    subtotal: Number(d.subtotal),
  };
}

/** "REC-2026-000003": el número se deriva del id y del año de la venta (no hay columna). */
function numeroComprobante(id: number, fecha: string): string {
  return `REC-${fecha.slice(0, 4)}-${String(id).padStart(6, "0")}`;
}

export function toApi(r: VentaRow, detalles: DetalleRow[], medios: MedioPagoRow[]): Venta {
  const total = Number(r.total);
  const items = detalles.filter((d) => d.venta_id === r.id && d.practica_id === null).map(toItem);
  const mediosVenta = medios.filter((m) => m.venta_id === r.id);

  return {
    id: r.id,
    numeroComprobante: numeroComprobante(r.id, r.fecha),
    // 0 = venta anónima de mostrador (sin consulta), como en el front.
    clienteId: r.cliente_id ?? 0,
    clienteNombre: r.cliente_nombre ?? "Consumidor Final",
    clienteDoc: r.cliente_doc ?? undefined,
    sucursalId: r.sucursal_id,
    consultaId: r.consulta_id,
    turnoId: r.turno_id,
    usuarioId: r.usuario_id,
    fecha: r.fecha,
    conceptoServicio: r.concepto_servicio ?? "Venta directa en mostrador",
    arancelServicio: Number(r.arancel_servicio),
    items,
    total,
    medioPago:
      mediosVenta.length === 1 ? claveMedio(mediosVenta[0].nombre) : mediosVenta.length > 1 ? "mixto" : "",
    mediosPago: mediosVenta.map((m) => ({
      formaPagoId: m.forma_pago_id,
      medio: claveMedio(m.nombre),
      monto: Number(m.monto),
    })),
    estado: r.estado === "anulado" ? "anulada" : "vigente",
  };
}
