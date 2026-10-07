// Contrato del módulo Ventas en Mostrador (HU-VTA-01): la forma EXACTA que
// devuelven GET /api/ventas y POST /api/ventas (src/modules/ventas/venta.mapper.ts).
// Los datos ya no son placeholder: salen de `venta`, `venta_detalle` y
// `venta_medio_pago`. El número de comprobante se deriva del id (no hay columna).

export interface VentaItemDetalle {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: number; // PK de la tabla `venta`
  numeroComprobante: string;
  clienteId: number; // FK → cliente.id
  clienteNombre: string;
  clienteDoc?: string;
  sucursalId: number; // FK → sucursal.id
  consultaId: number | null; // FK → consulta_medica.id
  turnoId: number | null; // FK → turno.id
  usuarioId: number; // FK → usuario.id (cajero/recepcionista)
  fecha: string; // ISO 8601
  conceptoServicio: string;
  arancelServicio: number;
  items: VentaItemDetalle[];
  total: number;
  medioPago: string;
  mediosPago?: {
    formaPagoId?: number;
    medio: string;
    monto: number;
    referencia?: string;
  }[];
  estado: "vigente" | "anulada";
}
