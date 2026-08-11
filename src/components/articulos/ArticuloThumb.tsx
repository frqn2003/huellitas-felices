import { Bone, Package, Pill, Syringe } from "lucide-react";
import type { Categoria } from "@/data/articulos";

const categoryIcons = {
  Medicamentos: Pill,
  Insumos: Syringe,
  Alimentos: Bone,
  Accesorios: Package,
} as const;

export function ArticuloThumb({
  categoria,
  nombre,
}: {
  categoria: Categoria;
  nombre: string;
}) {
  const Icon = categoryIcons[categoria] ?? Package;
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-cream-100"
      role="img"
      aria-label={`Ícono de ${nombre}`}
    >
      <Icon className="h-5 w-5 text-brand-900" aria-hidden="true" />
    </span>
  );
}
