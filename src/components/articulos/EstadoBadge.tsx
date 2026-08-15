import type { Articulo } from "@/data/articulos";

const badgeStyles = {
  Activo: {
    chip: "bg-brand-900/10 text-brand-900",
    dot: "bg-brand-900",
  },
  Inactivo: {
    chip: "bg-cream-100 text-text-secondary",
    dot: "bg-text-secondary",
  },
  "Próximo a vencer": {
    chip: "bg-accent-500/20 text-brand-900",
    dot: "bg-accent-500",
  },
} as const;

export function EstadoBadge({ articulo }: { articulo: Articulo }) {
  const estado = articulo.estado;
  const style = badgeStyles[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${style.chip}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {estado}
    </span>
  );
}
