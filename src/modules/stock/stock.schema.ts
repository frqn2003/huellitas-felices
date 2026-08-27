import { z } from "zod";

export const guardarDepositoSchema = z.object({
  sucursalId: z.number().int().positive("Seleccioná una sucursal válida."),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(100, "El nombre no puede superar los 100 caracteres."),
  ubicacion: z
    .string()
    .trim()
    .min(1, "La ubicación es obligatoria.")
    .max(150, "La ubicación no puede superar los 150 caracteres."),
});

const fichaBaseSchema = z.object({
  articuloId: z.number().int().positive("Seleccioná un artículo válido."),
  depositoId: z.number().int().positive("Seleccioná un depósito válido."),
  stockMinimo: z.number().positive("El umbral mínimo debe ser mayor a 0."),
  stockCritico: z.number().positive("El umbral crítico debe ser mayor a 0.").nullable().optional(),
});

function validarUmbrales(
  data: { stockMinimo: number; stockCritico?: number | null },
  ctx: z.RefinementCtx,
) {
  if (data.stockCritico !== null && data.stockCritico !== undefined && data.stockCritico >= data.stockMinimo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["stockCritico"],
      message: "El umbral crítico debe ser menor al umbral mínimo.",
    });
  }
}

export const crearFichaStockSchema = fichaBaseSchema.superRefine(validarUmbrales);

// El artículo viaja en el mismo formulario, pero el service impide cambiarlo.
export const editarFichaStockSchema = fichaBaseSchema.superRefine(validarUmbrales);

export type GuardarDepositoInput = z.infer<typeof guardarDepositoSchema>;
export type GuardarFichaStockInput = z.infer<typeof crearFichaStockSchema>;
