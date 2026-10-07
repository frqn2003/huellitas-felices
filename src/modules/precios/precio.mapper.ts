import type { Categoria } from "@/data/articulos";
import type { FilaListaPrecio, HistorialPrecio } from "@/data/lista-precios";
import type { HistorialRow, PrecioRow } from "./precio.types";

/**
 * HU-STK-03 — fila de Postgres → shape que espera el front.
 *
 *  · `numeric` llega como string desde `pg` → number.
 *  · `Date` → string ISO (los `date` como YYYY-MM-DD, los timestamp completos).
 *  · NULL se conserva donde el front lo distingue (`precio: null` = "Sin precio").
 */

/** `date` de Postgres → "YYYY-MM-DD" (sin que la zona horaria corra el día). */
function aFecha(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

const aNumero = (v: string | null): number | null => (v === null ? null : Number(v));
const aIso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/** Fila de artículo → FilaListaPrecio (contrato de src/data/lista-precios.ts). */
export function toFilaArticulo(r: PrecioRow): FilaListaPrecio {
  return {
    precioId: r.precio_id,
    articuloId: r.sujeto_id,
    codigo: r.codigo ?? "",
    nombre: r.nombre,
    descripcion: r.descripcion ?? "",
    categoria: (r.categoria_nombre ?? "") as Categoria,
    unidadMedida: r.unidad_medida_nombre ?? "",
    fabricante: r.fabricante_nombre ?? "",
    // `articulo.fecha_vencimiento` ya no existe (D1, lotes fuera del Sprint 1).
    fechaVencimiento: null,
    imagenUrl: r.imagen_url ?? "",
    estado: r.estado,
    precio: aNumero(r.precio),
    vigenciaDesde: aFecha(r.vigencia_desde),
    usuarioId: r.usuario_id,
    usuarioNombre: r.usuario_nombre,
    fechaRegistro: aIso(r.fecha_registro),
    updatedAt: aIso(r.updated_at),
    costoRefOc: aNumero(r.costo_ref_oc),
  };
}

/** Fila de práctica/servicio (p. ej. consulta médica). */
export type FilaPrecioPractica = {
  precioId: number | null;
  practicaId: number;
  nombre: string;
  estado: "activo" | "inactivo";
  precio: number | null;
  vigenciaDesde: string | null;
  usuarioId: number | null;
  usuarioNombre: string | null;
  fechaRegistro: string | null;
  updatedAt: string | null;
};

export function toFilaPractica(r: PrecioRow): FilaPrecioPractica {
  return {
    precioId: r.precio_id,
    practicaId: r.sujeto_id,
    nombre: r.nombre,
    estado: r.estado,
    precio: aNumero(r.precio),
    vigenciaDesde: aFecha(r.vigencia_desde),
    usuarioId: r.usuario_id,
    usuarioNombre: r.usuario_nombre,
    fechaRegistro: aIso(r.fecha_registro),
    updatedAt: aIso(r.updated_at),
  };
}

/** Fila del historial. `sujetoId` = articuloId o practicaId según el endpoint. */
export function toHistorial(r: HistorialRow): HistorialPrecio {
  return {
    id: r.id,
    articuloId: r.sujeto_id,
    precio: Number(r.precio),
    vigenciaDesde: aFecha(r.vigencia_desde) as string,
    vigenciaHasta: aFecha(r.vigencia_hasta),
    usuarioId: r.usuario_id,
    usuarioNombre: r.usuario_nombre,
    fechaHora: r.fecha_hora.toISOString(),
  };
}
