import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
  ClienteInput,
  ClienteRow,
  FiltrosCliente,
  MascotaRow,
} from "./cliente.types";

/**
 * HU-CLI-01 — Capa de acceso a datos para Clientes.
 */

const COLUMNAS = `
  id, nombre, apellido, documento, direccion, telefono, email,
  fecha_nacimiento, estado, created_at, updated_at
`;

export async function findAll(f: FiltrosCliente = {}): Promise<ClienteRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    const p = `$${params.length}`;
    condiciones.push(`(
      c.nombre ILIKE ${p} OR
      c.apellido ILIKE ${p} OR
      (c.nombre || ' ' || c.apellido) ILIKE ${p} OR
      c.documento ILIKE ${p} OR
      c.telefono ILIKE ${p} OR
      c.email ILIKE ${p}
    )`);
  }

  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`c.estado = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  return query<ClienteRow>(
    `SELECT ${COLUMNAS}
     FROM cliente c
     ${where}
     ORDER BY c.apellido, c.nombre`,
    params,
  );
}

export async function findById(id: number): Promise<ClienteRow | null> {
  const filas = await query<ClienteRow>(
    `SELECT ${COLUMNAS} FROM cliente c WHERE c.id = $1`,
    [id],
  );
  return filas[0] ?? null;
}

export async function findActivoByDocumento(
  documento: string,
  excluirId?: number,
): Promise<ClienteRow | null> {
  const filas = await query<ClienteRow>(
    `SELECT ${COLUMNAS}
     FROM cliente c
     WHERE c.documento = $1
       AND c.estado = 'activo'
       AND ($2::int IS NULL OR c.id <> $2)`,
    [documento, excluirId ?? null],
  );
  return filas[0] ?? null;
}

export async function findActivoByEmail(
  email: string,
  excluirId?: number,
): Promise<ClienteRow | null> {
  const filas = await query<ClienteRow>(
    `SELECT ${COLUMNAS}
     FROM cliente c
     WHERE lower(c.email) = lower($1)
       AND c.estado = 'activo'
       AND ($2::int IS NULL OR c.id <> $2)`,
    [email, excluirId ?? null],
  );
  return filas[0] ?? null;
}

export async function findInactivosDuplicados(
  documento: string,
  email: string,
): Promise<ClienteRow[]> {
  return query<ClienteRow>(
    `SELECT ${COLUMNAS}
     FROM cliente c
     WHERE c.estado = 'inactivo'
       AND (c.documento = $1 OR lower(c.email) = lower($2))
     ORDER BY c.apellido, c.nombre`,
    [documento, email],
  );
}

export async function findMascotasByClienteId(
  clienteId: number,
): Promise<MascotaRow[]> {
  return query<MascotaRow>(
    `SELECT id, cliente_id, nombre, especie, estado
     FROM mascota
     WHERE cliente_id = $1
     ORDER BY nombre`,
    [clienteId],
  );
}

export async function insert(
  input: ClienteInput,
  client: PoolClient,
): Promise<ClienteRow> {
  const res = await client.query<ClienteRow>(
    `INSERT INTO cliente (
       nombre, apellido, documento, direccion, telefono, email, fecha_nacimiento, estado
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNAS}`,
    [
      input.nombre,
      input.apellido,
      input.documento,
      input.direccion ?? null,
      input.telefono,
      input.email,
      input.fecha_nacimiento || null,
      input.estado ?? "activo",
    ],
  );
  return res.rows[0];
}

export async function update(
  id: number,
  input: ClienteInput,
  client: PoolClient,
): Promise<ClienteRow> {
  const res = await client.query<ClienteRow>(
    `UPDATE cliente
     SET nombre = $1,
         apellido = $2,
         documento = $3,
         direccion = $4,
         telefono = $5,
         email = $6,
         fecha_nacimiento = $7,
         estado = $8,
         updated_at = now()
     WHERE id = $9
     RETURNING ${COLUMNAS}`,
    [
      input.nombre,
      input.apellido,
      input.documento,
      input.direccion ?? null,
      input.telefono,
      input.email,
      input.fecha_nacimiento || null,
      input.estado ?? "activo",
      id,
    ],
  );
  return res.rows[0];
}
