import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db/client";

type Ejecutor = Pool | PoolClient;

/**
 * HU-FIN-02 — escritura de pagos a proveedor.
 *
 * Solo dos INSERT. Toda la validación de las imputaciones la hacen cuatro
 * triggers `BEFORE INSERT` sobre `pago_imputacion`, con `FOR UPDATE`. Acá no se
 * revalida nada.
 */

export type PagoInput = {
  proveedorId: number;
  numeroComprobante: string;
  formaPagoId: number;
  fecha: string;
  monto: number;
  usuarioId: number;
};

/**
 * Inserta la cabecera del pago.
 *
 * `tipo` lo fija el repo, no viene del body: el enum `tipo_pago` tiene UN solo
 * valor (`pago_proveedor`). Si llegara `cobranza_cliente` —que es lo que el
 * front manda hoy para el lado cliente— Postgres tiraría un `22P02`, que NO
 * está mapeado en errors.ts y saldría como un 500 sin explicación.
 */
export async function insertPago(data: PagoInput, client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO pago
       (tipo, proveedor_id, monto, fecha, forma_pago_id, numero_comprobante, usuario_id)
     VALUES ('pago_proveedor', $1, $2, $3::date, $4, $5, $6)
     RETURNING id`,
    [data.proveedorId, data.monto, data.fecha, data.formaPagoId, data.numeroComprobante, data.usuarioId],
  );
  return rows[0].id;
}

/**
 * Inserta UNA imputación.
 *
 * ⚠️ NO DEVUELVE ID, Y NO ES UN OLVIDO.
 *
 *    `fn_pi_upsert_monto_imputado` toma un advisory lock y, si ya existe una
 *    imputación para el par (pago, comprobante), hace un UPDATE sumando el
 *    monto y devuelve NULL — o sea, CANCELA el INSERT. Un
 *    `INSERT ... RETURNING id` devolvería 0 filas y `rows[0].id` explotaría con
 *    un TypeError en el camino más normal del mundo.
 *
 *    Tampoco `ON CONFLICT DO UPDATE`: el trigger BEFORE devuelve NULL antes de
 *    que el índice único llegue a ver algo, así que la cláusula sería código
 *    muerto que además contradice al trigger.
 *
 *    El service no necesita el id: relee las imputaciones después de insertar,
 *    que es la ÚNICA fuente veraz de los montos finales si hubo una fusión.
 *
 * Se inserta de a una y no con un `VALUES` multi-fila. No es por corrección —el
 * trigger corre por fila igual— sino porque un INSERT multi-fila devuelve UN
 * error opaco y no se sabe cuál de las tres imputaciones lo causó. Con el loop,
 * el service puede decir "la línea 2".
 */
export async function insertImputacion(
  data: { pagoId: number; comprobanteId: number; monto: number },
  client: PoolClient,
): Promise<void> {
  await client.query(
    `INSERT INTO pago_imputacion (pago_id, comprobante_proveedor_id, monto_imputado)
     VALUES ($1, $2, $3)`,
    [data.pagoId, data.comprobanteId, data.monto],
  );
}

/** ¿Existe y está activo? Para dar un 404 con nombre en vez de un 23503 pelado. */
export async function existeProveedorActivo(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<boolean> {
  const { rows } = await ejecutor.query<{ existe: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM proveedor WHERE id = $1 AND estado = 'activo'
     ) AS existe`,
    [id],
  );
  return rows[0]?.existe ?? false;
}

/**
 * Anula un pago insertando un pago de anulación.
 *
 * El trigger \`trg_pago_anula_pago\` se encarga de cambiar el estado del pago original
 * a 'anulado' y revertir las imputaciones al detectar que \`anula_pago_id\` no es nulo.
 */
export async function anularPago(
  pagoId: number,
  usuarioId: number,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO pago (tipo, proveedor_id, monto, fecha, forma_pago_id, numero_comprobante, anula_pago_id, usuario_id)
     SELECT tipo, proveedor_id, monto, CURRENT_DATE, forma_pago_id, 'ANUL-' || numero_comprobante, id, $2
     FROM pago
     WHERE id = $1
     RETURNING id`,
    [pagoId, usuarioId],
  );
  return rows[0].id;
}

/** Verifica si un pago existe y devuelve su estado y proveedor_id. */
export async function obtenerInfoPago(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<{ estado: string; proveedor_id: number } | undefined> {
  const { rows } = await ejecutor.query<{ estado: string; proveedor_id: number }>(
    `SELECT estado, proveedor_id FROM pago WHERE id = $1`,
    [id],
  );
  return rows[0];
}

