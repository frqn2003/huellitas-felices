/**
 * HU-STK-01 — tipos del módulo Artículos.
 */

/**
 * Fila que devuelve el SELECT del repo.
 *
 * No es exactamente la tabla `articulo`: incluye los nombres de categoría,
 * unidad, fabricante y proveedor, que vienen resueltos por JOIN. El front
 * muestra los nombres pero el formulario necesita los ids, así que la API
 * devuelve LOS DOS.
 */
export type ArticuloRow = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: number;
  categoria_nombre: string;
  unidad_medida_id: number;
  unidad_medida_nombre: string;
  fabricante_id: number;
  fabricante_nombre: string;
  // DERIVADOS, no columnas: salen del LEFT JOIN LATERAL contra la última orden
  // de compra no cancelada (decisión D2). Ver LATERAL_PROVEEDOR en el repo.
  proveedor_preferido_id: number | null;
  proveedor_preferido_nombre: string | null;
  estado: "activo" | "inactivo";
  imagen_url: string | null;
  created_at: Date;
  updated_at: Date;
};

/** Filtros del listado. Salen de FiltrosArticulos.tsx. */
export type FiltrosArticulo = {
  /** Busca en código o nombre. */
  busqueda?: string;
  categoriaId?: number;
  unidadMedidaId?: number;
  proveedorId?: number;
  estado?: "activo" | "inactivo";
};

/**
 * Datos para insertar o actualizar.
 *
 * OJO: NO incluye `codigo`. Lo genera el trigger fn_generar_cod_articulo a
 * partir del prefijo de la categoría (MED-000001). Si la app lo mandara,
 * el trigger lo pisaría igual.
 */
export type ArticuloInput = {
  nombre: string;
  descripcion?: string;
  categoriaId: number;
  unidadMedidaId: number;
  fabricanteId: number;
  imagenUrl?: string | null;
  activo?: boolean;
};

/** Catálogos que necesita el formulario para poblar sus selects. */
export type CatalogosArticulo = {
  categorias: { id: number; nombre: string }[];
  unidadesMedida: { id: number; nombre: string }[];
  fabricantes: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
};
