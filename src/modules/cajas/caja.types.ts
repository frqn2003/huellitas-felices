/**
 * HU-VTA-03 — tipos del módulo Caja Diaria.
 */

export type CajaRow = {
  id: number;
  sucursal_id: number;
  sucursal: string;
  nombre: string;
  /** numeric → string desde `pg`. */
  saldo_actual: string;
  estado: "activo" | "inactivo";
};

/** caja_apertura con caja, sucursal y cajero resueltos por JOIN. Fechas ya formateadas en SQL. */
export type AperturaRow = {
  id: number;
  caja_id: number;
  sucursal_id: number;
  sucursal: string;
  caja_nombre: string;
  cajero_id: number;
  cajero_nombre: string;
  cajero_apellido: string;
  monto_inicial: string;
  /** inicial + ingresos − egresos hasta ahora (en vivo; al cerrar coincide con el esperado). */
  saldo_actual: string;
  /** 'YYYY-MM-DDTHH24:MI:SS' sin zona (como los timestamp de la base). */
  fecha_apertura: string;
  /** true = abierta. */
  estado: boolean;
  monto_contado: string | null;
  monto_esperado: string | null;
  diferencia: string | null;
  fecha_cierre: string | null;
};

export type MovimientoRow = {
  id: number;
  caja_apertura_id: number;
  tipo: "ingreso" | "egreso";
  monto: string;
  motivo: string;
  venta_id: number | null;
  usuario_id: number;
  fecha_hora: string;
};

export type CajeroRow = {
  id: number;
  nombre: string;
  apellido: string;
  sucursal_id: number | null;
  estado: "activo" | "inactivo";
  rol: string;
};

export type FiltrosApertura = {
  sucursalId?: number;
  cajeroId?: number;
  /** true = abiertas, false = cerradas. */
  abierta?: boolean;
  /** 'YYYY-MM-DD', sobre fecha_apertura. */
  fechaDesde?: string;
  fechaHasta?: string;
};
