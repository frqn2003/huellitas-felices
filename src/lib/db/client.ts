import { Pool } from "pg";

/**
 * Pool de conexiones a Postgres.
 *
 * Se guarda en globalThis porque en `next dev` el hot reload vuelve a evaluar
 * este módulo en cada cambio: sin esto quedarían pools huérfanos abiertos hasta
 * agotar las conexiones de la base.
 */

declare global {
  var __huellitasPool: Pool | undefined;
}

function crearPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env.local (ver docs/backend/GUIA-IMPLEMENTACION.md §4).",
    );
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const pool: Pool = globalThis.__huellitasPool ?? crearPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__huellitasPool = pool;
}

/**
 * Query suelta, fuera de transacción. Para lecturas simples.
 * Las escrituras van SIEMPRE por withTransaction().
 */
export async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}
