/**
 * Vuelca el schema de la base a db/schema.sql
 *
 *   npm run db:dump
 *
 * PARA QUÉ SIRVE
 *   El equipo edita la estructura directamente en el SQL Editor de Supabase.
 *   Eso está bien, pero deja el schema viviendo en UN solo lugar: si el
 *   proyecto se pausa, se borra o alguien rompe algo, no hay con qué volver.
 *
 *   Este script lee la base y escribe el DDL completo en el repo. Con eso:
 *     · queda versionado en git (se ve qué cambió y cuándo, en el diff)
 *     · sirve de entregable para la cátedra (DDL + DER)
 *     · se puede recrear la base entera desde cero
 *
 *   NO reemplaza al SQL Editor: lo espeja. El flujo es
 *   cambiar en Supabase → correr esto → commitear.
 *
 * SOBRE EL ORDEN DEL ARCHIVO GENERADO
 *   Las tablas se crean primero SIN foreign keys, y las FK se agregan al final
 *   con ALTER TABLE. Así el archivo corre de arriba a abajo sin importar qué
 *   tabla depende de cuál — no hay que resolver el orden de dependencias.
 *
 * Solo lee. No modifica la base.
 */

import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "db", "schema.sql");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Copiá .env.example a .env.local y completalo.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const partes = [];
const seccion = (t) =>
  partes.push(`\n-- =========================================================\n-- ${t}\n-- =========================================================\n`);

try {
  partes.push(`-- =========================================================
-- Huellitas Felices — schema de la base
-- =========================================================
-- GENERADO AUTOMÁTICAMENTE por  npm run db:dump
-- NO editar a mano: los cambios se hacen en el SQL Editor de Supabase y
-- después se corre el dump de nuevo.
--
-- El archivo corre de arriba a abajo sobre una base vacía y reconstruye
-- todo: enums, secuencias, tablas, constraints, índices, funciones y triggers.
-- =========================================================
`);

  // ---------------------------------------------------------
  // ENUMS
  // ---------------------------------------------------------
  const { rows: enums } = await client.query(`
    SELECT t.typname,
           string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS valores
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);

  if (enums.length) {
    seccion("TIPOS ENUMERADOS");
    for (const e of enums) {
      partes.push(`CREATE TYPE ${e.typname} AS ENUM (${e.valores});`);
    }
    partes.push("");
  }

  // ---------------------------------------------------------
  // SECUENCIAS
  // ---------------------------------------------------------
  // Van antes que las tablas porque los DEFAULT nextval(...) las referencian.
  const { rows: secuencias } = await client.query(`
    SELECT sequencename FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename
  `);

  if (secuencias.length) {
    seccion("SECUENCIAS");
    for (const s of secuencias) {
      partes.push(`CREATE SEQUENCE IF NOT EXISTS ${s.sequencename};`);
    }
    partes.push("");
  }

  // ---------------------------------------------------------
  // TABLAS (sin constraints)
  // ---------------------------------------------------------
  seccion("TABLAS");

  const { rows: tablas } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_migracion'
    ORDER BY tablename
  `);

  for (const { tablename } of tablas) {
    const { rows: cols } = await client.query(
      `
      SELECT column_name, data_type, udt_name,
             character_maximum_length AS largo,
             numeric_precision AS precision, numeric_scale AS escala,
             is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      [tablename],
    );

    const lineas = cols.map((c) => {
      let tipo = c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type;
      if (c.largo) tipo += `(${c.largo})`;
      else if (c.precision !== null && c.escala !== null) tipo += `(${c.precision},${c.escala})`;

      let linea = `  ${c.column_name} ${tipo}`;
      if (c.column_default) linea += ` DEFAULT ${c.column_default}`;
      if (c.is_nullable === "NO") linea += " NOT NULL";
      return linea;
    });

    partes.push(`CREATE TABLE ${tablename} (\n${lineas.join(",\n")}\n);\n`);
  }

  // ---------------------------------------------------------
  // CONSTRAINTS que no son FK
  // ---------------------------------------------------------
  const { rows: constraints } = await client.query(`
    SELECT conrelid::regclass::text AS tabla, conname, contype,
           pg_get_constraintdef(oid) AS definicion
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conrelid::regclass::text <> '_migracion'
    ORDER BY conrelid::regclass::text, contype, conname
  `);

  const noFk = constraints.filter((c) => c.contype !== "f");
  if (noFk.length) {
    seccion("CLAVES PRIMARIAS, ÚNICOS Y CHECKS");
    for (const c of noFk) {
      partes.push(`ALTER TABLE ${c.tabla} ADD CONSTRAINT ${c.conname} ${c.definicion};`);
    }
    partes.push("");
  }

  // ---------------------------------------------------------
  // FOREIGN KEYS
  // ---------------------------------------------------------
  // Al final, para que el archivo no dependa del orden de creación.
  const fks = constraints.filter((c) => c.contype === "f");
  if (fks.length) {
    seccion("CLAVES FORÁNEAS");
    for (const c of fks) {
      partes.push(`ALTER TABLE ${c.tabla} ADD CONSTRAINT ${c.conname} ${c.definicion};`);
    }
    partes.push("");
  }

  // ---------------------------------------------------------
  // ÍNDICES
  // ---------------------------------------------------------
  // Solo los que NO respaldan un constraint: esos ya los creó el ALTER TABLE.
  const { rows: indices } = await client.query(`
    SELECT i.indexdef
    FROM pg_indexes i
    LEFT JOIN pg_constraint c
      ON c.conname = i.indexname
     AND c.connamespace = 'public'::regnamespace
    WHERE i.schemaname = 'public'
      AND c.oid IS NULL
      AND i.tablename <> '_migracion'
    ORDER BY i.tablename, i.indexname
  `);

  if (indices.length) {
    seccion("ÍNDICES");
    for (const i of indices) partes.push(`${i.indexdef};`);
    partes.push("");
  }

  // ---------------------------------------------------------
  // VISTAS
  // ---------------------------------------------------------
  // Van despues de las tablas y antes de las funciones: una vista depende de
  // las tablas que consulta, y puede ser usada por una funcion.
  const { rows: vistas } = await client.query(`
    SELECT viewname, definition
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname
  `);

  if (vistas.length) {
    seccion("VISTAS");
    for (const v of vistas) {
      partes.push(`CREATE OR REPLACE VIEW ${v.viewname} AS
${v.definition.trim()}
`);
    }
  }

  // ---------------------------------------------------------
  // FUNCIONES
  // ---------------------------------------------------------
  // Se excluyen las que devuelven `event_trigger`: son de Supabase
  // (rls_auto_enable), no del proyecto, y no hay que recrearlas.
  const { rows: funciones } = await client.query(`
    SELECT pg_get_functiondef(p.oid) AS definicion
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prorettype <> 'event_trigger'::regtype
    ORDER BY p.proname
  `);

  if (funciones.length) {
    seccion("FUNCIONES");
    for (const f of funciones) partes.push(`${f.definicion};\n`);
  }

  // ---------------------------------------------------------
  // TRIGGERS
  // ---------------------------------------------------------
  const { rows: triggers } = await client.query(`
    SELECT pg_get_triggerdef(t.oid) AS definicion
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  `);

  if (triggers.length) {
    seccion("TRIGGERS");
    for (const t of triggers) partes.push(`${t.definicion};`);
    partes.push("");
  }

  // ---------------------------------------------------------
  // COMENTARIOS
  // ---------------------------------------------------------
  const { rows: comentarios } = await client.query(`
    SELECT 'COMMENT ON TABLE ' || c.oid::regclass::text || ' IS ' ||
           quote_literal(obj_description(c.oid)) AS sentencia
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND obj_description(c.oid) IS NOT NULL
    UNION ALL
    SELECT 'COMMENT ON COLUMN ' || c.oid::regclass::text || '.' || a.attname || ' IS ' ||
           quote_literal(col_description(c.oid, a.attnum))
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND a.attnum > 0 AND NOT a.attisdropped
      AND col_description(c.oid, a.attnum) IS NOT NULL
    ORDER BY 1
  `);

  if (comentarios.length) {
    seccion("COMENTARIOS");
    for (const c of comentarios) partes.push(`${c.sentencia};`);
    partes.push("");
  }

  await writeFile(SALIDA, partes.join("\n"), "utf8");

  console.log(`✓ db/schema.sql actualizado`);
  console.log(
    `  ${tablas.length} tablas · ${vistas.length} vistas · ${enums.length} enums · ${funciones.length} funciones · ${triggers.length} triggers`,
  );
  console.log("\n  Revisá el diff con:  git diff db/schema.sql");
} finally {
  await client.end();
}
