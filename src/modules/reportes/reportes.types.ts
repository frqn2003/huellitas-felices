export interface FiltrosReporteVentas {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  sucursalId?: number;
  categoriaId?: number;
}

export interface TendenciaPunto {
  fecha: string; // YYYY-MM-DD
  total: number;
  operaciones: number;
}

export interface FilaReporteVenta {
  id: number;
  comprobante: string;
  fecha: string; // YYYY-MM-DD HH:mm
  sucursalNombre: string;
  clienteNombre: string;
  itemsResumen: string;
  total: number;
}

export interface ReporteVentasResultado {
  totalVentas: number;
  cantidadOperaciones: number;
  ticketPromedio: number;
  tendencia: TendenciaPunto[];
  filas: FilaReporteVenta[];
}
