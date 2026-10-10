import { query } from "@/lib/db/client";
import type { DashboardKPIs, FiltrosDashboard } from "./dashboard.types";

/**
 * HU-REP-01 — Servicio del Dashboard Gerencial
 *
 * Consolida los 4 indicadores KPI clave en tiempo real:
 *  1. Ventas del día (Moneda)
 *  2. Turnos del día (Número entero)
 *  3. Pacientes en internación (Número entero)
 *  4. Artículos con stock crítico (Número entero)
 *
 * Aplica los umbrales de alerta acordados:
 *  - Ventas: < $50.000
 *  - Turnos: > 15
 *  - Internación: > 5
 *  - Stock crítico: > 0
 */

const UMBRAL_VENTAS = 50000;
const UMBRAL_TURNOS = 15;
const UMBRAL_INTERNACION = 5;
const UMBRAL_STOCK_CRITICO = 0;

export async function obtenerKPIs(filtros: FiltrosDashboard = {}): Promise<DashboardKPIs> {
  const sucursalIdParam = filtros.sucursalId ?? null;

  // 1. Ventas del día
  const queryVentas = `
    SELECT COALESCE(SUM(total), 0)::numeric AS total
    FROM venta
    WHERE estado IN ('pagado', 'vigente')
      AND fecha::date = CURRENT_DATE
      AND ($1::int IS NULL OR sucursal_id = $1)
  `;

  // 2. Turnos del día (excluyendo cancelados, estado_id = 3)
  const queryTurnos = `
    SELECT COUNT(*)::int AS total
    FROM turno
    WHERE fecha = CURRENT_DATE
      AND estado_id <> 3
      AND ($1::int IS NULL OR sucursal_id = $1)
  `;

  // 3. Pacientes en internación
  // BACKEND: Actualmente no existe una tabla 'internacion' en la base de datos (ver db/schema.sql).
  // Se aproxima con las consultas médicas abiertas del día asociadas a un turno.
  // Cuando el equipo de backend migre el módulo de internación, reemplazar por:
  // SELECT COUNT(*)::int AS total FROM internacion WHERE estado = 'activo' AND ($1::int IS NULL OR sucursal_id = $1);
  const queryInternacion = `
    SELECT COUNT(*)::int AS total
    FROM consulta_medica cm
    JOIN turno t ON t.id = cm.turno_id
    WHERE cm.cerrada = false
      AND cm.fecha_hora::date = CURRENT_DATE
      AND ($1::int IS NULL OR t.sucursal_id = $1)
  `;

  // 4. Artículos con stock crítico
  const queryStockCritico = `
    SELECT COUNT(DISTINCT fs.articulo_id)::int AS total
    FROM ficha_stock fs
    JOIN articulo a ON a.id = fs.articulo_id
    JOIN deposito d ON d.id = fs.deposito_id
    WHERE a.estado = 'activo'
      AND fs.stock_critico IS NOT NULL
      AND fs.stock_actual <= fs.stock_critico
      AND ($1::int IS NULL OR d.sucursal_id = $1)
  `;

  const [resVentas, resTurnos, resInternacion, resStock] = await Promise.all([
    query<{ total: string | number }>(queryVentas, [sucursalIdParam]),
    query<{ total: number }>(queryTurnos, [sucursalIdParam]),
    query<{ total: number }>(queryInternacion, [sucursalIdParam]),
    query<{ total: number }>(queryStockCritico, [sucursalIdParam]),
  ]);

  const ventasValor = Number(resVentas[0]?.total ?? 0);
  const turnosValor = Number(resTurnos[0]?.total ?? 0);
  const internacionValor = Number(resInternacion[0]?.total ?? 0);
  const stockCriticoValor = Number(resStock[0]?.total ?? 0);

  const alertaVentas = ventasValor < UMBRAL_VENTAS;
  const alertaTurnos = turnosValor > UMBRAL_TURNOS;
  const alertaInternacion = internacionValor > UMBRAL_INTERNACION;
  const alertaStock = stockCriticoValor > UMBRAL_STOCK_CRITICO;

  return {
    ventasDelDia: {
      valor: ventasValor,
      alerta: alertaVentas,
      umbral: UMBRAL_VENTAS,
      condicion: "menor",
      mensajeAlerta: alertaVentas
        ? `Ventas por debajo del umbral mínimo ($${UMBRAL_VENTAS.toLocaleString("es-AR")})`
        : undefined,
    },
    turnosDelDia: {
      valor: turnosValor,
      alerta: alertaTurnos,
      umbral: UMBRAL_TURNOS,
      condicion: "mayor",
      mensajeAlerta: alertaTurnos
        ? `Alta demanda: supera el umbral de ${UMBRAL_TURNOS} turnos`
        : undefined,
    },
    pacientesInternacion: {
      valor: internacionValor,
      alerta: alertaInternacion,
      umbral: UMBRAL_INTERNACION,
      condicion: "mayor",
      mensajeAlerta: alertaInternacion
        ? `Capacidad crítica: supera el umbral de ${UMBRAL_INTERNACION} pacientes`
        : undefined,
    },
    articulosStockCritico: {
      valor: stockCriticoValor,
      alerta: alertaStock,
      umbral: UMBRAL_STOCK_CRITICO,
      condicion: "mayor",
      mensajeAlerta: alertaStock
        ? `Atención requerida: ${stockCriticoValor} artículo(s) en quiebre de stock`
        : undefined,
    },
    ultimaActualizacion: new Date().toISOString(),
  };
}
