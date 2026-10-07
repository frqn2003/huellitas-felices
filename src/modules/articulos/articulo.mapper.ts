import type { Articulo } from "@/data/articulos";
import type { ArticuloRow } from "./articulo.types";

/**
 * HU-STK-01 — fila de Postgres → shape que el front espera.
 *
 * Cuatro traducciones, ninguna cosmética:
 *
 *  1. Contrato mixto (C1): los catálogos conservan el camelCase histórico del
 *     front (`categoriaId`, `unidadMedidaId`) pero los campos nuevos siguen el
 *     dict en snake_case directo: `fabricante_id`, `imagen_url`,
 *     `created_at`/`updated_at`.
 *
 *  2. Estado (C3): la base usa el enum 'activo'/'inactivo' en minúscula y el
 *     front declara exactamente eso — se pasa el valor crudo, sin traducir.
 *     Badges, filtros y CSV muestran "Activo"/"Inactivo". El booleano `activo`
 *     ya no existe en el contrato (era una segunda fuente de verdad).
 *
 *  3. `Date` → string ISO. El driver `pg` devuelve los timestamp como objetos
 *     Date de JS. Al serializarse a JSON quedarían bien igual, pero el tipo del
 *     front dice `string`, así que se convierte explícito y no por accidente.
 *
 *  4. NULL → "". El front espera strings vacíos, no null: hace
 *     `articulo.descripcion.trim()` sin chequear, y con null eso explota.
 */
export function toApi(row: ArticuloRow): Articulo {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion ?? "",

    categoriaId: row.categoria_id,
    // Sin cast: `Articulo.categoria` es `string`.
    //
    // Acá había un `as Categoria` contra una unión de 4 valores fijos, con un
    // comentario que avisaba que si alguien agregaba una quinta categoría desde
    // el SQL Editor el tipo pasaba a mentir. Eso convertía cada fila nueva de la
    // tabla `categoria` en un cambio de código. El nombre es un dato de la base:
    // se pasa tal cual y la lista de opciones se pide por
    // GET /api/articulos/catalogos.
    categoria: row.categoria_nombre,

    unidadMedidaId: row.unidad_medida_id,
    unidadMedida: row.unidad_medida_nombre,

    // C1: snake_case directo como el dict.
    fabricante_id: row.fabricante_id,
    fabricante: row.fabricante_nombre,

    // Antes no se emitían y el formulario de EDICIÓN no podía preseleccionar la
    // presentación: abrías un artículo y el select arrancaba en la primera
    // opción, así que guardar sin tocar nada la cambiaba.
    presentacion_id: row.presentacion_id,
    presentacion: row.presentacion_nombre,
    // `numeric` llega como string desde `pg`.
    contenido_neto: Number(row.contenido_neto),

    proveedorPreferido:
      row.proveedor_preferido_id && row.proveedor_preferido_nombre
        ? { id: row.proveedor_preferido_id, nombre: row.proveedor_preferido_nombre }
        : null,

    // C3: valor crudo del enum (minúscula ya). El badge traduce a
    // "Activo"/"Inactivo" en el display.
    estado: row.estado,

    imagen_url: row.imagen_url ?? "",
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function toApiList(rows: ArticuloRow[]): Articulo[] {
  return rows.map(toApi);
}
