// Contrato del módulo Artículos: la forma EXACTA que devuelve GET /api/articulos.
//
// REGLA: un campo entra acá cuando la API lo manda, y va OPCIONAL solo si la
// API a veces no lo manda. Un `?` puesto "por las dudas" apaga al compilador y
// convierte un bug en un valor `undefined` que nadie ve.
//
// SE QUITARON DOS CAMPOS:
//   numero_lote?: string;
//   fecha_vencimiento?: string;
// Son de HU-STK-05 (lotes y vencimientos), que no está implementada: ni el
// mapper los emite ni el POST los manda (ver src/app/articulos/page.tsx). El
// formulario tiene inputs para los dos, así que recogían texto que se
// descartaba y nunca se podían precargar al editar.
//
// Y TRES DEJARON DE SER OPCIONALES (presentacion_id, presentacion,
// contenido_neto): el mapper SIEMPRE los emite y las columnas son NOT NULL. El
// `?` solo obligaba a escribir `?? ""` en cada uso, escondiendo que el dato
// siempre está.
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
  /**
   * NOMBRE de la categoría, resuelto por el JOIN del back.
   *
   * Es `string` y no una unión cerrada a propósito. Antes era
   * `"Medicamentos" | "Insumos" | "Alimentos" | "Accesorios"` y el mapper hacía
   * `row.categoria_nombre as Categoria` para que compilara: un cast que MIENTE
   * apenas alguien agrega una categoría desde el SQL Editor. El propio
   * comentario del mapper lo admitía ("hay que ampliar la unión"), o sea que
   * cada fila nueva en la tabla `categoria` exigía editar código a mano.
   *
   * La lista de categorías vive en la tabla `categoria`; el front la pide por
   * GET /api/articulos/catalogos y no necesita conocerla de antemano.
   */
  categoria: string;
  unidadMedidaId: number;
  /** Ídem categoría: el nombre viene de la tabla `unidad_medida`. */
  unidadMedida: string;
  fabricante_id: number;
  fabricante: string;
  /** FK → presentacion.id. NOT NULL en la base, siempre viene. */
  presentacion_id: number;
  /** Nombre de la presentación, resuelto por JOIN. Siempre viene. */
  presentacion: string;
  /** Contenido neto (el 500 de "500 ml"). NOT NULL con DEFAULT 1. */
  contenido_neto: number;
  /**
   * Proveedor "preferido": no es una columna de `articulo`, lo deriva el back
   * del último comprobante de compra. `null` si el artículo nunca se compró.
   */
  proveedorPreferido: { id: number; nombre: string } | null;
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

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

