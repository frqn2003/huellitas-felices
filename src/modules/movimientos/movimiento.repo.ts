import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
    FichaStockRow,
    FiltrosMovimiento,
    MovimientoStockRow,
} from "./movimiento.types";

export async function findAll(f: FiltrosMovimiento = {}): Promise<MovimientoStockRow[]> {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (f.busqueda) {
        params.push(`%${f.busqueda}%`);
        condiciones.push(`(a.nombre ILIKE $${params.length} OR CAST(m.id AS TEXT) ILIKE $${params.length})`);
    }

    if (f.tipo) {
        params.push(f.tipo.toLowerCase());
        condiciones.push(`m.tipo = $${params.length}::tipo_movimiento_stock`);
    }

    if (f.depositoId) {
        params.push(f.depositoId);
        condiciones.push(`fs.deposito_id = $${params.length}`);
    }

    if (f.articuloId) {
        params.push(f.articuloId);
        condiciones.push(`fs.articulo_id = $${params.length}`);
    }

    if (f.desde) {
        params.push(f.desde);
        condiciones.push(`m.fecha_hora >= $${params.length}`);
    }

    if (f.hasta) {
        params.push(f.hasta);
        condiciones.push(`m.fecha_hora <= $${params.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

    return query<MovimientoStockRow>(
        `SELECT
       m.id,
       'MOV-' || LPAD(m.id::text, 4, '0') AS numero,
       m.ficha_stock_id,
       a.id AS articulo_id,
       a.nombre AS articulo_nombre,
       um.unidad AS articulo_unidad,
       d.id AS deposito_id,
       d.nombre AS deposito_nombre,
       m.origen_id,
       om.nombre AS origen_nombre,
       m.origen_entidad_id,
       m.tipo,
       m.cantidad,
       m.fecha_hora,
       m.usuario_id,
       u.nombre AS usuario_nombre,
       u.apellido AS usuario_apellido,
       m.motivo,
       m.movimiento_vinculado_id,
       m.fecha_hora AS created_at
     FROM movimiento_stock m
     JOIN ficha_stock fs ON fs.id = m.ficha_stock_id
     JOIN articulo a ON a.id = fs.articulo_id
     JOIN unidad_medida um ON um.id = a.unidad_medida_id
     JOIN deposito d ON d.id = fs.deposito_id
     LEFT JOIN origen_movimiento om ON om.id = m.origen_id
     JOIN usuario u ON u.id = m.usuario_id
     ${where}
     ORDER BY m.fecha_hora DESC, m.id DESC`,
        params,
    );
}

export async function findFicha(
    articuloId: number,
    depositoId: number,
    client: PoolClient,
): Promise<FichaStockRow | null> {
    const { rows } = await client.query<FichaStockRow>(
        `SELECT
       fs.id,
       fs.articulo_id,
       a.nombre AS articulo_nombre,
       fs.deposito_id,
       d.nombre AS deposito_nombre,
       fs.stock_actual,
       fs.stock_minimo,
       fs.stock_critico
     FROM ficha_stock fs
     JOIN articulo a ON a.id = fs.articulo_id
     JOIN deposito d ON d.id = fs.deposito_id
     WHERE fs.articulo_id = $1 AND fs.deposito_id = $2`,
        [articuloId, depositoId],
    );
    return rows[0] ?? null;
}

export async function lockFicha(id: number, client: PoolClient): Promise<FichaStockRow> {
    const { rows } = await client.query<FichaStockRow>(
        `SELECT
       fs.id,
       fs.articulo_id,
       a.nombre AS articulo_nombre,
       fs.deposito_id,
       d.nombre AS deposito_nombre,
       fs.stock_actual,
       fs.stock_minimo,
       fs.stock_critico
     FROM ficha_stock fs
     JOIN articulo a ON a.id = fs.articulo_id
     JOIN deposito d ON d.id = fs.deposito_id
     WHERE fs.id = $1
     FOR UPDATE`,
        [id],
    );
    return rows[0];
}

export async function insertMovimiento(
    data: {
        fichaStockId: number;
        origenId: number | null;
        origenEntidadId: number | null;
        tipo: "ingreso" | "egreso";
        cantidad: number;
        usuarioId: number;
        motivo?: string | null;
        fechaHora?: string;
        movimientoVinculadoId?: number | null;
    },
    client: PoolClient,
): Promise<number> {
    const { rows } = await client.query<{ id: number }>(
        `INSERT INTO movimiento_stock (
       ficha_stock_id,
       origen_id,
       origen_entidad_id,
       tipo,
       cantidad,
       usuario_id,
       motivo,
       fecha_hora,
       movimiento_vinculado_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamp, now()), $9)
     RETURNING id`,
        [
            data.fichaStockId,
            data.origenId ?? 1, // Fallback al catálogo de origen
            data.origenEntidadId ?? null,
            data.tipo,
            data.cantidad,
            data.usuarioId,
            data.motivo ?? null,
            data.fechaHora ?? null,
            data.movimientoVinculadoId ?? null,
        ],
    );
    return rows[0].id;
}

export async function setMovimientoVinculado(
    id: number,
    vinculadoId: number,
    client: PoolClient,
): Promise<void> {
    await client.query(
        `UPDATE movimiento_stock SET movimiento_vinculado_id = $1 WHERE id = $2`,
        [vinculadoId, id],
    );
}
