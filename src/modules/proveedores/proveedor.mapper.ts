import type { Proveedor } from "@/data/proveedores";
import type { ProveedorRow } from "./proveedor.types";

/**
 * HU-PROV-01 — traduce fila de Postgres → shape que el front espera.
 *
 * POR QUÉ EXISTE ESTA CAPA (tres traducciones que no son opcionales):
 *
 *  1. snake_case → camelCase.
 *     `razon_social` → `razonSocial`. Y ojo: esto NO es parejo en todo el
 *     proyecto. Proveedores, Stock, Artículos y Movimientos usan camelCase,
 *     pero Órdenes de Compra usa snake_case con relaciones prefijadas
 *     (`proveedor_id`, `_proveedor`, `_detalles`). Cada mapper copia el estilo
 *     de SU módulo. Unificarlo es trabajo del front, no del back.
 *
 *  2. Casing del estado.
 *     El enum de la base es 'activo' | 'inactivo' (minúscula). El front
 *     declara `EstadoProveedor = "Activo" | "Inactivo"` (capitalizado) y lo
 *     muestra tal cual en EstadoProveedorBadge. Si no se traduce, el badge
 *     queda vacío.
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
    razonSocial: row.razon_social,
    cuit: row.cuit,
    direccion: row.direccion ?? "",
    telefono: row.telefono ?? "",
    email: row.email ?? "",
    contacto: row.contacto ?? "",
    formasPago,
    plazoEntregaDias: row.plazo_entrega_dias ?? 0,
    estado: row.estado === "activo" ? "Activo" : "Inactivo",
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
