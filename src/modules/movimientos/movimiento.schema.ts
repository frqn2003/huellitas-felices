import { z } from "zod";

export const itemMovimientoSchema = z.object({
    articuloId: z
        .number({ message: "Seleccioná un artículo válido." })
        .int()
        .positive("Seleccioná un artículo válido."),
    cantidad: z
        .number({ message: "La cantidad es obligatoria." })
        .positive("La cantidad debe ser mayor a 0."),
});

export const registrarMovimientoSchema = z.object({
    depositoId: z
        .number({ message: "Seleccioná el depósito." })
        .int()
        .positive("Seleccioná el depósito."),
    tipo: z.enum(["Ingreso", "Egreso", "Transferencia", "Ajuste"], {
        message: "Tipo de movimiento inválido.",
    }),
    origenId: z.number().int().positive().nullable().optional(),
    origenEntidadId: z.number().int().positive().nullable().optional(),
    motivo: z.string().trim().max(255).optional(),
    fechaHora: z.string().optional(),
    depositoDestinoId: z.number().int().positive().nullable().optional(),
    items: z
        .array(itemMovimientoSchema)
        .min(1, "Debes incluir al menos un artículo."),
});

export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;
