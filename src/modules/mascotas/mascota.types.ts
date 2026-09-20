import type { Row } from "@/lib/db/schema.types";

/**
 * HU-MAS-01 — tipos del módulo Mascotas.
 *
 * Dos mundos separados:
 *  · `MascotaRow` → lo que devuelve Postgres (snake_case, numeric como string)
 *  · el shape público lo define `Mascota` en src/data/mascotas.ts y lo produce
 *    el mapper.
 */

/**
 * Fila que devuelve el SELECT del repo.
 *
 * Las columnas de `mascota` se DERIVAN del esquema real
 * (src/lib/db/schema.types.ts, que genera `npm run db:types`), así un cambio en
 * la tabla rompe la compilación en vez de fallar en producción.
 *
 * ⚠️ `peso` sale tipado como STRING y no como number: la columna es `numeric` y
 *    el driver `pg` no la convierte (para no perder precisión). El mapper hace
 *    el `Number()`.
 */
export type MascotaRow = Pick<
  Row<"mascota">,
  | "id"
  | "cliente_id"
  | "nombre"
  | "especie"
  | "raza"
  | "sexo"
  | "peso"
  | "fecha_nacimiento"
  | "senas_particulares"
  | "estado"
> & {
  // Del JOIN con `cliente`: el listado muestra el nombre del dueño y la
  // búsqueda filtra por él. No son columnas de `mascota`.
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_documento: string;
};

/**
 * Filtros del listado. Salen de FiltrosMascotas.tsx.
 *
 * `busqueda` cubre lo que pide el brief: nombre de la mascota, nombre del dueño
 * o documento del dueño.
 */
export type FiltrosMascota = {
  busqueda?: string;
  estado?: "activo" | "inactivo";
  especie?: string;
  sexo?: string;
  /** Para el perfil de un cliente: solo sus mascotas. */
  clienteId?: number;
};

/** Datos para insertar o actualizar (ya validados por el schema). */
export type MascotaInput = {
  clienteId: number;
  nombre: string;
  especie: string;
  raza: string | null;
  sexo: string;
  peso: number | null;
  fechaNacimiento: string | null;
  senasParticulares: string | null;
  estado: "activo" | "inactivo";
};
