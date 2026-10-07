import { StatusBadge } from "@/components/ui/StatusBadge";

/**
 * Los tres estados del enum `estado_documento` de la base.
 *
 * ⚠️ `Pagado` FALTABA, Y ESO ROMPÍA LA PANTALLA.
 *
 *    La DBA agregó ese valor al enum el 2026-09-09, junto con el trigger que
 *    marca el comprobante apenas su saldo llega a cero. Acá el map solo tenía
 *    Vigente y Anulado, y el componente hacía:
 *
 *      const { variant, label } = map[estado];
 *
 *    Con `estado = "pagado"`, `map[...]` es undefined — y destructurar
 *    undefined tira un TypeError que NO es un dato feo en pantalla: es un
 *    crash del render que se lleva puesta la tabla entera.
 *
 *    Tampoco era un caso de laboratorio: los comprobantes de la base están
 *    todos en ese estado.
 */
export type EstadoComprobante = "Vigente" | "Anulado" | "Pagado";

interface EstadoComprobanteBadgeProps {
  estado: EstadoComprobante;
}

const MAP: Record<
  EstadoComprobante,
  { variant: "success" | "danger" | "info"; label: string }
> = {
  Vigente: { variant: "success", label: "Vigente" },
  Anulado: { variant: "danger", label: "Anulado" },
  // Info y no success: "pagado" no es lo mismo que "vigente con saldo". Que se
  // distingan de un vistazo es justo lo que sirve en la pantalla de cuenta
  // corriente.
  Pagado: { variant: "info", label: "Pagado" },
};

export function EstadoComprobanteBadge({ estado }: EstadoComprobanteBadgeProps) {
  // Fallback en vez de destructurar a ciegas: si mañana aparece un cuarto
  // estado, se muestra el texto crudo y la tabla sigue viva. Romper el render
  // por una etiqueta es una reacción desproporcionada.
  const meta = MAP[estado] ?? { variant: "info" as const, label: String(estado) };
  return <StatusBadge variant={meta.variant} label={meta.label} />;
}
