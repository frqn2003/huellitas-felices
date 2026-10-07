/**
 * HU-VTA-01 — tipos del módulo Ventas en Mostrador.
 */

/** Línea que manda el front: SOLO qué y cuánto. El precio lo pone la base. */
export type LineaEntrada = {
  articuloId?: number;
  practicaId?: number;
  cantidad: number;
};

/** Línea ya resuelta contra la Lista de Precios vigente. */
export type LineaCalculada = {
  tipo: "articulo" | "practica";
  articuloId: number | null;
  practicaId: number | null;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  /** Solo en las líneas que vienen de los insumos de la consulta. */
  consultaMedicaInsumoId: number | null;
};

export type Calculo = {
  consultaId: number | null;
  turnoId: number | null;
  clienteId: number | null;
  clienteNombre: string | null;
  sucursalId: number | null;
  lineas: LineaCalculada[];
  total: number;
};

// ---- Filas de Postgres ----

export type ItemPrecioRow = {
  id: number;
  codigo: string | null;
  nombre: string;
  estado: "activo" | "inactivo";
  categoria: string | null;
  unidad: string | null;
  /** numeric → string desde `pg`; null = sin precio cargado. */
  precio: string | null;
};

export type ConsultaVentaRow = {
  id: number;
  cerrada: boolean;
  cliente_id: number;
  cliente_nombre: string;
  turno_id: number;
  sucursal_id: number;
  practica_id: number;
};

export type InsumoConsultaRow = {
  id: number;
  articulo_id: number;
  cantidad: number;
};

export type VentaRow = {
  id: number;
  sucursal_id: number;
  deposito_id: number;
  consulta_id: number | null;
  turno_id: number | null;
  cliente_id: number | null;
  cliente_nombre: string | null;
  cliente_doc: string | null;
  usuario_id: number;
  /** 'YYYY-MM-DD HH24:MI' */
  fecha: string;
  total: string;
  estado: "vigente" | "pagado" | "anulado";
  concepto_servicio: string | null;
  arancel_servicio: string;
};

export type DetalleRow = {
  id: number;
  venta_id: number;
  articulo_id: number | null;
  practica_id: number | null;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  unidad: string | null;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
};

export type MedioPagoRow = {
  id: number;
  venta_id: number;
  forma_pago_id: number;
  nombre: string;
  monto: string;
};

/** Los cuatro medios de cobro de HU-VTA-02. */
export type TipoMedioCobro = "efectivo" | "transferencia" | "tarjeta" | "billetera_virtual";

/** Una fila de `forma_pago` que sirve para cobrar una venta. */
export type MedioCobro = {
  id: number;
  nombre: string;
  tipo: TipoMedioCobro;
};

/** Un asiento de la bitácora de auditoría sobre un medio de pago de la venta. */
export type AuditoriaCobroRow = {
  fecha_hora: string;
  usuario_id: number | null;
  usuario_nombre: string | null;
  operacion: string;
  forma_pago_id: number;
  monto: string;
};

export type FiltrosVenta = {
  clienteId?: number;
  sucursalId?: number;
  consultaId?: number;
  /** 'YYYY-MM-DD' sobre la fecha de la venta. */
  desde?: string;
  hasta?: string;
};
