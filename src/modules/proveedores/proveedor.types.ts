import type { Row } from "@/lib/db/schema.types";

/**
 * HU-PROV-01 — tipos del módulo Proveedores.
 *
 * Dos mundos separados a propósito:
 *  · *Row  → lo que devuelve Postgres (snake_case, estado en minúscula)
 *  · el shape público lo define el FRONT en src/data/proveedores.ts y el
 *    mapper lo produce. No se redefine acá para que no se puedan desincronizar.
 */

/**
 * Fila cruda de la tabla `proveedor`.
 *
 * Se DERIVA del esquema real (src/lib/db/schema.types.ts, que genera
 * `npm run db:types`) en vez de escribirse a mano. Antes era una copia manual:
 * si alguien renombraba una columna, este tipo seguía compilando y el error
 * aparecía recién en producción como un 42703. Ahora no compila.
 *
 * El `Pick` lista las columnas que este módulo consulta —las mismas de la
 * constante COLUMNAS del repo— así que pedir una columna que ya no existe
 * también falla al compilar.
 */
export type ProveedorRow = Pick<
  Row<"proveedor">,
  | "id"
  | "razon_social"
  | "cuit"
  | "direccion"
  | "telefono"
  | "email"
  | "contacto"
  | "plazo_entrega_dias"
  | "estado"
  | "calificacion"
>;

/** Filtros del listado. Salen de FiltrosProveedores.tsx. */
export type FiltrosProveedor = {
  /** Busca en razón social o CUIT. */
  busqueda?: string;
  estado?: "activo" | "inactivo";
  formaPagoId?: number;
};

/** Datos para insertar o actualizar (ya validados por el schema). */
export type ProveedorInput = {
  razonSocial: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  plazoEntregaDias?: number;
  formaPagoIds: number[];
};
