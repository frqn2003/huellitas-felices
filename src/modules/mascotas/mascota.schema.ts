import { z } from "zod";

/**
 * HU-MAS-01 — validación de input de Mascotas.
 *
 * Valida FORMA, no reglas que necesiten la base. Que el cliente exista y esté
 * activo lo chequea el service (`crear`/`editar`), porque para saberlo hay que
 * consultar.
 *
 * Los campos obligatorios son los NOT NULL de la tabla: cliente_id, nombre,
 * especie y sexo. El resto es nullable.
 *
 * SOBRE EL CAMPO `color`
 *   La HU lo nombra ("nombre, especie, raza, sexo, peso, fecha de nacimiento,
 *   color y señas particulares") pero NO se implementa: el brief lo resolvió
 *   con el equipo — "sexo SÍ va; color NO va (el esquema no tiene columna
 *   `color` en `mascota`; no se inventan campos)". Ver docs/briefs/HU-MAS-01.md.
 */

/**
 * Especie y sexo son `varchar` libres en la base — no hay tabla catálogo. La
 * UI los ofrece como select, y acá se valida contra la misma lista para que un
 * POST hecho a mano no meta "Dinosaurio".
 *
 * Si mañana el negocio admite más especies, esto y `especies` de
 * src/data/mascotas.ts se cambian juntos. Es una lista corta y cerrada por
 * decisión de producto, no una copia de una tabla.
 */
const ESPECIES = ["Perro", "Gato", "Otro"] as const;
const SEXOS = ["Macho", "Hembra"] as const;

export const crearMascotaSchema = z.object({
  clienteId: z
    .number({ invalid_type_error: "Elegí el dueño de la mascota." })
    .int()
    .positive("Elegí el dueño de la mascota."),

  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(100, "El nombre no puede superar los 100 caracteres."),

  especie: z.enum(ESPECIES, {
    errorMap: () => ({ message: "La especie debe ser Perro, Gato u Otro." }),
  }),

  // Texto libre: el front sugiere razas con un datalist pero el usuario puede
  // escribir cualquiera.
  raza: z
    .string()
    .trim()
    .max(100, "La raza no puede superar los 100 caracteres.")
    .nullable()
    .optional()
    // Un input vacío llega como "" y la columna es nullable: se guarda NULL,
    // no un string vacío.
    .transform((v) => (v ? v : null)),

  sexo: z.enum(SEXOS, {
    errorMap: () => ({ message: "El sexo debe ser Macho o Hembra." }),
  }),

  // CHECK de la base: `peso IS NULL OR peso > 0`. Se valida acá también para
  // dar el mensaje con el campo señalado en vez de un 23514 genérico.
  peso: z
    .number()
    .positive("El peso debe ser mayor a 0.")
    .max(500, "El peso no puede superar los 500 kg.")
    .nullable()
    .optional()
    .transform((v) => v ?? null),

  fechaNacimiento: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD.")
    // El trigger `trg_mascota_validar_fecha_nacimiento` también la rechaza si
    // es futura, pero acá el mensaje puede señalar el campo.
    .refine(
      (v) => new Date(`${v}T00:00:00`) <= new Date(),
      "La fecha de nacimiento no puede ser posterior a hoy.",
    )
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),

  senasParticulares: z
    .string()
    .trim()
    .max(1000, "Las señas particulares no pueden superar los 1000 caracteres.")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),

  // La baja es LÓGICA: el formulario puede mandar `inactivo` al editar.
  estado: z.enum(["activo", "inactivo"]).default("activo"),
});

/** La edición valida igual que el alta: el formulario es el mismo. */
export const editarMascotaSchema = crearMascotaSchema;

export type CrearMascotaInput = z.infer<typeof crearMascotaSchema>;
