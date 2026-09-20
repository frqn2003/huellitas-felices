import type { Articulo } from "@/data/articulos";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

const variantes: Record<Articulo["estado"], StatusVariant> = {
  activo: "success",
  inactivo: "neutral",
};

// El badge muestra el label legible (C3): el valor crudo del enum viaja en
// minúscula ("activo"/"inactivo") pero en pantalla se lee "Activo"/"Inactivo".
const LABEL: Record<Articulo["estado"], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export function EstadoBadge({ articulo }: { articulo: Articulo }) {
  return (
    <StatusBadge variant={variantes[articulo.estado]} label={LABEL[articulo.estado]} />
  );
}
