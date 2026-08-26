import type { Pool, PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  CotizacionDetalleRow,
  CotizacionRow,
  FiltrosSolicitud,
  SolicitudDetalleRow,
  SolicitudRow,
} from "./cotizacion.types";

/**
 * HU-COMP-02 — capa de acceso a datos de solicitudes y cotizaciones.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 *
 * Las lecturas aceptan un `ejecutor` por lo mismo que en orden.repo.ts: leer
 * dentro de una transacción abierta exige usar el mismo client, porque desde
 * otra conexión las filas todavía no existen.
 */
type Ejecutor = Pool | PoolClient;

const SELECT_SOLICITUD = `
  SELECT
    sc.id,
    sc.cod_sol,
    sc.usuario_id,
    u.nombre   AS usuario_nombre,
    u.apellido AS usuario_apellido,
    sc.fecha,
    sc.estado,
    sc.notas,
    sc.cotizacion_id_adjudicada
  FROM solicitud_cotizacion sc
  JOIN usuario u ON u.id = sc.usuario_id
`;

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findAll(f: FiltrosSolicitud = {}): Promise<SolicitudRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    // El buscador del front matchea por código, por id y por nombre de artículo
    // pedido (src/app/ordenes-compra/page.tsx:370). El código sale de la
    // columna: es un dato guardado, no algo que se arme al vuelo.
    condiciones.push(
      `(sc.cod_sol ILIKE $${params.length}
        OR CAST(sc.id AS TEXT) ILIKE $${params.length}
        OR EXISTS (
             SELECT 1
             FROM solicitud_detalle sd
             JOIN articulo a ON a.id = sd.articulo_id
             WHERE sd.solicitud_id = sc.id AND a.nombre ILIKE $${params.length}
           ))`,
    );
  }
  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`sc.estado = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  const direccion = f.ordenFecha === "antiguas" ? "ASC" : "DESC";

  return query<SolicitudRow>(
    `${SELECT_SOLICITUD} ${where} ORDER BY sc.fecha ${direccion}, sc.id ${direccion}`,
    params,
  );
}

export async function findById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<SolicitudRow | null> {
  const { rows } = await ejecutor.query<SolicitudRow>(`${SELECT_SOLICITUD} WHERE sc.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

/** Artículos pedidos de varias solicitudes, en una sola consulta (evita el N+1). */
export async function findDetalles(
  solicitudIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<SolicitudDetalleRow[]> {
  if (solicitudIds.length === 0) return [];

  const { rows } = await ejecutor.query<SolicitudDetalleRow>(
    `SELECT id, solicitud_id, articulo_id, cantidad_estimada, nota
     FROM solicitud_detalle
     WHERE solicitud_id = ANY($1::int[])
     ORDER BY id`,
    [solicitudIds],
  );
  return rows;
}

/** Cotizaciones recibidas, con proveedor y condición de pago resueltos. */
export async function findCotizaciones(
  solicitudIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<CotizacionRow[]> {
  if (solicitudIds.length === 0) return [];

  const { rows } = await ejecutor.query<CotizacionRow>(
    `SELECT
       c.id,
       c.solicitud_id,
       c.proveedor_id,
       p.razon_social AS proveedor_razon_social,
       p.estado       AS proveedor_estado,
       c.forma_pago_id,
       fp.nombre      AS forma_pago_nombre,
       c.fecha_recepcion
     FROM cotizacion c
     JOIN proveedor  p  ON p.id  = c.proveedor_id
     JOIN forma_pago fp ON fp.id = c.forma_pago_id
     WHERE c.solicitud_id = ANY($1::int[])
     ORDER BY c.fecha_recepcion, c.id`,
    [solicitudIds],
  );
  return rows;
}

export async function findCotizacionDetalles(
  cotizacionIds: number[],
  ejecutor: Ejecutor = pool,
): Promise<CotizacionDetalleRow[]> {
  if (cotizacionIds.length === 0) return [];

  const { rows } = await ejecutor.query<CotizacionDetalleRow>(
    `SELECT id, cotizacion_id, articulo_id, precio
     FROM cotizacion_detalle
     WHERE cotizacion_id = ANY($1::int[])
     ORDER BY id`,
    [cotizacionIds],
  );
  return rows;
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

export async function insertSolicitud(
  data: { usuarioId: number; notas: string | null },
  client: PoolClient,
): Promise<number> {
  // `cod_sol`, `fecha` y `estado` los pone la base: el número por el trigger
  // trg_generar_cod_solicitud, la fecha y el estado inicial por sus DEFAULT.
  // Nada de eso lo decide la aplicación.
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO solicitud_cotizacion (usuario_id, notas) VALUES ($1, $2) RETURNING id`,
    [data.usuarioId, data.notas],
  );
  return rows[0].id;
}

export async function insertSolicitudDetalles(
  solicitudId: number,
  lineas: { articuloId: number; cantidadEstimada: number; nota: string | null }[],
  client: PoolClient,
): Promise<void> {
  for (const linea of lineas) {
    await client.query(
      `INSERT INTO solicitud_detalle (solicitud_id, articulo_id, cantidad_estimada, nota)
       VALUES ($1, $2, $3, $4)`,
      [solicitudId, linea.articuloId, linea.cantidadEstimada, linea.nota],
    );
  }
}

export async function insertCotizacion(
  data: {
    solicitudId: number;
    proveedorId: number;
    formaPagoId: number;
    fechaRecepcion: string | null;
  },
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO cotizacion (solicitud_id, proveedor_id, forma_pago_id, fecha_recepcion)
     VALUES ($1, $2, $3, COALESCE($4::timestamp, now()))
     RETURNING id`,
    [data.solicitudId, data.proveedorId, data.formaPagoId, data.fechaRecepcion],
  );
  return rows[0].id;
}

export async function insertCotizacionDetalles(
  cotizacionId: number,
  detalles: { articuloId: number; precio: number }[],
  client: PoolClient,
): Promise<void> {
  for (const detalle of detalles) {
    await client.query(
      `INSERT INTO cotizacion_detalle (cotizacion_id, articulo_id, precio)
       VALUES ($1, $2, $3)`,
      [cotizacionId, detalle.articuloId, detalle.precio],
    );
  }
}

/**
 * Cambia el estado de la solicitud (y, al adjudicar, deja anotada la cotización
 * ganadora).
 *
 * El UPDATE dispara tg_auditar_solicitud_cotizacion, que guarda la fila
 * anterior y la nueva.
 */
export async function setEstado(
  id: number,
  estado: "Abierta" | "Adjudicada" | "Cancelada",
  cotizacionIdAdjudicada: number | null,
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE solicitud_cotizacion
     SET estado = $2, cotizacion_id_adjudicada = $3
     WHERE id = $1`,
    [id, estado, cotizacionIdAdjudicada],
  );
}
