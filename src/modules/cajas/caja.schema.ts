import { z } from "zod";

/**
 * HU-VTA-03 — validación de input (solo FORMA; las reglas que consultan la base
 * viven en el service).
 *
 * El usuario que ejecuta la operación sale SIEMPRE de la sesión. Lo único que
 * se elige en el body es el `cajeroId` responsable de la apertura.
 */

/** numeric(12,2): hasta 10 enteros y 2 decimales. `base` agrega el mínimo de cada campo. */
const importe = (campo: string, base: (n: z.ZodNumber) => z.ZodNumber) =>
  base(
    z
      .number({ message: `${campo} es obligatorio.` })
      .finite()
      .max(9_999_999_999.99, `${campo} supera el máximo que admite la base.`),
  ).refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    `${campo} admite hasta 2 decimales.`,
  );

/** POST /api/cajas/aperturas — monto inicial ≥ 0 (el 0 está permitido). */
export const abrirCajaSchema = z.object({
  cajaId: z.number().int().positive("Seleccioná una sucursal."),
  cajeroId: z.number().int().positive("Seleccioná un cajero responsable.").optional(),
  montoInicial: importe("El monto inicial", (n) => n.min(0, "El monto inicial no puede ser negativo.")),
});

/** POST /api/cajas/aperturas/:id/movimientos — manual: tipo, monto > 0 y motivo. */
export const movimientoCajaSchema = z.object({
  // El front muestra "Ingreso"/"Egreso"; la base guarda en minúscula.
  tipo: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(["ingreso", "egreso"], { message: "El tipo debe ser ingreso o egreso." }),
  ),
  monto: importe("El monto", (n) => n.positive("El monto debe ser mayor a 0.")),
  motivo: z
    .string({ message: "El motivo es obligatorio." })
    .trim()
    .min(1, "El motivo es obligatorio.")
    .max(255, "El motivo no puede superar los 255 caracteres."),
});

/** PATCH /api/cajas/aperturas/:id/cerrar — conteo final (≥ 0). */
export const cerrarCajaSchema = z.object({
  montoContado: importe("El monto contado", (n) => n.min(0, "El monto contado no puede ser negativo.")),
});

export type AbrirCajaInput = z.infer<typeof abrirCajaSchema>;
export type MovimientoCajaInput = z.infer<typeof movimientoCajaSchema>;
