import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EstadoProveedor } from "@/data/proveedores";

interface EstadoProveedorBadgeProps {
  estado: EstadoProveedor;
}

export function EstadoProveedorBadge({ estado }: EstadoProveedorBadgeProps) {
  return estado === "Activo" ? (
    <StatusBadge variant="success" label="Activo" />
  ) : (
    <StatusBadge variant="neutral" label="Inactivo" />
  );
}
