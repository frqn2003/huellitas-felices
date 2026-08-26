/**
 * HU-PROV-01 — tipos del módulo Proveedores.
 *
 * Dos mundos separados a propósito:
 *  · *Row  → lo que devuelve Postgres (snake_case, estado en minúscula)
 *  · el shape público lo define el FRONT en src/data/proveedores.ts y el
 *    mapper lo produce. No se redefine acá para que no se puedan desincronizar.
 */

/** Fila cruda de la tabla `proveedor`. */
export type ProveedorRow = {
  id: number;
  razon_social: string;
  cuit: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  plazo_entrega_dias: number | null;
  estado: "activo" | "inactivo";
  calificacion: string | null;
};

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
