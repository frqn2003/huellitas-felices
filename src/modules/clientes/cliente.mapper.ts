import type { Cliente, Mascota } from "@/data/clientes";
import type { ClienteRow, MascotaRow } from "./cliente.types";

/**
 * HU-CLI-01 — Traduce fila de Postgres → shape que el front espera.
 */

function formatFecha(fecha: string | Date | null): string | null {
  if (!fecha) return null;
  if (typeof fecha === "string") return fecha.slice(0, 10);
  return fecha.toISOString().slice(0, 10);
}

export function toApi(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nombre: row.nombre,
    apellido: row.apellido,
    documento: row.documento,
    telefono: row.telefono,
    email: row.email,
    direccion: row.direccion,
    fecha_nacimiento: formatFecha(row.fecha_nacimiento),
    estado: row.estado,
  };
}

export function toApiList(rows: ClienteRow[]): Cliente[] {
  return rows.map(toApi);
}

export function toApiMascota(row: MascotaRow): Mascota {
  return {
    id: row.id,
    nombre: row.nombre,
    especie: row.especie,
    estado: row.estado,
  };
}

export function toApiMascotaList(rows: MascotaRow[]): Mascota[] {
  return rows.map(toApiMascota);
}
