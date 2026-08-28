import type { Articulo, Categoria, UnidadMedida } from "@/data/articulos";
import type { ArticuloRow } from "./articulo.types";

/**
 * HU-STK-01 — fila de Postgres → shape que el front espera.
 *
 * Cuatro traducciones, ninguna cosmética:
 *
 *  1. snake_case → camelCase (`categoria_id` → `categoriaId`).
 *
 *  2. Estado: la base usa el enum 'activo'/'inactivo' en minúscula; el front
 *     declara `estado: "Activo" | "Inactivo"` y lo muestra tal cual en
 *     EstadoBadge. Además el front tiene un `activo: boolean` redundante que se
 *     deriva del mismo dato.
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
    // El cast es seguro mientras las categorías de la base sean las 4 del
    // catálogo sembrado (Medicamentos, Insumos, Alimentos, Accesorios).
    // Si alguien agrega una quinta desde el SQL Editor, el tipo del front miente
    // y hay que ampliar la unión `Categoria` en src/data/articulos.ts.
    categoria: row.categoria_nombre as Categoria,

    unidadMedidaId: row.unidad_medida_id,
    unidadMedida: row.unidad_medida_nombre as UnidadMedida,

    fabricanteId: row.fabricante_id,
    fabricante: row.fabricante_nombre,

    proveedorPreferido:
      row.proveedor_preferido_id && row.proveedor_preferido_nombre
        ? { id: row.proveedor_preferido_id, nombre: row.proveedor_preferido_nombre }
        : null,

    estado: row.estado === "activo" ? "Activo" : "Inactivo",
    activo: row.estado === "activo",

    imagen: row.imagen_url ?? "",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toApiList(rows: ArticuloRow[]): Articulo[] {
  return rows.map(toApi);
}
