import { z } from "zod";

/**
 * HU-FIN-02 — validación del alta de pago a proveedor.
 *
 * Acá se valida el PAYLOAD CONTRA SÍ MISMO. Todo lo que necesita leer la base
 * —cuánto se debe, si el comprobante está anulado, si es de otro proveedor— lo
 * hacen los triggers de `pago_imputacion`, con `FOR UPDATE`. Revalidarlo acá
 * sería leer un snapshot y decidir con datos que pueden haber cambiado un
 * milisegundo después.
 *
 * LA TRAMPA MÁS TENTADORA, ANOTADA PARA QUE NADIE LA REPITA:
 *   uno quiere validar `monto <= saldoPendiente` leyendo la vista. No hace
 *   falta. `imputado_histórico + monto <= monto_total` (lo que ya chequea
 *   `fn_ck_comprobante_no_excede`) es ALGEBRAICAMENTE LO MISMO — pero con lock.
 *   La versión de acá sería el mismo cálculo, sin lock, y con una ventana de
 *   carrera entre la lectura y la escritura.
 */

/** `numeric(12,2)`: más de 2 decimales los redondea Postgres en silencio. */
const importe = z
  .number()
  .positive("El importe tiene que ser mayor a cero.")
  .max(9_999_999_999.99, "El importe supera el máximo que admite la base.")
  .refine((n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, {
    message: "El importe admite como máximo dos decimales.",
  });

export const imputacionSchema = z.object({
  comprobanteId: z
    .number({ message: "Falta el comprobante a imputar." })
    .int()
    .positive("Falta el comprobante a imputar."),
  monto: importe,
});

export const crearPagoSchema = z
  .object({
    proveedorId: z
      .number({ message: "Elegí el proveedor." })
      .int()
      .positive("Elegí el proveedor."),

    /**
     * El número de recibo/cheque que trae el pago. NO se autogenera: a
     * diferencia de la orden de compra o del movimiento de stock, este número
     * es un dato externo que el usuario copia del comprobante.
     *
     * ⚠️ El UNIQUE de la base es GLOBAL, no por proveedor. El modal lo valida
     *    solo contra los pagos de ese proveedor, así que un número reusado con
     *    otro proveedor pasa el front y vuelve como 409
     *    (`NUMERO_PAGO_DUPLICADO`, ver errors.ts).
     */
    numeroComprobante: z
      .string({ message: "El número de comprobante es obligatorio." })
      .trim()
      .min(1, "El número de comprobante es obligatorio.")
      .max(30, "El número de comprobante admite hasta 30 caracteres."),

    formaPagoId: z
      .number({ message: "Elegí la forma de pago." })
      .int()
      .positive("Elegí la forma de pago."),

    fecha: z
      .string({ message: "La fecha es obligatoria." })
      .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida."),

    monto: importe,

    imputaciones: z
      .array(imputacionSchema)
      .min(1, "Imputá el pago a por lo menos un comprobante."),
  })
  /**
   * Fecha no futura.
   *
   * Hoy solo lo valida el modal, y una validación de front no es un límite: es
   * una comodidad. Un pago con fecha futura desordena el saldo histórico y no
   * corresponde a nada que haya pasado.
   */
  .refine(
    (d) => {
      const fecha = new Date(`${d.fecha.slice(0, 10)}T00:00:00`);
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      return fecha <= hoy;
    },
    { message: "La fecha del pago no puede ser futura.", path: ["fecha"] },
  )
  /**
   * Sin comprobantes repetidos.
   *
   * `fn_pi_upsert_monto_imputado` los fusionaría EN SILENCIO sumando los
   * montos. Eso es peor que un error: el usuario carga 200 y 300 creyendo que
   * son dos comprobantes distintos, y después ve uno solo con 500 sin entender
   * qué pasó.
   */
  .refine(
    (d) => new Set(d.imputaciones.map((i) => i.comprobanteId)).size === d.imputaciones.length,
    {
      message: "Hay un comprobante repetido en la imputación. Cargá una sola línea por comprobante.",
      path: ["imputaciones"],
    },
  )
  /**
   * La suma imputada tiene que ser EXACTAMENTE el monto del pago.
   *
   * La base solo exige `suma <= monto`, y el modal también. Pero la diferencia
   * sería plata que entró al sistema y no está imputada a nada — y **no existe
   * el concepto de "pago a cuenta"**: no hay tabla, no hay saldo a favor, esa
   * plata simplemente desaparece del modelo. El saldo del proveedor no baja por
   * ella y no hay ninguna pantalla donde verla.
   *
   * Decisión tomada con el equipo: igualdad estricta. Si alguna vez hacen falta
   * pagos a cuenta, es otra HU con su propia tabla.
   *
   * La comparación va en centavos: `0.1 + 0.2 !== 0.3` en punto flotante, así
   * que comparar los decimales directamente rechazaría pagos correctos.
   */
  .refine(
    (d) => {
      const centavos = (n: number) => Math.round(n * 100);
      const suma = d.imputaciones.reduce((acc, i) => acc + centavos(i.monto), 0);
      return suma === centavos(d.monto);
    },
    {
      message:
        "La suma de las imputaciones tiene que ser igual al monto del pago: no se pueden dejar importes sin imputar.",
      path: ["imputaciones"],
    },
  );

export type CrearPagoInput = z.infer<typeof crearPagoSchema>;
