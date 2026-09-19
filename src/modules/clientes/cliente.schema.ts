import { z } from "zod";

/**
 * HU-CLI-01 — validación de input de Clientes.
 */

const documento = z
  .string()
  .trim()
  .min(1, "El documento es obligatorio.")
  .regex(/^\d{7,8}$/, "El documento debe tener 7 u 8 dígitos.");

const telefono = z
  .string()
  .trim()
  .min(1, "El teléfono es obligatorio.")
  .regex(/^\+?\d{8,15}$/, "El teléfono debe tener entre 8 y 15 dígitos.");

export const crearClienteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .refine((val) => !/\d/.test(val), "El nombre no admite números."),
  apellido: z
    .string()
    .trim()
    .min(1, "El apellido es obligatorio.")
    .refine((val) => !/\d/.test(val), "El apellido no admite números."),
  documento,
  telefono,
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio.")
    .email("Ingresá un email válido."),
  direccion: z.string().trim().nullable().optional(),
  fecha_nacimiento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD.")
    .nullable()
    .optional(),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
});

export const editarClienteSchema = crearClienteSchema;

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
