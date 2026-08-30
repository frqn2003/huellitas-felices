import type { Articulo } from "@/data/articulos";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";

const variantes: Record<Articulo["estado"], StatusVariant> = {
  Activo: "success",
  Inactivo: "neutral",
};

export function EstadoBadge({ articulo }: { articulo: Articulo }) {
  return <StatusBadge variant={variantes[articulo.estado]} label={articulo.estado} />;
}
