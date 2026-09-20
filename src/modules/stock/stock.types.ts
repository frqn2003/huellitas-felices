import type { Row } from "@/lib/db/schema.types";

import type { EstadoStock } from "@/data/stock";

export type DepositoRow = Pick<
  Row<"deposito">,
  "id" | "sucursal_id" | "nombre" | "ubicacion"
> & {
  /** Del JOIN con `sucursal`. */
  sucursal_nombre: string;
};

export type FichaStockRow = Pick<
  // Los tres `stock_*` son `numeric`, asi que el esquema los tipa como STRING:
  // es lo que devuelve el driver `pg`. Antes estaban como `number | string`,
  // una union defensiva que obligaba a un `Number()` en cada uso sin dejar
  // claro cual de los dos venia en realidad.
  Row<"ficha_stock">,
  "id" | "articulo_id" | "deposito_id" | "stock_actual" | "stock_minimo" | "stock_critico"
> & {
  // Resuelto por los JOIN con deposito, sucursal y articulo.
  deposito_nombre: string;
  sucursal_id: number;
  sucursal_nombre: string;
  articulo_codigo: string;
  articulo_nombre: string;
  unidad_medida: string;
  articulo_estado: "activo" | "inactivo";
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
