import type { Articulo } from "@/data/articulos";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

export type EstadoArticulo = Articulo["estado"];

const variantes: Record<EstadoArticulo, StatusVariant> = {
  activo: "success",
  inactivo: "neutral",
};

// El badge muestra el label legible (C3): el valor crudo del enum viaja en
// minúscula ("activo"/"inactivo") pero en pantalla se lee "Activo"/"Inactivo".
const LABEL: Record<EstadoArticulo, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

/**
 * Estado del artículo sobre StatusBadge (nunca colores propios).
 *
 * Se puede pasar `estado` en lugar de `articulo` cuando no se tiene el objeto
 * completo (ej: las filas de Lista de Precios, HU-STK-03). Si no se pasa
 * ninguno de los dos no hay nada que mostrar.
 */
export function EstadoBadge({
  articulo,
  estado,
}: {
  articulo?: Articulo;
  estado?: EstadoArticulo;
}) {
  const valor = estado ?? articulo?.estado;
  if (!valor) return null;
  return <StatusBadge variant={variantes[valor]} label={LABEL[valor]} />;
}
