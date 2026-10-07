import { z } from "zod";

/**
 * HU-STK-03 — validación de input (solo FORMA; las reglas que consultan la base
 * viven en el service).
 *
 * DOS CAMPOS QUE NO ESTÁN A PROPÓSITO:
 *  · `usuarioId` — el responsable sale SIEMPRE de la sesión, nunca del body.
 *  · `costo` — el costo de compra se define en la recepción de la OC
 *    (HU-COMP-02), nunca desde esta pantalla. Zod descarta claves no
 *    declaradas, así que aunque el front lo mande, no llega al repo.
 */

/** numeric(12,2) CHECK >= 0 → máximo 10 enteros y 2 decimales. */
const precio = z
  .number({ message: "El precio es obligatorio." })
  .min(0, "El precio no puede ser negativo.")
  .max(9_999_999_999.99, "El precio supera el máximo que admite la base.")
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "El precio admite hasta 2 decimales.");

/** POST — modo INSERCION: primer precio de un artículo o práctica. */
export const crearPrecioSchema = z.object({
  articuloId: z.number().int().positive("Seleccioná un artículo.").optional(),
  practicaId: z.number().int().positive("Seleccioná una práctica.").optional(),
  precio,
}).refine((d) => (d.articuloId === undefined) !== (d.practicaId === undefined), {
  message: "Indicá un artículo o una práctica (uno solo).",
  path: ["articuloId"],
});

/** PATCH — modo EDICION: cambia el precio vigente. */
export const editarPrecioSchema = z.object({ precio });

export type CrearPrecioInput = z.infer<typeof crearPrecioSchema>;
export type EditarPrecioInput = z.infer<typeof editarPrecioSchema>;

/**
 * `?tipo=articulo|practica` (default articulo). Mismas rutas para los dos
 * sujetos: la mecánica es idéntica y cambia solo la tabla.
 */
export function leerSujeto(sp: URLSearchParams): "articulo" | "practica" {
  return sp.get("tipo") === "practica" ? "practica" : "articulo";
}
