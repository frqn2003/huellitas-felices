/**
 * HU-STK-03 — tipos del módulo Lista de Precios de Venta.
 *
 * Dos "sujetos" con la misma mecánica: artículos (`lista_precio`) y prácticas /
 * servicios (`lista_precio_practica`, p. ej. la consulta médica). El repo los
 * resuelve con una config por sujeto; el resto del módulo no distingue.
 */

export type Sujeto = "articulo" | "practica";

/** Fila del listado: el sujeto con su precio vigente (null = sin precio → HF047 en venta). */
export type PrecioRow = {
  /** PK de lista_precio(_practica); null = todavía sin precio. */
  precio_id: number | null;
  /** articulo.id o practica.id. */
  sujeto_id: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  categoria_nombre: string | null;
  unidad_medida_nombre: string | null;
  fabricante_nombre: string | null;
  estado: "activo" | "inactivo";
  /** numeric → string desde `pg`. */
  precio: string | null;
  vigencia_desde: Date | null;
  usuario_id: number | null;
  usuario_nombre: string | null;
  fecha_registro: Date | null;
  updated_at: Date | null;
  /** Costo de referencia de la última OC (solo artículos). */
  costo_ref_oc: string | null;
};

/** Fila cruda de lista_precio(_practica) devuelta por fn_abm_*. */
export type ListaPrecioRow = {
  id: number;
  sujeto_id: number;
  precio: string;
  vigencia_desde: Date;
  usuario_id: number;
  fecha_registro: Date;
  updated_at: Date;
};

export type HistorialRow = {
  id: number;
  sujeto_id: number;
  precio: string;
  vigencia_desde: Date;
  vigencia_hasta: Date | null;
  usuario_id: number;
  usuario_nombre: string;
  fecha_hora: Date;
};

export type FiltrosPrecio = {
  busqueda?: string;
  categoriaId?: number;
  estado?: "activo" | "inactivo";
  /** true = solo con precio, false = solo sin precio. */
  conPrecio?: boolean;
};

export type ModoAbm = "INSERCION" | "EDICION" | "LECTURA";
