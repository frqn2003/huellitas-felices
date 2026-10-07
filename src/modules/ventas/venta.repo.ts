import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
  ConsultaVentaRow,
  DetalleRow,
  FiltrosVenta,
  InsumoConsultaRow,
  ItemPrecioRow,
  AuditoriaCobroRow,
  MedioPagoRow,
  VentaRow,
} from "./venta.types";

/**
 * HU-VTA-01 — capa de acceso a datos de Ventas.
 *
 * ACÁ VA: SQL parametrizado y nada más. Lo que resuelve la BASE y no se repite:
 *  · precio de cada línea desde la lista vigente (trg_venta_detalle_tomar_precio);
 *  · total de la venta (trg_venta_recalcular_totales);
 *  · movimiento y descuento de stock (trg_venta_crear_movimiento_stock +
 *    trg_venta_detalle_descontar_stock, que reutilizan HU-STK-04);
 *  · pago = total, estado 'pagado', turno.pagado y el ingreso en caja si es
 *    efectivo (triggers diferidos de venta_medio_pago, se evalúan en el COMMIT);
 *  · bitácora (trg_auditoria_venta*).
 */

export type Ejecutor = { query: PoolClient["query"] };

async function ejecutar<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  ej?: Ejecutor,
): Promise<T[]> {
  if (ej) return (await ej.query<T>(sql, params)).rows;
  return query<T>(sql, params);
}

// ---------------------------------------------------------
// Lecturas de apoyo (resolución de líneas)
// ---------------------------------------------------------

/** Artículos con su precio de venta vigente (null = sin precio). */
export async function findArticulosConPrecio(ids: number[], ej?: Ejecutor): Promise<ItemPrecioRow[]> {
  if (ids.length === 0) return [];
  return ejecutar<ItemPrecioRow>(
    `SELECT a.id, a.codigo, a.nombre, a.estado, c.nombre AS categoria,
            um.nombre AS unidad, lp.precio
     FROM articulo a
     JOIN categoria c       ON c.id  = a.categoria_id
     JOIN unidad_medida um  ON um.id = a.unidad_medida_id
     LEFT JOIN lista_precio lp ON lp.articulo_id = a.id
     WHERE a.id = ANY($1::int[])`,
    [ids],
    ej,
  );
}

export async function findPracticasConPrecio(ids: number[], ej?: Ejecutor): Promise<ItemPrecioRow[]> {
  if (ids.length === 0) return [];
  return ejecutar<ItemPrecioRow>(
    `SELECT p.id, NULL::varchar AS codigo, p.nombre, p.estado,
            'Servicios'::varchar AS categoria, 'Servicio'::varchar AS unidad, lp.precio
     FROM practica p
     LEFT JOIN lista_precio_practica lp ON lp.practica_id = p.id
     WHERE p.id = ANY($1::int[])`,
    [ids],
    ej,
  );
}

export async function findConsulta(id: number, ej?: Ejecutor): Promise<ConsultaVentaRow | null> {
  const filas = await ejecutar<ConsultaVentaRow>(
    `SELECT cm.id, cm.cerrada, cm.cliente_id,
            cl.nombre || ' ' || cl.apellido AS cliente_nombre,
            cm.turno_id, t.sucursal_id, t.practica_id
     FROM consulta_medica cm
     JOIN turno   t  ON t.id  = cm.turno_id
     JOIN cliente cl ON cl.id = cm.cliente_id
     WHERE cm.id = $1`,
    [id],
    ej,
  );
  return filas[0] ?? null;
}

export async function findInsumosConsulta(consultaId: number, ej?: Ejecutor): Promise<InsumoConsultaRow[]> {
  return ejecutar<InsumoConsultaRow>(
    `SELECT id, articulo_id, cantidad FROM consulta_medica_insumo WHERE consulta_id = $1 ORDER BY id`,
    [consultaId],
    ej,
  );
}

export async function findVentaDeConsulta(consultaId: number, ej?: Ejecutor): Promise<number | null> {
  const filas = await ejecutar<{ id: number }>(
    "SELECT id FROM venta WHERE consulta_id = $1 AND estado <> 'anulado' LIMIT 1",
    [consultaId],
    ej,
  );
  return filas[0]?.id ?? null;
}

export async function findSucursalDeUsuario(usuarioId: number, ej?: Ejecutor): Promise<number | null> {
  const filas = await ejecutar<{ sucursal_id: number | null }>(
    "SELECT sucursal_id FROM usuario WHERE id = $1",
    [usuarioId],
    ej,
  );
  return filas[0]?.sucursal_id ?? null;
}

export async function findDepositos(sucursalId: number, ej?: Ejecutor): Promise<{ id: number }[]> {
  return ejecutar<{ id: number }>(
    "SELECT id FROM deposito WHERE sucursal_id = $1 ORDER BY id",
    [sucursalId],
    ej,
  );
}

export async function findFormasPago(ids: number[], ej?: Ejecutor): Promise<{ id: number; nombre: string }[]> {
  if (ids.length === 0) return [];
  return ejecutar<{ id: number; nombre: string }>(
    "SELECT id, nombre FROM forma_pago WHERE id = ANY($1::int[])",
    [ids],
    ej,
  );
}

/** Todo el catálogo `forma_pago` (se filtra por tipo en el service). */
export async function findTodasFormasPago(): Promise<{ id: number; nombre: string }[]> {
  return query<{ id: number; nombre: string }>("SELECT id, nombre FROM forma_pago ORDER BY nombre");
}

/**
 * Bitácora de los medios de pago de una venta, tal como la escribe
 * trg_auditoria_venta_medio_pago: usuario, fecha/hora, medio y monto.
 */
export async function findAuditoriaCobro(medioIds: number[]): Promise<AuditoriaCobroRow[]> {
  if (medioIds.length === 0) return [];
  return query<AuditoriaCobroRow>(
    `SELECT to_char(a.fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_hora,
            a.usuario_id,
            u.nombre || ' ' || u.apellido                    AS usuario_nombre,
            a.operacion::text                                AS operacion,
            (a.valores_nuevos ->> 'forma_pago_id')::int      AS forma_pago_id,
            a.valores_nuevos ->> 'monto'                     AS monto
     FROM auditoria a
     LEFT JOIN usuario u ON u.id = a.usuario_id
     WHERE a.tabla = 'venta_medio_pago' AND a.registro_id = ANY($1::int[])
     ORDER BY a.id`,
    [medioIds],
  );
}

export async function hayCajaAbierta(sucursalId: number, ej?: Ejecutor): Promise<boolean> {
  const filas = await ejecutar<{ id: number }>(
    `SELECT ca.id FROM caja_apertura ca JOIN caja c ON c.id = ca.caja_id
     WHERE c.sucursal_id = $1 AND ca.estado = true LIMIT 1`,
    [sucursalId],
    ej,
  );
  return filas.length > 0;
}

// ---------------------------------------------------------
// Lecturas de ventas
// ---------------------------------------------------------

const SELECT_VENTA = `
  SELECT
    v.id,
    v.sucursal_id,
    v.deposito_id,
    v.consulta_id,
    cm.turno_id,
    -- venta no tiene cliente (decisión del schema): si nació de una atención
    -- médica, el cliente es el de la consulta (un solo salto). Sin consulta es
    -- una venta de mostrador anónima.
    cm.cliente_id                           AS cliente_id,
    cl.nombre || ' ' || cl.apellido         AS cliente_nombre,
    cl.documento                            AS cliente_doc,
    v.usuario_id,
    to_char(v.fecha, 'YYYY-MM-DD HH24:MI')  AS fecha,
    v.total,
    v.estado,
    (SELECT pr.nombre FROM venta_detalle d JOIN practica pr ON pr.id = d.practica_id
      WHERE d.venta_id = v.id ORDER BY d.id LIMIT 1) AS concepto_servicio,
    COALESCE((SELECT SUM(d.subtotal) FROM venta_detalle d
      WHERE d.venta_id = v.id AND d.practica_id IS NOT NULL), 0) AS arancel_servicio
  FROM venta v
  LEFT JOIN consulta_medica cm ON cm.id = v.consulta_id
  LEFT JOIN cliente cl         ON cl.id = cm.cliente_id
`;

export async function findVentas(f: FiltrosVenta = {}): Promise<VentaRow[]> {
  const cond: string[] = [];
  const params: unknown[] = [];
  if (f.clienteId) {
    params.push(f.clienteId);
    cond.push(`cm.cliente_id = $${params.length}`);
  }
  if (f.sucursalId) {
    params.push(f.sucursalId);
    cond.push(`v.sucursal_id = $${params.length}`);
  }
  if (f.consultaId) {
    params.push(f.consultaId);
    cond.push(`v.consulta_id = $${params.length}`);
  }
  if (f.desde) {
    params.push(f.desde);
    cond.push(`v.fecha::date >= $${params.length}::date`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    cond.push(`v.fecha::date <= $${params.length}::date`);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  return query<VentaRow>(`${SELECT_VENTA} ${where} ORDER BY v.fecha DESC, v.id DESC`, params);
}

export async function findVentaById(id: number, ej?: Ejecutor): Promise<VentaRow | null> {
  const filas = await ejecutar<VentaRow>(`${SELECT_VENTA} WHERE v.id = $1`, [id], ej);
  return filas[0] ?? null;
}

export async function findDetalles(ventaIds: number[], ej?: Ejecutor): Promise<DetalleRow[]> {
  if (ventaIds.length === 0) return [];
  return ejecutar<DetalleRow>(
    `SELECT d.id, d.venta_id, d.articulo_id, d.practica_id,
            a.codigo,
            COALESCE(a.nombre, pr.nombre)          AS nombre,
            COALESCE(c.nombre, 'Servicios')        AS categoria,
            COALESCE(um.nombre, 'Servicio')        AS unidad,
            d.cantidad, d.precio_unitario, d.subtotal
     FROM venta_detalle d
     LEFT JOIN articulo a      ON a.id  = d.articulo_id
     LEFT JOIN categoria c     ON c.id  = a.categoria_id
     LEFT JOIN unidad_medida um ON um.id = a.unidad_medida_id
     LEFT JOIN practica pr     ON pr.id = d.practica_id
     WHERE d.venta_id = ANY($1::int[])
     ORDER BY d.id`,
    [ventaIds],
    ej,
  );
}

export async function findMediosPago(ventaIds: number[], ej?: Ejecutor): Promise<MedioPagoRow[]> {
  if (ventaIds.length === 0) return [];
  return ejecutar<MedioPagoRow>(
    `SELECT m.id, m.venta_id, m.forma_pago_id, f.nombre, m.monto
     FROM venta_medio_pago m JOIN forma_pago f ON f.id = m.forma_pago_id
     WHERE m.venta_id = ANY($1::int[])
     ORDER BY m.id`,
    [ventaIds],
    ej,
  );
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

export async function insertVenta(
  d: {
    sucursalId: number;
    depositoId: number;
    consultaId: number | null;
    usuarioId: number;
  },
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO venta (sucursal_id, deposito_id, consulta_id, usuario_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [d.sucursalId, d.depositoId, d.consultaId, d.usuarioId],
  );
  return rows[0].id;
}

/**
 * Inserta una línea. NO se manda `precio_unitario` ni `subtotal`: el primero lo
 * fija trg_venta_detalle_tomar_precio desde la lista vigente (no es editable),
 * el segundo se calcula en la base.
 */
export async function insertDetalle(
  ventaId: number,
  l: {
    articuloId: number | null;
    practicaId: number | null;
    cantidad: number;
    consultaMedicaInsumoId: number | null;
  },
  client: PoolClient,
): Promise<void> {
  await client.query(
    `INSERT INTO venta_detalle (venta_id, articulo_id, practica_id, cantidad, consulta_medica_insumo_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [ventaId, l.articuloId, l.practicaId, l.cantidad, l.consultaMedicaInsumoId],
  );
}

export async function insertMedioPago(
  ventaId: number,
  formaPagoId: number,
  monto: number,
  client: PoolClient,
): Promise<void> {
  await client.query(
    "INSERT INTO venta_medio_pago (venta_id, forma_pago_id, monto) VALUES ($1, $2, $3)",
    [ventaId, formaPagoId, monto],
  );
}
