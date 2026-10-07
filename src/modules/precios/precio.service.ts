import type { PoolClient } from "pg";
import type { FilaListaPrecio, HistorialPrecio } from "@/data/lista-precios";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./precio.repo";
import * as mapper from "./precio.mapper";
import type { FilaPrecioPractica } from "./precio.mapper";
import type { FiltrosPrecio, PrecioRow, Sujeto } from "./precio.types";

/**
 * HU-STK-03 — reglas de negocio de la Lista de Precios de Venta.
 *
 * Las tres modalidades del criterio ("INSERCIÓN, EDICIÓN y LECTURA") son los
 * tres modos de `fn_abm_lista_precio`:
 *   LECTURA   → listar / obtener / historial
 *   INSERCION → crear   (primer precio de un artículo o práctica)
 *   EDICION   → editar  (cambia el precio vigente, UPDATE in place)
 *
 * Qué NO hace este service, a propósito:
 *  · no escribe `historial_precios` — lo hace el trigger `trg_historial_precios`
 *    al insertar/actualizar `lista_precio`, así nadie puede olvidarse de archivar;
 *  · no toca el costo de compra — se fija en la recepción de la OC (HU-COMP-02);
 *  · no recibe `usuarioId` del body — es siempre el de la sesión.
 *
 * Las validaciones se repiten acá aunque `fn_abm_*` las tiene: la función
 * levanta P0001 (que el handler traduce a un 409 genérico), y acá se contesta
 * con el código y el campo exactos para que el front marque el input.
 */

type Fila<S extends Sujeto> = S extends "articulo" ? FilaListaPrecio : FilaPrecioPractica;

function mapear<S extends Sujeto>(sujeto: S, row: PrecioRow): Fila<S> {
  return (sujeto === "articulo" ? mapper.toFilaArticulo(row) : mapper.toFilaPractica(row)) as Fila<S>;
}

const ETIQUETA: Record<Sujeto, string> = { articulo: "el artículo", practica: "la práctica" };

// ---------------------------------------------------------
// Lecturas (modo LECTURA)
// ---------------------------------------------------------

/** Listado completo: incluye los que todavía no tienen precio. */
export async function listar<S extends Sujeto>(sujeto: S, filtros: FiltrosPrecio = {}): Promise<Fila<S>[]> {
  const rows = await repo.findAll(sujeto, filtros);
  return rows.map((r) => mapear(sujeto, r));
}

/** Una fila por PK de lista_precio(_practica). */
export async function obtener<S extends Sujeto>(sujeto: S, precioId: number): Promise<Fila<S>> {
  const row = await repo.findByPrecioId(sujeto, precioId);
  if (!row) throw new NotFoundError("el precio", precioId);
  return mapear(sujeto, row);
}

/**
 * Historial completo de un artículo/práctica, ordenado por fecha de registro
 * (más reciente primero). Solo consulta: no participa de la venta.
 */
export async function historial(sujeto: Sujeto, sujetoId: number): Promise<HistorialPrecio[]> {
  // Un sujeto que no existe es 404; uno que existe sin cambios devuelve [].
  const existe = await repo.findBySujeto(sujeto, sujetoId);
  if (!existe) throw new NotFoundError(ETIQUETA[sujeto], sujetoId);
  return (await repo.findHistorial(sujeto, sujetoId)).map(mapper.toHistorial);
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/** Modo INSERCION: primer precio. Si ya tiene uno, se usa EDICION. */
export async function crear<S extends Sujeto>(
  sujeto: S,
  sujetoId: number,
  precio: number,
  usuarioId: number,
): Promise<Fila<S>> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findBySujeto(sujeto, sujetoId, client);
    if (!actual) throw new NotFoundError(ETIQUETA[sujeto], sujetoId);
    validarActivo(sujeto, actual);

    if (actual.precio_id !== null) {
      throw new ConflictError(
        "PRECIO_YA_CARGADO",
        `${capitalizar(ETIQUETA[sujeto])} "${actual.nombre}" ya tiene un precio cargado: editalo en lugar de crear uno nuevo.`,
        "precio",
      );
    }

    await repo.abm(sujeto, "INSERCION", sujetoId, precio, usuarioId, client);
    return releer(sujeto, sujetoId, client);
  });
}

/**
 * Modo EDICION: cambia el precio vigente.
 *
 * Es un UPDATE sobre la única fila de `lista_precio`; el trigger archiva el
 * precio en `historial_precios` con usuario y fecha/hora. Si el importe no
 * cambia, el trigger no archiva nada (no hay cambio de precio que auditar).
 */
export async function editar<S extends Sujeto>(
  sujeto: S,
  precioId: number,
  precio: number,
  usuarioId: number,
): Promise<Fila<S>> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findByPrecioId(sujeto, precioId);
    if (!actual) throw new NotFoundError("el precio", precioId);
    validarActivo(sujeto, actual);

    await repo.abm(sujeto, "EDICION", actual.sujeto_id, precio, usuarioId, client);
    return releer(sujeto, actual.sujeto_id, client);
  });
}

// ---------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------

/** `fn_abm_*` rechaza fijar precio a un sujeto inactivo; acá con mensaje claro. */
function validarActivo(sujeto: Sujeto, row: PrecioRow): void {
  if (row.estado !== "activo") {
    throw new BusinessRuleError(
      "SUJETO_INACTIVO",
      `No se puede fijar un precio de venta para ${ETIQUETA[sujeto]} inactivo/a "${row.nombre}".`,
      sujeto === "articulo" ? "articuloId" : "practicaId",
    );
  }
}

/** Relee DENTRO de la transacción: desde otra conexión todavía no se ve el cambio. */
async function releer<S extends Sujeto>(sujeto: S, sujetoId: number, client: PoolClient): Promise<Fila<S>> {
  const row = await repo.findBySujeto(sujeto, sujetoId, client);
  if (!row) throw new NotFoundError(ETIQUETA[sujeto], sujetoId);
  return mapear(sujeto, row);
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
