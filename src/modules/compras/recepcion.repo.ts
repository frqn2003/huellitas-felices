import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db/client";
import type {
  CabeceraRecepcionInput,
  FiltrosRecepcion,
  LineaPendienteRow,
  LineaRecepcionInsert,
  OrdenParaRecepcionRow,
  RecepcionDetalleRow,
  RecepcionRow,
} from "./recepcion.types";
import type { EstadoOrdenRow } from "./orden.types";

/**
 * HU-COMP-03 — capa de acceso a datos de las recepciones.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 * ACÁ NO VA: validaciones, reglas, transacciones (las abre el service).
 *
 * LO QUE HACE LA BASE Y ACÁ NO SE REPITE:
 *  · `numero` (REC-000001) lo pone `trg_generar_numero_recepcion`
 *  · `diferencia` es una columna GENERATED: no se inserta ni se actualiza
 *  · la fila de `auditoria` la escribe `trg_auditoria_recepcion_mercaderia`
 *  · `ficha_stock.stock_actual` lo mueve `fn_actualizar_stock_det` cuando el
 *    service inserta el detalle del movimiento — este repo NO lo toca
 */

/**
 * El `ejecutor` por defecto es el pool, pero hay que pasarle el client cuando se
 * lee DENTRO de una transacción abierta: desde otra conexión, las filas recién
 * insertadas no existen hasta el COMMIT. Sin esto, el POST devolvía la recepción
 * sin detalles.
 */
type Ejecutor = Pool | PoolClient;

// ---------------------------------------------------------
// SELECT base del listado y del detalle
// ---------------------------------------------------------

const SELECT_RECEPCION = `
  SELECT
    r.id,
    r.numero,
    r.orden_compra_id,
    oc.cod_ord        AS orden_cod_ord,
    oc.proveedor_id,
    p.razon_social    AS proveedor_razon_social,
    r.deposito_id,
    d.nombre          AS deposito_nombre,
    r.tipo_recepcion,
    r.usuario_id,
    u.nombre          AS usuario_nombre,
    u.apellido        AS usuario_apellido,
    r.fecha_hora,
    r.observacion_general
  FROM recepcion_mercaderia r
  JOIN orden_compra oc ON oc.id = r.orden_compra_id
  JOIN proveedor    p  ON p.id  = oc.proveedor_id
  JOIN deposito     d  ON d.id  = r.deposito_id
  JOIN usuario      u  ON u.id  = r.usuario_id
`;

/**
 * Arma el WHERE del listado.
 *
 * Se comparte entre `findAll` y `contar` para que la página y el total no
 * puedan filtrar distinto: si se escribieran dos veces, el día que cambie un
 * filtro se actualiza uno solo y el paginador empieza a mentir.
 */
function construirWhere(f: FiltrosRecepcion): { where: string; params: unknown[] } {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    condiciones.push(
      `(r.numero ILIKE $${params.length}
        OR p.razon_social ILIKE $${params.length}
        OR oc.cod_ord ILIKE $${params.length})`,
    );
  }
  if (f.proveedorId) {
    params.push(f.proveedorId);
    condiciones.push(`oc.proveedor_id = $${params.length}`);
  }
  if (f.ordenCompraId) {
    params.push(f.ordenCompraId);
    condiciones.push(`r.orden_compra_id = $${params.length}`);
  }
  if (f.tipoRecepcion) {
    params.push(f.tipoRecepcion);
    condiciones.push(`r.tipo_recepcion = $${params.length}::tipo_recepcion`);
  }
  if (f.fechaDesde) {
    params.push(f.fechaDesde);
    condiciones.push(`r.fecha_hora >= $${params.length}`);
  }
  if (f.fechaHasta) {
    params.push(f.fechaHasta);
    condiciones.push(`r.fecha_hora <= $${params.length}`);
  }

  return {
    where: condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "",
    params,
  };
}

export async function findAll(
  f: FiltrosRecepcion = {},
  ejecutor: Ejecutor = pool,
): Promise<RecepcionRow[]> {
  const { where, params } = construirWhere(f);

  const limite = f.porPagina ?? 50;
  const salto = ((f.pagina ?? 1) - 1) * limite;

  params.push(limite);
  const pLimite = params.length;
  params.push(salto);
  const pSalto = params.length;

  const { rows } = await ejecutor.query<RecepcionRow>(
    `${SELECT_RECEPCION}
     ${where}
     ORDER BY r.fecha_hora DESC, r.id DESC
     LIMIT $${pLimite} OFFSET $${pSalto}`,
    params,
  );
  return rows;
}

/** Total de filas que matchean los filtros, para el paginador. */
export async function contar(
  f: FiltrosRecepcion = {},
  ejecutor: Ejecutor = pool,
): Promise<number> {
  const { where, params } = construirWhere(f);

  const { rows } = await ejecutor.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM recepcion_mercaderia r
     JOIN orden_compra oc ON oc.id = r.orden_compra_id
     JOIN proveedor    p  ON p.id  = oc.proveedor_id
     ${where}`,
    params,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<RecepcionRow | null> {
  const { rows } = await ejecutor.query<RecepcionRow>(
    `${SELECT_RECEPCION} WHERE r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Detalles de varias recepciones en UNA consulta.
 *
 * Si se pidiera el detalle recepción por recepción, un listado de 50 serían 51
 * consultas (el problema N+1). Con `= ANY($1)` son dos, y el mapper las agrupa
 * en memoria.
 */
export async function findDetalles(
  recepcionIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<RecepcionDetalleRow[]> {
  if (recepcionIds.length === 0) return [];

  const { rows } = await ejecutor.query<RecepcionDetalleRow>(
    `SELECT
       rmd.id,
       rmd.recepcion_id,
       rmd.orden_compra_detalle_id,
       ocd.articulo_id,
       a.nombre AS articulo_nombre,
       rmd.cantidad_solicitada,
       rmd.cantidad_recibida,
       rmd.diferencia,
       rmd.observacion,
       rmd.observacion_detalle
     FROM recepcion_mercaderia_detalle rmd
     JOIN orden_compra_detalle ocd ON ocd.id = rmd.orden_compra_detalle_id
     JOIN articulo             a   ON a.id  = ocd.articulo_id
     WHERE rmd.recepcion_id = ANY($1::int[])
     ORDER BY rmd.id`,
    [recepcionIds],
  );
  return rows;
}

// ---------------------------------------------------------
// La OC: lock y pendiente por línea
// ---------------------------------------------------------

/**
 * Trae la OC y la BLOQUEA hasta el fin de la transacción.
 *
 * Es lo primero que hace el service, y no es opcional: sin el lock, dos
 * personas recibiendo contra la misma orden leen las dos "todavía falta", las
 * dos deciden que la recepción es parcial, y la orden nunca se cierra. O al
 * revés: las dos la cierran y el segundo UPDATE pisa al primero.
 *
 * `FOR UPDATE OF oc` bloquea SOLO `orden_compra`. Sin el `OF`, Postgres
 * intentaría bloquear también las filas de proveedor y estado_orden_compra que
 * trae el JOIN — filas de catálogo que otras transacciones leen todo el tiempo.
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
 * Por cada línea de la OC: cuánto se pidió y cuánto se recibió ACUMULADO en
 * todas las recepciones anteriores.
 *
 * Una sola consulta con LEFT JOIN + GROUP BY, no un loop por línea. El LEFT es
 * lo que hace que una línea sin ninguna recepción todavía aparezca con
 * acumulado 0 en vez de desaparecer del resultado.
 *
 * No hace falta filtrar por `recepcion_mercaderia`: `orden_compra_detalle_id`
 * ya ancla cada fila del detalle a una línea de ESTA orden.
 */
export async function findPendientePorLinea(
  ordenCompraId: number,
  ejecutor: Ejecutor = pool,
): Promise<LineaPendienteRow[]> {
  const { rows } = await ejecutor.query<LineaPendienteRow>(
    `SELECT
       ocd.id                                   AS orden_compra_detalle_id,
       ocd.articulo_id,
       a.nombre                                 AS articulo_nombre,
       ocd.cantidad                             AS cantidad_pedida,
       COALESCE(SUM(rmd.cantidad_recibida), 0)  AS cantidad_recibida_acumulada
     FROM orden_compra_detalle ocd
     JOIN articulo a ON a.id = ocd.articulo_id
     LEFT JOIN recepcion_mercaderia_detalle rmd
            ON rmd.orden_compra_detalle_id = ocd.id
     WHERE ocd.orden_compra_id = $1
     GROUP BY ocd.id, ocd.articulo_id, a.nombre, ocd.cantidad
     ORDER BY ocd.id`,
    [ordenCompraId],
  );
  return rows;
}

/**
 * Cuántas líneas de la OC siguen cortas.
 *
 * Se llama DESPUÉS de insertar el detalle de la recepción nueva, con el mismo
 * client, así que el acumulado ya la incluye. Es lo que decide si la entrega fue
 * `total` o `parcial` (D-1): cero líneas cortas → la orden se cierra.
 *
 * Se recalcula contra la base en vez de sumarlo en JS a propósito: el veredicto
 * lo da la fuente de verdad, no un snapshot leído antes de escribir.
 */
export async function contarLineasIncompletas(
  ordenCompraId: number,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM (
       SELECT ocd.id
       FROM orden_compra_detalle ocd
       LEFT JOIN recepcion_mercaderia_detalle rmd
              ON rmd.orden_compra_detalle_id = ocd.id
       WHERE ocd.orden_compra_id = $1
       GROUP BY ocd.id, ocd.cantidad
       HAVING COALESCE(SUM(rmd.cantidad_recibida), 0) < ocd.cantidad
     ) AS incompletas`,
    [ordenCompraId],
  );
  return Number(rows[0]?.total ?? 0);
}

/**
 * Resuelve un estado del catálogo tolerando las dos escrituras que conviven en
 * el proyecto: 'Recibida Parcial' (como lo siembra db/seeds/01_catalogos.sql) y
 * 'recibida_parcial' (como lo escribe el código de órdenes).
 *
 * No es un capricho: hoy `orden.service.ts` compara contra `"Pendiente"` en un
 * lugar y contra `"pendiente"` en otro, así que no hay una única verdad a la
 * que atarse. Normalizar de los dos lados —minúsculas y espacios a guión bajo—
 * hace que este módulo funcione con cualquiera de las dos, sin tocar el módulo
 * de órdenes ni el catálogo.
 */
export async function findEstadoByNombre(
  nombre: string,
  ejecutor: Ejecutor = pool,
): Promise<EstadoOrdenRow | null> {
  const { rows } = await ejecutor.query<EstadoOrdenRow>(
    `SELECT id, nombre, es_final
     FROM estado_orden_compra
     WHERE lower(replace(nombre, ' ', '_')) = lower(replace($1, ' ', '_'))`,
    [nombre],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de la transacción del service)
// ---------------------------------------------------------

/**
 * Inserta la cabecera y devuelve su id y su número.
 *
 * NO se manda `numero`: lo genera `trg_generar_numero_recepcion` (BEFORE
 * INSERT) y vuelve por el RETURNING. Que lo ponga la base garantiza que dos
 * recepciones simultáneas no compartan número.
 */
export async function insertCabecera(
  data: CabeceraRecepcionInput,
  client: PoolClient,
): Promise<{ id: number; numero: string }> {
  const { rows } = await client.query<{ id: number; numero: string }>(
    `INSERT INTO recepcion_mercaderia
       (orden_compra_id, deposito_id, tipo_recepcion, usuario_id, observacion_general)
     VALUES ($1, $2, $3::tipo_recepcion, $4, $5)
     RETURNING id, numero`,
    [
      data.ordenCompraId,
      data.depositoId,
      data.tipoRecepcion,
      data.usuarioId,
      data.observacionGeneral,
    ],
  );
  return rows[0];
}

/**
 * Inserta una línea del detalle y devuelve su id y su diferencia.
 *
 * `diferencia` no se manda: es una columna GENERATED. Se devuelve por RETURNING
 * porque el service la necesita para decidir si genera notificación, y así el
 * valor que usa es el que calculó la base, no una resta hecha en JS que podría
 * redondear distinto.
 */
export async function insertDetalle(
  recepcionId: number,
  linea: LineaRecepcionInsert,
  client: PoolClient,
): Promise<{ id: number; diferencia: string }> {
  const { rows } = await client.query<{ id: number; diferencia: string }>(
    `INSERT INTO recepcion_mercaderia_detalle
       (recepcion_id, orden_compra_detalle_id, cantidad_solicitada,
        cantidad_recibida, observacion, observacion_detalle)
     VALUES ($1, $2, $3::numeric, $4::numeric, $5::tipo_observacion_recepcion, $6)
     RETURNING id, diferencia`,
    [
      recepcionId,
      linea.ordenCompraDetalleId,
      linea.cantidadSolicitada,
      linea.cantidadRecibida,
      linea.observacion,
      linea.observacionDetalle,
    ],
  );
  return rows[0];
}

/**
 * Fija el `tipo_recepcion` definitivo, ya derivado (D-1).
 *
 * La cabecera nace con un valor provisorio porque la columna es NOT NULL y el
 * veredicto solo se puede dar DESPUÉS de insertar el detalle: hasta ese momento
 * la base todavía no sabe qué llegó.
 */
export async function setTipoRecepcion(
  id: number,
  tipo: "parcial" | "total",
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE recepcion_mercaderia SET tipo_recepcion = $2::tipo_recepcion WHERE id = $1`,
    [id, tipo],
  );
}

/**
 * Asegura que exista la ficha de stock del artículo en ese depósito y dice si
 * hubo que crearla (D-2).
 *
 * POR QUÉ ACÁ SÍ Y EN MOVIMIENTOS NO
 *   El módulo de Movimientos rechaza un movimiento contra una ficha inexistente,
 *   y ahí el rechazo tiene sentido: un egreso o un ajuste sin ficha casi siempre
 *   significa que la persona eligió mal el depósito, y el error atrapa el tipeo.
 *
 *   En una recepción no hay esa ambigüedad: el artículo viene de una línea de OC
 *   y el depósito se eligió a propósito. Rechazar significaría "no podés
 *   descargar el camión hasta que alguien con otro permiso entre a otra pantalla
 *   y cree una ficha en cero". La recepción es, justamente, la forma natural en
 *   que un artículo entra por primera vez a un depósito.
 *
 * El `ON CONFLICT DO NOTHING` se apoya en el unique (articulo_id, deposito_id)
 * que ya existe: dos recepciones simultáneas del mismo artículo se resuelven
 * solas, sin que ninguna falle.
 *
 * ⚠️ La ficha nace con `stock_minimo = 0`, así que NUNCA dispara alerta de
 *    reposición. Por eso esta función devuelve `creada`: el service lo propaga
 *    y la pantalla avisa que hay que configurar los umbrales.
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

  // No se insertó: la ficha ya estaba. Se lee para quedarse con su id.
  const existente = await client.query<{ id: number }>(
    `SELECT id FROM ficha_stock WHERE articulo_id = $1 AND deposito_id = $2`,
    [articuloId, depositoId],
  );
  return { id: existente.rows[0].id, creada: false };
}

/**
 * Aviso al emisor de la OC por una línea con diferencia (D-3).
 *
 * Criterio: "Detecta y registra diferencias entre cantidad solicitada y
 * recibida, notificando al responsable de compras".
 */
export async function insertNotificacion(
  data: { recepcionDetalleId: number; usuarioResponsableId: number; mensaje: string },
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO notificacion_compra
       (recepcion_detalle_id, usuario_responsable_id, mensaje)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [data.recepcionDetalleId, data.usuarioResponsableId, data.mensaje],
  );
  return rows[0].id;
}
