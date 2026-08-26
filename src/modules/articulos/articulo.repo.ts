import type { PoolClient } from "pg";
import { query } from "@/lib/db/client";
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
 * SELECT base con los JOIN ya resueltos.
 *
 * Cuatro JOIN de una en vez de cinco queries por artículo: el front necesita
 * mostrar los NOMBRES (categoría, unidad, fabricante, proveedor) y el
 * formulario necesita los IDS, así que se devuelven los dos.
 *
 * `proveedor` va con LEFT JOIN porque el proveedor preferido es opcional; los
 * otros tres son INNER porque las FK son NOT NULL.
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
    a.proveedor_preferido_id,
    p.razon_social AS proveedor_preferido_nombre,
    a.estado,
    a.imagen_url,
    a.created_at,
    a.updated_at
  FROM articulo a
  JOIN categoria      c  ON c.id  = a.categoria_id
  JOIN unidad_medida  um ON um.id = a.unidad_medida_id
  JOIN fabricante     f  ON f.id  = a.fabricante_id
  LEFT JOIN proveedor p  ON p.id  = a.proveedor_preferido_id
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
    condiciones.push(`a.proveedor_preferido_id = $${params.length}`);
  }
  if (f.estado) {
    params.push(f.estado);
    condiciones.push(`a.estado = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  return query<ArticuloRow>(`${SELECT_BASE} ${where} ORDER BY a.nombre`, params);
}

export async function findById(id: number): Promise<ArticuloRow | null> {
  const filas = await query<ArticuloRow>(`${SELECT_BASE} WHERE a.id = $1`, [id]);
  return filas[0] ?? null;
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
        proveedor_preferido_id, imagen_url, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.nombre,
      data.descripcion ?? null,
      data.categoriaId,
      data.unidadMedidaId,
      data.fabricanteId,
      data.proveedorPreferidoId ?? null,
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
         proveedor_preferido_id = $7,
         imagen_url = $8,
         estado = $9
     WHERE id = $1`,
    [
      id,
      data.nombre,
      data.descripcion ?? null,
      data.categoriaId,
      data.unidadMedidaId,
      data.fabricanteId,
      data.proveedorPreferidoId ?? null,
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
