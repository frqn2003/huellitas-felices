import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
import type {
  FiltrosPrecio,
  HistorialRow,
  ListaPrecioRow,
  ModoAbm,
  PrecioRow,
  Sujeto,
} from "./precio.types";

/**
 * HU-STK-03 — capa de acceso a datos de la Lista de Precios.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 *
 * Las ESCRITURAS no hacen INSERT/UPDATE a mano: llaman a `fn_abm_lista_precio`
 * (o `_practica`), que es el modo INSERCION / EDICION / LECTURA que pide el
 * criterio. Los triggers de la base hacen el resto:
 *   · trg_lista_precio_actualizar_vigencia → fija vigencia_desde = hoy
 *   · trg_historial_precios                → archiva el precio en historial_precios
 * La app NUNCA escribe `historial_precios`.
 *
 * Los nombres de tabla/función salen de CONFIG (constantes del código), nunca
 * del input: por eso se pueden interpolar en el SQL sin riesgo de inyección.
 */

type Config = {
  fn: string;
  tabla: string;
  fk: string;
  historial: string;
  /** SELECT del listado: sujeto LEFT JOIN su precio. */
  selectBase: string;
  /** Alias SQL del sujeto, para los filtros. */
  alias: string;
};

const SELECT_ARTICULO = `
  SELECT
    lp.id                  AS precio_id,
    a.id                   AS sujeto_id,
    a.codigo,
    a.nombre,
    a.descripcion,
    a.imagen_url,
    c.nombre               AS categoria_nombre,
    um.nombre              AS unidad_medida_nombre,
    f.nombre               AS fabricante_nombre,
    a.estado,
    lp.precio,
    lp.vigencia_desde,
    lp.usuario_id,
    u.nombre || ' ' || u.apellido AS usuario_nombre,
    lp.fecha_registro,
    lp.updated_at,
    costo.precio           AS costo_ref_oc
  FROM articulo a
  JOIN categoria     c  ON c.id  = a.categoria_id
  JOIN unidad_medida um ON um.id = a.unidad_medida_id
  JOIN fabricante    f  ON f.id  = a.fabricante_id
  LEFT JOIN lista_precio lp ON lp.articulo_id = a.id
  LEFT JOIN usuario u       ON u.id = lp.usuario_id
  -- Costo de REFERENCIA (solo lectura): el costo real se fija en la recepción
  -- de la OC (HU-COMP-02), nunca desde esta pantalla. Mismo criterio que
  -- findUltimoPrecioCompra() en compras/orden.repo.ts.
  LEFT JOIN LATERAL (
    SELECT ocd.precio_acordado AS precio
    FROM orden_compra_detalle ocd
    JOIN orden_compra oc       ON oc.id = ocd.orden_compra_id
    JOIN estado_orden_compra e ON e.id  = oc.estado_id
    WHERE ocd.articulo_id = a.id AND e.nombre <> 'Cancelada'
    ORDER BY oc.fecha DESC, oc.id DESC
    LIMIT 1
  ) costo ON true
`;

const SELECT_PRACTICA = `
  SELECT
    lp.id                  AS precio_id,
    p.id                   AS sujeto_id,
    NULL::varchar          AS codigo,
    p.nombre,
    NULL::text             AS descripcion,
    NULL::varchar          AS imagen_url,
    NULL::varchar          AS categoria_nombre,
    NULL::varchar          AS unidad_medida_nombre,
    NULL::varchar          AS fabricante_nombre,
    p.estado,
    lp.precio,
    lp.vigencia_desde,
    lp.usuario_id,
    u.nombre || ' ' || u.apellido AS usuario_nombre,
    lp.fecha_registro,
    lp.updated_at,
    NULL::numeric          AS costo_ref_oc
  FROM practica p
  LEFT JOIN lista_precio_practica lp ON lp.practica_id = p.id
  LEFT JOIN usuario u                ON u.id = lp.usuario_id
`;

const CONFIG: Record<Sujeto, Config> = {
  articulo: {
    fn: "fn_abm_lista_precio",
    tabla: "lista_precio",
    fk: "articulo_id",
    historial: "historial_precios",
    selectBase: SELECT_ARTICULO,
    alias: "a",
  },
  practica: {
    fn: "fn_abm_lista_precio_practica",
    tabla: "lista_precio_practica",
    fk: "practica_id",
    historial: "historial_precios_practica",
    selectBase: SELECT_PRACTICA,
    alias: "p",
  },
};

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

/** Listado: TODOS los sujetos, con o sin precio (los sin precio rompen la venta con HF047). */
export async function findAll(sujeto: Sujeto, f: FiltrosPrecio = {}): Promise<PrecioRow[]> {
  const cfg = CONFIG[sujeto];
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    const n = params.length;
    condiciones.push(
      sujeto === "articulo"
        ? `(a.codigo ILIKE $${n} OR a.nombre ILIKE $${n})`
        : `p.nombre ILIKE $${n}`,
    );
  }
  if (f.categoriaId && sujeto === "articulo") {
    params.push(f.categoriaId);
    condiciones.push(`a.categoria_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`${cfg.alias}.estado = $${params.length}`);
  }
  if (f.conPrecio !== undefined) {
    condiciones.push(f.conPrecio ? "lp.id IS NOT NULL" : "lp.id IS NULL");
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  return query<PrecioRow>(`${cfg.selectBase} ${where} ORDER BY ${cfg.alias}.nombre`, params);
}

/** Un sujeto con su precio (o sin él), por id del SUJETO. */
export async function findBySujeto(
  sujeto: Sujeto,
  sujetoId: number,
  ejecutor: { query: PoolClient["query"] } | null = null,
): Promise<PrecioRow | null> {
  const cfg = CONFIG[sujeto];
  const sql = `${cfg.selectBase} WHERE ${cfg.alias}.id = $1`;
  const filas = ejecutor
    ? (await ejecutor.query<PrecioRow>(sql, [sujetoId])).rows
    : await query<PrecioRow>(sql, [sujetoId]);
  return filas[0] ?? null;
}

/** Un sujeto con su precio, por PK de lista_precio(_practica). */
export async function findByPrecioId(sujeto: Sujeto, precioId: number): Promise<PrecioRow | null> {
  const cfg = CONFIG[sujeto];
  const filas = await query<PrecioRow>(`${cfg.selectBase} WHERE lp.id = $1`, [precioId]);
  return filas[0] ?? null;
}

/**
 * Historial completo de UN sujeto, ordenado por fecha de registro (más nuevo
 * primero). La tabla `historial_precios` es solo consulta: no participa de la
 * venta (la venta lee `lista_precio`).
 */
export async function findHistorial(sujeto: Sujeto, sujetoId: number): Promise<HistorialRow[]> {
  const cfg = CONFIG[sujeto];
  return query<HistorialRow>(
    `SELECT h.id,
            h.${cfg.fk} AS sujeto_id,
            h.precio,
            h.vigencia_desde,
            h.vigencia_hasta,
            h.usuario_id,
            u.nombre || ' ' || u.apellido AS usuario_nombre,
            h.fecha_hora
     FROM ${cfg.historial} h
     JOIN usuario u ON u.id = h.usuario_id
     WHERE h.${cfg.fk} = $1
     ORDER BY h.fecha_hora DESC, h.id DESC`,
    [sujetoId],
  );
}

// ---------------------------------------------------------
// Escritura — siempre vía fn_abm_*, dentro de una transacción
// ---------------------------------------------------------

/**
 * Invoca fn_abm_lista_precio(_practica) en modo INSERCION o EDICION.
 * Devuelve la fila de lista_precio resultante.
 */
export async function abm(
  sujeto: Sujeto,
  modo: Exclude<ModoAbm, "LECTURA">,
  sujetoId: number,
  precio: number,
  usuarioId: number,
  client: PoolClient,
): Promise<ListaPrecioRow> {
  const cfg = CONFIG[sujeto];
  const { rows } = await client.query<ListaPrecioRow>(
    `SELECT id, ${cfg.fk} AS sujeto_id, precio, vigencia_desde, usuario_id, fecha_registro, updated_at
     FROM ${cfg.fn}($1::modo_abm, NULL, $2, $3, $4)`,
    [modo, sujetoId, precio, usuarioId],
  );
  return rows[0];
}
