import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db/client";
import type {
  DepositoInput,
  DepositoRow,
  FichaStockInput,
  FichaStockRow,
  FiltrosDeposito,
  FiltrosFichaStock,
} from "./stock.types";

type Ejecutor = Pool | PoolClient;

// Aca habia dos shims que sostenian dos modelos de datos a la vez:
//
//   const SUCURSAL_ID = "COALESCE((to_jsonb(d)->>'sucursal_id')::int, d.id)"
//   async function tieneSucursalId()  <- consultaba information_schema
//
// Existian mientras el equipo decidia si `deposito` iba a tener `sucursal_id`.
// Ya esta decidido y aplicado: la tabla `sucursal` existe, `deposito.sucursal_id`
// es NOT NULL con FK, y hay `uq_sucursal_nombre_activa`.
//
// El de `tieneSucursalId` ademas pegaba una consulta a `information_schema`
// EN CADA ESCRITURA de deposito, solo para preguntar si una columna existia.
//
// Y el nombre de la sucursal ahora sale de la TABLA por JOIN, no de un array
// del front. Eso arregla un bug real: `stock.mapper.ts` lo resolvia contra
// SUCURSALES de src/data/stock.ts, asi que una sucursal creada en la base y no
// agregada a ese array se mostraba con el nombre del DEPOSITO.
const SELECT_FICHA = `
  SELECT fs.id, fs.articulo_id, fs.deposito_id,
         d.nombre AS deposito_nombre,
         d.sucursal_id,
         s.nombre AS sucursal_nombre,
         a.codigo AS articulo_codigo,
         a.nombre AS articulo_nombre,
         um.nombre AS unidad_medida,
         a.estado AS articulo_estado,
         fs.stock_actual, fs.stock_minimo, fs.stock_critico
  FROM ficha_stock fs
  JOIN articulo a ON a.id = fs.articulo_id
  JOIN unidad_medida um ON um.id = a.unidad_medida_id
  JOIN deposito d ON d.id = fs.deposito_id
  JOIN sucursal s ON s.id = d.sucursal_id
`;

const SELECT_DEPOSITO = `
  SELECT d.id, d.sucursal_id, s.nombre AS sucursal_nombre, d.nombre, d.ubicacion
  FROM deposito d
  JOIN sucursal s ON s.id = d.sucursal_id
`;

export async function findDepositos(
  filtros: FiltrosDeposito = {},
  ejecutor: Ejecutor = pool,
): Promise<DepositoRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda}%`);
    condiciones.push(`(d.nombre ILIKE $${params.length} OR COALESCE(d.ubicacion, '') ILIKE $${params.length})`);
  }
  if (filtros.sucursalId) {
    params.push(filtros.sucursalId);
    condiciones.push(`d.sucursal_id = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  const { rows } = await ejecutor.query<DepositoRow>(
    `${SELECT_DEPOSITO} ${where}
     ORDER BY s.nombre, d.nombre`,
    params,
  );
  return rows;
}

export async function findDepositoById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<DepositoRow | null> {
  const { rows } = await ejecutor.query<DepositoRow>(
    `${SELECT_DEPOSITO} WHERE d.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findDepositoDuplicado(
  data: DepositoInput,
  excluirId?: number,
  ejecutor: Ejecutor = pool,
): Promise<DepositoRow | null> {
  // El duplicado se busca DENTRO de la sucursal: dos sucursales pueden tener
  // cada una su "Deposito Central".
  const { rows } = await ejecutor.query<DepositoRow>(
    `${SELECT_DEPOSITO}
     WHERE d.sucursal_id = $1
       AND lower(d.nombre) = lower($2)
       AND ($3::int IS NULL OR d.id <> $3)
     LIMIT 1`,
    [data.sucursalId, data.nombre, excluirId ?? null],
  );
  return rows[0] ?? null;
}

export async function insertDeposito(data: DepositoInput, client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO deposito (sucursal_id, nombre, ubicacion) VALUES ($1, $2, $3) RETURNING id`,
    [data.sucursalId, data.nombre, data.ubicacion],
  );
  return rows[0].id;
}

export async function updateDeposito(
  id: number,
  data: DepositoInput,
  client: PoolClient,
): Promise<boolean> {
  const { rowCount } = await client.query(
    `UPDATE deposito SET sucursal_id = $2, nombre = $3, ubicacion = $4 WHERE id = $1`,
    [id, data.sucursalId, data.nombre, data.ubicacion],
  );
  return (rowCount ?? 0) > 0;
}

export async function findFichas(
  filtros: FiltrosFichaStock = {},
  ejecutor: Ejecutor = pool,
): Promise<FichaStockRow[]> {
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (!filtros.incluirInactivos) condiciones.push("a.estado = 'activo'");
  if (filtros.busqueda) {
    params.push(`%${filtros.busqueda}%`);
    condiciones.push(`(a.codigo ILIKE $${params.length} OR a.nombre ILIKE $${params.length} OR d.nombre ILIKE $${params.length})`);
  }
  if (filtros.sucursalId) {
    params.push(filtros.sucursalId);
    condiciones.push(`d.sucursal_id = $${params.length}`);
  }
  if (filtros.depositoId) {
    params.push(filtros.depositoId);
    condiciones.push(`fs.deposito_id = $${params.length}`);
  }
  if (filtros.estadoStock === "critico") {
    condiciones.push("fs.stock_critico IS NOT NULL AND fs.stock_actual <= fs.stock_critico");
  } else if (filtros.estadoStock === "bajo") {
    condiciones.push("(fs.stock_critico IS NULL OR fs.stock_actual > fs.stock_critico) AND fs.stock_actual < fs.stock_minimo");
  } else if (filtros.estadoStock === "normal") {
    condiciones.push("fs.stock_actual >= fs.stock_minimo AND (fs.stock_critico IS NULL OR fs.stock_actual > fs.stock_critico)");
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  const { rows } = await ejecutor.query<FichaStockRow>(
    `${SELECT_FICHA} ${where} ORDER BY d.nombre, a.nombre`,
    params,
  );
  return rows;
}

export async function findFichaById(
  id: number,
  ejecutor: Ejecutor = pool,
): Promise<FichaStockRow | null> {
  const { rows } = await ejecutor.query<FichaStockRow>(
    `${SELECT_FICHA} WHERE fs.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findFichaDuplicada(
  articuloId: number,
  depositoId: number,
  excluirId?: number,
  ejecutor: Ejecutor = pool,
): Promise<FichaStockRow | null> {
  const { rows } = await ejecutor.query<FichaStockRow>(
    `${SELECT_FICHA}
     WHERE fs.articulo_id = $1 AND fs.deposito_id = $2
       AND ($3::int IS NULL OR fs.id <> $3)
     LIMIT 1`,
    [articuloId, depositoId, excluirId ?? null],
  );
  return rows[0] ?? null;
}

export async function insertFicha(data: FichaStockInput, client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO ficha_stock (articulo_id, deposito_id, stock_minimo, stock_critico)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [data.articuloId, data.depositoId, data.stockMinimo, data.stockCritico ?? null],
  );
  return rows[0].id;
}

export async function updateFicha(
  id: number,
  data: FichaStockInput,
  client: PoolClient,
): Promise<boolean> {
  // stock_actual y articulo_id se omiten deliberadamente: solo cambian por
  // movimientos y el artículo es de solo lectura en edición.
  const { rowCount } = await client.query(
    `UPDATE ficha_stock
     SET deposito_id = $2, stock_minimo = $3, stock_critico = $4
     WHERE id = $1`,
    [id, data.depositoId, data.stockMinimo, data.stockCritico ?? null],
  );
  return (rowCount ?? 0) > 0;
}
