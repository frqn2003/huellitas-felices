import { z } from "zod";

/**
 * HU-COMP-02 — validación de input de las órdenes de compra.
 *
 * Acá se valida FORMA, no reglas: que el proveedor esté activo, que los
 * artículos existan o que la orden todavía se pueda editar son cosas que
 * necesitan consultar la base, y eso es del service.
 *
 * Lo que el front manda y acá NO se acepta:
 *  · `fecha` — la fecha de emisión la sella el servidor (`orden_compra.fecha`
 *    tiene DEFAULT now() desde la corrección 04). Si viene en el body, zod la
 *    descarta en silencio: un objeto de zod sin .strict() ignora las claves de
 *    más. Ver la nota en el service.
 *  · `subtotal` / `total` — se recalculan siempre (regla dura de la guía §7).
 *  · `cod_ord` — el número lo genera la base al insertar.
 *
 * La regla detrás de las tres: lo que la base sabe generar, lo genera la base.
 */

const importe = z
  .number()
  .nonnegative("El importe no puede ser negativo.")
  .max(99_999_999.99, "El importe supera el máximo que admite la base.");

/**
 * Una línea del detalle: artículo + cantidad + precio pactado.
 *
 * Esto es la parte "detalle" de la relación cabecera-detalle que pide el
 * criterio: "una o más líneas, cada una con artículo, cantidad y precio
 * pactado (una compra puede incluir varios artículos)".
 */
export const lineaOrdenSchema = z.object({
  articuloId: z.number().int().positive("Elegí un artículo."),
  cantidad: z
    .number()
    .positive("La cantidad debe ser mayor a cero.")
    .max(9_999_999.99, "La cantidad supera el máximo que admite la base."),
  precioAcordado: importe,
});

export const crearOrdenSchema = z.object({
  proveedorId: z.number().int().positive("Elegí un proveedor."),

  /**
   * Condición de pago: el ID del catálogo `forma_pago`, no su nombre.
   *
   * El catálogo lo sirve GET /api/condiciones-pago y es la única lista que
   * existe. Mandar el nombre obligaría a hacer coincidir dos textos exactos
   * (con acentos y puntos incluidos) y a que un renombre en el catálogo rompiera
   * el alta en silencio. Con el id, el catálogo se puede editar sin tocar nada.
   */
  formaPagoId: z.number().int().positive("Elegí una condición de pago."),

  /** Depósito de entrega: de ahí sale la `direccion_entrega` que muestra el front. */
  depositoEntregaId: z.number().int().positive().optional(),

  /** Fecha comprometida de entrega (yyyy-mm-dd o ISO completo). */
  fechaEntrega: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "La fecha de entrega no es válida.")
    .optional()
    .or(z.literal("").transform(() => undefined))
    .nullable(),

  notas: z.string().trim().max(1000).optional(),

  /**
   * PORCENTAJE 0-100, no un monto. Así lo guarda `orden_compra.descuento` y así
   * lo manda el formulario (el CHECK ck_oc_importes lo exige en la base).
   */
  descuento: z
    .number()
    .min(0, "El descuento no puede ser negativo.")
    .max(100, "El descuento es un porcentaje: no puede superar 100.")
    .default(0),

  gastosEnvio: importe.default(0),

  // "una o más líneas": una orden sin artículos no es una orden.
  lineas: z
    .array(lineaOrdenSchema)
    .min(1, "La orden necesita al menos un artículo.")
    .refine(
      (lineas) => new Set(lineas.map((l) => l.articuloId)).size === lineas.length,
      "Hay un artículo repetido: sumá la cantidad en una sola línea.",
    ),
});

/** La edición valida igual que el alta: es el mismo formulario en modo EDICIÓN. */
export const editarOrdenSchema = crearOrdenSchema;

export type CrearOrdenInput = z.infer<typeof crearOrdenSchema>;
