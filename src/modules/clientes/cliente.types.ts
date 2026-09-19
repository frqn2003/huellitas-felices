/**
 * HU-CLI-01 — tipos del módulo Clientes.
 */

import type { EstadoCliente } from "@/data/clientes";

/** Fila cruda de la tabla `cliente`. */
export type ClienteRow = {
  id: number;
  nombre: string;
  apellido: string;
  documento: string;
  direccion: string | null;
  telefono: string;
  email: string;
  fecha_nacimiento: string | Date | null;
  estado: EstadoCliente;
  created_at: Date;
  updated_at: Date;
};

/** Fila cruda de la tabla `mascota` asociada a un cliente. */
export type MascotaRow = {
  id: number;
  cliente_id: number;
  nombre: string;
  especie: string;
  estado: EstadoCliente;
};

/** Filtros del listado de clientes. */
export type FiltrosCliente = {
  busqueda?: string;
  estado?: EstadoCliente;
};

/** Datos para insertar o actualizar cliente. */
export type ClienteInput = {
  nombre: string;
  apellido: string;
  documento: string;
  telefono: string;
  email: string;
  direccion?: string | null;
  fecha_nacimiento?: string | null;
  estado?: EstadoCliente;
};
