import type { EstadoProveedor } from "@/data/proveedores";

interface EstadoProveedorBadgeProps {
  estado: EstadoProveedor;
}

export function EstadoProveedorBadge({ estado }: EstadoProveedorBadgeProps) {
  if (estado === "Activo") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-status-success/10 px-2 py-0.5 text-xs font-bold text-status-success-strong">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-status-success" />
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-cream-100 px-2 py-0.5 text-xs font-bold text-text-secondary">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-border" />
      Inactivo
    </span>
  );
}
