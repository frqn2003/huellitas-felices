import type { PoolClient } from "pg";
import { pool, query } from "@/lib/db/client";
import type {
  ArticuloInput,
  ArticuloRow,
  CatalogosArticulo,
  FiltrosArticulo,
} from "./articulo.types";

/**
 * HU-STK-01 — capa de acceso a datos.
 *
 * ACÁ VA: SQL parametrizado y nada más.
 * ACÁ NO VA: validaciones, reglas, transacciones (las abre el service).
 */

/**
 * Proveedor preferido DERIVADO de la última orden de compra (decisión D2).
 *
 * No hay columna `articulo.proveedor_preferido_id`: el proveedor "preferido" es
 * simplemente al último al que se le compró. Guardarlo aparte crearía un dato
 * que se desincroniza del historial real de compras.
 *
 * ⚠️ ESTE CRITERIO TIENE QUE SER IDÉNTICO al de `findUltimoPrecioCompra()` en
 *    compras/orden.repo.ts: mismo ORDER BY, misma exclusión de las canceladas.
 *    Si divergen, el formulario de orden precarga el precio de una orden y la
 *    ficha del artículo muestra el proveedor de OTRA — un bug sutilísimo de
 *    diagnosticar.
 *
 * Va como LEFT JOIN LATERAL y no como cálculo en el service: en el service
 * sería una consulta por artículo, o sea un N+1 en cada listado.
 */
const LATERAL_PROVEEDOR = `
  LEFT JOIN LATERAL (
    SELECT p.id, p.razon_social
    FROM orden_compra_detalle ocd
    JOIN orden_compra oc       ON oc.id = ocd.orden_compra_id
    JOIN estado_orden_compra e ON e.id  = oc.estado_id
    JOIN proveedor p           ON p.id  = oc.proveedor_id
    WHERE ocd.articulo_id = a.id AND e.nombre <> 'Cancelada'
    ORDER BY oc.fecha DESC, oc.id DESC
    LIMIT 1
  ) prov ON true
`;

/**
 * SELECT base con los JOIN ya resueltos.
 *
 * El front necesita mostrar los NOMBRES (categoría, unidad, fabricante,
 * proveedor) y el formulario necesita los IDS, así que se devuelven los dos.
 *
 * Los tres JOIN de catálogo son INNER porque las FK son NOT NULL; el proveedor
 * viene del LATERAL de arriba y puede no existir (artículo nunca comprado).
 */
const SELECT_BASE = `
  SELECT
    a.id,
    a.codigo,
    a.nombre,
    a.descripcion,
    a.categoria_id,
    c.nombre  AS categoria_nombre,
    a.unidad_medida_id,
    um.nombre AS unidad_medida_nombre,
    a.fabricante_id,
    f.nombre  AS fabricante_nombre,
    prov.id            AS proveedor_preferido_id,
    prov.razon_social  AS proveedor_preferido_nombre,
    a.estado,
    a.imagen_url,
    a.created_at,
    a.updated_at
  FROM articulo a
  JOIN categoria      c  ON c.id  = a.categoria_id
  JOIN unidad_medida  um ON um.id = a.unidad_medida_id
  JOIN fabricante     f  ON f.id  = a.fabricante_id
  ${LATERAL_PROVEEDOR}
`;

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function findAll(f: FiltrosArticulo = {}): Promise<ArticuloRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (f.busqueda) {
    params.push(`%${f.busqueda}%`);
    condiciones.push(`(a.codigo ILIKE $${params.length} OR a.nombre ILIKE $${params.length})`);
  }
  if (f.categoriaId) {
    params.push(f.categoriaId);
    condiciones.push(`a.categoria_id = $${params.length}`);
  }
  if (f.unidadMedidaId) {
    params.push(f.unidadMedidaId);
    condiciones.push(`a.unidad_medida_id = $${params.length}`);
  }
  if (f.proveedorId) {
    params.push(f.proveedorId);
    condiciones.push(`prov.id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`a.estado = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  return query<ArticuloRow>(`${SELECT_BASE} ${where} ORDER BY a.nombre`, params);
}

/**
 * `ejecutor` permite leer DENTRO de una transacción abierta.
 *
 * Sin esto, el service tenía que duplicar el SELECT a mano para poder releer
 * con el `client` — y esa copia fue justamente la que quedó desincronizada
 * cuando cambió el esquema. Un solo lugar con el SQL, un solo lugar que
 * mantener.
 */
export async function findById(
  id: number,
  ejecutor: { query: typeof pool.query } = pool,
): Promise<ArticuloRow | null> {
  const { rows } = await ejecutor.query<ArticuloRow>(
    `${SELECT_BASE} WHERE a.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Busca un artículo ACTIVO con ese nombre.
 *
 * "Activo" no es un detalle: el criterio dice "valida que el nombre no se
 * encuentre duplicado entre artículos ACTIVOS". Si está inactivo, el nombre se
 * puede reutilizar.
 *
 * `excluirId` es para la edición: un artículo no choca consigo mismo.
 */
export async function findActivoByNombre(
  nombre: string,
  excluirId?: number,
): Promise<ArticuloRow | null> {
  const filas = await query<ArticuloRow>(
    `${SELECT_BASE}
     WHERE lower(a.nombre) = lower($1)
       AND a.estado = 'activo'
       AND ($2::int IS NULL OR a.id <> $2)`,
    [nombre, excluirId ?? null],
  );
  return filas[0] ?? null;
}

/** Catálogos del formulario, en una sola ida a la base. */
export async function catalogos(): Promise<CatalogosArticulo> {
  const [categorias, unidadesMedida, fabricantes, proveedores] = await Promise.all([
    query<{ id: number; nombre: string }>(
      "SELECT id, nombre FROM categoria ORDER BY nombre",
    ),
    query<{ id: number; nombre: string }>(
      "SELECT id, nombre FROM unidad_medida ORDER BY id",
    ),
    query<{ id: number; nombre: string }>(
      "SELECT id, nombre FROM fabricante WHERE estado = 'activo' ORDER BY nombre",
    ),
    // Solo proveedores ACTIVOS: uno inactivo no puede elegirse (HU-PROV-01).
    query<{ id: number; nombre: string }>(
      "SELECT id, razon_social AS nombre FROM proveedor WHERE estado = 'activo' ORDER BY razon_social",
    ),
  ]);

  return { categorias, unidadesMedida, fabricantes, proveedores };
}

// ---------------------------------------------------------
// Escrituras (siempre con client, dentro de una transacción)
// ---------------------------------------------------------

/**
 * Inserta el artículo.
 *
 * NO se envía `codigo`: lo completa el trigger fn_generar_cod_articulo antes de
 * que la base controle el NOT NULL. Por eso el INSERT puede omitir una columna
 * obligatoria sin que falle.
 *
 * El RETURNING trae solo el id; para devolver el objeto completo con los
 * nombres resueltos hay que volver a leer con findById (el service lo hace).
 */
export async function insert(
  data: ArticuloInput,
  client: PoolClient,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO articulo
       (nombre, descripcion, categoria_id, unidad_medida_id, fabricante_id,
        imagen_url, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      data.nombre,
      data.descripcion ?? null,
      data.categoriaId,
      data.unidadMedidaId,
      data.fabricanteId,
      data.imagenUrl ?? null,
      data.activo === false ? "inactivo" : "activo",
    ],
  );
  return rows[0].id;
}

export async function update(
  id: number,
  data: ArticuloInput,
  client: PoolClient,
): Promise<boolean> {
  const { rowCount } = await client.query(
    `UPDATE articulo
     SET nombre = $2,
         descripcion = $3,
         categoria_id = $4,
         unidad_medida_id = $5,
         fabricante_id = $6,
         imagen_url = $7,
         estado = $8
     WHERE id = $1`,
    [
      id,
      data.nombre,
      data.descripcion ?? null,
      data.categoriaId,
      data.unidadMedidaId,
      data.fabricanteId,
      data.imagenUrl ?? null,
      data.activo === false ? "inactivo" : "activo",
    ],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Baja LÓGICA. No hay DELETE en este módulo.
 * Criterio: "un artículo inactivo no puede seleccionarse en nuevos movimientos,
 * listas de precios ni órdenes de compra, pero sus registros históricos se
 * conservan".
 */
export async function setEstado(
  id: number,
  estado: "activo" | "inactivo",
  client: PoolClient,
): Promise<boolean> {
  const { rowCount } = await client.query(
    "UPDATE articulo SET estado = $2 WHERE id = $1",
    [id, estado],
  );
  return (rowCount ?? 0) > 0;
}
