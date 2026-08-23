/**
 * Runner de migraciones.
 *
 *   node scripts/migrate.mjs           aplica las migraciones pendientes
 *   node scripts/migrate.mjs --fresh   borra el schema y aplica todo desde cero
 *   node scripts/migrate.mjs --status  lista qué está aplicado y qué falta
 *
 * Cada archivo de db/migrations/ se aplica UNA sola vez y queda registrado en
 * la tabla `_migracion`. Cada migración corre en su propia transacción: si
 * falla, no deja nada a medias.
 *
 * Por qué un runner propio y no una herramienta: son 9 archivos SQL y la
 * cátedra evalúa el SQL. Un runner de 80 líneas se lee completo; una
 * herramienta esconde el DDL detrás de su propio formato.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_MIGRACIONES = join(RAIZ, "db", "migrations");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Copiá .env.example a .env.local y cargalo.");
  process.exit(1);
}

const fresh = process.argv.includes("--fresh");
const soloEstado = process.argv.includes("--status");

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  if (fresh) {
    console.log("→ --fresh: recreando el schema public");
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migracion (
      nombre      varchar(200) PRIMARY KEY,
      aplicada_en timestamp NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await client.query("SELECT nombre FROM _migracion");
  const aplicadas = new Set(rows.map((r) => r.nombre));

  const archivos = (await readdir(DIR_MIGRACIONES))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (soloEstado) {
    for (const archivo of archivos) {
      console.log(`${aplicadas.has(archivo) ? "✓" : " "} ${archivo}`);
    }
    process.exit(0);
  }

  const pendientes = archivos.filter((f) => !aplicadas.has(f));

  if (pendientes.length === 0) {
    console.log("Sin migraciones pendientes.");
    process.exit(0);
  }

  for (const archivo of pendientes) {
    const sql = await readFile(join(DIR_MIGRACIONES, archivo), "utf8");
    process.stdout.write(`→ ${archivo} ... `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migracion (nombre) VALUES ($1)", [archivo]);
      await client.query("COMMIT");
      console.log("ok");
    } catch (e) {
      await client.query("ROLLBACK");
      console.log("FALLÓ");
      console.error(`\n${e.message}\n`);
      process.exit(1);
    }
  }

  console.log(`\n${pendientes.length} migración(es) aplicada(s).`);
} finally {
  await client.end();
}
