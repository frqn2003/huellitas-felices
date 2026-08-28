import {
  SUCURSALES,
  calcularEstadoStock,
  type Deposito,
  type FichaStock,
} from "@/data/stock";
import type { DepositoRow, FichaStockRow } from "./stock.types";

function nombreSucursal(id: number, depositoNombre: string): string {
  // Mientras no exista tabla sucursal, se conserva el catálogo temporal del front.
  return SUCURSALES.find((s) => s.id === id)?.nombre ?? depositoNombre;
}

export function depositoToApi(row: DepositoRow): Deposito {
  return {
    id: row.id,
    sucursalId: row.sucursal_id,
    sucursal: nombreSucursal(row.sucursal_id, row.nombre),
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
      sucursal: nombreSucursal(row.sucursal_id, row.deposito_nombre),
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
