import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type { FiltrosProveedor, ProveedorInput, ProveedorRow } from "./proveedor.types";

/**
 * HU-PROV-01 — capa de acceso a datos.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 * ACÁ NO VA: validaciones, reglas de negocio, transacciones (las abre el service).
 *
 * Por qué las funciones de escritura reciben `client`: para que el service
 * pueda meterlas todas en la misma transacción. Las de lectura usan el pool
 * directo porque no necesitan aislamiento.
 */

// Columnas explícitas, nunca SELECT *: si mañana alguien agrega una columna a
// la tabla, no debería aparecer sola en la respuesta de la API.
// `rubro` NO existe en esta base (si estaba en una version anterior del DDL).
// `calificacion` si existe pero es HU-PROV-02, fuera del Sprint 1: no se expone.
const COLUMNAS = `
  id, razon_social, cuit, direccion, telefono, email, contacto,
  plazo_entrega_dias, estado, calificacion
`;

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findAll(f: FiltrosProveedor = {}): Promise<ProveedorRow[]> {
  // Se arma dinámicamente pero SIEMPRE con placeholders: los valores nunca se
  // interpolan en el string.
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    // Busca en razón social o CUIT, como el buscador de FiltrosProveedores.tsx
    condiciones.push(`(p.razon_social ILIKE $${params.length} OR p.cuit ILIKE $${params.length})`);
  }

  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`p.estado = $${params.length}`);
  }

  if (f.formaPagoId) {
    params.push(f.formaPagoId);
    condiciones.push(`EXISTS (
      SELECT 1 FROM proveedor_forma_pago pfp
      WHERE pfp.proveedor_id = p.id AND pfp.forma_pago_id = $${params.length}
    )`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  return query<ProveedorRow>(
    `SELECT ${COLUMNAS}
     FROM proveedor p
     ${where}
     ORDER BY p.razon_social`,
    params,
  );
}

export async function findById(id: number): Promise<ProveedorRow | null> {
  const filas = await query<ProveedorRow>(
    `SELECT ${COLUMNAS} FROM proveedor p WHERE p.id = $1`,
    [id],
  );
  return filas[0] ?? null;
}

/**
 * Busca un proveedor ACTIVO con ese CUIT.
 *
 * "Activo" no es un detalle: el criterio de HU-PROV-01 dice "valida que el CUIT
 * no se encuentre duplicado entre proveedores activos". Si el proveedor está
 * inactivo, el CUIT se puede volver a usar.
 *
 * `excluirId` sirve para la edición: un proveedor no choca consigo mismo.
 */
export async function findActivoByCuit(
  cuit: string,
  excluirId?: number,
): Promise<ProveedorRow | null> {
  const filas = await query<ProveedorRow>(
    `SELECT ${COLUMNAS}
     FROM proveedor p
     WHERE p.cuit = $1
       AND p.estado = 'activo'
       AND ($2::int IS NULL OR p.id <> $2)`,
    [cuit, excluirId ?? null],
  );
  return filas[0] ?? null;
}

/**
 * Formas de pago de varios proveedores, en UNA query.
 *
 * Recibe un array y no un id justamente para no hacer N+1: el listado trae 50
 * proveedores y con una función por-id serían 51 consultas.
 */
export async function formasPagoDe(
  proveedorIds: number[],
): Promise<Map<number, string[]>> {
  const mapa = new Map<number, string[]>();
  if (proveedorIds.length === 0) return mapa;

  const filas = await query<{ proveedor_id: number; nombre: string }>(
    `SELECT pfp.proveedor_id, fp.nombre
     FROM proveedor_forma_pago pfp
     JOIN forma_pago fp ON fp.id = pfp.forma_pago_id
     WHERE pfp.proveedor_id = ANY($1::int[])
     ORDER BY fp.nombre`,
    [proveedorIds],
  );

  for (const fila of filas) {
    const actuales = mapa.get(fila.proveedor_id) ?? [];
    actuales.push(fila.nombre);
    mapa.set(fila.proveedor_id, actuales);
  }

  return mapa;
}

/**
 * Cuenta las órdenes de compra abiertas del proveedor.
 *
 * "Abierta" = su estado no es final (es_final = false en estado_orden_compra).
 * Se usa para bloquear la baja lógica: lo pide el comentario de
 * src/context/ProveedoresContext.tsx:67, donde el front avisa que esta
 * validación le corresponde al back.
 */
export async function contarOrdenesAbiertas(proveedorId: number): Promise<number> {
  const filas = await query<{ total: string }>(
    `SELECT count(*)::text AS total
     FROM orden_compra oc
     JOIN estado_orden_compra e ON e.id = oc.estado_id
     WHERE oc.proveedor_id = $1 AND e.es_final = false`,
    [proveedorId],
  );
  return Number(filas[0]?.total ?? 0);
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

export async function insert(
  data: ProveedorInput,
  client: PoolClient,
): Promise<ProveedorRow> {
  const { rows } = await client.query<ProveedorRow>(
    `INSERT INTO proveedor
       (razon_social, cuit, direccion, telefono, email, contacto, plazo_entrega_dias)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNAS}`,
    [
      data.razonSocial,
      data.cuit,
      data.direccion ?? null,
      data.telefono ?? null,
      data.email ?? null,
      data.contacto ?? null,
      data.plazoEntregaDias ?? null,
    ],
  );
  return rows[0];
}

export async function update(
  id: number,
  data: ProveedorInput,
  client: PoolClient,
): Promise<ProveedorRow | null> {
  const { rows } = await client.query<ProveedorRow>(
    `UPDATE proveedor
     SET razon_social = $2,
         cuit = $3,
         direccion = $4,
         telefono = $5,
         email = $6,
         contacto = $7,
         plazo_entrega_dias = $8
     WHERE id = $1
     RETURNING ${COLUMNAS}`,
    [
      id,
      data.razonSocial,
      data.cuit,
      data.direccion ?? null,
      data.telefono ?? null,
      data.email ?? null,
      data.contacto ?? null,
      data.plazoEntregaDias ?? null,
    ],
  );
  return rows[0] ?? null;
}

/**
 * Cambia el estado. La baja es LÓGICA: no hay DELETE en este módulo.
 * Criterio HU-PROV-01: "un proveedor inactivo no puede seleccionarse en nuevas
 * órdenes de compra, pero conserva su historial".
 */
export async function setEstado(
  id: number,
  estado: "activo" | "inactivo",
  client: PoolClient,
): Promise<ProveedorRow | null> {
  const { rows } = await client.query<ProveedorRow>(
    `UPDATE proveedor SET estado = $2 WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, estado],
  );
  return rows[0] ?? null;
}

/**
 * Reemplaza el set completo de formas de pago del proveedor.
 *
 * Borrar-e-insertar en vez de calcular el diff: son 4 filas como máximo, y
 * dentro de la transacción es atómico igual. Más simple de leer y de auditar.
 */
export async function reemplazarFormasPago(
  proveedorId: number,
  formaPagoIds: number[],
  client: PoolClient,
): Promise<void> {
  await client.query("DELETE FROM proveedor_forma_pago WHERE proveedor_id = $1", [
    proveedorId,
  ]);

  if (formaPagoIds.length === 0) return;

  await client.query(
    `INSERT INTO proveedor_forma_pago (proveedor_id, forma_pago_id)
     SELECT $1, unnest($2::int[])`,
    [proveedorId, formaPagoIds],
  );
}
