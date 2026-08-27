import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/http/errors";
import * as repo from "./orden.repo";
import * as mapper from "./orden.mapper";
import type { OrdenCompraApi } from "./orden.mapper";
import type { FiltrosOrden, LineaOrden } from "./orden.types";
import type { CrearOrdenInput } from "./orden.schema";

/**
 * HU-COMP-02 — reglas de negocio de las órdenes de compra.
 *
 * ACÁ VA: las reglas de los criterios de aceptación, la orquestación de las
 * transacciones y la decisión de qué error corresponde.
 *
 * ACÁ NO VA: SQL (es del repo) ni nada de HTTP. En este archivo no aparece
 * `Request`, `Response` ni un status code, así que se puede testear llamando a
 * las funciones directo, sin levantar el servidor.
 */

// ---------------------------------------------------------
// Funciones puras — las más testeables del módulo
// ---------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Totales de la orden.
 *
 * `total = subtotal − (subtotal × descuento/100) + gastosEnvio`, redondeado a 2
 * decimales en cada paso porque la base guarda decimal(12,2).
 *
 * REGLA DURA (guía §7): esto se recalcula SIEMPRE. El `total` que manda el
 * front se descarta, no se compara. Si el front tuviera un bug de redondeo, o
 * si alguien llamara la API a mano con un total inventado, la base igual guarda
 * el número correcto.
 */
export function calcularTotales(
  lineas: LineaOrden[],
  descuentoPct: number,
  gastosEnvio: number,
): { subtotal: number; descuentoMonto: number; total: number } {
  const subtotal = round2(
    lineas.reduce((acc, l) => acc + l.cantidad * l.precioAcordado, 0),
  );
  const descuentoMonto = round2((subtotal * descuentoPct) / 100);
  const total = round2(subtotal - descuentoMonto + gastosEnvio);
  return { subtotal, descuentoMonto, total };
}

/**
 * Máquina de estados del criterio: "estados de la orden, como tabla de
 * referencia fija: pendiente, enviada, recibida parcial, recibida total,
 * cancelada".
 *
 * Los estados viven en `estado_orden_compra` (no en un enum del código); lo que
 * está acá es qué paso es legal desde cada uno. `es_final` de la tabla corta
 * cualquier transición desde un estado terminal, así que agregar un estado
 * final nuevo no obliga a tocar este código.
 *
 * SPRINT 1: 'Recibida Parcial' y 'Recibida Total' están declaradas pero NO son
 * alcanzables — no hay endpoint que las produzca. Se llega a ellas desde
 * HU-COMP-03 (Recepción de Mercadería), que es Sprint 2. La máquina queda
 * preparada para no tener que rehacerla.
 */
const TRANSICIONES: Record<string, string[]> = {
  // Los nombres son los de `estado_orden_compra` en la BASE (identificadores
  // con guión bajo), no los que muestra el front. La traducción para mostrar la
  // hace el mapper.
  pendiente: ["enviada", "cancelada"],
  enviada: ["recibida_parcial", "recibida_total", "cancelada"],
  recibida_parcial: ["recibida_total", "cancelada"],
};

export function puedeTransicionar(
  estadoActual: string,
  esFinal: boolean,
  destino: string,
): boolean {
  if (esFinal) return false;
  return (TRANSICIONES[estadoActual] ?? []).includes(destino);
}

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listar(filtros: FiltrosOrden = {}): Promise<OrdenCompraApi[]> {
  const rows = await repo.findAll(filtros);
  // Dos consultas en total, no una por orden. Ver findDetalles() en el repo.
  const detalles = await repo.findDetalles(rows.map((r) => r.id));
  return mapper.toApiList(rows, detalles);
}

export async function obtener(id: number): Promise<OrdenCompraApi> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("la orden de compra", id);
  return mapper.toApi(row, await repo.findDetalles([id]));
}

/** Catálogo de condiciones de pago para los selects del front. */
export async function condicionesPago(): Promise<{ id: number; nombre: string }[]> {
  return repo.listarFormasPago();
}

/**
 * Último precio pagado por un artículo (lo usa el formulario de orden para
 * precargar el precio unitario).
 */
export async function ultimoPrecioCompra(articuloId: number): Promise<{
  articuloId: number;
  precio: number | null;
  fecha: string | null;
  ordenId: number | null;
  codOrd: string | null;
}> {
  const fila = await repo.findUltimoPrecioCompra(articuloId);
  if (!fila) {
    // Que un artículo nunca se haya comprado no es un error: es el caso normal
    // de un artículo nuevo. El front deja el precio vacío para que se cargue a
    // mano.
    return { articuloId, precio: null, fecha: null, ordenId: null, codOrd: null };
  }
  return {
    articuloId,
    precio: Number(fila.precio),
    fecha: fila.fecha.toISOString(),
    ordenId: fila.orden_id,
    codOrd: fila.cod_ord,
  };
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/**
 * Alta de orden de compra (modo INSERCIÓN del formulario).
 *
 * Cubre el criterio de la cabecera ("proveedor, fecha de emisión, condiciones
 * de pago y estado") y el del detalle ("una o más líneas, cada una con
 * artículo, cantidad y precio pactado").
 */
export async function crear(
  input: CrearOrdenInput,
  usuarioId: number,
): Promise<OrdenCompraApi> {
  return withTransaction(async (client) => {
    // Primero de todo: sin esto el trigger de auditoría guarda usuario_id NULL.
    await withAuditUser(client, usuarioId);
    return crearEnTransaccion(client, input, usuarioId, null);
  });
}

/**
 * El alta, pero reusable desde otra transacción ya abierta.
 *
 * Existe porque la adjudicación de una solicitud de cotización crea VARIAS
 * órdenes (una por proveedor ganador) y todas tienen que nacer con las mismas
 * validaciones que una orden cargada a mano — proveedor activo, artículos
 * activos, totales recalculados — dentro de la misma transacción que marca la
 * solicitud como adjudicada. Sin esta función, esas reglas estarían escritas
 * dos veces y se irían separando con el tiempo.
 *
 * El llamador ya hizo `withAuditUser`, así que acá no se repite.
 */
export async function crearEnTransaccion(
  client: PoolClient,
  input: CrearOrdenInput,
  usuarioId: number,
  cotizacionId: number | null,
): Promise<OrdenCompraApi> {
  const lineas = normalizarLineas(input);

  await validarProveedorActivo(input.proveedorId, client);
  await validarArticulosActivos(lineas, client);
  const formaPagoId = await validarFormaPago(input.formaPagoId, client);
  const depositoId = await resolverDeposito(input.depositoEntregaId, client);

  const { subtotal, total } = calcularTotales(lineas, input.descuento, input.gastosEnvio);

  // Toda orden nace Pendiente: "estado inicial pendiente" del criterio.
  const pendiente = await repo.findEstadoByNombre("pendiente", client);
  if (!pendiente) {
    // No es culpa del usuario: falta correr db/seeds/01_catalogos.sql. Sale
    // como 500 genérico y el detalle queda en el log del server.
    throw new Error(
      "El catálogo estado_orden_compra no tiene 'Pendiente'. Correr db/seeds/01_catalogos.sql.",
    );
  }

  const ordenId = await repo.insertCabecera(
    {
      proveedorId: input.proveedorId,
      usuarioId,
      estadoId: pendiente.id,
      formaPagoId,
      depositoId,
      cotizacionId,
      fechaEntrega: input.fechaEntrega ?? null,
      notas: input.notas ?? null,
      subtotal,
      descuento: input.descuento,
      gastosEnvio: input.gastosEnvio,
      total,
    },
    client,
  );

  await repo.insertDetalles(ordenId, lineas, client);

  return leerEnTransaccion(ordenId, client);
}

/**
 * Edición (modo EDICIÓN del formulario).
 *
 * Solo se puede editar una orden Pendiente. Una vez enviada al proveedor, el
 * documento ya salió: cambiarlo dejaría la copia del proveedor y la nuestra
 * diciendo cosas distintas. Para eso está cancelar y emitir una nueva.
 */
export async function editar(
  id: number,
  input: CrearOrdenInput,
  usuarioId: number,
): Promise<OrdenCompraApi> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) throw new NotFoundError("la orden de compra", id);

    if (actual.estado_nombre !== "Pendiente") {
      throw new BusinessRuleError(
        "ORDEN_NO_EDITABLE",
        `Solo se puede editar una orden Pendiente. Esta está ${actual.estado_nombre}.`,
      );
    }

    const lineas = normalizarLineas(input);

    await validarProveedorActivo(input.proveedorId, client);
    await validarArticulosActivos(lineas, client);
    const formaPagoId = await validarFormaPago(input.formaPagoId, client);
    const depositoId = await resolverDeposito(input.depositoEntregaId, client);

    const { subtotal, total } = calcularTotales(lineas, input.descuento, input.gastosEnvio);

    await repo.updateCabecera(
      id,
      {
        proveedorId: input.proveedorId,
        formaPagoId,
        depositoId,
        fechaEntrega: input.fechaEntrega ?? null,
        notas: input.notas ?? null,
        subtotal,
        descuento: input.descuento,
        gastosEnvio: input.gastosEnvio,
        total,
      },
      client,
    );
    await repo.reemplazarDetalles(id, lineas, client);

    return leerEnTransaccion(id, client);
  });
}

/** Pendiente → Enviada. La orden se manda al proveedor. */
export async function enviar(id: number, usuarioId: number): Promise<OrdenCompraApi> {
  return cambiarEstado(id, "enviada", usuarioId);
}

/**
 * Cancelación.
 *
 * No es un DELETE: la orden queda con estado Cancelada y conserva su historial
 * (es lo que pide el criterio de auditoría, y además el número emitido no se
 * reutiliza). No se puede cancelar desde un estado final.
 */
export async function cancelar(id: number, usuarioId: number): Promise<OrdenCompraApi> {
  return cambiarEstado(id, "cancelada", usuarioId);
}

async function cambiarEstado(
  id: number,
  destino: string,
  usuarioId: number,
): Promise<OrdenCompraApi> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const actual = await repo.findById(id, client);
    if (!actual) throw new NotFoundError("la orden de compra", id);

    // Idempotente: pedir el estado que ya tiene no es un error.
    if (actual.estado_nombre === destino) return leerEnTransaccion(id, client);

    if (!puedeTransicionar(actual.estado_nombre, actual.es_final, destino)) {
      throw new BusinessRuleError(
        "TRANSICION_INVALIDA",
        `No se puede pasar una orden ${actual.estado_nombre} a ${destino}.`,
      );
    }

    const estado = await repo.findEstadoByNombre(destino, client);
    if (!estado) {
      throw new Error(
        `El catálogo estado_orden_compra no tiene '${destino}'. Correr db/seeds/01_catalogos.sql.`,
      );
    }

    // El UPDATE dispara tg_auditar_orden_compra, que guarda la fila anterior y
    // la nueva en jsonb: eso cubre "registra en bitácora cada modificación de
    // estado y cancelación".
    await repo.setEstado(id, estado.id, client);

    return leerEnTransaccion(id, client);
  });
}

// ---------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------

/**
 * Lee la orden con el MISMO client de la transacción.
 *
 * Desde otra conexión del pool las filas recién insertadas no se ven hasta el
 * COMMIT: la respuesta saldría sin detalles o directamente 404.
 */
async function leerEnTransaccion(id: number, client: PoolClient): Promise<OrdenCompraApi> {
  const row = await repo.findById(id, client);
  if (!row) throw new NotFoundError("la orden de compra", id);
  return mapper.toApi(row, await repo.findDetalles([id], client));
}

function normalizarLineas(input: CrearOrdenInput): LineaOrden[] {
  return input.lineas.map((l) => ({
    articuloId: l.articuloId,
    cantidad: l.cantidad,
    precioAcordado: l.precioAcordado,
  }));
}

/**
 * Criterio HU-PROV-01: "un proveedor inactivo no puede seleccionarse en nuevas
 * órdenes de compra, pero conserva su historial". El front ya filtra el select,
 * pero la API es alcanzable sin pasar por el front.
 */
async function validarProveedorActivo(proveedorId: number, client: PoolClient): Promise<void> {
  const proveedor = await repo.findProveedor(proveedorId, client);
  if (!proveedor) throw new NotFoundError("el proveedor", proveedorId);

  if (proveedor.estado !== "activo") {
    throw new BusinessRuleError(
      "PROVEEDOR_INACTIVO",
      `El proveedor ${proveedor.razon_social} está inactivo: no se le pueden emitir órdenes nuevas.`,
      "proveedorId",
    );
  }
}

/** Criterio HU-STK-01: un artículo inactivo no es seleccionable en órdenes. */
async function validarArticulosActivos(
  lineas: LineaOrden[],
  client: PoolClient,
): Promise<void> {
  const ids = lineas.map((l) => l.articuloId);
  const encontrados = await repo.findArticulosParaOrden(ids, client);

  const porId = new Map(encontrados.map((a) => [a.id, a]));

  for (const id of ids) {
    const articulo = porId.get(id);
    if (!articulo) throw new NotFoundError("el artículo", id);

    if (articulo.estado !== "activo") {
      throw new BusinessRuleError(
        "ARTICULO_INACTIVO",
        `El artículo "${articulo.nombre}" está inactivo: no se puede incluir en una orden.`,
        "lineas",
      );
    }
  }
}

/**
 * Valida que la condición de pago exista en el catálogo.
 *
 * Se exporta porque la cotización tiene exactamente el mismo campo: una sola
 * implementación para las dos puntas.
 *
 * La FK de la base ya rechazaría un id inexistente, pero devolvería un 23503
 * traducido a "se referencia un registro que no existe", que no le dice nada al
 * usuario. Acá el mensaje nombra el campo.
 */
export async function validarFormaPago(
  formaPagoId: number,
  client: PoolClient,
): Promise<number> {
  const forma = await repo.findFormaPagoById(formaPagoId, client);
  if (!forma) {
    throw new ValidationError(
      "CONDICION_PAGO_INVALIDA",
      `La condición de pago ${formaPagoId} no está en el catálogo. Pedí las válidas a GET /api/condiciones-pago.`,
      "formaPagoId",
    );
  }
  return forma.id;
}

async function resolverDeposito(
  depositoId: number | undefined,
  client: PoolClient,
): Promise<number | null> {
  if (depositoId === undefined) return null;

  if (!(await repo.existeDeposito(depositoId, client))) {
    throw new NotFoundError("el depósito de entrega", depositoId);
  }
  return depositoId;
}
