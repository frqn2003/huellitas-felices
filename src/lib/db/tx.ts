import type { PoolClient } from "pg";
import { pool } from "./client";

/**
 * Corre `fn` dentro de una transacción: COMMIT si resuelve, ROLLBACK si lanza.
 *
 * Regla del proyecto: TODA operación que escriba en más de una tabla va acá.
 * Los casos donde importa de verdad en el Sprint 1:
 *
 *  · HU-STK-04 · registrar movimiento: valida fichas → inserta cabecera y
 *    detalle → actualiza N fichas de stock. Si falla el paso 3, un movimiento
 *    a medias deja el inventario mintiendo.
 *  · HU-STK-02 · transferencia: egreso en origen + ingreso en destino. Se
 *    mueven las dos puntas o ninguna.
 *  · HU-COMP-02 · orden de compra: cabecera + N líneas de detalle.
 *  · HU-PROV-01 · proveedor: alta + sus formas de pago (N:M).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
