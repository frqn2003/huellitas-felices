import { z } from "zod";

/**
 * HU-STK-01 — validación de input.
 *
 * Recordá la distinción: un schema valida FORMA (que el campo exista, que sea
 * del tipo correcto, que no pase del largo permitido). Las reglas que necesitan
 * consultar la base — "no puede haber otro artículo activo con este nombre" —
 * viven en el service.
 *
 * DOS CAMPOS QUE NO ESTÁN A PROPÓSITO:
 *
 *  · `codigo` — lo genera el trigger de la base con el prefijo de la categoría
 *    (MED-000001). Si el front lo mandara, el trigger lo pisaría igual, así que
 *    aceptarlo sería mentirle a quien lee este archivo.
 *
 *  · `precio` — criterio explícito del Excel: "el artículo NO incluye campo de
 *    precio: el precio de venta se gestiona en la Lista de Precios (HU-STK-03)
 *    y el costo de compra se fija al confirmar la recepción de la orden".
 *
 *  · `proveedorPreferidoId` — se DERIVA de la última orden de compra (decisión
 *    D2), no se guarda. Si el front lo manda igual, zod lo descarta en silencio
 *    y la respuesta trae el valor derivado. Ver LATERAL_PROVEEDOR en el repo.
 */

/** Id de catálogo: entero positivo. */
const idCatalogo = (etiqueta: string) =>
  z
    .number({ message: `Seleccioná ${etiqueta}.` })
    .int()
    .positive(`Seleccioná ${etiqueta}.`);

export const crearArticuloSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(150, "El nombre no puede superar los 150 caracteres."),

  descripcion: z.string().trim().max(2000).optional(),

  categoriaId: idCatalogo("una categoría"),
  unidadMedidaId: idCatalogo("una unidad de medida"),
  fabricanteId: idCatalogo("un fabricante"),

  /**
   * La imagen llega como data URL en base64 (así la produce el FileReader del
   * front). El service la guarda y devuelve la URL final.
   * El límite de 2 MB ya lo aplica el front; acá se repite porque el front
   * puede saltearse y un base64 gigante llenaría la base.
   */
  imagen: z
    .string()
    .max(3_000_000, "La imagen es demasiado grande (máximo 2 MB).")
    .optional()
    .nullable(),

  activo: z.boolean().optional(),
});

/** La edición valida igual: es el mismo formulario en modo EDICIÓN. */
export const editarArticuloSchema = crearArticuloSchema;

export type CrearArticuloInput = z.infer<typeof crearArticuloSchema>;
