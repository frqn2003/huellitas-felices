import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db/client";
import type {
  ComprobanteCtaCteRow,
  EstadoCtaCteApi,
  FiltrosCtaCte,
  ImputacionRow,
  PagoCtaCteRow,
  ProveedorCtaCteRow,
  ResumenCtaCteRow,
} from "./ctacte.types";

type Ejecutor = Pool | PoolClient;

/**
 * HU-FIN-02 — SQL de la cuenta corriente de proveedores.
 *
 * Todo sale de `vista_cuenta_corriente_proveedor`. Acá no hay reglas de
 * negocio: solo consultas.
 */

/**
 * El peor estado entre los comprobantes de un proveedor.
 *
 * POR QUÉ EN SQL Y NO EN EL MAPPER
 *   Porque el listado se filtra por estado. Si el badge se derivara en JS, el
 *   `?estado=Vencido` no podría entrar en el WHERE y habría que filtrar la
 *   página ya traída — con lo cual `contar()` devolvería un total que no
 *   corresponde a lo que se ve. Es el mismo motivo por el que recepciones
 *   comparte el FROM entre el listado y el contador.
 *
 * La prelación es la del brief: Vencido > ProximoAVencer > Credito > Saldado.
 * `bool_or` responde "¿alguno de sus comprobantes está así?", que es
 * exactamente lo que significa "el peor estado".
 *
 * `Pendiente` es el caso por defecto: debe algo, nada vencido ni por vencer.
 */
const ESTADO_PROVEEDOR = `
  CASE
    WHEN bool_or(v.estado_vencimiento = 'vencido')    THEN 'vencido'
    WHEN bool_or(v.estado_vencimiento = 'por_vencer') THEN 'por_vencer'
    WHEN COALESCE(SUM(v.saldo_pendiente), 0) < 0 THEN 'credito'
    WHEN COALESCE(SUM(v.saldo_pendiente), 0) = 0 THEN 'saldado'
    ELSE 'pendiente'
  END
`;

/**
 * ⚠️ ARRANCA EN `proveedor`, NO EN LA VISTA.
 *
 * La vista arranca en `comprobante_proveedor`, así que un proveedor sin
 * comprobantes no tiene ni una fila. Con un `GROUP BY` sobre la vista, esos
 * proveedores DESAPARECEN del listado — justo la fila "Pet Food SA / $0 /
 * Saldado" que muestra el wireframe del brief.
 *
 * El `LEFT JOIN` es lo que los mantiene, con saldo 0 gracias al COALESCE.
 */
const FROM_RESUMEN = `
  FROM proveedor p
  LEFT JOIN vista_cuenta_corriente_proveedor v ON v.proveedor_id = p.id
`;

const SELECT_RESUMEN = `
  SELECT
    p.id            AS proveedor_id,
    p.razon_social,
    p.cuit,
    COALESCE(SUM(v.saldo_pendiente), 0) AS saldo_actual,
    -- Solo los que TODAVÍA deben algo: sin el FILTER, la fecha del encabezado
    -- saldría de una factura ya saldada o de una Nota de Crédito.
    to_char(
      MIN(v.fecha_vencimiento) FILTER (WHERE v.saldo_pendiente > 0),
      'YYYY-MM-DD'
    )               AS proximo_vencimiento,
    -- Días hasta ese vencimiento. Se usa para el ícono de alerta del listado
    -- (⚠ vencido / ● por vencer) sin que el front reste fechas.
    --
    -- Y de paso hace que esta consulta FALLE FUERTE si no se aplicó la
    -- corrección 17: dias_para_vencer es una columna NUEVA, así que sin ella
    -- sale un 42703 y responses.ts loguea "revisá si falta aplicar alguna
    -- corrección". estado_vencimiento, en cambio, ya existía con OTRA semántica
    -- (3 valores, sin mirar el saldo) — leerla sin la corrección devolvería
    -- datos que parecen buenos y no lo son.
    -- (Sin backticks en este comentario: va dentro de un template literal.)
    MIN(v.dias_para_vencer) FILTER (WHERE v.saldo_pendiente > 0)
                    AS dias_proximo_vencimiento,
    ${ESTADO_PROVEEDOR} AS estado_vencimiento
  ${FROM_RESUMEN}
`;

/** Traduce el estado del front al vocabulario de la vista, para el filtro. */
const ESTADO_A_DB: Record<EstadoCtaCteApi, string> = {
  Vencido: "vencido",
  ProximoAVencer: "por_vencer",
  Credito: "credito",
  Saldado: "saldado",
  Pendiente: "pendiente",
};

/**
 * Arma el WHERE y el HAVING del resumen.
 *
 * El estado va en HAVING y no en WHERE porque es un agregado: se calcula sobre
 * el grupo, no sobre la fila. Se devuelven por separado para que `contar()`
 * pueda armar la misma consulta.
 */
function construirFiltros(f: FiltrosCtaCte): {
  where: string;
  having: string;
  params: unknown[];
} {
  // Solo proveedores activos: uno dado de baja no se gestiona más, y si tenía
  // saldo eso es un problema de la baja, no del listado de pagos del día.
  const condiciones: string[] = ["p.estado = 'activo'"];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    condiciones.push(
      `(p.razon_social ILIKE $${params.length} OR p.cuit ILIKE $${params.length})`,
    );
  }

  let having = "";
  if (f.estado) {
    params.push(ESTADO_A_DB[f.estado]);
    having = `HAVING ${ESTADO_PROVEEDOR} = $${params.length}`;
  }

  return { where: `WHERE ${condiciones.join(" AND ")}`, having, params };
}

const GROUP_BY = `GROUP BY p.id, p.razon_social, p.cuit`;

// ---------------------------------------------------------
// Resumen (Pantalla A)
// ---------------------------------------------------------

export async function findResumen(
  f: FiltrosCtaCte = {},
  ejecutor: Ejecutor = pool,
): Promise<ResumenCtaCteRow[]> {
  const { where, having, params } = construirFiltros(f);

  const pagina = f.pagina ?? 1;
  const porPagina = f.porPagina ?? 50;
  params.push(porPagina, (pagina - 1) * porPagina);

  const { rows } = await ejecutor.query<ResumenCtaCteRow>(
    `${SELECT_RESUMEN} ${where} ${GROUP_BY} ${having}
     ORDER BY COALESCE(SUM(v.saldo_pendiente), 0) DESC, p.razon_social
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
}

export async function contarResumen(
  f: FiltrosCtaCte = {},
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const { where, having, params } = construirFiltros(f);

  // El GROUP BY hace que `count(*)` cuente filas del grupo, no grupos. Por eso
  // va envuelto: se cuenta cuántos grupos quedaron.
  const { rows } = await ejecutor.query<{ total: string }>(
    `SELECT count(*)::int AS total FROM (
       SELECT p.id ${FROM_RESUMEN} ${where} ${GROUP_BY} ${having}
     ) q`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
}

// ---------------------------------------------------------
// Detalle (Pantalla B)
// ---------------------------------------------------------

export async function findProveedor(
  proveedorId: number,
  ejecutor: Ejecutor = pool,
): Promise<ProveedorCtaCteRow | null> {
  const { rows } = await ejecutor.query<ProveedorCtaCteRow>(
    `SELECT id, razon_social, cuit FROM proveedor WHERE id = $1`,
    [proveedorId],
  );
  return rows[0] ?? null;
}

/**
 * Los comprobantes de la cuenta corriente.
 *
 * Devuelve TODOS los vigentes, incluidos los saldados. No se filtra por
 * `saldo_pendiente > 0` a propósito: el criterio pide poder ver los pagos
 * imputados a un comprobante, y filtrando los saldados un comprobante recién
 * pagado desaparecería de la pantalla junto con su historial — justo después de
 * la operación que el usuario acaba de hacer. Con `saldado` entre los estados,
 * esconderlos es una decisión del front y sale gratis.
 *
 * Las fechas salen con `to_char` y no como `date`: `pg` parsea `date` a
 * medianoche LOCAL, y un `.toISOString()` después corre el día en cualquier
 * servidor que no esté en UTC-3.
 */
export async function findComprobantes(
  proveedorId: number,
  ejecutor: Ejecutor = pool,
): Promise<ComprobanteCtaCteRow[]> {
  const { rows } = await ejecutor.query<ComprobanteCtaCteRow>(
    `SELECT
       v.comprobante_id,
       v.numero_completo,
       v.tipo_comprobante,
       to_char(v.fecha_emision, 'YYYY-MM-DD')    AS fecha_emision,
       to_char(v.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
       v.monto_signado,
       v.monto_pagado,
       v.saldo_pendiente,
       v.dias_para_vencer,
       v.estado_vencimiento
     FROM vista_cuenta_corriente_proveedor v
     WHERE v.proveedor_id = $1
     ORDER BY v.fecha_vencimiento, v.comprobante_id`,
    [proveedorId],
  );
  return rows;
}

export async function findPagos(
  proveedorId: number,
  ejecutor: Ejecutor = pool,
): Promise<PagoCtaCteRow[]> {
  const { rows } = await ejecutor.query<PagoCtaCteRow>(
    `SELECT
       pg.id,
       pg.numero_comprobante,
       to_char(pg.fecha, 'YYYY-MM-DD') AS fecha,
       pg.forma_pago_id,
       fp.nombre AS forma_pago_nombre,
       pg.monto,
       pg.estado,
       (u.nombre || ' ' || u.apellido) AS usuario_nombre
     FROM pago pg
     JOIN forma_pago fp ON fp.id = pg.forma_pago_id
     JOIN usuario    u  ON u.id  = pg.usuario_id
     WHERE pg.proveedor_id = $1
     ORDER BY pg.fecha DESC, pg.id DESC`,
    [proveedorId],
  );
  return rows;
}

/**
 * Las imputaciones de varios pagos, en UNA consulta.
 *
 * `= ANY($1)` y no un `IN` armado con interpolación: el array viaja como
 * parámetro. Y una sola consulta para los N pagos, no una por pago — que con 40
 * pagos serían 41 viajes a la base en vez de 2.
 */
export async function findImputaciones(
  pagoIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<ImputacionRow[]> {
  if (pagoIds.length === 0) return [];

  const { rows } = await ejecutor.query<ImputacionRow>(
    `SELECT
       pi.pago_id,
       pi.comprobante_proveedor_id,
       cp.letra || ' ' || cp.punto_venta || '-' || cp.numero_comprobante AS numero_completo,
       pi.monto_imputado
     FROM pago_imputacion pi
     JOIN comprobante_proveedor cp ON cp.id = pi.comprobante_proveedor_id
     WHERE pi.pago_id = ANY($1::int[])
     ORDER BY pi.pago_id, pi.id`,
    [pagoIds],
  );
  return rows;
}
