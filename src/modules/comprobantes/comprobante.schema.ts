import { z } from "zod";

export const lineaSchema = z.object({
  articuloId: z.number().int().positive("Seleccioná un artículo válido."),
  cantidad: z.number().positive("La cantidad debe ser mayor a cero."),
  precioFacturado: z.number().nonnegative("El precio no puede ser negativo."),
  subtotal: z.number().nonnegative("El subtotal no puede ser negativo.").optional(),
});

export const lineaComprobanteSchema = lineaSchema;

export const crearComprobanteSchema = z.object({
  proveedorId: z.number().int().positive("Elegí un proveedor."),
  tipoComprobanteId: z.number().int().positive("Elegí un tipo de comprobante."),
  letra: z.string().trim().min(1).max(2, "La letra debe tener máximo 2 caracteres.").toUpperCase(),
  puntoVenta: z.string().trim().regex(/^\d{1,4}$/, "El punto de venta debe tener hasta 4 dígitos."),
  numeroComprobante: z.string().trim().regex(/^\d{1,8}$/, "El número de comprobante debe tener hasta 8 dígitos."),
  fechaEmision: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Fecha de emisión inválida."),
  fechaVencimiento: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Fecha de vencimiento inválida."),
  ordenCompraId: z.number().int().positive("Elegí una orden de compra."),
  comprobanteCorregidoId: z.number().int().positive().nullable().optional().default(null),
  anulaComprobanteId: z.number().int().positive().nullable().optional().default(null),
  montoTotal: z.number().nonnegative().optional(),
  lineas: z.array(lineaSchema).min(1, "El comprobante debe tener al menos una línea."),
});

export const anularComprobanteSchema = z.object({
  motivo: z.string().trim().min(1, "El motivo de anulación es obligatorio.").max(500),
});

export type CrearComprobanteInput = z.infer<typeof crearComprobanteSchema>;
export type AnularComprobanteInput = z.infer<typeof anularComprobanteSchema>;
