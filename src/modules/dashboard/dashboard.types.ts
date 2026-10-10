export type CondicionUmbral = "mayor" | "menor";

export interface KPIIndicador {
  valor: number;
  alerta: boolean;
  umbral: number;
  condicion: CondicionUmbral;
  mensajeAlerta?: string;
}

export interface DashboardKPIs {
  ventasDelDia: KPIIndicador;
  turnosDelDia: KPIIndicador;
  pacientesInternacion: KPIIndicador;
  articulosStockCritico: KPIIndicador;
  ultimaActualizacion: string;
}

export interface FiltrosDashboard {
  sucursalId?: number;
}
