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
 *
 * ⚠️ OJO CON EL DESCARTE SILENCIOSO. Este objeto no es `.strict()`, así que
 *    cualquier clave que el front mande y acá no esté declarada se pierde sin
 *    error. Es cómodo para lo de arriba (que es a propósito) y fue una trampa
 *    para `presentacionId`, que faltaba: el front lo mandaba, zod lo tiraba, y
 *    el alta reventaba con un 500 por NOT NULL varios pasos después.
 *
 *    Si agregás un campo al formulario, agregalo también acá.
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
   * ⚠️ FALTABA ACÁ, Y ESE ERA EL 500 DEL ALTA.
   *
   * El formulario ya mandaba `presentacion_id`, pero este schema no lo
   * declaraba — y un objeto de zod sin `.strict()` DESCARTA EN SILENCIO las
   * claves que no conoce. Así que el valor se perdía antes de llegar al repo,
   * el INSERT omitía la columna, y como `articulo.presentacion_id` es NOT NULL
   * sin default, Postgres devolvía un 23502 que nadie traducía: 500 pelado.
   *
   * El nombre va en camelCase como el resto del body (`categoriaId`,
   * `unidadMedidaId`); el front se adaptó.
   */
  presentacionId: idCatalogo("una presentación"),

  /**
   * Contenido neto (500 en "500 ml"). La columna es NOT NULL con DEFAULT 1.
   *
   * Es opcional en el body: si no viene, la base pone 1. Pero el formulario lo
   * pide, y antes también se descartaba en silencio — se tecleaba 500 y se
   * guardaba 1.
   */
  contenidoNeto: z
    .number()
    .positive("El contenido neto debe ser mayor a cero.")
    .max(99_999_999.99, "El contenido neto supera el máximo que admite la base.")
    .optional(),

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
