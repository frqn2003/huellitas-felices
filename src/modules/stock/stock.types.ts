import type { EstadoStock } from "@/data/stock";

export type DepositoRow = {
  id: number;
  sucursal_id: number;
  nombre: string;
  ubicacion: string | null;
};

export type FichaStockRow = {
  id: number;
  articulo_id: number;
  deposito_id: number;
  deposito_nombre: string;
  sucursal_id: number;
  articulo_codigo: string;
  articulo_nombre: string;
  unidad_medida: string;
  articulo_estado: "activo" | "inactivo";
  stock_actual: number | string;
  stock_minimo: number | string;
  stock_critico: number | string | null;
};

export type FiltrosDeposito = {
  busqueda?: string;
  sucursalId?: number;
};

export type FiltrosFichaStock = {
  busqueda?: string;
  sucursalId?: number;
  depositoId?: number;
  estadoStock?: EstadoStock;
  incluirInactivos?: boolean;
};

export type DepositoInput = {
  sucursalId: number;
  nombre: string;
  ubicacion: string;
};

export type FichaStockInput = {
  articuloId: number;
  depositoId: number;
  stockMinimo: number;
  stockCritico?: number | null;
};
