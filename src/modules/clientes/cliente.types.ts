import type { Row } from "@/lib/db/schema.types";

/**
 * HU-CLI-01 — tipos del módulo Clientes.
 */

import type { EstadoCliente } from "@/data/clientes";

/** Fila cruda de la tabla `cliente`. */
export type ClienteRow = Pick<
  Row<"cliente">,
  | "id"
  | "nombre"
  | "apellido"
  | "documento"
  | "direccion"
  | "telefono"
  | "email"
  | "fecha_nacimiento"
  | "estado"
  | "created_at"
  | "updated_at"
>;

/** Fila cruda de la tabla `mascota` asociada a un cliente. */
/**
 * Solo lo que el perfil del cliente necesita mostrar de cada mascota.
 *
 * La mascota completa (con raza, sexo, peso…) vive en su propio módulo:
 * src/modules/mascotas/. Acá se lee de la misma tabla, así una mascota nueva
 * aparece en el perfil de su dueño sin sincronizar nada — es el criterio 4 de
 * HU-MAS-01.
 */
export type MascotaRow = Pick<
  Row<"mascota">,
  "id" | "cliente_id" | "nombre" | "especie" | "estado"
>;

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
