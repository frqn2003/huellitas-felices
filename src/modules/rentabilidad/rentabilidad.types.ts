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

export interface MesEvolucionRentabilidad {
  periodo: string;
  mesLabel: string;
  mesCompleto: string;
  ingresos: number;
  egresosProveedores: number;
  egresosCaja: number;
  egresosTotal: number;
  margenBruto: number;
  margenPorcentaje: number;
  acumIngresos: number;
  acumProveedores: number;
  acumCaja: number;
  acumEgresosTotal: number;
  acumMargenBruto: number;
  esFuturo?: boolean;
}

export interface EvolucionRentabilidadResponse {
  sucursalId: number;
  sucursalNombre: string;
  desde: string;
  hasta: string;
  meses: MesEvolucionRentabilidad[];
}

