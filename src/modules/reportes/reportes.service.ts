import { query } from "@/lib/db/client";
import { ValidationError } from "@/lib/http/errors";
import type {
  FiltrosReporteVentas,
  FilaReporteVenta,
  ReporteVentasResultado,
  TendenciaPunto,
} from "./reportes.types";

interface RowVentaReporte extends Record<string, unknown> {
  id: number;
  fecha: string;
  fecha_dia: string;
  sucursal_nombre: string;
  cliente_nombre: string | null;
  total_calculado: string | number;
  items_resumen: string | null;
}

function generarComprobante(id: number, fecha: string): string {
  const anio = fecha.slice(0, 4);
  return `REC-${anio}-${String(id).padStart(6, "0")}`;
}

export async function obtenerReporteVentas(
  filtros: FiltrosReporteVentas,
): Promise<ReporteVentasResultado> {
  const { desde, hasta, sucursalId, categoriaId } = filtros;

  if (!desde || !hasta) {
    throw new ValidationError("FECHAS_REQUERIDAS", "El rango de fechas es obligatorio.");
  }

  if (desde > hasta) {
    throw new ValidationError(
      "RANGO_INVALIDO",
      "La fecha 'desde' no puede ser posterior a 'hasta'.",
      "desde",
    );
  }

  const params: unknown[] = [desde, hasta];
  const condiciones: string[] = [
    "v.estado IN ('pagado', 'vigente')",
    "v.fecha::date >= $1::date",
    "v.fecha::date <= $2::date",
  ];

  if (sucursalId) {
    params.push(sucursalId);
    condiciones.push(`v.sucursal_id = $${params.length}`);
  }

  if (categoriaId) {
    params.push(categoriaId);
    condiciones.push(`(
      a.categoria_id = $${params.length}
      OR (vd.practica_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM categoria c_serv WHERE c_serv.id = $${params.length} AND lower(c_serv.nombre) LIKE '%servicio%'
      ))
    )`);
  }

  const whereClause = condiciones.join(" AND ");

  // Si se filtra por categoría, el total corresponde a los ítems de esa categoría.
  // Si no se filtra por categoría, se toma el total de la venta.
  const selectSql = `
    SELECT
      v.id,
      to_char(v.fecha, 'YYYY-MM-DD HH24:MI') AS fecha,
      to_char(v.fecha, 'YYYY-MM-DD') AS fecha_dia,
      s.nombre AS sucursal_nombre,
      COALESCE(cl.nombre || ' ' || cl.apellido, 'Consumidor Final') AS cliente_nombre,
      ${
        categoriaId
          ? "SUM(vd.subtotal) AS total_calculado"
          : "v.total AS total_calculado"
      },
      string_agg(DISTINCT COALESCE(a.nombre, pr.nombre), ', ') AS items_resumen
    FROM venta v
    JOIN sucursal s ON s.id = v.sucursal_id
    LEFT JOIN consulta_medica cm ON cm.id = v.consulta_id
    LEFT JOIN cliente cl ON cl.id = cm.cliente_id
    JOIN venta_detalle vd ON vd.venta_id = v.id
    LEFT JOIN articulo a ON a.id = vd.articulo_id
    LEFT JOIN practica pr ON pr.id = vd.practica_id
    WHERE ${whereClause}
    GROUP BY v.id, v.fecha, s.nombre, cl.nombre, cl.apellido, v.total
    ORDER BY v.fecha DESC, v.id DESC
  `;

  const rows = await query<RowVentaReporte>(selectSql, params);

  if (rows.length === 0) {
    return {
      totalVentas: 0,
      cantidadOperaciones: 0,
      ticketPromedio: 0,
      tendencia: [],
      filas: [],
    };
  }

  let totalAcumulado = 0;
  const filas: FilaReporteVenta[] = [];
  const agrupacionPorDia: Record<string, { total: number; operaciones: number }> = {};

  for (const r of rows) {
    const totalFila = Number(r.total_calculado ?? 0);
    totalAcumulado += totalFila;

    filas.push({
      id: r.id,
      comprobante: generarComprobante(r.id, r.fecha),
      fecha: r.fecha,
      sucursalNombre: r.sucursal_nombre,
      clienteNombre: r.cliente_nombre ?? "Consumidor Final",
      itemsResumen: r.items_resumen ?? "Sin detalle de artículos",
      total: totalFila,
    });

    const dia = r.fecha_dia;
    if (!agrupacionPorDia[dia]) {
      agrupacionPorDia[dia] = { total: 0, operaciones: 0 };
    }
    agrupacionPorDia[dia].total += totalFila;
    agrupacionPorDia[dia].operaciones += 1;
  }

  const cantidadOperaciones = rows.length;
  const ticketPromedio =
    cantidadOperaciones > 0 ? Math.round((totalAcumulado / cantidadOperaciones) * 100) / 100 : 0;

  // Tendencia ordenada cronológicamente (ascendente)
  const tendencia: TendenciaPunto[] = Object.keys(agrupacionPorDia)
    .sort()
    .map((dia) => ({
      fecha: dia,
      total: Math.round(agrupacionPorDia[dia].total * 100) / 100,
      operaciones: agrupacionPorDia[dia].operaciones,
    }));

  return {
    totalVentas: Math.round(totalAcumulado * 100) / 100,
    cantidadOperaciones,
    ticketPromedio,
    tendencia,
    filas,
  };
}
