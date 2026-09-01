import { z } from "zod";

/**
 * HU-COMP-03 — validación de input de las recepciones de mercadería.
 *
 * Acá se valida FORMA, no reglas. Todo lo que depende del estado de la base —el
 * pendiente de cada línea, si la OC admite recepciones, si la línea pertenece a
 * esa orden— se valida en el service, DENTRO del lock. Validarlo acá sería leer
 * un snapshot y decidir sobre datos que pueden haber cambiado un milisegundo
 * después.
 *
 * LO QUE EL FRONT PUEDE MANDAR Y ACÁ SE DESCARTA EN SILENCIO
 * (un objeto de zod sin .strict() ignora las claves de más):
 *
 *  · `tipoRecepcion` — lo DERIVA el backend (D-1). Si el usuario pudiera marcar
 *    "Total" a mano, la OC se cerraría aunque falten artículos.
 *  · `cantidadSolicitada` — la calcula el service con la OC bloqueada (D-4).
 *    Es el pendiente real al momento de la entrega, no lo que crea el front.
 *  · `numero` — lo genera el trigger `trg_generar_numero_recepcion`.
 *  · `usuarioId` — sale de la sesión, nunca del body (regla dura §7.5).
 *
 * La regla detrás de las cuatro: lo que la base o el server saben calcular, no
 * se acepta del cliente.
 */

/** Los tres motivos del enum `tipo_observacion_recepcion`. */
export const OBSERVACIONES = ["faltante", "danado", "error"] as const;

/**
 * Una línea de la recepción: qué línea de la OC y cuánto llegó de verdad.
 *
 * `cantidadRecibida` admite 0: "vino la entrega y de este artículo no llegó
 * nada" es un hecho que hay que poder registrar, con su observación.
 */
export const itemRecepcionSchema = z.object({
  ordenCompraDetalleId: z
    .number({ message: "Falta la línea de la orden de compra." })
    .int()
    .positive("Falta la línea de la orden de compra."),

  cantidadRecibida: z
    .number({ message: "La cantidad recibida es obligatoria." })
    .nonnegative("La cantidad recibida no puede ser negativa.")
    .max(9_999_999.99, "La cantidad supera el máximo que admite la base."),

  /**
   * `danado` sin ñ: es el valor del enum de la base, no el texto que se muestra.
   * La pantalla traduce a "Dañado" con OBSERVACIONES_RECEPCION.
   */
  observacion: z.enum(OBSERVACIONES, { message: "Motivo de diferencia inválido." })
    .nullable()
    .optional(),

  observacionDetalle: z.string().trim().max(500).nullable().optional(),
});

export const crearRecepcionSchema = z.object({
  ordenCompraId: z
    .number({ message: "Elegí la orden de compra." })
    .int()
    .positive("Elegí la orden de compra."),

  /**
   * Depósito donde entra la mercadería.
   *
   * Va en el body y no se toma de `orden_compra.deposito_id` porque esa columna
   * es nullable y porque la entrega puede terminar descargándose en otro
   * depósito del que se había pactado. Es una decisión de quien recibe.
   */
  depositoId: z
    .number({ message: "Elegí el depósito." })
    .int()
    .positive("Elegí el depósito."),

  observacionGeneral: z.string().trim().max(1000).nullable().optional(),

  /**
   * "una o más líneas": una recepción sin artículos no es una recepción.
   *
   * Dos validaciones que NO están acá a propósito, porque el doc les asigna un
   * código de error propio que el front puede querer distinguir:
   *  · al menos una línea con cantidad > 0 → `RECEPCION_VACIA`
   *  · sin líneas repetidas                → `LINEA_DUPLICADA`
   *
   * Un `.refine()` de zod las devolvería como `DATOS_INVALIDOS` genérico. Van
   * en el service, que puede nombrarlas.
   */
  items: z.array(itemRecepcionSchema).min(1, "La recepción necesita al menos un artículo."),
});

export type CrearRecepcionInput = z.infer<typeof crearRecepcionSchema>;
