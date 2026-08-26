import type { EstadoOrden, OrdenCompra, OrdenCompraDetalle } from "@/data/ordenes-compra";
import type { OrdenDetalleRow, OrdenRow } from "./orden.types";

/**
 * HU-COMP-02 — fila de Postgres → shape que el front espera.
 *
 * Este módulo NO usa camelCase: `src/data/ordenes-compra.ts` declara
 * `proveedor_id`, `precio_acordado`, `_proveedor`, `_detalles`. Es el único
 * módulo del front con ese estilo y el mapper lo respeta (guía §7): unificarlo
 * es trabajo del front, y hacerlo solo de un lado rompería la pantalla.
 *
 * Cuatro traducciones que no son cosméticas:
 *
 *  1. decimal → number. El driver `pg` devuelve los decimal(12,2) como STRING
 *     para no perder precisión. Sin convertir, el front recibiría total: "9610"
 *     y `o.total >= totalMin` compararía strings (el filtro por rango de
 *     importe de FiltrosOrdenes.tsx fallaría en silencio).
 *
 *  2. Date → string ISO. Los timestamp llegan como objetos Date; el tipo del
 *     front dice `string`.
 *
 *  3. estado_id → nombre del estado. El front muestra el string
 *     ("Pendiente", "Enviada"...); la base guarda la FK a estado_orden_compra.
 *
 *  4. deposito.ubicacion → `direccion_entrega`. El front espera la dirección ya
 *     resuelta; la base guarda la FK al depósito. Ver la divergencia anotada
 *     abajo.
 */

/**
 * Lo que devuelve la API: el contrato del front MÁS los tres campos que hoy le
 * faltan declarar. No son extras opcionales — son parte del contrato nuevo, y
 * el front tiene que agregarlos a su interfaz `OrdenCompra`
 * (ver docs/backend/PENDIENTE-FRONT.md).
 *
 *  · `cod_ord` — el número de la orden. Lo genera la secuencia de la base
 *    dentro de la transacción. El front venía derivándolo del id con
 *    `numeroOrden(id)`; eso hay que borrarlo. Un id es una PK, no un número de
 *    documento: coinciden hasta el primer borrado o la primera carga hecha
 *    desde otro lado.
 *
 *  · `forma_pago_id` — la PK de la condición de pago. Con solo el nombre, el
 *    `<select>` no puede preseleccionar la opción al abrir una orden para
 *    editarla, y el front tendría que buscar por texto.
 *
 *  · `deposito_id` — misma razón: es lo que preselecciona el depósito de
 *    entrega, en vez de adivinarlo comparando direcciones
 *    (`depositoPorDireccion()` en OrdenFormModal).
 *
 * `condicion_pago` y `direccion_entrega` se siguen mandando resueltos: la tabla
 * los muestra tal cual y no tiene por qué resolver ids para leer una fila.
 */
export type OrdenCompraApi = OrdenCompra & {
  cod_ord: string;
  forma_pago_id: number;
  deposito_id: number | null;
};

function aNumero(valor: string | null): number {
  return valor === null ? 0 : Number(valor);
}

export function toApi(row: OrdenRow, detalles: OrdenDetalleRow[]): OrdenCompraApi {
  return {
    id: row.id,
    cod_ord: row.cod_ord,
    proveedor_id: row.proveedor_id,
    cotizacion_id: row.cotizacion_id,
    usuario_id: row.usuario_id,
    fecha: row.fecha.toISOString(),
    fecha_entrega: row.fecha_entrega ? row.fecha_entrega.toISOString() : null,

    // DIVERGENCIA ASUMIDA: `src/data/ordenes-compra.ts` dice que la base guarda
    // un varchar `direccion_entrega` sin FK. El DER real hace lo contrario y es
    // lo correcto: guarda `deposito_id` y la dirección sale de
    // `deposito.ubicacion`. Así, si el depósito se muda, las órdenes viejas no
    // quedan con una dirección que ya no existe. El front recibe el mismo
    // string de siempre y no se entera.
    direccion_entrega: row.deposito_ubicacion ?? "",
    deposito_id: row.deposito_id,

    forma_pago_id: row.forma_pago_id,
    condicion_pago: row.forma_pago_nombre,
    notas: row.notas,

    subtotal: aNumero(row.subtotal),
    // PORCENTAJE (0-100), no monto: así lo declara el front y así lo guarda la
    // columna (CHECK ck_oc_importes).
    descuento: aNumero(row.descuento),
    gastos_envio: aNumero(row.gastos_envio),
    total: aNumero(row.total),

    // El cast es seguro mientras `estado_orden_compra` tenga los 5 nombres
    // sembrados en db/seeds/01_catalogos.sql. Si alguien agrega un sexto estado
    // desde el SQL Editor, el tipo del front miente y hay que ampliar la unión
    // `EstadoOrden`.
    estado: row.estado_nombre as EstadoOrden,

    _proveedor: { id: row.proveedor_id, razon_social: row.proveedor_razon_social },
    _usuario: {
      id: row.usuario_id,
      nombre: `${row.usuario_nombre} ${row.usuario_apellido}`.trim(),
    },
    _detalles: detalles.map(toApiDetalle),
  };
}

function toApiDetalle(row: OrdenDetalleRow): OrdenCompraDetalle {
  return {
    id: row.id,
    orden_compra_id: row.orden_compra_id,
    articulo_id: row.articulo_id,
    cantidad: Number(row.cantidad),
    precio_acordado: Number(row.precio_acordado),
  };
}

/**
 * Arma el listado agrupando los detalles por orden.
 *
 * Recibe TODOS los detalles de TODAS las órdenes en un solo array (así los trae
 * el repo, en una consulta) y los reparte acá. Con un Map es una pasada; con
 * `detalles.filter(...)` dentro del map sería una pasada por orden.
 */
export function toApiList(rows: OrdenRow[], detalles: OrdenDetalleRow[]): OrdenCompraApi[] {
  const porOrden = new Map<number, OrdenDetalleRow[]>();
  for (const d of detalles) {
    const grupo = porOrden.get(d.orden_compra_id);
    if (grupo) grupo.push(d);
    else porOrden.set(d.orden_compra_id, [d]);
  }
  return rows.map((row) => toApi(row, porOrden.get(row.id) ?? []));
}
