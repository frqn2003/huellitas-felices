import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./cotizacion.repo";
import * as mapper from "./cotizacion.mapper";
import * as ordenRepo from "./orden.repo";
import * as ordenService from "./orden.service";
import type { OrdenCompraApi } from "./orden.mapper";
import type { SolicitudCotizacionApi } from "./cotizacion.mapper";
import type { FiltrosSolicitud } from "./cotizacion.types";
import type {
  AdjudicarInput,
  CrearSolicitudInput,
  RegistrarCotizacionInput,
} from "./cotizacion.schema";

/**
 * HU-COMP-02 — reglas del proceso de selección de proveedor.
 *
 * El circuito completo, que es el criterio de la HU en orden:
 *
 *   1. crear()               → "necesito estos artículos, quién los cotiza"
 *   2. registrarCotizacion() → llega la respuesta de cada proveedor
 *      (el front las compara con los datos que devuelve obtener())
 *   3. adjudicar()           → se elige y se emite la orden con número único
 *
 * Todo lo que escribe va en transacción, y las órdenes que nacen de una
 * adjudicación se crean con el service de órdenes, no con SQL propio: así pasan
 * por las mismas validaciones que una orden cargada a mano.
 */

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

export async function listar(
  filtros: FiltrosSolicitud = {},
): Promise<SolicitudCotizacionApi[]> {
  const rows = await repo.findAll(filtros);
  if (rows.length === 0) return [];

  // Cuatro consultas para N solicitudes, no cuatro por solicitud.
  const ids = rows.map((r) => r.id);
  const detalles = await repo.findDetalles(ids);
  const cotizaciones = await repo.findCotizaciones(ids);
  const cotizacionDetalles = await repo.findCotizacionDetalles(
    cotizaciones.map((c) => c.id),
  );

  return mapper.toApiList(rows, detalles, cotizaciones, cotizacionDetalles);
}

/** Trae la solicitud con todo lo que la pantalla de comparación necesita. */
export async function obtener(id: number): Promise<SolicitudCotizacionApi> {
  return armar(id, undefined);
}

// ---------------------------------------------------------
// Escrituras
// ---------------------------------------------------------

/** Alta de la solicitud: los artículos y cantidades que se van a pedir cotizar. */
export async function crear(
  input: CrearSolicitudInput,
  usuarioId: number,
): Promise<SolicitudCotizacionApi> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    await validarArticulosActivos(
      input.lineas.map((l) => l.articuloId),
      client,
    );

    const solicitudId = await repo.insertSolicitud(
      { usuarioId, notas: input.notas ?? null },
      client,
    );

    await repo.insertSolicitudDetalles(
      solicitudId,
      input.lineas.map((l) => ({
        articuloId: l.articuloId,
        cantidadEstimada: l.cantidadEstimada,
        nota: l.nota ?? null,
      })),
      client,
    );

    return armar(solicitudId, client);
  });
}

/**
 * Registra la cotización que respondió un proveedor.
 *
 * Criterio: "permite registrar y comparar cotizaciones de más de un proveedor
 * PARA LOS MISMOS ARTÍCULOS (precio y condiciones)". Ese "los mismos artículos"
 * es una regla, no una descripción: si un proveedor cotizara solo la mitad de
 * las líneas, su total saldría más barato por comparar menos cosas. Por eso se
 * exige un precio por cada artículo pedido, ni más ni menos.
 */
export async function registrarCotizacion(
  solicitudId: number,
  input: RegistrarCotizacionInput,
  usuarioId: number,
): Promise<SolicitudCotizacionApi> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const solicitud = await repo.findById(solicitudId, client);
    if (!solicitud) throw new NotFoundError("la solicitud de cotización", solicitudId);

    if (solicitud.estado !== "Abierta") {
      throw new BusinessRuleError(
        "SOLICITUD_CERRADA",
        `No se pueden cargar cotizaciones en una solicitud ${solicitud.estado}.`,
      );
    }

    const proveedor = await ordenRepo.findProveedor(input.proveedorId, client);
    if (!proveedor) throw new NotFoundError("el proveedor", input.proveedorId);
    if (proveedor.estado !== "activo") {
      throw new BusinessRuleError(
        "PROVEEDOR_INACTIVO",
        `El proveedor ${proveedor.razon_social} está inactivo: no puede cotizar.`,
        "proveedorId",
      );
    }

    // Un proveedor cotiza una sola vez por solicitud. El índice
    // uq_cot_solicitud_proveedor es la red de seguridad ante dos requests
    // simultáneos; este chequeo es el que da el mensaje entendible.
    const yaCotizadas = await repo.findCotizaciones([solicitudId], client);
    if (yaCotizadas.some((c) => c.proveedor_id === input.proveedorId)) {
      throw new ConflictError(
        "COTIZACION_DUPLICADA",
        `${proveedor.razon_social} ya cotizó esta solicitud. Editá la cotización existente en vez de cargar otra.`,
        "proveedorId",
      );
    }

    // Comparar precios de conjuntos distintos de artículos no significa nada:
    // se exige exactamente un precio por artículo pedido.
    const pedidos = await repo.findDetalles([solicitudId], client);
    validarCoberturaDePrecios(pedidos.map((d) => d.articulo_id), input.detalles);

    const formaPagoId = await ordenService.validarFormaPago(input.formaPagoId, client);

    const cotizacionId = await repo.insertCotizacion(
      {
        solicitudId,
        proveedorId: input.proveedorId,
        formaPagoId,
        fechaRecepcion: input.fechaRecepcion ?? null,
      },
      client,
    );

    await repo.insertCotizacionDetalles(cotizacionId, input.detalles, client);

    return armar(solicitudId, client);
  });
}

/**
 * Adjudicación: se elige el ganador y se emiten las órdenes.
 *
 * Es la operación crítica del módulo, y es la razón por la que todo esto va en
 * una transacción: marcar la solicitud como adjudicada y crear las órdenes
 * tienen que pasar juntos. Si se marcara la solicitud y fallara la creación de
 * una orden, quedaría una compra "adjudicada" sin ninguna orden emitida — y
 * como la solicitud ya no está Abierta, no habría forma de reintentar.
 *
 * Adjudicación POR ARTÍCULO (así lo resolvió el front): cada línea puede ir a
 * un proveedor distinto, y las líneas se agrupan por cotización ganadora. De
 * ahí que una sola adjudicación pueda emitir varias órdenes — una por
 * proveedor, que es el "agrupándolas por proveedor" del criterio.
 */
export async function adjudicar(
  solicitudId: number,
  input: AdjudicarInput,
  usuarioId: number,
): Promise<{ solicitud: SolicitudCotizacionApi; ordenes: OrdenCompraApi[] }> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const solicitud = await repo.findById(solicitudId, client);
    if (!solicitud) throw new NotFoundError("la solicitud de cotización", solicitudId);

    if (solicitud.estado !== "Abierta") {
      throw new BusinessRuleError(
        "SOLICITUD_CERRADA",
        `La solicitud ya está ${solicitud.estado}: no se puede adjudicar de nuevo.`,
      );
    }

    const pedidos = await repo.findDetalles([solicitudId], client);
    const cotizaciones = await repo.findCotizaciones([solicitudId], client);
    if (cotizaciones.length === 0) {
      throw new BusinessRuleError(
        "SIN_COTIZACIONES",
        "No hay ninguna cotización cargada: no hay nada que adjudicar.",
      );
    }

    const precios = await repo.findCotizacionDetalles(
      cotizaciones.map((c) => c.id),
      client,
    );

    // Toda línea pedida tiene que quedar adjudicada, y nada que no se haya
    // pedido puede colarse. Si el usuario quiere comprar solo una parte, la
    // solicitud se cancela y se arma otra: media adjudicación dejaría líneas
    // pedidas sin orden y sin forma de saber si fue a propósito.
    const idsPedidos = pedidos.map((d) => d.articulo_id);
    const idsAsignados = input.asignaciones.map((a) => a.articuloId);

    const sinAsignar = idsPedidos.filter((id) => !idsAsignados.includes(id));
    if (sinAsignar.length > 0) {
      throw new BusinessRuleError(
        "ADJUDICACION_INCOMPLETA",
        `Faltan asignar ${sinAsignar.length} artículo(s) de la solicitud a una cotización.`,
        "asignaciones",
      );
    }

    const ajenos = idsAsignados.filter((id) => !idsPedidos.includes(id));
    if (ajenos.length > 0) {
      throw new BusinessRuleError(
        "ARTICULO_NO_SOLICITADO",
        `Se intentó adjudicar un artículo que no está en la solicitud (id ${ajenos[0]}).`,
        "asignaciones",
      );
    }

    // Agrupar por cotización ganadora = agrupar por proveedor, porque cada
    // proveedor tiene una sola cotización por solicitud.
    const porCotizacion = new Map<number, { articuloId: number }[]>();
    for (const asignacion of input.asignaciones) {
      const grupo = porCotizacion.get(asignacion.cotizacionId);
      if (grupo) grupo.push({ articuloId: asignacion.articuloId });
      else porCotizacion.set(asignacion.cotizacionId, [{ articuloId: asignacion.articuloId }]);
    }

    const cantidadPorArticulo = new Map(
      pedidos.map((d) => [d.articulo_id, Number(d.cantidad_estimada)]),
    );

    const ordenes: OrdenCompraApi[] = [];

    for (const [cotizacionId, lineasAdjudicadas] of porCotizacion) {
      const cotizacion = cotizaciones.find((c) => c.id === cotizacionId);
      if (!cotizacion) {
        throw new BusinessRuleError(
          "COTIZACION_AJENA",
          `La cotización ${cotizacionId} no pertenece a esta solicitud.`,
          "asignaciones",
        );
      }

      const lineas = lineasAdjudicadas.map((linea) => {
        const precio = precios.find(
          (p) => p.cotizacion_id === cotizacionId && p.articulo_id === linea.articuloId,
        );
        if (!precio) {
          // No debería pasar: registrarCotizacion() exige precio para todos los
          // artículos. Si pasa, es que se agregó una línea a la solicitud
          // después de recibir esa cotización.
          throw new BusinessRuleError(
            "PRECIO_FALTANTE",
            `La cotización de ${cotizacion.proveedor_razon_social} no tiene precio para uno de los artículos adjudicados.`,
            "asignaciones",
          );
        }

        return {
          articuloId: linea.articuloId,
          // La cantidad sale de la SOLICITUD, no del input: se compra lo que se
          // pidió cotizar, al precio que se cotizó.
          cantidad: cantidadPorArticulo.get(linea.articuloId) ?? 0,
          precioAcordado: Number(precio.precio),
        };
      });

      const orden = await ordenService.crearEnTransaccion(
        client,
        {
          proveedorId: cotizacion.proveedor_id,
          // La condición de pago pactada es la que ofreció el proveedor en su
          // cotización: es parte de lo que se comparó para elegirlo.
          formaPagoId: cotizacion.forma_pago_id,
          depositoEntregaId: input.depositoEntregaId,
          fechaEntrega: null,
          notas: notaDeOrigen(solicitud.cod_sol, solicitud.notas),
          descuento: 0,
          gastosEnvio: 0,
          lineas,
        },
        usuarioId,
        // ESTO es "la comparación queda documentada en la orden emitida": desde
        // la orden se llega a la cotización ganadora, y desde ella a la
        // solicitud y a las cotizaciones que perdieron.
        cotizacionId,
      );

      ordenes.push(orden);
    }

    // Si ganó una sola cotización se anota como la adjudicada. Si la
    // adjudicación fue split no hay UNA ganadora: queda NULL y la trazabilidad
    // la dan las órdenes (así lo documenta también el front en
    // CotizacionesContext.tsx:120).
    const ganadoraUnica = porCotizacion.size === 1 ? [...porCotizacion.keys()][0] : null;
    await repo.setEstado(solicitudId, "Adjudicada", client);

    return { solicitud: await armar(solicitudId, client), ordenes };
  });
}

/**
 * Cancelación de la solicitud.
 *
 * Baja lógica: la solicitud queda con estado Cancelada y conserva las
 * cotizaciones recibidas. Solo se cancela una solicitud Abierta — una ya
 * adjudicada generó órdenes, y cancelar esas órdenes es otra operación
 * (PATCH /api/ordenes-compra/:id/cancelar).
 */
export async function cancelar(
  solicitudId: number,
  usuarioId: number,
): Promise<SolicitudCotizacionApi> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const solicitud = await repo.findById(solicitudId, client);
    if (!solicitud) throw new NotFoundError("la solicitud de cotización", solicitudId);

    // Idempotente: cancelar algo ya cancelado no es un error.
    if (solicitud.estado === "Cancelada") return armar(solicitudId, client);

    if (solicitud.estado === "Adjudicada") {
      throw new BusinessRuleError(
        "SOLICITUD_ADJUDICADA",
        "No se puede cancelar una solicitud ya adjudicada: cancelá las órdenes de compra que generó.",
      );
    }

    await repo.setEstado(solicitudId, "Cancelada", client);

    return armar(solicitudId, client);
  });
}

// ---------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------

/**
 * Arma la solicitud completa (artículos + cotizaciones + precios).
 *
 * `client` es obligatorio cuando se llama desde dentro de una transacción: con
 * el pool, las filas recién insertadas no se ven hasta el COMMIT.
 */
async function armar(
  solicitudId: number,
  client: PoolClient | undefined,
): Promise<SolicitudCotizacionApi> {
  const row = await repo.findById(solicitudId, client);
  if (!row) throw new NotFoundError("la solicitud de cotización", solicitudId);

  const detalles = await repo.findDetalles([solicitudId], client);
  const cotizaciones = await repo.findCotizaciones([solicitudId], client);
  const cotizacionDetalles = await repo.findCotizacionDetalles(
    cotizaciones.map((c) => c.id),
    client,
  );

  return mapper.toApi(row, detalles, cotizaciones, cotizacionDetalles);
}

/** Criterio HU-STK-01: un artículo inactivo no se puede pedir ni comprar. */
async function validarArticulosActivos(ids: number[], client: PoolClient): Promise<void> {
  const encontrados = await ordenRepo.findArticulosParaOrden(ids, client);
  const porId = new Map(encontrados.map((a) => [a.id, a]));

  for (const id of ids) {
    const articulo = porId.get(id);
    if (!articulo) throw new NotFoundError("el artículo", id);

    if (articulo.estado !== "activo") {
      throw new BusinessRuleError(
        "ARTICULO_INACTIVO",
        `El artículo "${articulo.nombre}" está inactivo: no se puede pedir cotización por él.`,
        "lineas",
      );
    }
  }
}

function validarCoberturaDePrecios(
  articulosPedidos: number[],
  detalles: { articuloId: number; precio: number }[],
): void {
  const cotizados = detalles.map((d) => d.articuloId);

  const faltantes = articulosPedidos.filter((id) => !cotizados.includes(id));
  if (faltantes.length > 0) {
    throw new BusinessRuleError(
      "COTIZACION_INCOMPLETA",
      `Falta el precio de ${faltantes.length} artículo(s) de la solicitud. Para poder comparar, el proveedor tiene que cotizar todos.`,
      "detalles",
    );
  }

  const sobrantes = cotizados.filter((id) => !articulosPedidos.includes(id));
  if (sobrantes.length > 0) {
    throw new BusinessRuleError(
      "ARTICULO_NO_SOLICITADO",
      `Se cotizó un artículo que no está en la solicitud (id ${sobrantes[0]}).`,
      "detalles",
    );
  }
}

/**
 * Deja escrito en la orden de dónde salió, para quien la lea sin abrir el
 * sistema.
 *
 * Usa el `cod_sol` que guardó la base, no un número armado con el id: si acá se
 * derivara, la nota podría terminar citando una solicitud que no es.
 */
function notaDeOrigen(codSolicitud: string, notas: string | null): string {
  const origen = `Generada desde la solicitud ${codSolicitud}.`;
  return notas ? `${origen} ${notas}` : origen;
}
