import { z } from "zod";

/**
 * HU-CLIN-01 — validación de input (solo FORMA; las reglas que consultan la
 * base viven en el service).
 *
 * El profesional NUNCA viene del body: la consulta ya lo tiene (el de la franja
 * de agenda del turno) y quien opera es el de la sesión.
 */

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar los ${max} caracteres.`)
    .nullish()
    .transform((v) => (v ? v : null));

const insumoSchema = z.object({
  articuloId: z.number().int().positive("Seleccioná un artículo."),
  // consulta_medica_insumo.cantidad es integer con CHECK > 0.
  cantidad: z
    .number({ message: "La cantidad es obligatoria." })
    .int("La cantidad debe ser un número entero.")
    .positive("La cantidad debe ser mayor a 0."),
});

/** POST /api/consultas — abre la consulta de un turno 'atendido'. */
export const abrirConsultaSchema = z.object({
  turnoId: z.number().int().positive("Indicá el turno."),
});

/**
 * PATCH /api/consultas/:id/cerrar — la pantalla guarda todo al finalizar:
 * campos clínicos + detalle de insumos, y el cierre.
 */
export const cerrarConsultaSchema = z.object({
  motivoConsulta: z.string().trim().min(1, "El motivo de consulta es obligatorio.").max(2000),
  diagnostico: z.string().trim().min(1, "El diagnóstico es obligatorio.").max(4000),
  tratamiento: textoOpcional(4000),
  estadoFisicoGeneral: textoOpcional(4000),
  // numeric(4,1) / integer / numeric(6,2), todos con CHECK > 0.
  temperatura: z
    .number()
    .positive("La temperatura debe ser mayor a 0.")
    .max(99.9)
    .nullish()
    .transform((v) => v ?? null),
  frecuenciaCardiaca: z
    .number()
    .int("La frecuencia cardíaca debe ser un entero.")
    .positive("La frecuencia cardíaca debe ser mayor a 0.")
    .max(1000)
    .nullish()
    .transform((v) => v ?? null),
  pesoMomento: z
    .number()
    .positive("El peso debe ser mayor a 0.")
    .max(9999.99)
    .nullish()
    .transform((v) => v ?? null),
  insumos: z
    .array(insumoSchema)
    .default([])
    .refine(
      (l) => new Set(l.map((i) => i.articuloId)).size === l.length,
      "Hay artículos repetidos en los insumos.",
    ),
});

/** POST /api/consultas/:id/notas — nota aclaratoria posterior al cierre. */
export const notaConsultaSchema = z.object({
  nota: z
    .string()
    .trim()
    .min(1, "La nota no puede estar vacía.")
    .max(2000, "La nota no puede superar los 2000 caracteres."),
});

export type CerrarConsultaInput = z.infer<typeof cerrarConsultaSchema>;
