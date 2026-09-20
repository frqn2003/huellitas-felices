import { z } from "zod";

/**
 * HU-TUR-01 — validación de input de Turnos.
 *
 * Valida FORMA. Todo lo que necesite consultar la base —que la mascota sea del
 * cliente, que el profesional atienda ese día, que el horario esté libre— vive
 * en el service.
 *
 * `sucursalId`, `estadoId` y `fechaCreacion` NO están acá y no es un olvido:
 *   · `sucursal_id` lo deriva el trigger `fn_turno_sincronizar_sucursal` desde
 *     la agenda del profesional. Si lo mandara el front, dos fuentes de verdad.
 *   · `estado_id` arranca siempre en 1 (pendiente): lo pone el service.
 *   · `fecha_creacion` tiene DEFAULT now().
 * Si el front igual los manda, zod los descarta en silencio (sin `.strict()`).
 */

/** "HH:mm" o "HH:mm:ss" — el front manda el primero, Postgres devuelve el segundo. */
const hora = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "La hora debe tener el formato HH:mm.");

export const crearTurnoSchema = z
  .object({
    clienteId: z
      .number({ invalid_type_error: "Elegí el cliente." })
      .int()
      .positive("Elegí el cliente."),

    mascotaId: z
      .number({ invalid_type_error: "Elegí la mascota." })
      .int()
      .positive("Elegí la mascota."),

    /**
     * La FRANJA del profesional, no el profesional.
     *
     * El wizard elige primero al veterinario y después uno de sus horarios; lo
     * que viaja es el id de ese horario (`agenda_profesional.id`), porque es lo
     * que ata el turno a un día de la semana y a una sucursal.
     */
    agendaProfesionalId: z
      .number({ invalid_type_error: "Elegí el horario del profesional." })
      .int()
      .positive("Elegí el horario del profesional."),

    practicaId: z
      .number({ invalid_type_error: "Elegí la práctica." })
      .int()
      .positive("Elegí la práctica."),

    fecha: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD."),

    horaInicio: hora,
    horaFin: hora,

    notas: z
      .string()
      .trim()
      .max(500, "Las notas no pueden superar los 500 caracteres.")
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
  })
  // El CHECK `turno_check` de la base exige lo mismo, pero acá el mensaje puede
  // señalar el campo en vez de salir como un 23514 genérico.
  .refine((t) => t.horaFin > t.horaInicio, {
    message: "La hora de fin tiene que ser posterior a la de inicio.",
    path: ["horaFin"],
  });

export type CrearTurnoInput = z.infer<typeof crearTurnoSchema>;
