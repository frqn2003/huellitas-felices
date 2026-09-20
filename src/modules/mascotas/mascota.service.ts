import type { Mascota } from "@/data/mascotas";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./mascota.repo";
import * as mapper from "./mascota.mapper";
import type { FiltrosMascota, MascotaInput } from "./mascota.types";

/**
 * HU-MAS-01 — reglas de negocio de Mascotas.
 *
 * Los criterios de aceptación y dónde se cumple cada uno:
 *
 *  1. "Opera en tres modos: INSERCIÓN, EDICIÓN y LECTURA"
 *     → tres operaciones: `crear`, `editar`, `obtener`. Los modos son del
 *       formulario (es UI); acá son tres funciones distintas porque tienen
 *       reglas distintas.
 *
 *  2. "Campos: nombre, especie, raza, sexo, peso, fecha de nacimiento, color y
 *     señas particulares"
 *     → `mascota.schema.ts`. SIN `color`: el brief lo resolvió con el equipo
 *       ("el esquema no tiene columna color; no se inventan campos").
 *
 *  3. "La asociación a un cliente existente es obligatoria; no se permite crear
 *     una mascota sin titular"
 *     → `validarCliente()`, más la FK NOT NULL de la base como red de
 *       seguridad. Son dos capas a propósito: el service da el mensaje útil,
 *       la FK garantiza que no entre basura ni por la API ni por el SQL Editor.
 *
 *  4. "La mascota creada queda visible de inmediato en el perfil del cliente"
 *     → sale solo: el perfil lee GET /api/clientes/:id/mascotas contra la misma
 *       tabla. No hay caché ni copia que sincronizar.
 *
 *  5. "Registra en bitácora de auditoría cada alta y modificación, con valores
 *     anterior y nuevo"
 *     → lo hace el trigger `trg_auditoria_mascota` (AFTER INSERT OR UPDATE),
 *       que guarda `to_jsonb(OLD)` y `to_jsonb(NEW)`. Lo único que tiene que
 *       hacer la app es decirle QUIÉN opera: `withAuditUser`, primera línea de
 *       cada transacción. Si se olvida, la fila de auditoría queda con
 *       usuario_id NULL y no sirve para auditar.
 */

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listar(filtros: FiltrosMascota = {}): Promise<Mascota[]> {
  return mapper.toApiList(await repo.findAll(filtros));
}

/** Modo LECTURA del formulario (el ícono 👁 del listado). */
export async function obtener(id: number): Promise<Mascota> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("la mascota", id);
  return mapper.toApi(row);
}

// ---------------------------------------------------------
// Reglas compartidas entre alta y edición
// ---------------------------------------------------------

/**
 * Criterio 3: el titular tiene que existir y estar activo.
 *
 * Se distinguen los dos casos porque el usuario puede hacer cosas distintas:
 * si el cliente no existe, eligió mal; si está inactivo, tiene que reactivarlo
 * primero. Un único "cliente inválido" lo dejaría adivinando.
 */
async function validarCliente(clienteId: number): Promise<void> {
  const cliente = await repo.findClienteParaAsociar(clienteId);

  if (!cliente) {
    throw new NotFoundError("el cliente titular", clienteId);
  }

  if (cliente.estado !== "activo") {
    throw new BusinessRuleError(
      "CLIENTE_INACTIVO",
      `${cliente.nombre} ${cliente.apellido} está inactivo: reactivalo antes de asociarle una mascota.`,
      "clienteId",
    );
  }
}

/**
 * Un mismo dueño no puede tener dos mascotas ACTIVAS con el mismo nombre.
 *
 * No hay UNIQUE en la base que lo impida, y está bien que no lo haya: dos
 * clientes distintos sí pueden tener un "Toby". Pero dos "Toby" del mismo dueño
 * son indistinguibles a la hora de sacar un turno.
 *
 * "Activas" importa: si la mascota anterior fue dada de baja, el nombre se
 * puede reusar.
 */
async function validarNombreUnicoDelDueno(
  clienteId: number,
  nombre: string,
  excluirId?: number,
): Promise<void> {
  const duplicada = await repo.findActivaPorNombreDelCliente(clienteId, nombre, excluirId);
  if (duplicada) {
    throw new ConflictError(
      "MASCOTA_DUPLICADA",
      `${duplicada.cliente_nombre} ${duplicada.cliente_apellido} ya tiene una mascota activa llamada ${duplicada.nombre}.`,
      "nombre",
    );
  }
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/** Alta (modo INSERCIÓN del formulario paramétrico). */
export async function crear(input: MascotaInput, usuarioId: number): Promise<Mascota> {
  return withTransaction(async (client) => {
    // Primero de todo: sin esto el trigger de auditoría guarda usuario_id NULL
    // y el criterio 5 queda incumplido aunque la operación funcione.
    await withAuditUser(client, usuarioId);

    await validarCliente(input.clienteId);
    await validarNombreUnicoDelDueno(input.clienteId, input.nombre);

    const id = await repo.insert(input, client);

    // Se relee DENTRO de la transacción: desde el pool esta fila todavía no
    // existe (falta el COMMIT) y la respuesta saldría vacía.
    const row = await repo.findByIdEnTransaccion(id, client);
    if (!row) throw new NotFoundError("la mascota recién creada", id);

    return mapper.toApi(row);
  });
}

/**
 * Edición (modo EDICIÓN del formulario).
 *
 * Incluye la baja lógica: el formulario manda `estado: "inactivo"`. No hay
 * DELETE — la mascota conserva su historial de turnos.
 */
export async function editar(
  id: number,
  input: MascotaInput,
  usuarioId: number,
): Promise<Mascota> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id);
    if (!actual) throw new NotFoundError("la mascota", id);

    await validarCliente(input.clienteId);
    // `id` excluido: una mascota no choca consigo misma al guardar sin
    // cambiarle el nombre.
    await validarNombreUnicoDelDueno(input.clienteId, input.nombre, id);

    const actualizada = await repo.update(id, input, client);
    if (!actualizada) throw new NotFoundError("la mascota", id);

    const row = await repo.findByIdEnTransaccion(id, client);
    if (!row) throw new NotFoundError("la mascota", id);

    return mapper.toApi(row);
  });
}
