import { calcularEstadoStock, type Deposito, type FichaStock } from "@/data/stock";
import type { DepositoRow, FichaStockRow } from "./stock.types";

// Aca habia un `nombreSucursal()` que resolvia el nombre contra el array
// SUCURSALES de src/data/stock.ts -- o sea, el backend leyendo un catalogo del
// FRONT. Una sucursal creada en la base y no agregada a ese array caia en el
// fallback y se mostraba con el nombre del deposito.
//
// Ahora el nombre viene por JOIN con la tabla `sucursal`.

export function depositoToApi(row: DepositoRow): Deposito {
  return {
    id: row.id,
    sucursalId: row.sucursal_id,
    sucursal: row.sucursal_nombre,
    nombre: row.nombre,
    ubicacion: row.ubicacion ?? "",
  };
}

export function fichaToApi(row: FichaStockRow): FichaStock {
  const stockActual = Number(row.stock_actual);
  const stockMinimo = Number(row.stock_minimo);
  const stockCritico = row.stock_critico === null ? null : Number(row.stock_critico);

  return {
    id: row.id,
    articuloId: row.articulo_id,
    depositoId: row.deposito_id,
    deposito: {
      id: row.deposito_id,
      nombre: row.deposito_nombre,
      sucursal: row.sucursal_nombre,
    },
    articulo: {
      id: row.articulo_id,
      codigo: row.articulo_codigo,
      nombre: row.articulo_nombre,
      unidadMedida: row.unidad_medida,
      estado: row.articulo_estado,
    },
    stockActual,
    stockMinimo,
    stockCritico,
    estadoCalculado: calcularEstadoStock({ stockActual, stockMinimo, stockCritico }),
  };
}
