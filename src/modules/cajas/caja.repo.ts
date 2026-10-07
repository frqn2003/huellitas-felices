import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
  AperturaRow,
  CajaRow,
  CajeroRow,
  FiltrosApertura,
  MovimientoRow,
} from "./caja.types";

/**
 * HU-VTA-03 — capa de acceso a datos de la Caja Diaria.
 *
 * ACÁ VA: SQL parametrizado y nada más. Lo que ya garantiza la base y no se
 * repite acá como regla: una sola caja abierta por sucursal (índice
 * uq_caja_apertura_abierta + trigger HF045), movimientos solo en caja abierta
 * (HF044), monto esperado calculado al cerrar (HF042) y bitácora de auditoría
 * (trg_auditoria_caja_apertura / trg_auditoria_movimiento_caja).
 */

export type Ejecutor = { query: PoolClient["query"] };

// Los timestamp se formatean en SQL como texto sin zona ('2026-09-25T08:00:00')
// para que el front los reciba igual que en sus datos de prueba y no haya
// corrimiento horario por convertir a Date.
const TS = `'YYYY-MM-DD"T"HH24:MI:SS'`;

const SELECT_APERTURA = `
  SELECT
    ca.id,
    ca.caja_id,
    c.sucursal_id,
    s.nombre                          AS sucursal,
    c.nombre                          AS caja_nombre,
    ca.usuario_id                     AS cajero_id,
    u.nombre                          AS cajero_nombre,
    u.apellido                        AS cajero_apellido,
    ca.monto_inicial,
    to_char(ca.fecha_apertura, ${TS}) AS fecha_apertura,
    ca.estado,
    ca.monto_contado,
    ca.monto_esperado,
    ca.diferencia,
    to_char(ca.fecha_cierre, ${TS})   AS fecha_cierre
  FROM caja_apertura ca
  JOIN caja     c ON c.id = ca.caja_id
  JOIN sucursal s ON s.id = c.sucursal_id
  JOIN usuario  u ON u.id = ca.usuario_id
`;

const SELECT_MOVIMIENTO = `
  SELECT id, caja_apertura_id, tipo, monto, motivo, venta_id, usuario_id,
         to_char(fecha_hora, ${TS}) AS fecha_hora
  FROM movimiento_caja
`;

async function ejecutar<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  ej?: Ejecutor,
): Promise<T[]> {
  if (ej) return (await ej.query<T>(sql, params)).rows;
  return query<T>(sql, params);
}

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

/** Cajas con su sucursal y saldo vivo. */
export async function findCajas(sucursalId?: number): Promise<CajaRow[]> {
  return query<CajaRow>(
    `SELECT c.id, c.sucursal_id, s.nombre AS sucursal, c.nombre, c.saldo_actual, c.estado
     FROM caja c
     JOIN sucursal s ON s.id = c.sucursal_id
     WHERE ($1::int IS NULL OR c.sucursal_id = $1)
     ORDER BY s.nombre, c.nombre`,
    [sucursalId ?? null],
  );
}

export async function findCaja(
  id: number,
  ej?: Ejecutor,
): Promise<{ id: number; sucursal_id: number; estado: "activo" | "inactivo" } | null> {
  const filas = await ejecutar<{ id: number; sucursal_id: number; estado: "activo" | "inactivo" }>(
    "SELECT id, sucursal_id, estado FROM caja WHERE id = $1",
    [id],
    ej,
  );
  return filas[0] ?? null;
}

/** Usuarios con rol Cajero, activos; opcionalmente los de una sucursal. */
export async function findCajeros(sucursalId?: number): Promise<CajeroRow[]> {
  return query<CajeroRow>(
    `SELECT u.id, u.nombre, u.apellido, u.sucursal_id, u.estado, r.nombre AS rol
     FROM usuario u
     JOIN rol r ON r.id = u.rol_id
     WHERE r.nombre = 'Cajero'
       AND u.estado = 'activo'
       AND ($1::int IS NULL OR u.sucursal_id = $1 OR u.sucursal_id IS NULL)
     ORDER BY u.apellido, u.nombre`,
    [sucursalId ?? null],
  );
}

export async function findCajero(id: number, ej?: Ejecutor): Promise<CajeroRow | null> {
  const filas = await ejecutar<CajeroRow>(
    `SELECT u.id, u.nombre, u.apellido, u.sucursal_id, u.estado, r.nombre AS rol
     FROM usuario u JOIN rol r ON r.id = u.rol_id
     WHERE u.id = $1`,
    [id],
    ej,
  );
  return filas[0] ?? null;
}

export async function findAperturas(f: FiltrosApertura = {}): Promise<AperturaRow[]> {
  const cond: string[] = [];
  const params: unknown[] = [];
  if (f.sucursalId) {
    params.push(f.sucursalId);
    cond.push(`c.sucursal_id = $${params.length}`);
  }
  if (f.cajeroId) {
    params.push(f.cajeroId);
    cond.push(`ca.usuario_id = $${params.length}`);
  }
  if (f.abierta !== undefined) {
    params.push(f.abierta);
    cond.push(`ca.estado = $${params.length}`);
  }
  if (f.fechaDesde) {
    params.push(f.fechaDesde);
    cond.push(`ca.fecha_apertura::date >= $${params.length}::date`);
  }
  if (f.fechaHasta) {
    params.push(f.fechaHasta);
    cond.push(`ca.fecha_apertura::date <= $${params.length}::date`);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  return query<AperturaRow>(
    `${SELECT_APERTURA} ${where} ORDER BY ca.fecha_apertura DESC, ca.id DESC`,
    params,
  );
}

export async function findAperturaById(id: number, ej?: Ejecutor): Promise<AperturaRow | null> {
  const filas = await ejecutar<AperturaRow>(`${SELECT_APERTURA} WHERE ca.id = $1`, [id], ej);
  return filas[0] ?? null;
}

/** La caja abierta de una sucursal (hay a lo sumo una), con su cajero, para el mensaje de error. */
export async function findAbiertaEnSucursal(
  sucursalId: number,
  ej?: Ejecutor,
): Promise<AperturaRow | null> {
  const filas = await ejecutar<AperturaRow>(
    `${SELECT_APERTURA} WHERE c.sucursal_id = $1 AND ca.estado = true LIMIT 1`,
    [sucursalId],
    ej,
  );
  return filas[0] ?? null;
}

export async function findMovimientos(aperturaId: number, ej?: Ejecutor): Promise<MovimientoRow[]> {
  return ejecutar<MovimientoRow>(
    `${SELECT_MOVIMIENTO} WHERE caja_apertura_id = $1 ORDER BY fecha_hora, id`,
    [aperturaId],
    ej,
  );
}

export async function findMovimientoById(id: number, ej?: Ejecutor): Promise<MovimientoRow | null> {
  const filas = await ejecutar<MovimientoRow>(`${SELECT_MOVIMIENTO} WHERE id = $1`, [id], ej);
  return filas[0] ?? null;
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

/**
 * Bloquea la fila de la apertura hasta el fin de la transacción.
 *
 * Serializa "cerrar" contra "registrar movimiento": sin esto, un movimiento que
 * entra mientras se cierra podría quedar fuera del monto esperado.
 *  · `exclusivo = true`  (cierre)     → FOR UPDATE
 *  · `exclusivo = false` (movimiento) → FOR SHARE: varios movimientos a la vez, pero no con un cierre.
 */
export async function bloquearApertura(
  id: number,
  exclusivo: boolean,
  client: PoolClient,
): Promise<{ id: number; estado: boolean } | null> {
  const { rows } = await client.query<{ id: number; estado: boolean }>(
    `SELECT id, estado FROM caja_apertura WHERE id = $1 ${exclusivo ? "FOR UPDATE" : "FOR SHARE"}`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insertApertura(
  data: { cajaId: number; cajeroId: number; montoInicial: number },
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO caja_apertura (caja_id, usuario_id, monto_inicial)
     VALUES ($1, $2, $3) RETURNING id`,
    [data.cajaId, data.cajeroId, data.montoInicial],
  );
  return rows[0].id;
}

export async function insertMovimiento(
  data: {
    aperturaId: number;
    tipo: "ingreso" | "egreso";
    monto: number;
    motivo: string;
    usuarioId: number;
  },
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO movimiento_caja (caja_apertura_id, tipo, monto, motivo, usuario_id)
     VALUES ($1, $2::tipo_movimiento_caja, $3, $4, $5) RETURNING id`,
    [data.aperturaId, data.tipo, data.monto, data.motivo, data.usuarioId],
  );
  return rows[0].id;
}

/**
 * Cierra la caja con el conteo final.
 *
 * El trigger fn_caja_calcular_cierre completa `monto_esperado` (inicial +
 * ingresos − egresos) y `fecha_cierre`, pero NO la `diferencia`: se calcula acá
 * en el mismo UPDATE con la misma fórmula (positivo = sobrante, negativo =
 * faltante). Es consistente porque la apertura está bloqueada FOR UPDATE.
 */
export async function cerrarApertura(
  id: number,
  montoContado: number,
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE caja_apertura
     SET estado         = false,
         monto_contado  = $2,
         diferencia     = $2 - (
           monto_inicial + COALESCE((
             SELECT SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END)
             FROM movimiento_caja m
             WHERE m.caja_apertura_id = caja_apertura.id
           ), 0)
         )
     WHERE id = $1`,
    [id, montoContado],
  );
}
