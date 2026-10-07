import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  ComprobanteRow,
  ComprobanteDetalleRow,
  TipoComprobanteRow,
  FiltrosComprobante,
  CabeceraComprobanteInput,
  LineaComprobanteInput,
} from "./comprobante.types";

/**
 * Pool o cliente de transacción.
 *
 * Las lecturas que se llaman DESPUÉS de escribir dentro de una transacción
 * tienen que recibir el `client`: desde otra conexión del pool las filas recién
 * insertadas todavía no existen.
 */
type Ejecutor = Pool | PoolClient;

export async function listar(filtros: FiltrosComprobante): Promise<ComprobanteRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filtros.proveedorId) {
    params.push(filtros.proveedorId);
    conditions.push(`c.proveedor_id = $${params.length}`);
  }

  if (filtros.tipoComprobanteId) {
    params.push(filtros.tipoComprobanteId);
    conditions.push(`c.tipo_comprobante_id = $${params.length}`);
  }

  const ocId = filtros.ordenCompraId ?? filtros.ocId;
  if (ocId) {
    params.push(ocId);
    conditions.push(`c.orden_compra_id = $${params.length}`);
  }

  if (filtros.estado) {
    params.push(filtros.estado.toLowerCase());
    conditions.push(`c.estado = $${params.length}`);
  }

  if (filtros.desde) {
    params.push(filtros.desde);
    conditions.push(`c.fecha_emision >= $${params.length}`);
  }

  if (filtros.hasta) {
    params.push(filtros.hasta);
    conditions.push(`c.fecha_emision <= $${params.length}`);
  }

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda}%`);
    conditions.push(`(
      p.razon_social ILIKE $${params.length} OR
      p.cuit ILIKE $${params.length} OR
      oc.cod_ord ILIKE $${params.length} OR
      c.numero_comprobante ILIKE $${params.length}
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      c.*,
      p.razon_social AS proveedor_razon_social,
      p.cuit AS proveedor_cuit,
      tc.nombre AS tipo_comprobante_nombre,
      oc.cod_ord AS orden_compra_cod,
      oc.cod_ord AS orden_compra_numero,
      corr.letra || '-' || LPAD(corr.punto_venta, 4, '0') || '-' || LPAD(corr.numero_comprobante, 8, '0') AS comprobante_corregido_numero,
      anul.letra || '-' || LPAD(anul.punto_venta, 4, '0') || '-' || LPAD(anul.numero_comprobante, 8, '0') AS anula_comprobante_numero
    FROM comprobante_proveedor c
    JOIN proveedor p ON p.id = c.proveedor_id
    JOIN tipo_comprobante tc ON tc.id = c.tipo_comprobante_id
    JOIN orden_compra oc ON oc.id = c.orden_compra_id
    LEFT JOIN comprobante_proveedor corr ON corr.id = c.comprobante_corregido_id
    LEFT JOIN comprobante_proveedor anul ON anul.id = c.anula_comprobante_id
    ${whereClause}
    ORDER BY c.fecha_emision DESC, c.id DESC;
  `;

  return query<ComprobanteRow>(sql, params);
}

/**
 * ⚠️ ACEPTA UN `ejecutor` Y NO ES OPCIONAL POR CAPRICHO.
 *
 * Sin él, `query()` toma OTRA conexión del pool. Si se lo llama dentro de una
 * transacción —como hacen `crear()` y `anular()` para releer lo que acaban de
 * escribir— esa otra conexión todavía no ve la fila: falta el COMMIT. Devolvía
 * `null`, el `!` del service se lo tragaba en tiempo de compilación, y el
 * mapper explotaba con un TypeError.
 *
 * O sea que **crear un comprobante por la API siempre terminaba en 500 y en
 * ROLLBACK**. Los comprobantes que hay en la base entraron por SQL a mano: su
 * fila de `auditoria` tiene `usuario_id` en NULL, que es lo que deja un INSERT
 * que no pasó por `withAuditUser`.
 */
export async function obtenerPorId(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<ComprobanteRow | null> {
  const sql = `
    SELECT
      c.*,
      p.razon_social AS proveedor_razon_social,
      p.cuit AS proveedor_cuit,
      tc.nombre AS tipo_comprobante_nombre,
      oc.cod_ord AS orden_compra_cod,
      oc.cod_ord AS orden_compra_numero,
      corr.letra || '-' || LPAD(corr.punto_venta, 4, '0') || '-' || LPAD(corr.numero_comprobante, 8, '0') AS comprobante_corregido_numero,
      anul.letra || '-' || LPAD(anul.punto_venta, 4, '0') || '-' || LPAD(anul.numero_comprobante, 8, '0') AS anula_comprobante_numero
    FROM comprobante_proveedor c
    JOIN proveedor p ON p.id = c.proveedor_id
    JOIN tipo_comprobante tc ON tc.id = c.tipo_comprobante_id
    JOIN orden_compra oc ON oc.id = c.orden_compra_id
    LEFT JOIN comprobante_proveedor corr ON corr.id = c.comprobante_corregido_id
    LEFT JOIN comprobante_proveedor anul ON anul.id = c.anula_comprobante_id
    WHERE c.id = $1;
  `;
  const { rows } = await ejecutor.query<ComprobanteRow>(sql, [id]);
  return rows[0] ?? null;
}

/** Mismo motivo que `obtenerPorId`: tiene que poder leer dentro de la transacción. */
export async function obtenerDetalles(
  comprobanteId: number,
  ejecutor: Ejecutor = pool,
): Promise<ComprobanteDetalleRow[]> {
  const sql = `
    SELECT
      d.*,
      a.codigo AS articulo_codigo,
      a.nombre AS articulo_nombre,
      a.descripcion AS articulo_descripcion
    FROM comprobante_proveedor_detalle d
    JOIN articulo a ON a.id = d.articulo_id
    WHERE d.comprobante_id = $1
    ORDER BY d.id ASC;
  `;
  const { rows } = await ejecutor.query<ComprobanteDetalleRow>(sql, [comprobanteId]);
  return rows;
}

export async function existeNumero(
  proveedorId: number,
  tipoComprobanteId: number,
  letra: string,
  puntoVenta: string,
  numeroComprobante: string,
): Promise<boolean> {
  const sql = `
    SELECT id FROM comprobante_proveedor
    WHERE proveedor_id = $1
      AND tipo_comprobante_id = $2
      AND letra = $3
      AND punto_venta = $4
      AND numero_comprobante = $5
    LIMIT 1;
  `;
  const rows = await query<{ id: number }>(sql, [
    proveedorId,
    tipoComprobanteId,
    letra,
    puntoVenta,
    numeroComprobante,
  ]);
  return rows.length > 0;
}

export async function obtenerEstadoOrdenCompra(ordenCompraId: number): Promise<{ estado: string } | null> {
  const sql = `
    SELECT eoc.nombre AS estado
    FROM orden_compra oc
    JOIN estado_orden_compra eoc ON eoc.id = oc.estado_id
    WHERE oc.id = $1;
  `;
  const rows = await query<{ estado: string }>(sql, [ordenCompraId]);
  return rows[0] ?? null;
}

export async function listarTiposComprobante(): Promise<TipoComprobanteRow[]> {
  const sql = `SELECT * FROM tipo_comprobante ORDER BY id ASC;`;
  return query<TipoComprobanteRow>(sql);
}

export async function insertarCabecera(client: PoolClient, input: CabeceraComprobanteInput, usuarioId?: number): Promise<number> {
  const usrId = input.usuarioId ?? usuarioId;
  const sql = `
    INSERT INTO comprobante_proveedor (
      proveedor_id,
      tipo_comprobante_id,
      letra,
      punto_venta,
      numero_comprobante,
      fecha_emision,
      fecha_vencimiento,
      orden_compra_id,
      comprobante_corregido_id,
      anula_comprobante_id,
      monto_total,
      estado,
      usuario_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'vigente', $12)
    RETURNING id;
  `;
  const res = await client.query(sql, [
    input.proveedorId,
    input.tipoComprobanteId,
    input.letra,
    input.puntoVenta,
    input.numeroComprobante,
    input.fechaEmision,
    input.fechaVencimiento,
    input.ordenCompraId,
    input.comprobanteCorregidoId ?? null,
    input.anulaComprobanteId ?? null,
    input.montoTotal,
    usrId,
  ]);
  return res.rows[0].id;
}

export async function insertarLineas(client: PoolClient, comprobanteId: number, lineas: LineaComprobanteInput[]): Promise<void> {
  for (const l of lineas) {
    const sql = `
      INSERT INTO comprobante_proveedor_detalle (
        comprobante_id,
        articulo_id,
        cantidad,
        precio_facturado
      ) VALUES ($1, $2, $3, $4);
    `;
    await client.query(sql, [comprobanteId, l.articuloId, l.cantidad, l.precioFacturado]);
  }
}

export const comprobanteRepo = {
  listar,
  obtenerPorId,
  obtenerDetalles,
  existeNumero,
  obtenerEstadoOrdenCompra,
  listarTiposComprobante,
  insertar: insertarCabecera,
  insertarCabecera,
  insertarLineas,
};
