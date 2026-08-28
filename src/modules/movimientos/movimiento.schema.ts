import { z } from "zod";

/**
 * HU-STK-04 — validación de input.
 *
 * SOBRE `tipo`: el enum de la BASE tiene dos valores (`ingreso`, `egreso`).
 * Acá hay cuatro porque este es el contrato de la **API**, no el de la base:
 * "Transferencia" y "Ajuste" son ORÍGENES del movimiento, y el service los
 * traduce a la combinación (tipo, origen) que corresponde. Ver
 * `resolverTipoYOrigen()` en el service.
 */

export const itemMovimientoSchema = z.object({
    articuloId: z
        .number({ message: "Seleccioná un artículo válido." })
        .int()
        .positive("Seleccioná un artículo válido."),
    /**
     * Positiva salvo en un Ajuste, donde un número negativo significa "sacar".
     * El signo se valida abajo, en el superRefine del movimiento completo:
     * acá todavía no se sabe de qué tipo es.
     */
    cantidad: z
        .number({ message: "La cantidad es obligatoria." })
        .refine((n) => n !== 0, "La cantidad no puede ser cero."),
});

export const registrarMovimientoSchema = z
    .object({
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
    })
    .superRefine((input, ctx) => {
        const hayNegativos = input.items.some((i) => i.cantidad < 0);

        // Solo un Ajuste puede llevar cantidades negativas. En los demás tipos,
        // la dirección la da `tipo`, no el signo.
        if (hayNegativos && input.tipo !== "Ajuste") {
            ctx.addIssue({
                code: "custom",
                path: ["items"],
                message:
                    "Solo un Ajuste admite cantidades negativas. En los demás movimientos la dirección la define el tipo.",
            });
            return;
        }

        // Un ajuste con signos mezclados necesitaría dos cabeceras (una de
        // ingreso y otra de egreso) y dejaría un movimiento que es dos cosas a
        // la vez. Se cargan como dos ajustes separados.
        if (input.tipo === "Ajuste") {
            const hayPositivos = input.items.some((i) => i.cantidad > 0);
            if (hayNegativos && hayPositivos) {
                ctx.addIssue({
                    code: "custom",
                    path: ["items"],
                    message:
                        "Un ajuste no puede mezclar cantidades positivas y negativas: cargá dos ajustes separados.",
                });
            }
        }

        if (input.tipo === "Transferencia") {
            if (!input.depositoDestinoId) {
                ctx.addIssue({
                    code: "custom",
                    path: ["depositoDestinoId"],
                    message: "Para una transferencia debés indicar el depósito de destino.",
                });
            } else if (input.depositoDestinoId === input.depositoId) {
                ctx.addIssue({
                    code: "custom",
                    path: ["depositoDestinoId"],
                    message: "El depósito de origen y el de destino no pueden ser el mismo.",
                });
            }
        }
    });

export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;
