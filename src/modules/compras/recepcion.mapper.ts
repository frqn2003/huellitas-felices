import type { Recepcion, RecepcionDetalle } from "@/data/recepciones";
import type {
  LineaPendienteApi,
  LineaPendienteRow,
  RecepcionDetalleRow,
  RecepcionRow,
} from "./recepcion.types";

/**
 * HU-COMP-03 — fila de Postgres → shape que el front espera.
 *
 * El contrato es `src/data/recepciones.ts`. Ese archivo mezcla snake_case
 * (`orden_compra_id`, `tipo_recepcion`, `_detalles`) con camelCase
 * (`articuloNombre`, `cantidadRecibida`), y el mapper lo copia tal cual: es el
 * contrato que la pantalla ya consume, y cambiarlo de un solo lado la rompe
 * (GUIA-IMPLEMENTACION §7).
 *
 * Tres traducciones que no son cosméticas:
 *
 *  1. numeric → number. El driver `pg` devuelve los numeric(12,2) como STRING
 *     para no perder precisión. Sin convertir, el front recibiría
 *     cantidadRecibida: "85" y cualquier resta o comparación numérica fallaría
 *     en silencio.
 *
 *  2. Date → string ISO. Los timestamp llegan como objetos Date; el tipo del
 *     front dice `string`.
 *
 *  3. nombre + apellido → `usuario.nombre`. El front muestra un solo campo.
 */

function aNumero(valor: string | number): number {
  return typeof valor === "number" ? valor : Number(valor);
}

export function toApiDetalle(row: RecepcionDetalleRow): RecepcionDetalle {
  return {
    id: row.id,
    recepcion_id: row.recepcion_id,
    orden_compra_detalle_id: row.orden_compra_detalle_id,
    articulo_id: row.articulo_id,
    articuloNombre: row.articulo_nombre,

    // ⚠️ Esto es el PENDIENTE que había al momento de la entrega, no la cantidad
    // total de la OC (D-4). En una primera recepción total coinciden; en una
    // segunda parcial, no. El brief del front asume lo contrario: la columna
    // "Solicitado" de la pantalla tiene que mostrar este número (§8.3 del doc).
    cantidadSolicitada: aNumero(row.cantidad_solicitada),
    cantidadRecibida: aNumero(row.cantidad_recibida),

    observacion: row.observacion,
    observacionDetalle: row.observacion_detalle,
  };
}

export function toApi(row: RecepcionRow, detalles: RecepcionDetalleRow[]): Recepcion {
  return {
    id: row.id,
    numero: row.numero,
    orden_compra_id: row.orden_compra_id,
    ordenCompra: {
      numero: row.orden_cod_ord,
      proveedor: { id: row.proveedor_id, razonSocial: row.proveedor_razon_social },
    },
    deposito_id: row.deposito_id,
    deposito: { id: row.deposito_id, nombre: row.deposito_nombre },
    tipo_recepcion: row.tipo_recepcion,
    usuario_id: row.usuario_id,
    usuario: { nombre: `${row.usuario_nombre} ${row.usuario_apellido}`.trim() },
    fecha_hora: new Date(row.fecha_hora).toISOString(),
    observacion_general: row.observacion_general,
    _detalles: detalles.map(toApiDetalle),
  };
}

/**
 * Arma el listado agrupando los detalles por recepción.
 *
 * Recibe TODOS los detalles de TODAS las recepciones en un solo array (así los
 * trae el repo, en una consulta) y los reparte acá. Con un Map es una pasada;
 * con `detalles.filter(...)` dentro del map sería una pasada por recepción.
 */
export function toApiList(
  rows: RecepcionRow[],
  detalles: RecepcionDetalleRow[],
): Recepcion[] {
  const porRecepcion = new Map<number, RecepcionDetalleRow[]>();
  for (const d of detalles) {
    const grupo = porRecepcion.get(d.recepcion_id);
    if (grupo) grupo.push(d);
    else porRecepcion.set(d.recepcion_id, [d]);
  }
  return rows.map((row) => toApi(row, porRecepcion.get(row.id) ?? []));
}

/**
 * Línea de la OC → lo que el formulario de alta necesita para armar una fila.
 *
 * `cantidadPendiente` nunca sale negativa: si la base tuviera una
 * sobre-recepción cargada a mano desde el SQL Editor, mostrar "-5 pendientes"
 * confundiría más de lo que informa.
 */
export function toLineaPendiente(row: LineaPendienteRow): LineaPendienteApi {
  const pedida = aNumero(row.cantidad_pedida);
  const acumulada = aNumero(row.cantidad_recibida_acumulada);

  return {
    ordenCompraDetalleId: row.orden_compra_detalle_id,
    articuloId: row.articulo_id,
    articuloNombre: row.articulo_nombre,
    cantidadPedida: pedida,
    cantidadRecibidaAcumulada: acumulada,
    cantidadPendiente: Math.max(0, pedida - acumulada),
  };
}
