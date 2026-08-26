import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  CabeceraOrdenInput,
  EstadoOrdenRow,
  FiltrosOrden,
  LineaOrden,
  OrdenDetalleRow,
  OrdenRow,
} from "./orden.types";

/**
 * HU-COMP-02 — capa de acceso a datos de las órdenes de compra.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 * ACÁ NO VA: validaciones, reglas, transacciones (las abre el service).
 *
 * POR QUÉ CASI TODAS LAS FUNCIONES ACEPTAN UN `ejecutor`
 *   Cuando el service crea una orden dentro de una transacción y después quiere
 *   devolverla armada, tiene que leerla con el MISMO client: desde otra
 *   conexión del pool las filas recién insertadas no se ven hasta el COMMIT, y
 *   la respuesta saldría vacía. Por defecto se usa el pool (lecturas sueltas).
 */
type Ejecutor = Pool | PoolClient;

/**
 * SELECT base con las relaciones resueltas.
 *
 * El front espera `_proveedor`, `_usuario` y `direccion_entrega` ya resueltos
 * (src/data/ordenes-compra.ts), así que se traen por JOIN en vez de hacer una
 * consulta por orden.
 *
 * `deposito` va con LEFT JOIN porque `orden_compra.deposito_id` es nullable;
 * los demás son INNER porque las FK son NOT NULL.
 */
const SELECT_BASE = `
  SELECT
    oc.id,
    oc.cod_ord,
    oc.proveedor_id,
    p.razon_social AS proveedor_razon_social,
    p.estado       AS proveedor_estado,
    oc.cotizacion_id,
    oc.usuario_id,
    u.nombre       AS usuario_nombre,
    u.apellido     AS usuario_apellido,
    oc.fecha,
    oc.fecha_entrega,
    oc.deposito_id,
    d.ubicacion    AS deposito_ubicacion,
    oc.forma_pago_id,
    fp.nombre      AS forma_pago_nombre,
    oc.notas,
    oc.subtotal,
    oc.descuento,
    oc.gastos_envio,
    oc.total,
    oc.estado_id,
    e.nombre       AS estado_nombre,
    e.es_final
  FROM orden_compra oc
  JOIN proveedor           p  ON p.id  = oc.proveedor_id
  JOIN usuario             u  ON u.id  = oc.usuario_id
  JOIN estado_orden_compra e  ON e.id  = oc.estado_id
  JOIN forma_pago          fp ON fp.id = oc.forma_pago_id
  LEFT JOIN deposito       d  ON d.id  = oc.deposito_id
`;

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findAll(f: FiltrosOrden = {}): Promise<OrdenRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    condiciones.push(
      `(oc.cod_ord ILIKE $${params.length}
        OR p.razon_social ILIKE $${params.length}
        OR CAST(oc.id AS TEXT) ILIKE $${params.length})`,
    );
  }
  if (f.proveedorId) {
    params.push(f.proveedorId);
    condiciones.push(`oc.proveedor_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`e.nombre = $${params.length}`);
  }
  if (f.desde) {
    params.push(f.desde);
    condiciones.push(`oc.fecha >= $${params.length}`);
  }
  if (f.hasta) {
    params.push(f.hasta);
    condiciones.push(`oc.fecha <= $${params.length}`);
  }
  if (f.totalMin !== undefined) {
    params.push(f.totalMin);
    condiciones.push(`oc.total >= $${params.length}`);
  }
  if (f.totalMax !== undefined) {
    params.push(f.totalMax);
    condiciones.push(`oc.total <= $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  // El front ofrece "más recientes" / "más antiguas" en FiltrosOrdenes.tsx.
  const direccion = f.ordenFecha === "antiguas" ? "ASC" : "DESC";

  return query<OrdenRow>(
    `${SELECT_BASE} ${where} ORDER BY oc.fecha ${direccion}, oc.id ${direccion}`,
    params,
  );
}

export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<OrdenRow | null> {
  const { rows } = await ejecutor.query<OrdenRow>(`${SELECT_BASE} WHERE oc.id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Detalles de varias órdenes en UNA consulta.
 *
 * Si se pidiera el detalle orden por orden, un listado de 50 órdenes serían 51
 * consultas (el problema N+1). Con `= ANY($1)` son dos: una para las cabeceras
 * y una para todos los detalles, que el service agrupa en memoria.
 */
export async function findDetalles(
  ordenIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<OrdenDetalleRow[]> {
  if (ordenIds.length === 0) return [];

  const { rows } = await ejecutor.query<OrdenDetalleRow>(
    `SELECT id, orden_compra_id, articulo_id, cantidad, precio_acordado
     FROM orden_compra_detalle
     WHERE orden_compra_id = ANY($1::int[])
     ORDER BY id`,
    [ordenIds],
  );
  return rows;
}

/**
 * Último precio pagado por un artículo.
 *
 * Criterio del formulario de orden: el precio unitario "se carga
 * automáticamente del último precio de compra". Las órdenes canceladas no
 * cuentan: ese precio nunca se pactó de verdad.
 */
export async function findUltimoPrecioCompra(
  articuloId: number,
): Promise<{ precio: string; fecha: Date; orden_id: number; cod_ord: string } | null> {
  const filas = await query<{ precio: string; fecha: Date; orden_id: number; cod_ord: string }>(
    `SELECT ocd.precio_acordado AS precio, oc.fecha, oc.id AS orden_id, oc.cod_ord
     FROM orden_compra_detalle ocd
     JOIN orden_compra oc ON oc.id = ocd.orden_compra_id
     JOIN estado_orden_compra e ON e.id = oc.estado_id
     WHERE ocd.articulo_id = $1 AND e.nombre <> 'Cancelada'
     ORDER BY oc.fecha DESC, oc.id DESC
     LIMIT 1`,
    [articuloId],
  );
  return filas[0] ?? null;
}

// ---------------------------------------------------------
// Catálogos y validaciones que necesita el service
// ---------------------------------------------------------
// Consultan tablas de otros módulos a propósito: son lecturas de apoyo para las
// reglas de ESTE módulo (proveedor activo, artículo activo), no su ABM. Mismo
// criterio que `contarOrdenesAbiertas()` en proveedor.repo.ts, que mira
// orden_compra desde el módulo de proveedores.

export async function findEstadoByNombre(
  nombre: string,
  ejecutor: Ejecutor = pool,
): Promise<EstadoOrdenRow | null> {
  const { rows } = await ejecutor.query<EstadoOrdenRow>(
    `SELECT id, nombre, es_final FROM estado_orden_compra WHERE nombre = $1`,
    [nombre],
  );
  return rows[0] ?? null;
}

export async function findProveedor(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; razon_social: string; estado: "activo" | "inactivo" } | null> {
  const { rows } = await ejecutor.query<{
    id: number;
    razon_social: string;
    estado: "activo" | "inactivo";
  }>(`SELECT id, razon_social, estado FROM proveedor WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Devuelve los artículos de la lista que NO se pueden comprar: los que no
 * existen quedan afuera del resultado y los inactivos vienen marcados.
 *
 * Criterio HU-STK-01: un artículo inactivo no es seleccionable en órdenes.
 */
export async function findArticulosParaOrden(
  ids: number[],
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string; estado: "activo" | "inactivo" }[]> {
  if (ids.length === 0) return [];

  const { rows } = await ejecutor.query<{
    id: number;
    nombre: string;
    estado: "activo" | "inactivo";
  }>(`SELECT id, nombre, estado FROM articulo WHERE id = ANY($1::int[])`, [ids]);
  return rows;
}

export async function findFormaPagoById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<{ id: number; nombre: string } | null> {
  const { rows } = await ejecutor.query<{ id: number; nombre: string }>(
    `SELECT id, nombre FROM forma_pago WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * El catálogo entero, para GET /api/condiciones-pago.
 *
 * No hay búsqueda por nombre a propósito: la API recibe ids, no textos. Buscar
 * por nombre invitaría a que el front volviera a tener su lista hardcodeada.
 */
export async function listarFormasPago(): Promise<{ id: number; nombre: string }[]> {
  return query<{ id: number; nombre: string }>(
    `SELECT id, nombre FROM forma_pago ORDER BY nombre`,
  );
}

export async function existeDeposito(id: number, ejecutor: Ejecutor = pool): Promise<boolean> {
  const { rows } = await ejecutor.query<{ id: number }>(
    `SELECT id FROM deposito WHERE id = $1`,
    [id],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

/**
 * Inserta la cabecera y devuelve el id.
 *
 * `cod_ord` NO se manda: lo genera el trigger `trg_generar_cod_orden_compra`
 * (BEFORE INSERT) con la secuencia `orden_compra_cod_seq`. Es la numeración
 * única y secuencial que pide el criterio, y al vivir en la base no hay forma
 * de que dos requests simultáneos saquen el mismo número.
 *
 * `fecha` tampoco: la pone el DEFAULT now() de la tabla (corrección 04).
 */
export async function insertCabecera(
  data: CabeceraOrdenInput,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO orden_compra (
       proveedor_id, usuario_id, estado_id, forma_pago_id, deposito_id,
       cotizacion_id, fecha_entrega, notas,
       subtotal, descuento, gastos_envio, total
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      data.proveedorId,
      data.usuarioId,
      data.estadoId,
      data.formaPagoId,
      data.depositoId,
      data.cotizacionId,
      data.fechaEntrega,
      data.notas,
      data.subtotal,
      data.descuento,
      data.gastosEnvio,
      data.total,
    ],
  );
  return rows[0].id;
}

/**
 * Inserta las líneas del detalle.
 *
 * `subtotal` de la línea se calcula en el INSERT (cantidad × precio) para que
 * no pueda quedar desalineado con sus dos factores. La columna es NOT NULL.
 */
export async function insertDetalles(
  ordenId: number,
  lineas: LineaOrden[],
  client: PoolClient,
): Promise<void> {
  for (const linea of lineas) {
    await client.query(
      `INSERT INTO orden_compra_detalle
         (orden_compra_id, articulo_id, cantidad, precio_acordado, subtotal)
       VALUES ($1, $2, $3::numeric, $4::numeric, $3::numeric * $4::numeric)`,
      [ordenId, linea.articuloId, linea.cantidad, linea.precioAcordado],
    );
  }
}

export async function updateCabecera(
  id: number,
  data: Omit<CabeceraOrdenInput, "usuarioId" | "estadoId" | "cotizacionId">,
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE orden_compra SET
       proveedor_id  = $2,
       forma_pago_id = $3,
       deposito_id   = $4,
       fecha_entrega = $5::timestamp,
       notas         = $6,
       subtotal      = $7,
       descuento     = $8,
       gastos_envio  = $9,
       total         = $10
     WHERE id = $1`,
    [
      id,
      data.proveedorId,
      data.formaPagoId,
      data.depositoId,
      data.fechaEntrega,
      data.notas,
      data.subtotal,
      data.descuento,
      data.gastosEnvio,
      data.total,
    ],
  );
}

/**
 * Reemplaza el detalle completo.
 *
 * DELETE + INSERT en vez de un diff línea por línea: el formulario devuelve el
 * detalle entero, no un parche, y el estado final es idéntico. Como corre
 * dentro de la transacción del service, en ningún momento se ve una orden sin
 * líneas desde afuera.
 *
 * `orden_compra_detalle` no tiene trigger de auditoría: lo que se audita es la
 * cabecera. Ver la nota en db/correcciones/09_cotizaciones.sql §7.
 */
export async function reemplazarDetalles(
  ordenId: number,
  lineas: LineaOrden[],
  client: PoolClient,
): Promise<void> {
  await client.query(`DELETE FROM orden_compra_detalle WHERE orden_compra_id = $1`, [ordenId]);
  await insertDetalles(ordenId, lineas, client);
}

export async function setEstado(
  id: number,
  estadoId: number,
  client: PoolClient,
): Promise<void> {
  await client.query(`UPDATE orden_compra SET estado_id = $2 WHERE id = $1`, [id, estadoId]);
}
