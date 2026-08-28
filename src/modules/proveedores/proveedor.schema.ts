import { z } from "zod";

/**
 * HU-PROV-01 — validación de input.
 *
 * Los campos obligatorios son los que el brief marca con asterisco
 * (docs/briefs/HU-PROV-01.md): razón social y CUIT. El resto es opcional.
 *
 * OJO: la validación de CUIT duplicado NO va acá. Un schema valida forma,
 * no reglas que necesiten consultar la base. Eso es del service.
 */

/** CUIT argentino: 11 dígitos, con o sin guiones (XX-XXXXXXXX-X). */
const cuit = z
  .string()
  .trim()
  .regex(/^\d{2}-?\d{8}-?\d$/, "El CUIT debe tener el formato XX-XXXXXXXX-X.");

export const crearProveedorSchema = z.object({
  razonSocial: z
    .string()
    .trim()
    .min(1, "La razón social es obligatoria.")
    .max(150, "La razón social no puede superar los 150 caracteres."),

  cuit,

  direccion: z.string().trim().max(255).optional(),
  telefono: z.string().trim().max(30).optional(),

  email: z
    .string()
    .trim()
    .max(120)
    .email("El email no tiene un formato válido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  contacto: z.string().trim().max(100).optional(),

  plazoEntregaDias: z
    .number()
    .int("El plazo de entrega debe ser un número entero de días.")
    .min(0, "El plazo de entrega no puede ser negativo.")
    .max(365, "El plazo de entrega no puede superar los 365 días.")
    .optional(),

  // N:M — decisión D-A. El front manda varias formas de pago por proveedor.
  formaPagoIds: z
    .array(z.number().int().positive())
    .min(1, "Elegí al menos una forma de pago.")
    .default([]),
});

/** La edición valida igual que el alta: el formulario es el mismo (modo EDICIÓN). */
export const editarProveedorSchema = crearProveedorSchema;

export type CrearProveedorInput = z.infer<typeof crearProveedorSchema>;
