export type UnidadMedida = "Unidad" | "Kg" | "L" | "mL" | "Caja";

export type Categoria = "Medicamentos" | "Insumos" | "Alimentos" | "Accesorios";

export interface Proveedor {
  id: number;
  nombre: string;
}

export interface Articulo {
  id: number;
  /** Lo genera la base (trigger fn_generar_cod_articulo): MED-000001. Solo lectura. */
  codigo: string;
  nombre: string;
  descripcion: string;
  // Categoría, unidad, fabricante y presentación son TABLAS en la base. La API
  // devuelve el id (lo que necesita el formulario para su select) y el nombre
  // (lo que muestra la tabla), así ninguna pantalla tiene que resolver la otra
  // mitad. Los ids siguen el nombre del dict (snake_case, convención C1).
  categoriaId: number;
  categoria: Categoria;
  unidadMedidaId: number;
  unidadMedida: UnidadMedida;
  fabricante_id: number;
  fabricante: string;
  /** FK → presentacion.id (NOT NULL en la base). */
  presentacion_id?: number;
  /** Nombre de la presentación, resuelto por JOIN. */
  presentacion?: string;
  /** Nro. de lote (dict: opcional). BACKEND: pendiente en la API. */
  numero_lote?: string;
  /** Fecha de vencimiento ISO (YYYY-MM-DD). BACKEND: pendiente en la API. */
  fecha_vencimiento?: string;
  /** Contenido neto (dict: numeric(10,2), default 1). BACKEND: pendiente en la API. */
  /** Contenido neto (el 500 de "500 ml"). Lo emite la API. */
  contenido_neto?: number;
  proveedorPreferido: Proveedor | null;
  /** Valor crudo del enum de la BD (C3): "activo" | "inactivo". Las pantallas
      muestran "Activo"/"Inactivo" en badges, filtros y CSV. */
  estado: "activo" | "inactivo";
  /** Ruta pública de la imagen (`/uploads/articulos/...`). Vacío = sin imagen. */
  imagen_url: string;
  /** dict: created_at/updated_at los pone la base. Solo lectura. */
  created_at: string;
  updated_at: string;
}

/** Catálogos que pobla el formulario. GET /api/articulos/catalogos */
export interface CatalogosArticulo {
  categorias: { id: number; nombre: string }[];
  unidadesMedida: { id: number; nombre: string }[];
  fabricantes: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
  /**
   * Los emite GET /api/articulos/catalogos leyendo la tabla `presentacion`.
   *
   * Acá había un array `PRESENTACIONES` hardcodeado al que el front caía si la
   * API no los mandaba. Se borró: sus ids no coincidían con los de la tabla
   * (id 1 era "Comprimido" acá y es "Bolsa" en la base), así que el formulario
   * guardaba la presentación equivocada sin decir nada.
   */
  presentaciones: { id: number; nombre: string }[];
}

export const CATEGORIAS: Categoria[] = [
  "Medicamentos",
  "Insumos",
  "Alimentos",
  "Accesorios",
];

export const UNIDADES: UnidadMedida[] = ["Unidad", "Kg", "L", "mL", "Caja"];



// BACKEND: poblar desde GET /api/proveedores. Cada `id` es la PK en la base de datos.
export const PROVEEDORES: Proveedor[] = [
  { id: 5, nombre: "Laboratorios Pharma S.A." },
  { id: 8, nombre: "Vetmed Labs" },
  { id: 12, nombre: "Distribuidora Mascotas Felices" },
  { id: 15, nombre: "Agroalimentos del Sur" },
];

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

