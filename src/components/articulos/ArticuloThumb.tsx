import { PawPrint } from "lucide-react";

const SIZES = {
  md: { box: "h-16 w-16", icon: "h-7 w-7" },
} as const;

export function ArticuloThumb({
  imagen,
  nombre,
  size = "md",
}: {
  imagen: string;
  nombre: string;
  size?: keyof typeof SIZES;
}) {
  const dims = SIZES[size];
  if (imagen) {
    return (
      <img
        src={imagen}
        alt={nombre}
        loading="lazy"
        className={`${dims.box} shrink-0 rounded-sm object-cover`}
      />
    );
  }
  return (
    <span
      className={`${dims.box} flex shrink-0 items-center justify-center rounded-sm border border-dashed border-border bg-cream-50`}
      role="img"
      aria-label={`Sin imagen de ${nombre}`}
    >
      <PawPrint className={`${dims.icon} text-brand-900/40`} aria-hidden="true" />
    </span>
  );
}