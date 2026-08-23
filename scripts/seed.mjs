/**
 * Runner de seeds.
 *
 *   node scripts/seed.mjs              corre todo db/seeds/ en orden
 *   node scripts/seed.mjs --catalogos  solo 01_catalogos.sql
 *
 * A diferencia de las migraciones, los seeds se pueden correr muchas veces:
 * están escritos con ON CONFLICT DO NOTHING.
 *
 * 01_catalogos.sql → datos de operación (sin esto el sistema no funciona)
 * 02_demo.sql      → datos de prueba para la demo (descartables)
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_SEEDS = join(RAIZ, "db", "seeds");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Copiá .env.example a .env.local y cargalo.");
  process.exit(1);
}

const soloCatalogos = process.argv.includes("--catalogos");

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  const archivos = (await readdir(DIR_SEEDS))
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !soloCatalogos || f.startsWith("01_"))
    .sort();

  for (const archivo of archivos) {
    const sql = await readFile(join(DIR_SEEDS, archivo), "utf8");
    process.stdout.write(`→ ${archivo} ... `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("ok");
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("FALLÓ");
      console.error(`\n${e.message}\n`);
      process.exit(1);
    }
  }

  console.log(`\n${archivos.length} seed(s) aplicado(s).`);
} finally {
  await client.end();
}
