import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db/client";
import type {
    CabeceraInput,
    FichaStockRow,
    FiltrosMovimiento,
    MovimientoStockRow,
} from "./movimiento.types";

/**
 * HU-STK-04 — acceso a datos.
 *
 * MODELO: cabecera (`movimiento_stock_cab`) + detalle (`movimiento_stock_det`),
 * como pide el criterio textual de la HU. La vista `v_movimiento_stock` los
 * aplana para el listado, que es el shape que el front ya consume.
 *
 * LO QUE HACE LA BASE Y ACÁ NO SE REPITE:
 *  · `numero` (MOV-000001) lo pone `trg_generar_numero_movimiento`
 *  · `ficha_stock.stock_actual` lo actualiza `trg_actualizar_stock_det`, que
 *    además rechaza los egresos que dejarían negativo (ERRCODE HF001)
 */

/**
 * El `ejecutor` por defecto es el pool, pero hay que pasarle el client cuando se
 * lee DENTRO de una transacción abierta: desde otra conexión, las filas recién
 * insertadas no existen hasta el COMMIT. Sin esto, el POST devolvía la lista de
 * movimientos vacía.
 */
type Ejecutor = Pool | PoolClient;

const SELECT_MOVIMIENTO = `
  SELECT
    m.id,
    m.movimiento_id,
    m.numero,
    m.ficha_stock_id,
    a.id AS articulo_id,
    a.nombre AS articulo_nombre,
    um.nombre AS articulo_unidad,
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
  FROM v_movimiento_stock m
  JOIN ficha_stock fs       ON fs.id = m.ficha_stock_id
  JOIN articulo a           ON a.id  = fs.articulo_id
  JOIN unidad_medida um     ON um.id = a.unidad_medida_id
  JOIN deposito d           ON d.id  = m.deposito_id
  JOIN origen_movimiento om ON om.id = m.origen_id
  JOIN usuario u            ON u.id  = m.usuario_id
`;

export async function findAll(
    f: FiltrosMovimiento = {},
    ejecutor: Ejecutor = pool,
): Promise<MovimientoStockRow[]> {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (f.busqueda) {
        params.push(`%${f.busqueda}%`);
        condiciones.push(`(a.nombre ILIKE $${params.length} OR m.numero ILIKE $${params.length})`);
    }

    // El enum de la base tiene DOS valores. "Transferencia" y "Ajuste" no son
    // tipos: son orígenes. Castear f.tipo al enum reventaba con 22P02 para esos
    // dos valores, que son justo dos de las cuatro opciones del filtro del front.
    if (f.tipo === "Ingreso" || f.tipo === "Egreso") {
        params.push(f.tipo.toLowerCase());
        condiciones.push(`m.tipo = $${params.length}::tipo_movimiento_stock`);
    } else if (f.tipo === "Transferencia" || f.tipo === "Ajuste") {
        params.push(f.tipo.toLowerCase());
        condiciones.push(`om.nombre = $${params.length}`);
    }

    if (f.depositoId) {
        // El de la CABECERA, que es el depósito afectado por la operación.
        params.push(f.depositoId);
        condiciones.push(`m.deposito_id = $${params.length}`);
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

    const { rows } = await ejecutor.query<MovimientoStockRow>(
        // Por movimiento_id antes que por id de detalle: así las líneas de una
        // misma operación salen juntas en el listado.
        `${SELECT_MOVIMIENTO}
     ${where}
     ORDER BY m.fecha_hora DESC, m.movimiento_id DESC, m.id DESC`,
        params,
    );
    return rows;
}

const SELECT_FICHA = `
  SELECT
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
`;

export async function findFicha(
    articuloId: number,
    depositoId: number,
    client: PoolClient,
): Promise<FichaStockRow | null> {
    const { rows } = await client.query<FichaStockRow>(
        `${SELECT_FICHA} WHERE fs.articulo_id = $1 AND fs.deposito_id = $2`,
        [articuloId, depositoId],
    );
    return rows[0] ?? null;
}

export async function findFichaById(
    id: number,
    client: PoolClient,
): Promise<FichaStockRow | null> {
    const { rows } = await client.query<FichaStockRow>(
        `${SELECT_FICHA} WHERE fs.id = $1`,
        [id],
    );
    return rows[0] ?? null;
}

/**
 * Bloquea la fila de la ficha hasta el fin de la transacción.
 *
 * El trigger que ajusta el stock toma su propio lock, pero en el orden en que
 * se insertan los detalles. Bloquear ACÁ, ordenado por id (lo hace el service),
 * evita que dos transacciones que tocan las mismas fichas en distinto orden se
 * queden esperando mutuamente para siempre — un deadlock.
 */
export async function lockFicha(id: number, client: PoolClient): Promise<FichaStockRow> {
    const { rows } = await client.query<FichaStockRow>(
        `SELECT fs.id, fs.articulo_id, fs.deposito_id, fs.stock_actual,
            fs.stock_minimo, fs.stock_critico,
            a.nombre AS articulo_nombre, d.nombre AS deposito_nombre
     FROM ficha_stock fs
     JOIN articulo a ON a.id = fs.articulo_id
     JOIN deposito d ON d.id = fs.deposito_id
     WHERE fs.id = $1
     FOR UPDATE OF fs`,
        [id],
    );
    return rows[0];
}

/**
 * Resuelve un origen del catálogo por nombre.
 *
 * `movimiento_stock_cab.origen_id` es NOT NULL, y el front manda `null` para
 * Transferencia y Ajuste. El código viejo caía en `?? 1`, que es
 * `recepcion_compra`: TODA transferencia quedaba registrada como una recepción
 * de compra. Acá se busca el origen que corresponde de verdad.
 */
export async function findOrigenByNombre(
    nombre: string,
    client: PoolClient,
): Promise<number | null> {
    const { rows } = await client.query<{ id: number }>(
        `SELECT id FROM origen_movimiento WHERE nombre = $1`,
        [nombre],
    );
    return rows[0]?.id ?? null;
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/**
 * Inserta la cabecera y devuelve su id y su número.
 *
 * NO se manda `numero`: lo genera `trg_generar_numero_movimiento` (BEFORE
 * INSERT) y vuelve por el RETURNING. Que lo ponga la base garantiza que dos
 * operaciones simultáneas no compartan número.
 */
export async function insertCabecera(
    data: CabeceraInput,
    client: PoolClient,
): Promise<{ id: number; numero: string }> {
    const { rows } = await client.query<{ id: number; numero: string }>(
        `INSERT INTO movimiento_stock_cab (
       deposito_id, tipo, origen_id, origen_entidad_id,
       fecha_hora, usuario_id, motivo, movimiento_vinculado_id
     ) VALUES ($1, $2, $3, $4, COALESCE($5::timestamp, now()), $6, $7, $8)
     RETURNING id, numero`,
        [
            data.depositoId,
            data.tipo,
            data.origenId,
            data.origenEntidadId ?? null,
            data.fechaHora ?? null,
            data.usuarioId,
            data.motivo ?? null,
            data.movimientoVinculadoId ?? null,
        ],
    );
    return rows[0];
}

/**
 * Inserta una línea del detalle.
 *
 * ⚠️ SIEMPRE después de la cabecera: el trigger `fn_actualizar_stock_det` lee
 *    `movimiento_stock_cab.tipo` por `NEW.movimiento_id` para saber si suma o
 *    resta. Sin la cabecera, no tiene contra qué resolverlo.
 *
 * La cantidad va siempre POSITIVA (`ck_mov_det_cantidad`); el signo lo define
 * el `tipo` de la cabecera.
 */
export async function insertDetalle(
    data: { movimientoId: number; fichaStockId: number; cantidad: number },
    client: PoolClient,
): Promise<number> {
    const { rows } = await client.query<{ id: number }>(
        `INSERT INTO movimiento_stock_det (movimiento_id, ficha_stock_id, cantidad)
     VALUES ($1, $2, $3)
     RETURNING id`,
        [data.movimientoId, data.fichaStockId, data.cantidad],
    );
    return rows[0].id;
}

/** Enlaza las dos puntas de una transferencia. */
export async function setMovimientoVinculado(
    id: number,
    vinculadoId: number,
    client: PoolClient,
): Promise<void> {
    await client.query(
        `UPDATE movimiento_stock_cab SET movimiento_vinculado_id = $1 WHERE id = $2`,
        [vinculadoId, id],
    );
}
