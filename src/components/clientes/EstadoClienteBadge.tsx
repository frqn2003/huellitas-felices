import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EstadoCliente } from "@/data/clientes";

interface EstadoClienteBadgeProps {
  estado: EstadoCliente;
}

export function EstadoClienteBadge({ estado }: EstadoClienteBadgeProps) {
  // El badge recibe el valor crudo del enum (C3): "activo"/"inactivo" en
  // minúscula desde la data, y acá se mapea al label + variante de color.
  return estado === "activo" ? (
    <StatusBadge variant="success" label="Activo" />
  ) : (
    <StatusBadge variant="neutral" label="Inactivo" />
  );
}