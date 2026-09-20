/**
 * Verifica las suposiciones que el código hace sobre los DATOS de la base.
 *
 *   npm run db:check
 *
 * ── QUÉ CUBRE, Y POR QUÉ NO ALCANZA CON EL TYPECHECK ─────────────────────────
 *
 * `npm run db:types` + `npm run typecheck` detectan cambios de ESTRUCTURA: si
 * alguien renombra una columna, el código no compila.
 *
 * Pero hay un puñado de lugares donde el código depende de FILAS concretas —
 * de que exista un estado llamado "cancelado", un origen llamado "ajuste", un
 * rol llamado "Veterinario". Eso el compilador no lo puede ver: son strings.
 * Si alguien renombra una fila desde el SQL Editor, el código sigue compilando
 * y falla en silencio:
 *
 *   · la máquina de estados de turnos rechazaría TODAS las transiciones
 *   · el formulario de movimientos no ofrecería ningún origen
 *   · el catálogo de profesionales saldría vacío
 *
 * Este script es la red para eso. Corre en segundos y no modifica nada.
 *
 * ── CÓMO AGREGAR UNA VERIFICACIÓN ────────────────────────────────────────────
 *
 * Sumá una entrada a CHEQUEOS. Cada una dice qué espera, dónde está escrito en
 * el código, y qué se rompe si falta — ese último dato es el que hace útil el
 * mensaje cuando el script falla un lunes a la mañana.
 *
 * Sale con código 1 si algo falta, para poder usarlo en CI.
 */

import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Copiá .env.example a .env.local y completalo.");
  process.exit(1);
}

/**
 * Cada chequeo: los valores que el código espera encontrar en una columna.
 */
const CHEQUEOS = [
  {
    que: "estado_turno.nombre",
    sql: "SELECT nombre FROM estado_turno",
    espera: ["pendiente", "confirmado", "cancelado", "atendido", "no_asistio"],
    donde: "src/modules/turnos/turno.service.ts → TRANSICIONES",
    rompe: "la máquina de estados rechaza TODAS las transiciones de turno (HU-TUR-02)",
  },
  {
    que: "origen_movimiento.nombre",
    sql: "SELECT nombre FROM origen_movimiento",
    espera: ["venta", "recepcion_compra", "transferencia_sucursal", "ajuste"],
    donde: "src/data/movimientos.ts → origenesPorTipo",
    rompe: "el formulario de movimientos no ofrece orígenes válidos para el tipo elegido",
  },
  {
    que: "rol.nombre",
    sql: "SELECT nombre FROM rol",
    espera: ["Veterinario", "Recepcionista", "Administrador"],
    donde: "src/modules/turnos/turno.repo.ts → listarProfesionales()",
    rompe: "GET /api/profesionales devuelve vacío y no se pueden dar turnos",
  },
  {
    que: "estado_orden_compra.nombre",
    sql: "SELECT nombre FROM estado_orden_compra",
    espera: ["pendiente", "enviada", "recibida_parcial", "recibida_total", "cancelada"],
    donde: "src/modules/compras/orden.service.ts → TRANSICIONES",
    rompe: "no se puede enviar ni cancelar una orden de compra",
  },
];

/**
 * Catálogos que tienen que tener AL MENOS una fila para que su pantalla sirva.
 *
 * Esto no es un error del código sino de los datos: la base está bien pero
 * falta sembrarla. Sale como aviso, no como falla.
 */
const NO_VACIOS = [
  { tabla: "practica", para: "el wizard de turnos no ofrece ninguna práctica" },
  { tabla: "agenda_profesional", para: "ningún profesional tiene horarios y no se pueden dar turnos" },
  { tabla: "forma_pago", para: "los selects de forma de pago salen vacíos" },
  { tabla: "tipo_comprobante", para: "no se pueden registrar comprobantes" },
  { tabla: "deposito", para: "no se pueden registrar movimientos de stock" },
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

let fallas = 0;
let avisos = 0;

console.log("Verificando las suposiciones del código sobre los datos…\n");

for (const c of CHEQUEOS) {
  let presentes;
  try {
    const { rows } = await client.query(c.sql);
    presentes = new Set(rows.map((r) => r.nombre));
  } catch (e) {
    fallas++;
    console.log(`✗ ${c.que}`);
    console.log(`    no se pudo consultar: ${e.message.split("\n")[0]}`);
    console.log(`    lo usa: ${c.donde}\n`);
    continue;
  }

  const faltan = c.espera.filter((v) => !presentes.has(v));

  if (faltan.length === 0) {
    console.log(`✓ ${c.que}  (${c.espera.length} valores esperados, todos presentes)`);
  } else {
    fallas++;
    console.log(`✗ ${c.que}`);
    console.log(`    faltan: ${faltan.map((f) => `"${f}"`).join(", ")}`);
    console.log(`    hay:    ${[...presentes].map((p) => `"${p}"`).join(", ")}`);
    console.log(`    lo usa: ${c.donde}`);
    console.log(`    si falta: ${c.rompe}\n`);
  }
}

console.log();

for (const n of NO_VACIOS) {
  try {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM ${n.tabla}`);
    const total = rows[0].n;
    if (total > 0) {
      console.log(`✓ ${n.tabla.padEnd(22)} ${total} fila(s)`);
    } else {
      avisos++;
      console.log(`⚠ ${n.tabla.padEnd(22)} VACÍA — ${n.para}`);
    }
  } catch (e) {
    fallas++;
    console.log(`✗ ${n.tabla.padEnd(22)} no se pudo consultar: ${e.message.split("\n")[0]}`);
  }
}

await client.end();

console.log();
if (fallas > 0) {
  console.log(`${fallas} problema(s). El código espera valores que la base no tiene.`);
  console.log("Revisá si alguien renombró una fila de catálogo, o si falta correr db/seeds/.");
  process.exit(1);
}
if (avisos > 0) {
  console.log(`Sin problemas de integridad. ${avisos} catálogo(s) vacío(s) — ver arriba.`);
} else {
  console.log("Todo en orden.");
}
