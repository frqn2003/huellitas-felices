/**
 * CONTRATO — Lista de Precios de Venta e Historial (HU-STK-03)
 *
 * Define las rutas, parámetros y tipos de respuesta acordados entre
 * frontend y backend para la consulta y gestión de precios vigentes e históricos.
 */

import { z } from "zod";
import type { FilaListaPrecio, HistorialPrecio } from "@/data/lista-precios";

// ─── 1. Rutas ────────────────────────────────────────────────────────────────

export const RUTA_LISTA_PRECIOS = "/api/lista-precios";
export const rutaPrecio = (id: number) => `${RUTA_LISTA_PRECIOS}/${id}`;

export const RUTA_HISTORIAL_PRECIOS = "/api/lista-precios/historial";
export const rutaHistorialArticulo = (articuloId: number) =>
  `${RUTA_HISTORIAL_PRECIOS}?articuloId=${articuloId}`;
export const rutaHistorialPractica = (practicaId: number) =>
  `${RUTA_HISTORIAL_PRECIOS}?tipo=practica&practicaId=${practicaId}`;

// ─── 2. Schemas de Validación ────────────────────────────────────────────────

export const consultaHistorialSchema = z.object({
  articuloId: z.coerce.number().int().positive().optional(),
  practicaId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["articulo", "practica"]).optional().default("articulo"),
});

export type ConsultaHistorialParams = z.infer<typeof consultaHistorialSchema>;

// ─── 3. Tipos de Respuesta ───────────────────────────────────────────────────

export type ListaPreciosResponse = FilaListaPrecio[];
export type HistorialPreciosResponse = HistorialPrecio[];

// ─── 4. Códigos de Error ────────────────────────────────────────────────────

export const ERRORES_PRECIOS = {
  FILTRO_OBLIGATORIO: "FILTRO_OBLIGATORIO",
  NO_ENCONTRADO: "NO_ENCONTRADO",
  PRECIO_YA_CARGADO: "PRECIO_YA_CARGADO",
  SUJETO_INACTIVO: "SUJETO_INACTIVO",
} as const;
