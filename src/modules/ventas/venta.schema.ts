import { z } from "zod";

/**
 * HU-VTA-01 — validación de input (solo FORMA; las reglas que consultan la base
 * viven en el service).
 *
 * LO QUE NO ESTÁ A PROPÓSITO:
 *  · `precioUnitario` / `subtotal` / `total` — el precio se toma SIEMPRE de la
 *    Lista de Precios vigente (HU-STK-03) y no es editable en esta pantalla.
 *    Aunque el front lo mande, zod lo descarta.
 *  · `clienteId` — `venta` no tiene cliente: si el cobro nace de una atención
 *    médica, el cliente es el de esa consulta (consulta_medica.cliente_id).
 *    Una venta de mostrador sin consulta es anónima por diseño del schema.
 *  · `usuarioId` — el responsable es el de la sesión.
 *  · `fecha` — es la del momento de la venta (la lista de precios es una sola
 *    fila vigente, sin rangos de fechas).
 */

const idPositivo = (msg: string) => z.number({ message: msg }).int(msg).positive(msg);

/** venta_detalle.cantidad es numeric(12,2) > 0 (admite fracciones: kg, mL). */
const cantidad = z
  .number({ message: "La cantidad es obligatoria." })
  .positive("La cantidad debe ser mayor a 0.")
  .max(9_999_999_999.99, "La cantidad supera el máximo que admite la base.")
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "La cantidad admite hasta 2 decimales.");

const lineaSchema = z
  .object({
    articuloId: idPositivo("Seleccioná un artículo.").optional(),
    practicaId: idPositivo("Seleccioná un servicio.").optional(),
    cantidad,
  })
  .refine((l) => (l.articuloId === undefined) !== (l.practicaId === undefined), {
    message: "Cada línea lleva un artículo o un servicio (uno solo).",
    path: ["articuloId"],
  });

const lineas = z.array(lineaSchema).default([]);

/** POST /api/ventas/calcular — previsualiza líneas y total. */
export const calcularVentaSchema = z
  .object({
    consultaId: idPositivo("Indicá la atención médica.").optional(),
    turnoId: idPositivo("Indicá el turno.").optional(),
    lineas,
  })
  .refine((d) => d.consultaId !== undefined || d.turnoId !== undefined || d.lineas.length > 0, {
    message: "Agregá al menos un ítem o indicá una atención médica o turno.",
    path: ["lineas"],
  });

/** POST /api/ventas — confirma la venta. */
export const crearVentaSchema = z
  .object({
    sucursalId: idPositivo("Seleccioná una sucursal.").optional(),
    depositoId: idPositivo("Seleccioná un depósito.").optional(),
    /** Cobro de una atención finalizada: precarga la consulta y sus insumos. */
    consultaId: idPositivo("Indicá la atención médica.").optional(),
    /** Turno directo a cobrar en mostrador. */
    turnoId: idPositivo("Indicá el turno.").optional(),
    /** Con consulta: ítems ADICIONALES. Sin consulta: el detalle completo. */
    lineas,
    mediosPago: z
      .array(
        z.object({
          formaPagoId: idPositivo("Seleccioná la forma de pago."),
          monto: z
            .number({ message: "El monto es obligatorio." })
            .positive("El monto debe ser mayor a 0.")
            .max(9_999_999_999.99),
        }),
      )
      .min(1, "Indicá al menos un medio de pago."),
  })
  .refine((d) => d.consultaId !== undefined || d.turnoId !== undefined || d.lineas.length > 0, {
    message: "Agregá al menos un ítem o indicá una atención médica o turno.",
    path: ["lineas"],
  });

export type CalcularVentaInput = z.infer<typeof calcularVentaSchema>;
export type CrearVentaInput = z.infer<typeof crearVentaSchema>;
