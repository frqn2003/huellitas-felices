import type { Articulo } from "@/data/articulos";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { ConflictError, NotFoundError } from "@/lib/http/errors";
import { guardarImagenBase64 } from "@/lib/uploads";
import * as repo from "./articulo.repo";
import * as mapper from "./articulo.mapper";
import type { ArticuloRow, CatalogosArticulo, FiltrosArticulo } from "./articulo.types";
import type { CrearArticuloInput } from "./articulo.schema";

/**
 * HU-STK-01 — reglas de negocio de Artículos.
 *
 * Notá que en este archivo no aparece `Request`, `Response` ni un status code:
 * el service no sabe que existe HTTP. Por eso `crear({...}, 1)` se puede llamar
 * desde un test sin levantar el servidor.
 */

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listar(filtros: FiltrosArticulo = {}): Promise<Articulo[]> {
  return mapper.toApiList(await repo.findAll(filtros));
}

export async function obtener(id: number): Promise<Articulo> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("el artículo", id);
  return mapper.toApi(row);
}

export async function catalogos(): Promise<CatalogosArticulo> {
  return repo.catalogos();
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/**
 * Alta de artículo (modo INSERCIÓN del formulario paramétrico).
 *
 * Criterio HU-STK-01: "valida que el nombre no se encuentre duplicado entre
 * artículos activos".
 *
 * Lo que NO hace este service, a propósito:
 *  · no genera el `codigo` — lo hace el trigger fn_generar_cod_articulo con el
 *    prefijo de la categoría;
 *  · no toca `created_at`/`updated_at` — los ponen el DEFAULT y el trigger
 *    fn_touch_updated_at.
 */
export async function crear(
  input: CrearArticuloInput,
  usuarioId: number,
): Promise<Articulo> {
  // La imagen se escribe en disco ANTES de abrir la transacción: escribir un
  // archivo no se puede deshacer con un ROLLBACK, así que no tiene sentido
  // tenerlo adentro. Si después falla el INSERT, queda un archivo huérfano en
  // disco — molesto pero inofensivo, y preferible a una transacción larga
  // esperando I/O.
  const imagenUrl = await guardarImagenBase64(input.imagen);

  return withTransaction(async (client) => {
    // Primero de todo: sin esto el trigger de auditoría guarda usuario_id NULL.
    await withAuditUser(client, usuarioId);

    // Chequeo previo para dar el mensaje lindo con el campo señalado.
    // El índice único parcial `uq_articulo_nombre_activo` (corrección 04) es la
    // red de seguridad para dos requests simultáneos: ese choque lo traduce
    // traducirErrorPostgres() en lib/http/errors.ts.
    const duplicado = await repo.findActivoByNombre(input.nombre);
    if (duplicado) {
      throw new ConflictError(
        "NOMBRE_DUPLICADO",
        `Ya existe un artículo activo con el nombre "${input.nombre}" (${duplicado.codigo}).`,
        "nombre",
      );
    }

    const id = await repo.insert(
      {
        nombre: input.nombre,
        descripcion: input.descripcion,
        categoriaId: input.categoriaId,
        unidadMedidaId: input.unidadMedidaId,
        fabricanteId: input.fabricanteId,
        imagenUrl,
        activo: input.activo,
      },
      client,
    );

    // Se relee en vez de usar un RETURNING: el INSERT no puede devolver el
    // `codigo` que generó el trigger junto con los nombres de categoría,
    // unidad, fabricante y proveedor, que salen de los JOIN.
    const row = await leerFrescoOFallar(id, client);
    return mapper.toApi(row);
  });
}

/** Edición (modo EDICIÓN del formulario). */
export async function editar(
  id: number,
  input: CrearArticuloInput,
  usuarioId: number,
): Promise<Articulo> {
  const imagenUrl = await guardarImagenBase64(input.imagen);

  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("el artículo", id);

    // `id` excluido: un artículo no choca consigo mismo al guardar sin
    // cambiarle el nombre.
    const duplicado = await repo.findActivoByNombre(input.nombre, id);
    if (duplicado) {
      throw new ConflictError(
        "NOMBRE_DUPLICADO",
        `Ya existe otro artículo activo con el nombre "${input.nombre}" (${duplicado.codigo}).`,
        "nombre",
      );
    }

    await repo.update(
      id,
      {
        nombre: input.nombre,
        descripcion: input.descripcion,
        categoriaId: input.categoriaId,
        unidadMedidaId: input.unidadMedidaId,
        fabricanteId: input.fabricanteId,
        imagenUrl,
        activo: input.activo,
      },
      client,
    );

    return mapper.toApi(await leerFrescoOFallar(id, client));
  });
}

/**
 * Baja LÓGICA.
 * Criterio: "un artículo inactivo no puede seleccionarse en nuevos movimientos,
 * listas de precios ni órdenes de compra, pero sus registros históricos se
 * conservan". Por eso nunca hay DELETE.
 */
export async function desactivar(id: number, usuarioId: number): Promise<Articulo> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("el artículo", id);

    // Idempotente: desactivar algo ya desactivado no es un error.
    if (actual.estado === "inactivo") return mapper.toApi(actual);

    await repo.setEstado(id, "inactivo", client);

    // El trigger de auditoría detecta activo→inactivo y lo registra como
    // 'baja', no como 'modificacion'. Ver fn_auditar() en la corrección 01.
    return mapper.toApi(await leerFrescoOFallar(id, client));
  });
}

// ---------------------------------------------------------
// Helper interno
// ---------------------------------------------------------

/**
 * Relee el artículo DENTRO de la transacción y falla si no está.
 *
 * El `client` no es opcional acá: desde otra conexión, las filas que la
 * transacción todavía no confirmó no se ven, y la respuesta saldría con datos
 * viejos o directamente vacía.
 *
 * Antes esta función tenía el SELECT copiado a mano del repo. Esa copia fue
 * justamente la que quedó desincronizada cuando cambió el esquema: el SQL vive
 * en UN solo lugar.
 */
async function leerFrescoOFallar(
  id: number,
  client: Parameters<Parameters<typeof withTransaction>[0]>[0],
): Promise<ArticuloRow> {
  const row = await repo.findById(id, client);
  if (!row) throw new NotFoundError("el artículo", id);
  return row;
}
