import { z } from "zod";

/**
 * HU-COMP-02 — validación de input de solicitudes, cotizaciones y adjudicación.
 *
 * Igual que en órdenes: acá se valida forma. Que la solicitud siga Abierta, que
 * la cotización sea de esa solicitud o que el proveedor esté activo son reglas
 * que necesitan la base, y viven en el service.
 */

// ---------------------------------------------------------
// Solicitud de cotización
// ---------------------------------------------------------

export const crearSolicitudSchema = z.object({
  lineas: z
    .array(
      z.object({
        articuloId: z.number().int().positive("Elegí un artículo."),
        cantidadEstimada: z
          .number()
          .positive("La cantidad estimada debe ser mayor a cero.")
          .max(9_999_999.99, "La cantidad supera el máximo que admite la base."),
        nota: z.string().trim().max(255).optional(),
      }),
    )
    .min(1, "La solicitud necesita al menos un artículo.")
    .refine(
      (lineas) => new Set(lineas.map((l) => l.articuloId)).size === lineas.length,
      "Hay un artículo repetido: sumá la cantidad en una sola línea.",
    ),

  notas: z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------
// Cotización recibida de un proveedor
// ---------------------------------------------------------

export const registrarCotizacionSchema = z.object({
  proveedorId: z.number().int().positive("Elegí un proveedor."),

  // La condición que ofrece el proveedor: id del catálogo `forma_pago`, igual
  // que en la orden. El catálogo sale de GET /api/condiciones-pago.
  formaPagoId: z.number().int().positive("Elegí una condición de pago."),

  /** Cuándo llegó la cotización. Si no viene, la sella el servidor con now(). */
  fechaRecepcion: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "La fecha de recepción no es válida.")
    .optional(),

  /**
   * Precio unitario por artículo.
   *
   * El front lo tiene como `precios: Record<articuloId, number>`
   * (CotizacionFormModal); la conversión es una línea:
   *   detalles: Object.entries(precios).map(([articuloId, precio]) =>
   *     ({ articuloId: Number(articuloId), precio }))
   *
   * Se pide array y no objeto porque con un array zod puede señalar QUÉ línea
   * falló (`detalles.2.precio`), que es lo que el front necesita para marcar
   * ese input en rojo.
   *
   * SIN CANTIDAD, a propósito: la cantidad ya está en la solicitud y es la
   * misma para todos los proveedores. Si cada uno cotizara su propia cantidad,
   * los totales no serían comparables y la comparación no querría decir nada.
   */
  detalles: z
    .array(
      z.object({
        articuloId: z.number().int().positive(),
        precio: z
          .number()
          .nonnegative("El precio no puede ser negativo.")
          .max(99_999_999.99, "El precio supera el máximo que admite la base."),
      }),
    )
    .min(1, "Cargá el precio de al menos un artículo.")
    .refine(
      (detalles) => new Set(detalles.map((d) => d.articuloId)).size === detalles.length,
      "Hay un artículo con dos precios distintos.",
    ),
});

// ---------------------------------------------------------
// Adjudicación
// ---------------------------------------------------------

/**
 * Adjudicación POR ARTÍCULO (adjudicación split).
 *
 * El front la resolvió así (CompararCotizacionesModal + AsignacionArticulo):
 * cada artículo de la solicitud se le asigna a la cotización que se elige para
 * ESE artículo, que no tiene por qué ser la misma para todos — es normal que un
 * proveedor sea más barato en alimentos y otro en medicamentos.
 *
 * Consecuencia: una adjudicación puede generar VARIAS órdenes de compra, una
 * por proveedor ganador, agrupando sus artículos. Eso es exactamente lo que el
 * criterio describe como "agrupándolas por proveedor".
 */
export const adjudicarSchema = z.object({
  asignaciones: z
    .array(
      z.object({
        articuloId: z.number().int().positive(),
        cotizacionId: z.number().int().positive(),
      }),
    )
    .min(1, "Asigná al menos un artículo a una cotización.")
    .refine(
      (asignaciones) =>
        new Set(asignaciones.map((a) => a.articuloId)).size === asignaciones.length,
      "Un artículo no puede adjudicarse a dos cotizaciones a la vez.",
    ),

  /** Depósito de entrega de las órdenes generadas (opcional). */
  depositoEntregaId: z.number().int().positive().optional(),
});

export type CrearSolicitudInput = z.infer<typeof crearSolicitudSchema>;
export type RegistrarCotizacionInput = z.infer<typeof registrarCotizacionSchema>;
export type AdjudicarInput = z.infer<typeof adjudicarSchema>;
