import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db/client";
import type {
  FiltrosRecepcion,
  LineaPendienteRow,
  NotificacionGenerada,
  OrdenParaRecepcionRow,
  RecepcionDetalleRow,
  RecepcionRow,
} from "./recepcion.types";

type Ejecutor = Pool | PoolClient;

/**
 * HU-COMP-03 — SQL de la Recepción de Mercadería.
 *
 * Todo contra `movimiento_stock_cab` / `movimiento_stock_det`: la recepción es
 * un movimiento de stock, no una tabla aparte (ver recepcion.types.ts).
 *
 * Acá NO hay reglas de negocio ni HTTP. Solo consultas.
 */

/**
 * El filtro que convierte "movimientos" en "recepciones".
 *
 * Se resuelve por NOMBRE y no por un id fijo escrito a mano: el id de
 * `recepcion_compra` depende del orden en que se sembró el catálogo, y
 * hardcodear un `origen_id = 7` es la clase de constante que funciona en la
 * base de uno y falla en la del otro.
 *
 * La subconsulta va en línea en cada query en vez de resolverse antes en JS
 * porque así el filtro viaja con el SQL: es imposible escribir una consulta de
 * este repo y olvidarse de aplicarlo — que devolvería egresos por venta
 * mezclados en el historial de recepciones.
 */
const ORIGEN_RECEPCION = `(SELECT id FROM origen_movimiento WHERE nombre = 'recepcion_compra')`;

/**
 * ¿Después de este movimiento quedó alguna línea de la OC sin completar?
 *
 * Es la derivación de `tipo_recepcion` (D-1). Antes era una columna; ahora se
 * calcula, porque `movimiento_stock_cab` no tiene dónde guardarla y porque
 * guardarla sería una copia cacheada de esta misma pregunta.
 *
 * El `c2.id <= c.id` es lo que la vuelve HISTÓRICA: mirando una recepción vieja
 * responde "¿cerró la orden EN SU MOMENTO?", no "¿la orden está cerrada hoy?".
 * Sin ese recorte, una entrega parcial de agosto figuraría como total apenas
 * llegara la que completó la orden en septiembre.
 */
const LATERAL_TIPO = `
  LEFT JOIN LATERAL (
    SELECT NOT EXISTS (
      SELECT 1
      FROM orden_compra_detalle ocd
      WHERE ocd.orden_compra_id = c.origen_entidad_id
        AND ocd.cantidad > COALESCE((
              SELECT SUM(d2.cantidad)
              FROM movimiento_stock_det d2
              JOIN movimiento_stock_cab c2 ON c2.id = d2.movimiento_id
              JOIN ficha_stock          f2 ON f2.id = d2.ficha_stock_id
              WHERE c2.origen_id         = c.origen_id
                AND c2.origen_entidad_id = c.origen_entidad_id
                AND c2.id               <= c.id
                AND f2.articulo_id       = ocd.articulo_id
            ), 0)
    ) AS es_total
  ) tr ON true
`;

/**
 * El FROM compartido entre el listado, el contador y el detalle.
 *
 * Se define una sola vez a propósito: si el listado y `contar()` filtraran
 * distinto, el paginador mostraría "23 resultados" sobre una lista de 18 y
 * nadie entendería por qué. Mismo criterio que ya se usaba antes del cambio de
 * modelo.
 */
const FROM_RECEPCION = `
  FROM movimiento_stock_cab c
  JOIN orden_compra   oc ON oc.id = c.origen_entidad_id
  JOIN proveedor       p ON p.id  = oc.proveedor_id
  JOIN deposito        d ON d.id  = c.deposito_id
  JOIN sucursal        s ON s.id  = d.sucursal_id
  JOIN usuario         u ON u.id  = c.usuario_id
  ${LATERAL_TIPO}
`;

const SELECT_RECEPCION = `
  SELECT
    c.id,
    c.numero,
    c.origen_entidad_id AS orden_compra_id,
    oc.cod_ord          AS orden_cod_ord,
    oc.proveedor_id,
    p.razon_social      AS proveedor_razon_social,
    c.deposito_id,
    d.nombre            AS deposito_nombre,
    s.nombre            AS sucursal_nombre,
    CASE WHEN tr.es_total THEN 'total' ELSE 'parcial' END AS tipo_recepcion,
    c.usuario_id,
    u.nombre            AS usuario_nombre,
    u.apellido          AS usuario_apellido,
    c.fecha_hora,
    c.motivo            AS observacion_general
  ${FROM_RECEPCION}
`;

/**
 * Arma el WHERE del listado.
 *
 * Se comparte entre `findAll` y `contar` por el mismo motivo que el FROM.
 */
function construirWhere(f: FiltrosRecepcion): { where: string; params: unknown[] } {
  // El primer filtro no es opcional: es lo que distingue una recepción de
  // cualquier otro movimiento de stock.
  const condiciones: string[] = [`c.origen_id = ${ORIGEN_RECEPCION}`];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    condiciones.push(
      `(c.numero ILIKE $${params.length}
        OR oc.cod_ord ILIKE $${params.length}
        OR p.razon_social ILIKE $${params.length})`,
    );
  }

  if (f.proveedorId) {
    params.push(f.proveedorId);
    condiciones.push(`oc.proveedor_id = $${params.length}`);
  }

  if (f.ordenCompraId) {
    params.push(f.ordenCompraId);
    condiciones.push(`c.origen_entidad_id = $${params.length}`);
  }

  // El tipo es derivado, así que el filtro va contra el LATERAL y no contra una
  // columna. Funciona igual; lo que no se puede es indexarlo.
  if (f.tipoRecepcion === "total") condiciones.push(`tr.es_total`);
  if (f.tipoRecepcion === "parcial") condiciones.push(`NOT tr.es_total`);

  if (f.fechaDesde) {
    params.push(f.fechaDesde);
    condiciones.push(`c.fecha_hora >= $${params.length}::date`);
  }

  if (f.fechaHasta) {
    // `< fechaHasta + 1 día` y no `<= fechaHasta`: la columna es timestamp, así
    // que `<= '2026-09-08'` se compara contra las 00:00 y deja afuera todo lo
    // recibido ese mismo día.
    params.push(f.fechaHasta);
    condiciones.push(`c.fecha_hora < ($${params.length}::date + interval '1 day')`);
  }

  return { where: `WHERE ${condiciones.join(" AND ")}`, params };
}

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findAll(
  f: FiltrosRecepcion = {},
  ejecutor: Ejecutor = pool,
): Promise<RecepcionRow[]> {
  const { where, params } = construirWhere(f);

  const pagina = f.pagina ?? 1;
  const porPagina = f.porPagina ?? 50;
  params.push(porPagina, (pagina - 1) * porPagina);

  const { rows } = await ejecutor.query<RecepcionRow>(
    `${SELECT_RECEPCION} ${where}
     ORDER BY c.fecha_hora DESC, c.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows;
}

export async function contar(
  f: FiltrosRecepcion = {},
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const { where, params } = construirWhere(f);
  const { rows } = await ejecutor.query<{ total: string }>(
    `SELECT count(*)::int AS total ${FROM_RECEPCION} ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<RecepcionRow | null> {
  const { rows } = await ejecutor.query<RecepcionRow>(
    `${SELECT_RECEPCION}
     WHERE c.id = $1 AND c.origen_id = ${ORIGEN_RECEPCION}`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * El detalle de N recepciones en UNA consulta.
 *
 * `= ANY($1)` y no un `IN` armado con string interpolation: el array viaja como
 * parámetro y no hay forma de inyectar nada. Y una sola consulta para las N
 * recepciones de la página, no una por recepción — que sería el N+1 clásico:
 * con 50 filas en pantalla, 51 viajes a la base en vez de 2.
 *
 * `cantidad_solicitada` es lo que faltaba ANTES de esta entrega (D-4):
 * lo pedido en la línea de la OC menos todo lo recibido en movimientos
 * anteriores. El `d2.id`/`c2.id < c.id` es lo que lo hace "antes".
 */
export async function findDetalles(
  ids: number[],
  ejecutor: Ejecutor = pool,
): Promise<RecepcionDetalleRow[]> {
  if (ids.length === 0) return [];

  const { rows } = await ejecutor.query<RecepcionDetalleRow>(
    `SELECT
       det.id,
       det.movimiento_id,
       ocd.id            AS orden_compra_detalle_id,
       fs.articulo_id,
       a.nombre          AS articulo_nombre,
       COALESCE(ocd.cantidad, 0) - COALESCE((
         SELECT SUM(d2.cantidad)
         FROM movimiento_stock_det d2
         JOIN movimiento_stock_cab c2 ON c2.id = d2.movimiento_id
         JOIN ficha_stock          f2 ON f2.id = d2.ficha_stock_id
         WHERE c2.origen_id         = c.origen_id
           AND c2.origen_entidad_id = c.origen_entidad_id
           AND c2.id                < c.id
           AND f2.articulo_id       = fs.articulo_id
       ), 0)             AS cantidad_solicitada,
       det.cantidad      AS cantidad_recibida
     FROM movimiento_stock_det det
     JOIN movimiento_stock_cab c  ON c.id  = det.movimiento_id
     JOIN ficha_stock          fs ON fs.id = det.ficha_stock_id
     JOIN articulo             a  ON a.id  = fs.articulo_id
     LEFT JOIN orden_compra_detalle ocd
            ON ocd.orden_compra_id = c.origen_entidad_id
           AND ocd.articulo_id     = fs.articulo_id
     WHERE det.movimiento_id = ANY($1::int[])
     ORDER BY det.movimiento_id, det.id`,
    [ids],
  );
  return rows;
}

// ---------------------------------------------------------
// La orden de compra
// ---------------------------------------------------------

/**
 * Trae la OC y la BLOQUEA hasta el fin de la transacción.
 *
 * Es lo primero que hace el service, y no es opcional: sin el lock, dos
 * personas recibiendo contra la misma orden leen las dos "todavía falta 10", y
 * las dos aceptan una entrega de 10 — cuando entre las dos recibieron 20.
 *
 * `FOR UPDATE OF oc` bloquea SOLO `orden_compra`. Sin el `OF`, Postgres
 * intentaría bloquear también las filas de proveedor y estado_orden_compra del
 * JOIN: filas de catálogo que todas las demás transacciones leen todo el tiempo.
 */
export async function lockOrden(
  ordenCompraId: number,
  client: PoolClient,
): Promise<OrdenParaRecepcionRow | null> {
  const { rows } = await client.query<OrdenParaRecepcionRow>(
    `SELECT
       oc.id,
       oc.cod_ord,
       oc.proveedor_id,
       p.razon_social AS proveedor_razon_social,
       oc.usuario_id,
       oc.deposito_id,
       oc.estado_id,
       e.nombre       AS estado_nombre,
       e.es_final
     FROM orden_compra oc
     JOIN proveedor           p ON p.id = oc.proveedor_id
     JOIN estado_orden_compra e ON e.id = oc.estado_id
     WHERE oc.id = $1
     FOR UPDATE OF oc`,
    [ordenCompraId],
  );
  return rows[0] ?? null;
}

/**
 * Por cada línea de la OC: cuánto se pidió y cuánto se recibió acumulado.
 *
 * Una sola consulta, no un loop por línea. El LEFT JOIN LATERAL es lo que hace
 * que una línea sin ninguna recepción todavía aparezca con acumulado 0 en vez
 * de desaparecer del resultado — y esa línea es justo la que el formulario de
 * alta tiene que ofrecer.
 *
 * El acumulado se suma sobre los MOVIMIENTOS de recepción de la orden. Antes se
 * sumaba sobre `recepcion_mercaderia_detalle`, que ya no existe; el número es el
 * mismo porque es la misma entrega, contada donde ahora vive.
 */
export async function findPendientePorLinea(
  ordenCompraId: number,
  ejecutor: Ejecutor = pool,
): Promise<LineaPendienteRow[]> {
  const { rows } = await ejecutor.query<LineaPendienteRow>(
    `SELECT
       ocd.id                         AS orden_compra_detalle_id,
       ocd.articulo_id,
       a.nombre                       AS articulo_nombre,
       ocd.cantidad                   AS cantidad_pedida,
       COALESCE(rec.recibido, 0)      AS cantidad_recibida_acumulada
     FROM orden_compra_detalle ocd
     JOIN articulo a ON a.id = ocd.articulo_id
     LEFT JOIN LATERAL (
       SELECT SUM(d.cantidad) AS recibido
       FROM movimiento_stock_det d
       JOIN movimiento_stock_cab c  ON c.id  = d.movimiento_id
       JOIN ficha_stock          fs ON fs.id = d.ficha_stock_id
       WHERE c.origen_id         = ${ORIGEN_RECEPCION}
         AND c.origen_entidad_id = ocd.orden_compra_id
         AND fs.articulo_id      = ocd.articulo_id
     ) rec ON true
     WHERE ocd.orden_compra_id = $1
     ORDER BY ocd.id`,
    [ordenCompraId],
  );
  return rows;
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/**
 * Devuelve el id del origen `recepcion_compra`, que la cabecera necesita.
 *
 * Si el catálogo no lo tiene, el problema no es del usuario: falta correr
 * `db/seeds/01_catalogos.sql`. El service lo convierte en un 500 con ese
 * mensaje en el log, no en un error de validación que mandaría a buscar el
 * problema en el formulario.
 */
export async function findOrigenRecepcion(
  ejecutor: Ejecutor = pool,
): Promise<{ id: number } | null> {
  const { rows } = await ejecutor.query<{ id: number }>(
    `SELECT id FROM origen_movimiento WHERE nombre = 'recepcion_compra'`,
  );
  return rows[0] ?? null;
}

/**
 * Devuelve la ficha de stock del par (artículo, depósito), creándola si no está.
 *
 * POR QUÉ SE CREA AL VUELO (D-2)
 *   La recepción es, justamente, la forma natural en que un artículo entra por
 *   primera vez a un depósito. Exigir que la ficha exista antes obligaría a
 *   frenar la descarga de la mercadería para ir a otra pantalla a crearla.
 *
 * El `ON CONFLICT DO NOTHING` se apoya en el unique (articulo_id, deposito_id):
 * dos recepciones simultáneas del mismo artículo se resuelven solas, sin que
 * ninguna falle.
 *
 * ⚠️ La ficha nace con `stock_minimo = 0`, así que NUNCA dispara alerta de
 *    reposición. Por eso devuelve `creada`: el service lo propaga y la pantalla
 *    avisa que hay que configurar los umbrales.
 */
export async function asegurarFichaStock(
  articuloId: number,
  depositoId: number,
  client: PoolClient,
): Promise<{ id: number; creada: boolean }> {
  const insertada = await client.query<{ id: number }>(
    `INSERT INTO ficha_stock (articulo_id, deposito_id, stock_actual, stock_minimo)
     VALUES ($1, $2, 0, 0)
     ON CONFLICT (articulo_id, deposito_id) DO NOTHING
     RETURNING id`,
    [articuloId, depositoId],
  );

  if (insertada.rows.length > 0) {
    return { id: insertada.rows[0].id, creada: true };
  }

  const existente = await client.query<{ id: number }>(
    `SELECT id FROM ficha_stock WHERE articulo_id = $1 AND deposito_id = $2`,
    [articuloId, depositoId],
  );
  return { id: existente.rows[0].id, creada: false };
}

/**
 * Lee las diferencias que dejó `fn_notificar_diferencia_compra`.
 *
 * ⚠️ SE LEEN, NO SE ESCRIBEN. El trigger corre por cada detalle insertado y es
 *    el único que ve el acumulado completo de la OC en ese instante: si el
 *    service las escribiera también, habría dos filas por diferencia — o peor,
 *    dos números distintos.
 *
 *    El trigger además BORRA la notificación cuando una entrega posterior
 *    completa la línea. Duplicar esa lógica acá sería duplicar también la
 *    decisión de cuándo una diferencia dejó de existir.
 *
 * Se consulta con el mismo `client` de la transacción: desde otra conexión del
 * pool estas filas todavía no existen (falta el COMMIT).
 */
export async function findNotificacionesDeOrden(
  ordenCompraId: number,
  client: PoolClient,
): Promise<NotificacionGenerada[]> {
  const { rows } = await client.query<{
    id: number;
    orden_compra_detalle_id: number;
    usuario_responsable_id: number;
    mensaje: string;
    cantidad_solicitada: string;
    cantidad_recibida: string;
    diferencia: string | null;
  }>(
    `SELECT n.id, n.orden_compra_detalle_id, n.usuario_responsable_id, n.mensaje,
            n.cantidad_solicitada, n.cantidad_recibida, n.diferencia
     FROM notificacion_compra n
     JOIN orden_compra_detalle ocd ON ocd.id = n.orden_compra_detalle_id
     WHERE ocd.orden_compra_id = $1
     ORDER BY n.id`,
    [ordenCompraId],
  );

  return rows.map((r) => ({
    id: r.id,
    ordenCompraDetalleId: r.orden_compra_detalle_id,
    usuarioResponsableId: r.usuario_responsable_id,
    mensaje: r.mensaje,
    cantidadSolicitada: Number(r.cantidad_solicitada),
    cantidadRecibida: Number(r.cantidad_recibida),
    diferencia: Number(r.diferencia ?? 0),
  }));
}

/**
 * Cómo quedó la OC después de la recepción.
 *
 * El estado lo mueve `fn_actualiza_oc_por_recepcion`, no este módulo. Esto solo
 * lo lee para devolvérselo al front, que muestra "La orden quedó Recibida
 * Total" sin tener que adivinarlo.
 */
export async function findEstadoOrden(
  ordenCompraId: number,
  client: PoolClient,
): Promise<string | null> {
  const { rows } = await client.query<{ nombre: string }>(
    `SELECT e.nombre
     FROM orden_compra oc
     JOIN estado_orden_compra e ON e.id = oc.estado_id
     WHERE oc.id = $1`,
    [ordenCompraId],
  );
  return rows[0]?.nombre ?? null;
}
