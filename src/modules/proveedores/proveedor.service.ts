import type { Proveedor } from "@/data/proveedores";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./proveedor.repo";
import * as mapper from "./proveedor.mapper";
import type { FiltrosProveedor, ProveedorInput } from "./proveedor.types";

/**
 * HU-PROV-01 — reglas de negocio de Proveedores.
 *
 * ACÁ VA: las reglas de los criterios de aceptación, la orquestación de
 * transacciones y las decisiones de qué error corresponde.
 *
 * ACÁ NO VA: SQL (eso es del repo) ni nada de HTTP. Fijate que en este archivo
 * no aparece `Request`, `Response` ni un status code: por eso se puede testear
 * llamando a las funciones directo, sin levantar el servidor.
 */

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listar(filtros: FiltrosProveedor = {}): Promise<Proveedor[]> {
  const rows = await repo.findAll(filtros);

  // Dos queries en total, no una por proveedor. Ver el comentario de
  // formasPagoDe() en el repo sobre el N+1.
  const formasPago = await repo.formasPagoDe(rows.map((r) => r.id));

  return mapper.toApiList(rows, formasPago);
}

export async function obtener(id: number): Promise<Proveedor> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("el proveedor", id);

  const formasPago = await repo.formasPagoDe([id]);
  return mapper.toApi(row, formasPago.get(id) ?? []);
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/**
 * Alta de proveedor (modo INSERCIÓN del formulario paramétrico).
 *
 * Criterio HU-PROV-01: "valida que el CUIT no se encuentre duplicado entre
 * proveedores activos".
 */
export async function crear(
  input: ProveedorInput,
  usuarioId: number,
): Promise<Proveedor> {
  return withTransaction(async (client) => {
    // Sin esto, el trigger de auditoría no sabe quién operó y guarda usuario_id
    // NULL. Va primero, antes de cualquier escritura.
    await withAuditUser(client, usuarioId);

    // Chequeo previo: da el mensaje lindo con el campo señalado.
    // El índice único parcial `uq_proveedor_cuit_activo` es la red de seguridad
    // para el caso de dos requests simultáneos que pasan los dos por acá; ese
    // choque se traduce en lib/http/errors.ts → traducirErrorPostgres().
    const duplicado = await repo.findActivoByCuit(input.cuit);
    if (duplicado) {
      throw new ConflictError(
        "CUIT_DUPLICADO",
        `Ya existe un proveedor activo con el CUIT ${input.cuit}: ${duplicado.razon_social}.`,
        "cuit",
      );
    }

    const row = await repo.insert(input, client);
    await repo.reemplazarFormasPago(row.id, input.formaPagoIds, client);

    return mapper.toApi(row, await nombresFormasPago(row.id, client));
  });
}

/**
 * Edición (modo EDICIÓN del formulario).
 *
 * El brief dice que el ícono de editar no aparece para proveedores inactivos,
 * pero eso es la UI: acá se valida igual, porque el front puede equivocarse y
 * la API es pública para cualquiera que sepa la URL.
 */
export async function editar(
  id: number,
  input: ProveedorInput,
  usuarioId: number,
): Promise<Proveedor> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("el proveedor", id);

    if (actual.estado === "inactivo") {
      throw new BusinessRuleError(
        "PROVEEDOR_INACTIVO",
        "No se puede editar un proveedor inactivo. Reactivalo primero.",
      );
    }

    // `id` excluido: un proveedor no choca consigo mismo al guardar sin cambiar el CUIT.
    const duplicado = await repo.findActivoByCuit(input.cuit, id);
    if (duplicado) {
      throw new ConflictError(
        "CUIT_DUPLICADO",
        `Ya existe otro proveedor activo con el CUIT ${input.cuit}: ${duplicado.razon_social}.`,
        "cuit",
      );
    }

    const row = await repo.update(id, input, client);
    if (!row) throw new NotFoundError("el proveedor", id);

    await repo.reemplazarFormasPago(id, input.formaPagoIds, client);

    return mapper.toApi(row, await nombresFormasPago(id, client));
  });
}

/**
 * Baja LÓGICA.
 *
 * Criterio HU-PROV-01: "la baja es LÓGICA; un proveedor inactivo no puede
 * seleccionarse en nuevas órdenes de compra, pero conserva su historial".
 *
 * La regla de las órdenes abiertas no está en el criterio de la HU: la pide el
 * front en src/context/ProveedoresContext.tsx:67, donde deja anotado que "el
 * backend debería fallar si hay órdenes pendientes". Tiene sentido: dar de baja
 * un proveedor con una OC en curso deja esa orden sin proveedor operable.
 */
export async function inactivar(id: number, usuarioId: number): Promise<Proveedor> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("el proveedor", id);

    // Idempotente: dar de baja algo ya dado de baja no es un error.
    if (actual.estado === "inactivo") {
      return mapper.toApi(actual, await nombresFormasPago(id, client));
    }

    const abiertas = await repo.contarOrdenesAbiertas(id);
    if (abiertas > 0) {
      throw new BusinessRuleError(
        "PROVEEDOR_CON_ORDENES_ABIERTAS",
        `No se puede dar de baja: el proveedor tiene ${abiertas} orden(es) de compra sin cerrar.`,
      );
    }

    const row = await repo.setEstado(id, "inactivo", client);
    if (!row) throw new NotFoundError("el proveedor", id);

    // El trigger de auditoría detecta activo→inactivo y lo registra como 'baja',
    // no como 'modificacion'. Ver fn_auditar() en 0005_auditoria.sql.
    return mapper.toApi(row, await nombresFormasPago(id, client));
  });
}

/** Reactivación. No está en el criterio, pero sin esto una baja por error es irreversible. */
export async function reactivar(id: number, usuarioId: number): Promise<Proveedor> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("el proveedor", id);

    // Al reactivar puede aparecer un choque de CUIT que mientras estaba
    // inactivo era legal (el índice único solo mira los activos).
    const duplicado = await repo.findActivoByCuit(actual.cuit, id);
    if (duplicado) {
      throw new ConflictError(
        "CUIT_DUPLICADO",
        `No se puede reactivar: ya hay un proveedor activo con el CUIT ${actual.cuit} (${duplicado.razon_social}).`,
        "cuit",
      );
    }

    const row = await repo.setEstado(id, "activo", client);
    if (!row) throw new NotFoundError("el proveedor", id);

    return mapper.toApi(row, await nombresFormasPago(id, client));
  });
}

// ---------------------------------------------------------
// Helper interno
// ---------------------------------------------------------

/**
 * Lee las formas de pago recién guardadas.
 *
 * Va contra `client` y no contra el pool porque todavía estamos dentro de la
 * transacción: desde otra conexión, las filas insertadas no se ven hasta el
 * COMMIT y la respuesta saldría con el array vacío.
 */
async function nombresFormasPago(
  proveedorId: number,
  client: Parameters<Parameters<typeof withTransaction>[0]>[0],
): Promise<string[]> {
  const { rows } = await client.query<{ nombre: string }>(
    `SELECT fp.nombre
     FROM proveedor_forma_pago pfp
     JOIN forma_pago fp ON fp.id = pfp.forma_pago_id
     WHERE pfp.proveedor_id = $1
     ORDER BY fp.nombre`,
    [proveedorId],
  );
  return rows.map((r) => r.nombre);
}
