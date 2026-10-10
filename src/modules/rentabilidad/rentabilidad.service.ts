import { query } from "@/lib/db/client";
import type {
  RentabilidadFiltros,
  RentabilidadResumen,
  SucursalRentabilidad,
} from "./rentabilidad.types";

interface RowVentas extends Record<string, unknown> {
  sucursal_id: number;
  sucursal_nombre: string;
  ingresos: string;
  cantidad_ventas: number;
}

interface RowEgresosCaja extends Record<string, unknown> {
  sucursal_id: number;
  egresos_caja: string;
  cantidad_egresos_caja: number;
}

interface RowEgresosProveedores extends Record<string, unknown> {
  sucursal_id: number;
  egresos_proveedores: string;
  cantidad_pagos_proveedores: number;
}

/**
 * Servicio de Rentabilidad por Sucursal (Economía Integral)
 *
 * Consolida para el período seleccionado:
 *  1. Ingresos: Ventas en recepción/mostrador (vigentes o pagadas).
 *  2. Egresos de Caja: Salidas de dinero operativas de caja chica (tipo 'egreso').
 *  3. Egresos a Proveedores: Pagos por compras y deudas de cuentas corrientes a proveedores
 *     imputados a comprobantes y depósitos de la sucursal.
 *  4. Total Egresos = Egresos de Caja + Pagos a Proveedores.
 *  5. Margen Bruto = Ingresos - Total Egresos.
 */
export async function obtenerRentabilidadPorSucursal(
  filtros: RentabilidadFiltros,
): Promise<RentabilidadResumen> {
  const { desde, hasta, sucursalesIds } = filtros;
  const fechaDesde = `${desde} 00:00:00`;
  const fechaHasta = `${hasta} 23:59:59.999`;

  const sucursalFilter = sucursalesIds && sucursalesIds.length > 0 ? sucursalesIds : null;

  // 1. Ingresos por ventas en mostrador/recepción
  const sqlVentas = `
    SELECT 
      s.id AS sucursal_id,
      s.nombre AS sucursal_nombre,
      COALESCE(SUM(v.total), 0)::numeric AS ingresos,
      COUNT(v.id)::int AS cantidad_ventas
    FROM sucursal s
    LEFT JOIN venta v ON v.sucursal_id = s.id 
      AND v.estado IN ('pagado', 'vigente')
      AND v.fecha >= $1 AND v.fecha <= $2
    WHERE s.estado = 'activo'
      AND ($3::int[] IS NULL OR s.id = ANY($3))
    GROUP BY s.id, s.nombre
    ORDER BY s.id ASC
  `;

  // 2. Egresos operativos de caja (caja_apertura -> caja -> sucursal)
  const sqlEgresosCaja = `
    SELECT 
      s.id AS sucursal_id,
      COALESCE(SUM(mc.monto), 0)::numeric AS egresos_caja,
      COUNT(mc.id)::int AS cantidad_egresos_caja
    FROM sucursal s
    LEFT JOIN caja c ON c.sucursal_id = s.id
    LEFT JOIN caja_apertura ca ON ca.caja_id = c.id
    LEFT JOIN movimiento_caja mc ON mc.caja_apertura_id = ca.id 
      AND mc.tipo = 'egreso'
      AND mc.fecha_hora >= $1 AND mc.fecha_hora <= $2
    WHERE s.estado = 'activo'
      AND ($3::int[] IS NULL OR s.id = ANY($3))
    GROUP BY s.id
  `;

  // 3. Egresos por compras y pagos a proveedores (cuenta corriente)
  // Vinculados a través de pago -> pago_imputacion -> comprobante_proveedor -> orden_compra -> deposito -> sucursal
  const sqlEgresosProveedores = `
    SELECT 
      s.id AS sucursal_id,
      COALESCE(SUM(pi.monto_imputado), 0)::numeric AS egresos_proveedores,
      COUNT(DISTINCT p.id)::int AS cantidad_pagos_proveedores
    FROM sucursal s
    LEFT JOIN deposito d ON d.sucursal_id = s.id
    LEFT JOIN orden_compra oc ON oc.deposito_id = d.id
    LEFT JOIN comprobante_proveedor cp ON cp.orden_compra_id = oc.id
    LEFT JOIN (
      pago_imputacion pi
      JOIN pago p ON p.id = pi.pago_id 
        AND p.estado = 'vigente' 
        AND p.fecha >= $1::date 
        AND p.fecha <= $2::date
    ) ON pi.comprobante_proveedor_id = cp.id
    WHERE s.estado = 'activo'
      AND ($3::int[] IS NULL OR s.id = ANY($3))
    GROUP BY s.id
  `;

  const [resVentas, resEgresosCaja, resEgresosProv] = await Promise.all([
    query<RowVentas>(sqlVentas, [fechaDesde, fechaHasta, sucursalFilter]),
    query<RowEgresosCaja>(sqlEgresosCaja, [fechaDesde, fechaHasta, sucursalFilter]),
    query<RowEgresosProveedores>(sqlEgresosProveedores, [fechaDesde, fechaHasta, sucursalFilter]),
  ]);

  const mapCaja = new Map<number, { egresos_caja: number; cantidad_egresos_caja: number }>();
  for (const row of resEgresosCaja) {
    mapCaja.set(row.sucursal_id, {
      egresos_caja: Number(row.egresos_caja) || 0,
      cantidad_egresos_caja: row.cantidad_egresos_caja || 0,
    });
  }

  const mapProv = new Map<
    number,
    { egresos_proveedores: number; cantidad_pagos_proveedores: number }
  >();
  for (const row of resEgresosProv) {
    mapProv.set(row.sucursal_id, {
      egresos_proveedores: Number(row.egresos_proveedores) || 0,
      cantidad_pagos_proveedores: row.cantidad_pagos_proveedores || 0,
    });
  }

  const sucursales: SucursalRentabilidad[] = resVentas.map((row) => {
    const sucursalId = row.sucursal_id;
    const ingresos = Number(row.ingresos) || 0;

    const cajaData = mapCaja.get(sucursalId) ?? { egresos_caja: 0, cantidad_egresos_caja: 0 };
    const provData = mapProv.get(sucursalId) ?? {
      egresos_proveedores: 0,
      cantidad_pagos_proveedores: 0,
    };

    const egresosCaja = cajaData.egresos_caja;
    const egresosProveedores = provData.egresos_proveedores;
    const egresos = egresosCaja + egresosProveedores;

    const margenBruto = ingresos - egresos;
    const margenPorcentaje =
      ingresos > 0 ? Number(((margenBruto / ingresos) * 100).toFixed(2)) : egresos > 0 ? -100 : 0;

    return {
      sucursalId,
      nombre: row.sucursal_nombre,
      ingresos,
      egresosCaja,
      egresosProveedores,
      egresos,
      margenBruto,
      margenPorcentaje,
      cantidadVentas: row.cantidad_ventas || 0,
      cantidadEgresosCaja: cajaData.cantidad_egresos_caja,
      cantidadPagosProveedores: provData.cantidad_pagos_proveedores,
    };
  });

  const totalIngresos = sucursales.reduce((acc, s) => acc + s.ingresos, 0);
  const totalEgresosCaja = sucursales.reduce((acc, s) => acc + s.egresosCaja, 0);
  const totalEgresosProveedores = sucursales.reduce((acc, s) => acc + s.egresosProveedores, 0);
  const totalEgresos = totalEgresosCaja + totalEgresosProveedores;

  const margenBrutoTotal = totalIngresos - totalEgresos;
  const margenPorcentajeTotal =
    totalIngresos > 0
      ? Number(((margenBrutoTotal / totalIngresos) * 100).toFixed(2))
      : totalEgresos > 0
        ? -100
        : 0;

  // Ranking ordenado por mayor margen bruto
  const ranking = [...sucursales].sort((a, b) => {
    if (b.margenBruto !== a.margenBruto) {
      return b.margenBruto - a.margenBruto;
    }
    return b.ingresos - a.ingresos;
  });

  return {
    periodo: { desde, hasta },
    totalIngresos,
    totalEgresosCaja,
    totalEgresosProveedores,
    totalEgresos,
    margenBrutoTotal,
    margenPorcentajeTotal,
    sucursales,
    ranking,
  };
}
