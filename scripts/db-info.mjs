/**
 * Inspecciona la base: qué tablas, columnas, constraints, enums e índices hay.
 *
 *   npm run db:info        resumen (tablas + cantidad de filas)
 *   npm run db:info:full   todo: columnas, constraints, índices, triggers
 *
 * (script aparte para --full porque npm se come los flags que empiezan con --,
 *  aun pasandolos despues de un separador --)
 *
 * Para qué sirve: un DER en imagen no muestra los UNIQUE, los CHECK, los valores
 * de los enum ni las acciones ON DELETE. Esto sí. Es lo que hay que correr contra
 * la base real para comparar con db/migrations/0001_baseline.sql, que se
 * reconstruyó a mano y es una hipótesis.
 *
 * Solo lee. No modifica nada.
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Copiá .env.example a .env.local y completalo.");
  process.exit(1);
}

const full = process.argv.includes("--full");

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const titulo = (t) => console.log(`\n${"=".repeat(60)}\n${t}\n${"=".repeat(60)}`);

try {
  const { rows: version } = await client.query("SELECT version()");
  console.log(version[0].version.split(",")[0]);

  // ---------------------------------------------------------
  // Tablas + cantidad de filas
  // ---------------------------------------------------------
  titulo("TABLAS");

  const { rows: tablas } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  if (tablas.length === 0) {
    console.log("(vacía — no hay ninguna tabla en el schema public)");
  }

  for (const { tablename } of tablas) {
    // count(*) exacto: son tablas chicas, no hace falta estimar
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM "${tablename}"`,
    );
    console.log(`  ${tablename.padEnd(30)} ${String(rows[0].n).padStart(6)} filas`);
  }

  // ---------------------------------------------------------
  // Enums — el DER no los muestra y acá hubo sorpresas
  // ---------------------------------------------------------
  titulo("ENUMS");

  const { rows: enums } = await client.query(`
    SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);

  if (enums.length === 0) console.log("(ninguno)");
  for (const e of enums) console.log(`  ${e.typname}: ${e.valores}`);

  // ---------------------------------------------------------
  // Vistas
  // ---------------------------------------------------------
  const { rows: vistas } = await client.query(
    "SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname",
  );
  if (vistas.length) {
    titulo("VISTAS");
    for (const v of vistas) console.log(`  ${v.viewname}`);
  }

  // ---------------------------------------------------------
  // Migraciones aplicadas
  // ---------------------------------------------------------
  const { rows: existe } = await client.query(`
    SELECT to_regclass('public._migracion') IS NOT NULL AS existe
  `);

  titulo("MIGRACIONES APLICADAS");
  if (!existe[0].existe) {
    console.log("(la tabla _migracion no existe — nunca se corrió npm run db:migrate)");
  } else {
    const { rows: migs } = await client.query(
      "SELECT nombre, aplicada_en FROM _migracion ORDER BY nombre",
    );
    if (migs.length === 0) console.log("(ninguna)");
    for (const m of migs) {
      console.log(`  ✓ ${m.nombre.padEnd(40)} ${m.aplicada_en.toISOString()}`);
    }
  }

  if (!full) {
    console.log("\n(usá  npm run db:info -- --full  para ver columnas, constraints e índices)");
    process.exit(0);
  }

  // ---------------------------------------------------------
  // Columnas
  // ---------------------------------------------------------
  titulo("COLUMNAS");

  const { rows: columnas } = await client.query(`
    SELECT table_name, column_name, data_type, udt_name,
           character_maximum_length AS largo,
           numeric_precision AS precision, numeric_scale AS escala,
           is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  let tablaActual = null;
  for (const c of columnas) {
    if (c.table_name !== tablaActual) {
      tablaActual = c.table_name;
      console.log(`\n  ${tablaActual}`);
    }
    let tipo = c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type;
    if (c.largo) tipo += `(${c.largo})`;
    else if (c.precision && c.escala !== null) tipo += `(${c.precision},${c.escala})`;

    const nn = c.is_nullable === "NO" ? " NOT NULL" : "";
    const def = c.column_default ? ` DEFAULT ${c.column_default}` : "";
    console.log(`    ${c.column_name.padEnd(26)} ${tipo}${nn}${def}`);
  }

  // ---------------------------------------------------------
  // Constraints — lo que un DER NO muestra
  // ---------------------------------------------------------
  titulo("CONSTRAINTS");

  const { rows: constraints } = await client.query(`
    SELECT conrelid::regclass::text AS tabla, conname,
           CASE contype
             WHEN 'p' THEN 'PK' WHEN 'f' THEN 'FK' WHEN 'u' THEN 'UNIQUE'
             WHEN 'c' THEN 'CHECK' ELSE contype::text
           END AS tipo,
           pg_get_constraintdef(oid) AS definicion
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text, contype, conname
  `);

  tablaActual = null;
  for (const c of constraints) {
    if (c.tabla !== tablaActual) {
      tablaActual = c.tabla;
      console.log(`\n  ${tablaActual}`);
    }
    console.log(`    [${c.tipo.padEnd(6)}] ${c.conname}`);
    console.log(`             ${c.definicion}`);
  }

  // ---------------------------------------------------------
  // Índices — los parciales (WHERE ...) son criterios de aceptación
  // ---------------------------------------------------------
  titulo("ÍNDICES");

  const { rows: indices } = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  tablaActual = null;
  for (const i of indices) {
    if (i.tablename !== tablaActual) {
      tablaActual = i.tablename;
      console.log(`\n  ${tablaActual}`);
    }
    const parcial = i.indexdef.includes(" WHERE ") ? "  ← PARCIAL" : "";
    console.log(`    ${i.indexname}${parcial}`);
    console.log(`      ${i.indexdef}`);
  }

  // ---------------------------------------------------------
  // Triggers
  // ---------------------------------------------------------
  titulo("TRIGGERS");

  // El `tgname` solo no alcanza: importa CUANDO dispara (BEFORE/AFTER) y ANTE QUE
  // (INSERT/UPDATE/DELETE). Un BEFORE UPDATE que regenera un codigo, por ejemplo,
  // le cambia el identificador a un registro cada vez que se lo edita.
  const { rows: triggers } = await client.query(`
    SELECT c.relname AS tabla, t.tgname,
           pg_get_triggerdef(t.oid) AS definicion
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  `);

  if (triggers.length === 0) console.log("(ninguno)");
  for (const t of triggers) {
    console.log(`
  ${t.tabla} · ${t.tgname}`);
    console.log(`    ${t.definicion}`);
  }

  // ---------------------------------------------------------
  // Cuerpo de las funciones
  // ---------------------------------------------------------
  // Lo mas importante de todo el reporte: si hay logica de negocio en triggers,
  // el service NO tiene que repetirla. Sin ver estos cuerpos es imposible saber
  // que hace la base sola y que le toca a la aplicacion.
  titulo("FUNCIONES (cuerpo)");

  const { rows: funciones } = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS definicion
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  `);

  if (funciones.length === 0) console.log("(ninguna)");
  for (const f of funciones) {
    console.log(`
${"-".repeat(60)}
${f.proname}
${"-".repeat(60)}`);
    console.log(f.definicion);
  }
} finally {
  await client.end();
}
