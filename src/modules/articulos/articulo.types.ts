import type { Row } from "@/lib/db/schema.types";

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
export type ArticuloRow = Pick<
  // Las columnas de la tabla `articulo`, DERIVADAS del esquema real
  // (`npm run db:types`). Si alguien renombra una, esto no compila.
  //
  // `contenido_neto` sale tipado como STRING y no como number: es `numeric`, y
  // el driver `pg` no lo convierte para no perder precisión. El mapper hace el
  // `Number()`.
  Row<"articulo">,
  | "id"
  | "codigo"
  | "nombre"
  | "descripcion"
  | "categoria_id"
  | "unidad_medida_id"
  | "fabricante_id"
  | "presentacion_id"
  | "contenido_neto"
  | "estado"
  | "imagen_url"
  | "created_at"
  | "updated_at"
> & {
  // Lo que NO es columna de `articulo` y el generador no puede conocer:
  // los nombres que traen los JOIN de catálogo...
  categoria_nombre: string;
  unidad_medida_nombre: string;
  fabricante_nombre: string;
  presentacion_nombre: string;
  // ...y el proveedor preferido, que sale del LEFT JOIN LATERAL contra la
  // última orden de compra no cancelada (decisión D2, ver LATERAL_PROVEEDOR).
  proveedor_preferido_id: number | null;
  proveedor_preferido_nombre: string | null;
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
  /**
   * FK a `presentacion`. La columna es NOT NULL y SIN DEFAULT, así que omitirla
   * en el INSERT es un 23502 — que era exactamente el 500 que devolvía el alta
   * de artículos.
   */
  presentacionId: number;
  /** `articulo.contenido_neto`. NOT NULL con DEFAULT 1. */
  contenidoNeto?: number;
  imagenUrl?: string | null;
  activo?: boolean;
};

/** Catálogos que necesita el formulario para poblar sus selects. */
export type CatalogosArticulo = {
  categorias: { id: number; nombre: string }[];
  unidadesMedida: { id: number; nombre: string }[];
  fabricantes: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
  /**
   * ⚠️ FALTABA, Y NO ERA COSMÉTICO.
   *
   * Sin esta lista el front caía a un array hardcodeado (`PRESENTACIONES` de
   * src/data/articulos.ts) cuyos ids NO coinciden con la tabla: ahí el id 1 era
   * "Comprimido" y en la base el id 1 es "Bolsa". O sea que aun arreglando el
   * INSERT, el formulario habría guardado la presentación equivocada sin
   * avisar.
   */
  presentaciones: { id: number; nombre: string }[];
};
