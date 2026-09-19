import { StatusBadge } from "@/components/ui/StatusBadge";

interface SexoBadgeProps {
  sexo: string;
}

/**
 * Badge de sexo de una mascota. Macho = info (azul), Hembra = pink (rosa).
 * Delega en `StatusBadge` (único punto de verdad de colores de estado).
 * // BACKEND: sexo varchar libre en BD — los valores "Macho"/"Hembra" son
 * // el catálogo fijo del front (src/data/mascotas.ts, sin endpoint).
 */
export function SexoBadge({ sexo }: SexoBadgeProps) {
  return sexo === "Macho" ? (
    <StatusBadge variant="info" label="Macho" />
  ) : (
    <StatusBadge variant="pink" label="Hembra" />
  );
}