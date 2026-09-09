import type { Recepcion, RecepcionDetalle } from "@/data/recepciones";
import type {
  LineaPendienteApi,
  LineaPendienteRow,
  RecepcionDetalleRow,
  RecepcionRow,
} from "./recepcion.types";

/**
 * HU-COMP-03 — traduce filas de la base al contrato que consume la pantalla.
 *
 * El mapper existe para que un cambio de nombre de columna no llegue al front.
 * Acá pasa tres cosas y ninguna es lógica de negocio:
 *
 *  1. snake_case de la base → el shape que espera el componente
 *  2. `numeric` → `number` (el driver `pg` los entrega como STRING para no
 *     perder precisión; si se pasaran tal cual, `cantidad + 1` daría "501")
 *  3. `Date` → string ISO
 */

function aNumero(valor: string | number): number {
  return typeof valor === "number" ? valor : Number(valor);
}

export function toApiDetalle(row: RecepcionDetalleRow): RecepcionDetalle {
  return {
    id: row.id,
    // El front lo llama `recepcion_id`; en la base es el id de la cabecera del
    // movimiento. Es el mismo número: la recepción ES el movimiento.
    recepcion_id: row.movimiento_id,
    // 0 solo si el artículo no está en ninguna línea de la OC, que la base
    // rechaza al insertar. Queda por si hay datos cargados a mano.
    orden_compra_detalle_id: row.orden_compra_detalle_id ?? 0,
    articulo_id: row.articulo_id,
    articuloNombre: row.articulo_nombre,

    // ⚠️ Esto es el PENDIENTE que había ANTES de esta entrega, no la cantidad
    // total de la OC (D-4). En una primera recepción total coinciden; en una
    // segunda parcial, no. La columna "Solicitado" de la pantalla muestra este
    // número.
    cantidadSolicitada: aNumero(row.cantidad_solicitada),
    cantidadRecibida: aNumero(row.cantidad_recibida),

    // ⚠️ SIEMPRE NULL, Y NO ES UN OLVIDO.
    //
    // `movimiento_stock_det` tiene tres columnas —movimiento, ficha, cantidad—
    // y ninguna donde guardar "faltante" o "2 envases rotos". Al unificar la
    // recepción con los movimientos de stock (pedido del PO), la observación
    // por línea se quedó sin lugar.
    //
    // Qué sí queda registrado de la diferencia:
    //   · `notificacion_compra` la detecta sola y guarda cantidades y mensaje
    //   · el texto que el usuario escriba se conserva en `motivo` de la
    //     cabecera (ver armarMotivo() en el service), sin atribución por línea
    //
    // Para recuperarla haría falta una columna nueva en `movimiento_stock_det`.
    // Está planteado en docs/backend/HU-COMP-03.md como decisión abierta: es
    // una decisión de modelo, no algo que el backend pueda resolver solo.
    observacion: null,
    observacionDetalle: null,
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
    sucursal: row.sucursal_nombre,
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
    const lista = porRecepcion.get(d.movimiento_id);
    if (lista) lista.push(d);
    else porRecepcion.set(d.movimiento_id, [d]);
  }

  return rows.map((r) => toApi(r, porRecepcion.get(r.id) ?? []));
}

/**
 * Una línea de la OC con su pendiente, para el formulario de alta.
 *
 * `cantidadPendiente` puede dar negativo si se recibió de más (algo que la base
 * permite y notifica). Se deja pasar el número real en vez de truncarlo en 0:
 * si la pantalla muestra "-5 pendientes", eso es exactamente lo que hay que
 * mirar, y esconderlo detrás de un cero haría que el problema no exista para
 * nadie.
 */
export function toLineaPendiente(row: LineaPendienteRow): LineaPendienteApi {
  const pedida = aNumero(row.cantidad_pedida);
  const recibida = aNumero(row.cantidad_recibida_acumulada);

  return {
    ordenCompraDetalleId: row.orden_compra_detalle_id,
    articuloId: row.articulo_id,
    articuloNombre: row.articulo_nombre,
    cantidadPedida: pedida,
    cantidadRecibida: recibida,
    cantidadPendiente: pedida - recibida,
  };
}
