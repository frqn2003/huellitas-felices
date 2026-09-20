import type { Practica, Profesional, Turno, EstadoTurno } from "@/data/turnos";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/http/errors";
import * as repo from "./turno.repo";
import * as mapper from "./turno.mapper";
import type { FiltrosTurno, TurnoInput } from "./turno.types";

/**
 * HU-TUR-01 — reglas de negocio de Turnos.
 *
 * Los criterios y dónde se cumple cada uno:
 *
 *  1. "Selección de cliente, mascota (asociada al cliente), profesional, fecha
 *     y hora"
 *     → los catálogos (`catalogoProfesionales`, `catalogoPracticas`) y las
 *       validaciones de `crear`. Que la mascota sea DEL cliente lo chequea
 *       `validarMascotaDelCliente`.
 *
 *  2. "Valida la disponibilidad del profesional en el horario solicitado antes
 *     de confirmar; rechaza la superposición"
 *     → `validarFranjaYHorario` + `validarSinSuperposicion`, con el constraint
 *       `turno_sin_superposicion_excl` de la base como red bajo concurrencia.
 *
 *  3. "Muestra confirmación visual del turno creado, con resumen"
 *     → es del front, pero depende de que `crear` devuelva el turno COMPLETO y
 *       ya persistido (con su id y su sucursal derivada), no el draft que se
 *       mandó. Por eso se relee después del INSERT.
 *
 *  4. "El turno queda visible de inmediato en la agenda del profesional y de la
 *     sucursal"
 *     → sale solo: la agenda lee la misma tabla. No hay copia que sincronizar.
 *
 *  5. "Registra en bitácora de auditoría el alta del turno"
 *     → lo hace el trigger `trg_auditoria_turno_alta` (AFTER INSERT). Lo único
 *       que tiene que hacer la app es decir QUIÉN opera: `withAuditUser`,
 *       primera línea de la transacción.
 */

/** El turno nace pendiente (catálogo `estado_turno`: 1 = pendiente). */
const ESTADO_PENDIENTE = 1;

/** El estado "cancelado" libera el hueco. Coincide con el WHERE del EXCLUDE. */
const ESTADO_CANCELADO = 3;

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listar(filtros: FiltrosTurno = {}): Promise<Turno[]> {
  return mapper.toApiList(await repo.findAll(filtros));
}

export async function obtener(id: number): Promise<Turno> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("el turno", id);
  return mapper.toApi(row);
}

// ---------------------------------------------------------
// Catálogos del wizard
// ---------------------------------------------------------

/** Veterinarios activos con sus franjas. Dos consultas, no una por profesional. */
export async function catalogoProfesionales(): Promise<Profesional[]> {
  const [profesionales, franjas] = await Promise.all([
    repo.listarProfesionales(),
    repo.listarFranjas(),
  ]);
  return mapper.toApiProfesionales(profesionales, franjas);
}

export async function catalogoPracticas(): Promise<Practica[]> {
  const filas = await repo.listarPracticas();
  return filas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    // La columna es nullable pero el front la necesita para calcular hora_fin.
    // 30 minutos es la duración de "consulta", la práctica más común: es un
    // default razonable para una fila mal cargada, y mejor que un NaN.
    duracionMinutos: p.duracion_estimada_minutos ?? 30,
  }));
}

export async function catalogoEstados(): Promise<EstadoTurno[]> {
  return repo.listarEstados();
}

/**
 * Los horarios ya ocupados de una franja en una fecha.
 *
 * El wizard calcula los huecos libres restando esto a la franja. Podría
 * derivarlos del listado completo de turnos que ya tiene, pero pedirlos
 * puntualmente evita que la pantalla dependa de haber traído TODOS los turnos
 * de la sucursal solo para saber si las 10:00 están libres.
 */
export async function ocupados(
  agendaProfesionalId: number,
  fecha: string,
): Promise<{ horaInicio: string; horaFin: string }[]> {
  const filas = await repo.findOcupados(agendaProfesionalId, fecha);
  return filas.map((f) => ({
    horaInicio: f.hora_inicio.slice(0, 5),
    horaFin: f.hora_fin.slice(0, 5),
  }));
}

// ---------------------------------------------------------
// Validaciones del alta
// ---------------------------------------------------------

async function validarCliente(clienteId: number): Promise<void> {
  const cliente = await repo.findClienteActivo(clienteId);
  if (!cliente) throw new NotFoundError("el cliente", clienteId);
  if (cliente.estado !== "activo") {
    throw new BusinessRuleError(
      "CLIENTE_INACTIVO",
      `${cliente.nombre} ${cliente.apellido} está inactivo: no se le pueden dar turnos.`,
      "clienteId",
    );
  }
}

/**
 * Criterio 1: la mascota tiene que ser DEL cliente elegido.
 *
 * El trigger `fn_turno_validar_mascota_cliente` valida lo mismo en la base,
 * pero sale como P0001 con un mensaje genérico. Acá se puede decir de quién es
 * realmente la mascota, que es lo que necesita quien está en el mostrador.
 */
async function validarMascotaDelCliente(mascotaId: number, clienteId: number): Promise<void> {
  const mascota = await repo.findMascota(mascotaId);
  if (!mascota) throw new NotFoundError("la mascota", mascotaId);

  if (mascota.cliente_id !== clienteId) {
    throw new BusinessRuleError(
      "MASCOTA_DE_OTRO_CLIENTE",
      `${mascota.nombre} no pertenece al cliente seleccionado.`,
      "mascotaId",
    );
  }

  if (mascota.estado !== "activo") {
    throw new BusinessRuleError(
      "MASCOTA_INACTIVA",
      `${mascota.nombre} está dada de baja: no se le pueden dar turnos.`,
      "mascotaId",
    );
  }
}

async function validarPractica(practicaId: number): Promise<void> {
  const practica = await repo.findPractica(practicaId);
  if (!practica) throw new NotFoundError("la práctica", practicaId);
  if (practica.estado !== "activo") {
    throw new BusinessRuleError(
      "PRACTICA_INACTIVA",
      `La práctica ${practica.nombre} ya no está disponible.`,
      "practicaId",
    );
  }
}

/**
 * Criterio 2, primera mitad: el horario pedido tiene que caer DENTRO de la
 * franja del profesional, y en un día que ese profesional trabaje.
 *
 * `agenda_semanal.dia_semana` usa ISO 8601 (1=lunes … 7=domingo), mientras que
 * el `getDay()` de JavaScript devuelve 0=domingo … 6=sábado. Convertir mal esto
 * corre todo un día y es el error clásico del módulo.
 */
async function validarFranjaYHorario(input: TurnoInput): Promise<void> {
  const franja = await repo.findFranja(input.agendaProfesionalId);
  if (!franja) throw new NotFoundError("el horario del profesional", input.agendaProfesionalId);

  if (franja.estado !== "activo") {
    throw new BusinessRuleError(
      "FRANJA_INACTIVA",
      "Ese horario del profesional ya no está disponible.",
      "agendaProfesionalId",
    );
  }

  if (franja.agenda_semanal_estado !== "activo") {
    throw new BusinessRuleError(
      "AGENDA_INACTIVA",
      "La agenda de la sucursal para ese día no está activa.",
      "agendaProfesionalId",
    );
  }

  // JS: 0=domingo … 6=sábado → ISO: 1=lunes … 7=domingo.
  // Se parsea con "T00:00:00" para que sea hora LOCAL: `new Date("2026-09-23")`
  // a secas se interpreta como UTC y en Argentina cae el día anterior.
  const diaJs = new Date(`${input.fecha}T00:00:00`).getDay();
  const diaIso = diaJs === 0 ? 7 : diaJs;

  if (diaIso !== franja.dia_semana) {
    const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
    throw new BusinessRuleError(
      "DIA_NO_LABORABLE",
      `El profesional no atiende en ese horario los ${DIAS[diaIso]}: esa franja es de ${DIAS[franja.dia_semana]}.`,
      "fecha",
    );
  }

  // Comparar "HH:mm" como strings funciona porque el formato es de ancho fijo
  // y con ceros a la izquierda: "09:30" < "10:00" lexicográficamente también.
  const inicioFranja = franja.hora_inicio.slice(0, 5);
  const finFranja = franja.hora_fin.slice(0, 5);

  if (input.horaInicio < inicioFranja || input.horaFin > finFranja) {
    throw new BusinessRuleError(
      "FUERA_DE_FRANJA",
      `El turno (${input.horaInicio}–${input.horaFin}) queda fuera del horario de atención del profesional (${inicioFranja}–${finFranja}).`,
      "horaInicio",
    );
  }
}

/**
 * Criterio 2, segunda mitad: "rechaza la superposición".
 *
 * ⚠️ ESTO NO ES LA GARANTÍA, es el mensaje lindo. Dos recepcionistas reservando
 *    el mismo hueco al mismo tiempo pasan las dos por acá antes de que
 *    cualquiera inserte. Lo que impide de verdad el turno duplicado es el
 *    constraint `turno_sin_superposicion_excl` de la base, que devuelve 23P01 y
 *    se traduce en lib/http/errors.ts. Las dos capas hacen falta.
 */
async function validarSinSuperposicion(input: TurnoInput): Promise<void> {
  const choque = await repo.findSuperpuesto(
    input.agendaProfesionalId,
    input.fecha,
    input.horaInicio,
    input.horaFin,
  );

  if (choque) {
    throw new BusinessRuleError(
      "TURNO_SUPERPUESTO",
      `El profesional ya tiene un turno de ${choque.hora_inicio.slice(0, 5)} a ${choque.hora_fin.slice(0, 5)} ese día.`,
      "horaInicio",
    );
  }
}

/** Un turno no se puede agendar en el pasado (lo valida también un trigger). */
function validarFechaNoPasada(fecha: string): void {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  if (fecha < hoyISO) {
    throw new ValidationError(
      "FECHA_PASADA",
      "No se puede agendar un turno en una fecha que ya pasó.",
      "fecha",
    );
  }
}

// ---------------------------------------------------------
// Escritura
// ---------------------------------------------------------

/**
 * Alta de turno.
 *
 * El orden importa: se valida TODO antes de escribir nada. Si la mascota es de
 * otro cliente, mejor enterarse antes de haber consumido un id de la secuencia.
 */
export async function crear(input: TurnoInput, usuarioId: number): Promise<Turno> {
  return withTransaction(async (client) => {
    // Primero de todo: sin esto el trigger de auditoría guarda usuario_id NULL
    // y el criterio 5 queda incumplido aunque el turno se cree bien.
    await withAuditUser(client, usuarioId);

    validarFechaNoPasada(input.fecha);
    await validarCliente(input.clienteId);
    await validarMascotaDelCliente(input.mascotaId, input.clienteId);
    await validarPractica(input.practicaId);
    await validarFranjaYHorario(input);
    await validarSinSuperposicion(input);

    const id = await repo.insert(input, ESTADO_PENDIENTE, usuarioId, client);

    // Se relee DENTRO de la transacción por dos motivos: desde el pool la fila
    // todavía no existe (falta el COMMIT), y hace falta traer la `sucursal_id`
    // que completó el trigger — el criterio 3 pide mostrar el resumen del turno
    // creado, no el del draft que se mandó.
    const row = await repo.findByIdEnTransaccion(id, client);
    if (!row) throw new NotFoundError("el turno recién creado", id);

    return mapper.toApi(row);
  });
}

// ---------------------------------------------------------
// HU-TUR-02 — cambio de estado
// ---------------------------------------------------------

/**
 * Máquina de estados del turno.
 *
 * Regla confirmada con el equipo (docs/briefs/HU-TUR-02.md): NO SE RETROCEDE.
 *
 *     pendiente ──► confirmado ──┬──► atendido    (final)
 *                                ├──► cancelado   (final)
 *                                └──► no_asistio  (final)
 *
 * Un turno pendiente NO salta directo a atendido: primero se confirma.
 *
 * Se declara por NOMBRE y no por id, igual que `origenesPorTipo` en
 * movimientos: los estados viven en la tabla `estado_turno` y sus ids podrían
 * reordenarse; los nombres son el contrato. Y `es_final` de la tabla corta
 * cualquier salida de un estado terminal, así que agregar un estado final nuevo
 * al catálogo no obliga a tocar este código.
 */
const TRANSICIONES: Record<string, string[]> = {
  pendiente: ["confirmado"],
  confirmado: ["cancelado", "atendido", "no_asistio"],
  // cancelado, atendido y no_asistio no figuran: son finales.
};

export function puedeTransicionar(
  estadoActual: string,
  esFinal: boolean,
  destino: string,
): boolean {
  if (esFinal) return false;
  return (TRANSICIONES[estadoActual] ?? []).includes(destino);
}

/** Etiqueta legible de un estado crudo del catálogo ("no_asistio" → "No asistió"). */
function etiqueta(nombre: string): string {
  const ETIQUETAS: Record<string, string> = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    cancelado: "Cancelado",
    atendido: "Atendido",
    no_asistio: "No asistió",
  };
  return ETIQUETAS[nombre] ?? nombre;
}

/**
 * Cambia el estado de un turno — HU-TUR-02.
 *
 * Los criterios y dónde se cumple cada uno:
 *
 *  1. "Estados como tabla de referencia fija"
 *     → el catálogo `estado_turno` (GET /api/estados-turno). Acá solo se valida
 *       QUÉ paso es legal desde cada uno.
 *
 *  2. "El cambio se realiza desde la vista de agenda"
 *     → es del front; este service es el que ese botón termina llamando.
 *
 *  3. "Un turno cancelado libera automáticamente el horario"
 *     → sale solo, y es importante entender por qué: tanto el chequeo de
 *       disponibilidad (`findSuperpuesto`) como el constraint
 *       `turno_sin_superposicion_excl` filtran por `estado_id <> 3`. Al pasar a
 *       cancelado, el turno deja de contar para los dos en el mismo instante.
 *       No hay nada que borrar ni liberar a mano.
 *
 *  4. "Un turno 'no asistió' queda en el historial del cliente"
 *     → no hay tabla de historial: el historial ES la lista de turnos del
 *       cliente. Como la baja es un cambio de estado y no un DELETE, el turno
 *       sigue ahí y se consulta con
 *       GET /api/turnos?clienteId=X&estadoId=5.
 *
 *  5. "Registra en bitácora cada cambio de estado, con usuario, fecha y hora"
 *     → lo hace el trigger `trg_auditoria_turno_estado`, que dispara SOLO
 *       cuando `estado_id` cambia y guarda `valores_anteriores`/`valores_nuevos`.
 *       `withAuditUser` es lo que le dice quién opera; sin eso la fila queda con
 *       usuario_id NULL y el criterio no se cumple.
 */
export async function cambiarEstado(
  id: number,
  estadoDestinoId: number,
  usuarioId: number,
): Promise<Turno> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    // El lock evita que dos recepcionistas cambien el mismo turno a la vez y el
    // segundo pise al primero validando contra un estado ya viejo.
    const actual = await repo.lockTurnoParaEstado(id, client);
    if (!actual) throw new NotFoundError("el turno", id);

    const destino = await repo.findEstado(estadoDestinoId);
    if (!destino) throw new NotFoundError("el estado", estadoDestinoId);

    // Idempotente: pedir el estado que ya tiene no es un error, y además no
    // dispara el trigger de auditoría (el UPDATE no cambiaría nada), así que no
    // ensucia la bitácora con un "cambio" que no cambió nada.
    if (actual.estado_id === estadoDestinoId) {
      const row = await repo.findByIdEnTransaccion(id, client);
      if (!row) throw new NotFoundError("el turno", id);
      return mapper.toApi(row);
    }

    if (!puedeTransicionar(actual.estado_nombre, actual.es_final, destino.nombre)) {
      // Dos mensajes distintos porque son dos situaciones distintas para quien
      // está en el mostrador: una no tiene arreglo, la otra sí.
      throw new BusinessRuleError(
        "TRANSICION_INVALIDA",
        actual.es_final
          ? `El turno está ${etiqueta(actual.estado_nombre)} y ese estado es final: no admite más cambios.`
          : `No se puede pasar un turno ${etiqueta(actual.estado_nombre)} a ${etiqueta(destino.nombre)}.`,
        "estadoId",
      );
    }

    const ok = await repo.updateEstado(id, estadoDestinoId, client);
    if (!ok) throw new NotFoundError("el turno", id);

    const row = await repo.findByIdEnTransaccion(id, client);
    if (!row) throw new NotFoundError("el turno", id);

    return mapper.toApi(row);
  });
}

export { ESTADO_PENDIENTE, ESTADO_CANCELADO };
