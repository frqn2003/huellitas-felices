export interface RentabilidadFiltros {
  desde: string;
  hasta: string;
  sucursalesIds?: number[];
}

export interface SucursalRentabilidad {
  sucursalId: number;
  nombre: string;
  ingresos: number;
  egresosCaja: number;
  egresosProveedores: number;
  egresos: number;
  margenBruto: number;
  margenPorcentaje: number;
  cantidadVentas: number;
  cantidadEgresosCaja: number;
  cantidadPagosProveedores: number;
}

export interface RentabilidadResumen {
  periodo: {
    desde: string;
    hasta: string;
  };
  totalIngresos: number;
  totalEgresosCaja: number;
  totalEgresosProveedores: number;
  totalEgresos: number;
  margenBrutoTotal: number;
  margenPorcentajeTotal: number;
  sucursales: SucursalRentabilidad[];
  ranking: SucursalRentabilidad[];
}
