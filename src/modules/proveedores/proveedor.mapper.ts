import type { Proveedor } from "@/data/proveedores";
import type { ProveedorRow } from "./proveedor.types";

/**
 * HU-PROV-01 — traduce fila de Postgres → shape que el front espera.
 *
 * POR QUÉ EXISTE ESTA CAPA (tres traducciones que no son opcionales):
 *
 *  1. Contrato directo (C1): el front declaró los nombres de la BD tal cual
 *     (`razon_social`, `plazo_entrega_dias`), sin mapeo camelCase. Y ojo: esto
 *     NO es parejo en todo el proyecto. Stock y Artículos conservan camelCase en
 *     los catálogos (`categoriaId`, `unidadMedidaId`) y Órdenes de Compra usa
 *     snake_case con relaciones prefijadas (`proveedor_id`, `_proveedor`,
 *     `_detalles`). Cada mapper copia el estilo de SU módulo.
 *
 *  2. Casing del estado (C3).
 *     El enum de la base es 'activo' | 'inactivo' (minúscula) y es EL MISMO que
 *     declara el front (`EstadoProveedor`) — se pasa tal cual, sin traducir. El
 *     badge (EstadoProveedorBadge) es quien muestra "Activo"/"Inactivo".
 *
 *  3. decimal → number.
 *     El driver `pg` devuelve los decimal como STRING para no perder precisión.
 *     Si eso llega al front sin convertir, `plazoEntregaDias` viene "5" en vez
 *     de 5 y cualquier comparación numérica falla en silencio.
 *
 * El tipo `Proveedor` se importa de src/data/proveedores.ts a propósito: es el
 * contrato compartido. Si el front cambia la interfaz, esto deja de compilar —
 * que es exactamente lo que queremos que pase.
 */

export function toApi(row: ProveedorRow, formasPago: string[]): Proveedor {
  return {
    id: row.id,
    razon_social: row.razon_social,
    cuit: row.cuit,
    direccion: row.direccion ?? "",
    telefono: row.telefono ?? "",
    email: row.email ?? "",
    contacto: row.contacto ?? "",
    formasPago,
    plazo_entrega_dias: row.plazo_entrega_dias ?? 0,
    // C3: valor crudo del enum de la base — minúscula ya, sin traducción.
    estado: row.estado,
  };

  // NOTA: `calificacion` existe en la tabla pero NO se expone: es HU-PROV-02
  // (Evaluación de Desempeño), fuera del Sprint 1. Cuando entre esa HU se
  // agrega acá y a la interfaz del front a la vez.
  // `rubro` no existe en esta versión de la base (sí estaba en el DDL anterior).
}

/** Mapea un listado resolviendo las formas de pago en una sola query. */
export function toApiList(
  rows: ProveedorRow[],
  formasPagoPorProveedor: Map<number, string[]>,
): Proveedor[] {
  return rows.map((row) => toApi(row, formasPagoPorProveedor.get(row.id) ?? []));
}
