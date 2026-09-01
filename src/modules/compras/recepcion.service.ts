import type { PoolClient } from "pg";
import type { Recepcion, TipoRecepcion } from "@/data/recepciones";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/http/errors";
import * as movimientoRepo from "@/modules/movimientos/movimiento.repo";
import * as repo from "./recepcion.repo";
import * as mapper from "./recepcion.mapper";
import * as ordenRepo from "./orden.repo";
import type {
  FichaCreada,
  FiltrosRecepcion,
  LineaPendienteApi,
  LineaPendienteRow,
  LineaRecepcionInsert,
  ListadoRecepciones,
  NotificacionGenerada,
  OrdenParaRecepcionRow,
} from "./recepcion.types";
import type { CrearRecepcionInput } from "./recepcion.schema";

/**
 * HU-COMP-03 — reglas de negocio de la Recepción de Mercadería.
 *
 * ACÁ VA: las reglas de los criterios de aceptación, la orquestación de la
 * transacción y la decisión de qué error corresponde.
 *
 * ACÁ NO VA: SQL (es del repo) ni nada de HTTP. En este archivo no aparece
 * `Request`, `Response` ni un status code.
 *
 * LO QUE ESTE SERVICE **NO** HACE, A PROPÓSITO:
 *
 *  · No actualiza `ficha_stock.stock_actual`. Lo hace el trigger
 *    `fn_actualizar_stock_det` al insertar cada detalle del movimiento. Si el
 *    service lo hiciera también, el stock se contaría DOS VECES.
 *
 *  · No escribe en `auditoria`. Lo hace `trg_auditoria_recepcion_mercaderia`.
 *    Lo único que hay que recordar es `withAuditUser()` al abrir la transacción.
 *
 *  · No genera el `numero`. Lo pone `trg_generar_numero_recepcion`.
 *
 *  · No acepta el `tipo_recepcion` del usuario. Lo deriva (D-1).
 */

// ---------------------------------------------------------
// Nombres de estado que este módulo produce
// ---------------------------------------------------------
// Se resuelven contra el catálogo por nombre normalizado (ver
// repo.findEstadoByNombre): el proyecto convive con 'Recibida Parcial' en el
// seed y 'recibida_parcial' en el código de órdenes, y este módulo funciona con
// cualquiera de las dos sin tener que unificar nada primero.
const ESTADO_PARCIAL = "recibida_parcial";
const ESTADO_TOTAL = "recibida_total";

/** El origen del catálogo `origen_movimiento` que corresponde a una recepción. */
const ORIGEN_RECEPCION = "recepcion_compra";

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

/**
 * Página y tamaño de página, saneados.
 *
 * `leerEntero()` deja pasar cualquier entero, incluidos 0 y negativos, y eso
 * llegaría al SQL como `LIMIT -10` (error de Postgres) o `LIMIT 0` (lista vacía
 * sin explicación). El techo de 200 evita que un `?porPagina=999999` traiga el
 * historial entero de un año en una sola respuesta.
 */
function sanearPaginacion(f: FiltrosRecepcion): { pagina: number; porPagina: number } {
  const pagina = Math.max(1, Math.trunc(f.pagina ?? 1));
  const porPagina = Math.min(200, Math.max(1, Math.trunc(f.porPagina ?? 50)));
  return { pagina, porPagina };
}

export async function listar(
  filtros: FiltrosRecepcion = {},
): Promise<ListadoRecepciones<Recepcion>> {
  const { pagina, porPagina } = sanearPaginacion(filtros);

  const rows = await repo.findAll({ ...filtros, pagina, porPagina });
  // Dos consultas para el detalle de N recepciones, no N+1. Ver findDetalles().
  const detalles = await repo.findDetalles(rows.map((r) => r.id));

  return {
    items: mapper.toApiList(rows, detalles),
    total: await repo.contar(filtros),
    pagina,
    porPagina,
  };
}

export async function obtener(id: number): Promise<Recepcion> {
  const row = await repo.findById(id);
  if (!row) throw new NotFoundError("la recepción", id);
  return mapper.toApi(row, await repo.findDetalles([id]));
}

/**
 * Qué falta recibir de una OC. Es lo que arma el formulario de alta.
 *
 * Devuelve SOLO las líneas con pendiente > 0. Eso es lo que hace que la segunda
 * recepción parcial muestre lo que falta y no lo que ya llegó — el caso de uso
 * central de la HU.
 *
 * Una OC ya recibida por completo devuelve una lista vacía, no un error: no
 * poder recibir más no es una falla, es la respuesta correcta a la pregunta.
 */
export async function pendienteDeRecepcion(
  ordenCompraId: number,
): Promise<LineaPendienteApi[]> {
  const orden = await ordenRepo.findById(ordenCompraId);
  if (!orden) throw new NotFoundError("la orden de compra", ordenCompraId);

  const lineas = await repo.findPendientePorLinea(ordenCompraId);
  return lineas.map(mapper.toLineaPendiente).filter((l) => l.cantidadPendiente > 0);
}

// ---------------------------------------------------------
// Escritura — el corazón de la HU
// ---------------------------------------------------------

export type ResultadoRecepcion = {
  recepcion: Recepcion;
  /** Cómo quedó la OC: el nombre del estado tal cual lo guarda el catálogo. */
  estadoOrdenResultante: string;
  movimientoStock: { id: number; numero: string };
  /** Fichas que no existían y se crearon al vuelo (D-2). Dispara el aviso de umbrales. */
  fichasCreadas: FichaCreada[];
  /** Alimenta el toast de alerta por diferencias. */
  notificaciones: NotificacionGenerada[];
};

/**
 * Registra una recepción contra una Orden de Compra.
 *
 * TODO pasa en UNA transacción. Si algo falla después de haber sumado stock,
 * el ROLLBACK lo deshace: no puede quedar una recepción sin movimiento, ni un
 * movimiento sin recepción, ni una OC cerrada sin lo que la cerró.
 */
export async function registrar(
  input: CrearRecepcionInput,
  usuarioId: number,
): Promise<ResultadoRecepcion> {
  return withTransaction(async (client) => {
    // Primero de todo: sin esto el trigger de auditoría guarda usuario_id NULL,
    // y una bitácora sin responsable no sirve para auditar.
    await withAuditUser(client, usuarioId);

    // -----------------------------------------------------
    // 1. Bloquear la OC
    // -----------------------------------------------------
    // Es lo PRIMERO. Todo lo que viene después decide en base a "cuánto falta",
    // y esa pregunta solo tiene una respuesta estable con la orden bloqueada.
    const orden = await repo.lockOrden(input.ordenCompraId, client);
    if (!orden) throw new NotFoundError("la orden de compra", input.ordenCompraId);

    // -----------------------------------------------------
    // 2. Validar la OC y el depósito
    // -----------------------------------------------------
    // Solo `es_final`, y no la tabla de transiciones de puedeTransicionar():
    // esa máquina no admite pendiente → recibida_parcial, pero el criterio del
    // doc (§8.2) es explícito en que se puede recibir contra CUALQUIER orden no
    // final —Pendiente, Enviada o Recibida Parcial—. Un proveedor que entrega
    // antes de que alguien marque la orden como "enviada" es lo normal, no un
    // error que haya que frenar en el depósito.
    if (orden.es_final) {
      throw new BusinessRuleError(
        "OC_ESTADO_FINAL",
        `La orden ${orden.cod_ord} ya está cerrada (${orden.estado_nombre}), no admite recepciones.`,
        "ordenCompraId",
      );
    }

    if (!(await ordenRepo.existeDeposito(input.depositoId, client))) {
      throw new NotFoundError("el depósito", input.depositoId);
    }

    // -----------------------------------------------------
    // 3. Traer el pendiente por línea
    // -----------------------------------------------------
    const lineasOrden = await repo.findPendientePorLinea(orden.id, client);
    const pendientePorLinea = new Map(
      lineasOrden.map((l) => [
        l.orden_compra_detalle_id,
        {
          articuloId: l.articulo_id,
          articuloNombre: l.articulo_nombre,
          pendiente: Number(l.cantidad_pedida) - Number(l.cantidad_recibida_acumulada),
        },
      ]),
    );

    // -----------------------------------------------------
    // 4. Validar los items del body contra ese pendiente
    // -----------------------------------------------------
    const lineas = validarItems(input, pendientePorLinea, orden);

    // -----------------------------------------------------
    // 5. Cabecera
    // -----------------------------------------------------
    // `tipo_recepcion` es NOT NULL y el veredicto AUTORITATIVO recién se puede
    // dar en el paso 7, con el detalle ya escrito. Pero acá no se pone un
    // placeholder: se calcula en memoria, que con la OC bloqueada da el mismo
    // resultado, porque nadie más puede estar recibiendo contra esta orden.
    //
    // POR QUÉ IMPORTA: `trg_auditoria_recepcion_mercaderia` es AFTER INSERT y
    // guarda un snapshot de la fila tal como nace. Si naciera siempre 'parcial'
    // y se corrigiera después con un UPDATE, la bitácora diría "parcial" en la
    // entrega que cerró la orden — y la bitácora es un criterio de aceptación
    // de esta HU, no un detalle.
    const tipoEstimado = derivarTipo(lineasOrden, lineas);

    const cabecera = await repo.insertCabecera(
      {
        ordenCompraId: orden.id,
        depositoId: input.depositoId,
        tipoRecepcion: tipoEstimado,
        usuarioId,
        observacionGeneral: input.observacionGeneral ?? null,
      },
      client,
    );

    // -----------------------------------------------------
    // 6. Detalles
    // -----------------------------------------------------
    // `cantidad_solicitada` = el pendiente calculado en el paso 3, NUNCA lo que
    // vino en el body (D-4).
    const detallesInsertados: DetalleInsertado[] = [];
    for (const linea of lineas) {
      // `diferencia` la devuelve la base: es una columna GENERATED, así que ese
      // número es el que quedó guardado — no una resta hecha en JS que podría
      // redondear distinto que numeric(12,2).
      const { id, diferencia } = await repo.insertDetalle(cabecera.id, linea, client);
      detallesInsertados.push({ detalleId: id, linea, diferencia: Number(diferencia) });
    }

    // -----------------------------------------------------
    // 7. Confirmar el tipo contra la base y actualizar el estado de la OC
    // -----------------------------------------------------
    // La pregunta es una sola: ¿queda alguna línea de la orden cuyo acumulado
    // siga siendo menor a lo pedido? Se le pregunta a la BASE, que ya ve los
    // detalles recién insertados: el veredicto lo da la fuente de verdad, no
    // una cuenta hecha en JS sobre un snapshot leído antes de escribir.
    const incompletas = await repo.contarLineasIncompletas(orden.id, client);
    const tipo = incompletas === 0 ? "total" : "parcial";
    const nombreEstado = incompletas === 0 ? ESTADO_TOTAL : ESTADO_PARCIAL;

    // Normalmente coinciden y no hay UPDATE. Solo difieren si alguien escribió
    // detalle desde fuera de la aplicación (SQL Editor), que es el único camino
    // que el lock no cubre. Ahí gana la base y la fila se corrige.
    if (tipo !== tipoEstimado) {
      await repo.setTipoRecepcion(cabecera.id, tipo, client);
    }

    const estado = await repo.findEstadoByNombre(nombreEstado, client);
    if (!estado) {
      // No es culpa del usuario: falta correr db/seeds/01_catalogos.sql. Sale
      // como 500 genérico y el detalle queda en el log del server.
      throw new Error(
        `El catálogo estado_orden_compra no tiene '${nombreEstado}'. Correr db/seeds/01_catalogos.sql.`,
      );
    }

    // Dispara trg_auditoria_orden_compra_estado, que guarda la fila anterior y
    // la nueva: es el "registra en bitácora cada modificación de estado".
    await ordenRepo.setEstado(orden.id, estado.id, client);

    // -----------------------------------------------------
    // 8 y 9. Fichas de stock + movimiento de ingreso
    // -----------------------------------------------------
    const { movimiento, fichasCreadas } = await generarIngresoStock(
      client,
      { recepcionId: cabecera.id, numero: cabecera.numero },
      orden,
      input.depositoId,
      usuarioId,
      lineas,
      pendientePorLinea,
    );

    // -----------------------------------------------------
    // 10. Notificaciones por diferencia
    // -----------------------------------------------------
    const notificaciones = await generarNotificaciones(
      client,
      detallesInsertados,
      orden,
      pendientePorLinea,
    );

    // -----------------------------------------------------
    // 11. Respuesta
    // -----------------------------------------------------
    // Se lee con el MISMO client: desde otra conexión del pool estas filas
    // todavía no existen (falta el COMMIT) y la respuesta saldría en 404.
    const row = await repo.findById(cabecera.id, client);
    if (!row) throw new NotFoundError("la recepción", cabecera.id);

    return {
      recepcion: mapper.toApi(row, await repo.findDetalles([cabecera.id], client)),
      estadoOrdenResultante: estado.nombre,
      movimientoStock: movimiento,
      fichasCreadas,
      notificaciones,
    };
  });
}

// ---------------------------------------------------------
// Validación de los items (paso 4)
// ---------------------------------------------------------

type PendienteLinea = { articuloId: number; articuloNombre: string; pendiente: number };

/** Una línea ya escrita, con la `diferencia` que calculó la base. */
type DetalleInsertado = {
  detalleId: number;
  linea: LineaRecepcionInsert;
  diferencia: number;
};

/**
 * Convierte los items del body en líneas listas para insertar, o lanza.
 *
 * Todo lo de acá necesita el estado de la base, así que no puede vivir en zod:
 * se valida DENTRO del lock, contra el pendiente real.
 */
function validarItems(
  input: CrearRecepcionInput,
  pendientePorLinea: Map<number, PendienteLinea>,
  orden: OrdenParaRecepcionRow,
): LineaRecepcionInsert[] {
  const vistas = new Set<number>();
  const lineas: LineaRecepcionInsert[] = [];

  for (const item of input.items) {
    if (vistas.has(item.ordenCompraDetalleId)) {
      throw new BusinessRuleError(
        "LINEA_DUPLICADA",
        "Hay una línea repetida: cargá la cantidad recibida en una sola fila.",
        "items",
      );
    }
    vistas.add(item.ordenCompraDetalleId);

    const linea = pendientePorLinea.get(item.ordenCompraDetalleId);
    if (!linea) {
      throw new BusinessRuleError(
        "LINEA_AJENA",
        `La línea ${item.ordenCompraDetalleId} no pertenece a la orden ${orden.cod_ord}.`,
        "items",
      );
    }

    // Una línea ya completa no puede volver a recibirse. Se separa del caso
    // general porque el mensaje "solo quedaban 0 pendientes" no explica nada.
    if (linea.pendiente <= 0) {
      throw new BusinessRuleError(
        "SOBRE_RECEPCION",
        `Ya se recibió todo lo pedido de "${linea.articuloNombre}": no quedan unidades pendientes.`,
        "items",
      );
    }

    if (item.cantidadRecibida > linea.pendiente) {
      throw new BusinessRuleError(
        "SOBRE_RECEPCION",
        `Se recibieron ${item.cantidadRecibida} unidades de "${linea.articuloNombre}" pero solo quedaban ${linea.pendiente} pendientes.`,
        "items",
      );
    }

    // La diferencia se calcula contra el PENDIENTE, no contra el total de la OC
    // (D-4): significa "de lo que faltaba, esto no vino".
    const diferencia = linea.pendiente - item.cantidadRecibida;
    const observacion = item.observacion ?? null;

    if (diferencia !== 0 && !observacion) {
      throw new BusinessRuleError(
        "OBSERVACION_REQUERIDA",
        `Indicá el motivo de la diferencia en "${linea.articuloNombre}".`,
        "items",
      );
    }

    if (diferencia === 0 && observacion) {
      throw new BusinessRuleError(
        "OBSERVACION_INVALIDA",
        `"${linea.articuloNombre}" llegó completo: no corresponde cargarle un motivo de diferencia.`,
        "items",
      );
    }

    lineas.push({
      ordenCompraDetalleId: item.ordenCompraDetalleId,
      cantidadSolicitada: linea.pendiente,
      cantidadRecibida: item.cantidadRecibida,
      observacion,
      observacionDetalle: item.observacionDetalle ?? null,
    });
  }

  // Criterio: "se ingresan solo los artículos y cantidades recibidos". Una
  // recepción donde no llegó nada de nada no es una recepción parcial: es una
  // entrega que no ocurrió, y no tiene por qué mover el stock ni cambiar el
  // estado de la orden.
  if (!lineas.some((l) => l.cantidadRecibida > 0)) {
    throw new BusinessRuleError(
      "RECEPCION_VACIA",
      "La recepción no registra ningún artículo recibido.",
      "items",
    );
  }

  return lineas;
}

/**
 * ¿Esta entrega cierra la orden? (D-1)
 *
 * Es la misma pregunta que hace `contarLineasIncompletas()`, resuelta en
 * memoria para poder insertar la cabecera con el valor correcto de entrada.
 *
 * Se compara POR LÍNEA DE OC lo pedido contra el acumulado de TODAS las
 * recepciones —las anteriores más esta—, no solo contra lo que trae este body.
 * Ese es exactamente el motivo por el que el usuario no puede elegir el tipo a
 * mano: el criterio "si es total, todos los artículos tienen diferencia 0" es
 * falso cuando una parcial previa ya completó algunas líneas.
 *
 * Las líneas de la OC que no vinieron en el body cuentan igual: si quedó alguna
 * sin completar, la entrega es parcial aunque todo lo que sí vino haya llegado
 * entero.
 */
function derivarTipo(
  lineasOrden: LineaPendienteRow[],
  lineas: LineaRecepcionInsert[],
): TipoRecepcion {
  const recibidoAhora = new Map<number, number>();
  for (const l of lineas) {
    recibidoAhora.set(l.ordenCompraDetalleId, l.cantidadRecibida);
  }

  const quedaAlgunaCorta = lineasOrden.some((l) => {
    const acumulado =
      Number(l.cantidad_recibida_acumulada) +
      (recibidoAhora.get(l.orden_compra_detalle_id) ?? 0);
    return acumulado < Number(l.cantidad_pedida);
  });

  return quedaAlgunaCorta ? "parcial" : "total";
}

// ---------------------------------------------------------
// Ingreso de stock (pasos 8 y 9)
// ---------------------------------------------------------

/**
 * Genera el movimiento de ingreso por lo efectivamente recibido.
 *
 * Criterio: "Al confirmar, genera automáticamente un movimiento de ingreso de
 * stock (HU-STK-04) por las cantidades recibidas, referenciando la recepción".
 *
 * POR QUÉ ACÁ Y NO EN UN TRIGGER (D-5)
 *   El brief del front y el DBML piden un `AFTER INSERT ON recepcion_mercaderia`
 *   que genere el movimiento. No puede funcionar: en el instante en que se
 *   inserta la cabecera todavía no existe ninguna fila de detalle, así que el
 *   movimiento saldría vacío. Se hace acá, después de los detalles, dentro de la
 *   misma transacción — que además es el patrón que ya usa HU-STK-04.
 *
 * Se reutilizan los repos de Movimientos en vez de escribir el INSERT de nuevo:
 * el día que cambie la forma de registrar un movimiento, cambia en un solo lado.
 */
async function generarIngresoStock(
  client: PoolClient,
  recepcion: { recepcionId: number; numero: string },
  orden: OrdenParaRecepcionRow,
  depositoId: number,
  usuarioId: number,
  lineas: LineaRecepcionInsert[],
  pendientePorLinea: Map<number, PendienteLinea>,
): Promise<{ movimiento: { id: number; numero: string }; fichasCreadas: FichaCreada[] }> {
  // Solo lo que entró de verdad. Una línea recibida en 0 queda registrada en la
  // recepción (con su observación) pero no mueve stock ni justifica crear una
  // ficha: no entró nada al depósito.
  const recibidas = lineas.filter((l) => l.cantidadRecibida > 0);

  // El origen se resuelve por NOMBRE contra el catálogo, nunca por id
  // hardcodeado. Ese bug ya pasó una vez en este proyecto: un `?? 1` dejaba
  // TODA transferencia registrada como recepción de compra (ver el comentario
  // en movimiento.repo.findOrigenByNombre).
  const origenId = await movimientoRepo.findOrigenByNombre(ORIGEN_RECEPCION, client);
  if (!origenId) {
    throw new BusinessRuleError(
      "ORIGEN_NO_CONFIGURADO",
      `Falta el origen "${ORIGEN_RECEPCION}" en el catálogo origen_movimiento.`,
    );
  }

  // Fichas primero: el trigger del stock tira HF002 si la ficha no existe.
  const fichasCreadas: FichaCreada[] = [];
  const cantidadPorFicha = new Map<number, number>();

  for (const linea of recibidas) {
    const info = pendientePorLinea.get(linea.ordenCompraDetalleId)!;
    const ficha = await repo.asegurarFichaStock(info.articuloId, depositoId, client);

    if (ficha.creada) {
      fichasCreadas.push({
        articuloId: info.articuloId,
        articuloNombre: info.articuloNombre,
        depositoId,
      });
    }

    // Se acumula por ficha, no por línea de OC: `uq_mov_det_ficha` prohíbe dos
    // detalles del mismo movimiento contra la misma ficha. Hoy una OC no puede
    // repetir un artículo, pero si alguna vez pudiera, esto lo suma en un solo
    // renglón en vez de reventar contra el único.
    cantidadPorFicha.set(
      ficha.id,
      (cantidadPorFicha.get(ficha.id) ?? 0) + linea.cantidadRecibida,
    );
  }

  // UNA cabecera para toda la recepción, con N detalles. `origen_entidad_id`
  // apunta a `recepcion_mercaderia.id` — a la CABECERA de la recepción, no a su
  // detalle: es el gancho que permite ir del movimiento a la recepción que lo
  // originó. (El COMMENT viejo de la columna decía "detalle" y era incorrecto;
  // lo corrige db/correcciones/14.)
  const movimiento = await movimientoRepo.insertCabecera(
    {
      depositoId,
      tipo: "ingreso",
      origenId,
      origenEntidadId: recepcion.recepcionId,
      usuarioId,
      motivo: `Recepción ${recepcion.numero} contra ${orden.cod_ord}`.slice(0, 255),
    },
    client,
  );

  // Cada INSERT dispara trg_actualizar_stock_det, que es quien SUMA el stock.
  // El service no toca ficha_stock: si lo hiciera, se contaría dos veces.
  for (const [fichaStockId, cantidad] of cantidadPorFicha) {
    await movimientoRepo.insertDetalle(
      { movimientoId: movimiento.id, fichaStockId, cantidad },
      client,
    );
  }

  return { movimiento, fichasCreadas };
}

// ---------------------------------------------------------
// Notificaciones (paso 10)
// ---------------------------------------------------------

/**
 * Una notificación por cada línea con diferencia, dirigida al emisor de la OC.
 *
 * Criterio: "Detecta y registra diferencias entre cantidad solicitada y
 * recibida, notificando al responsable de compras".
 *
 * El destinatario es `orden_compra.usuario_id` (D-3): no existe un rol
 * "responsable de compras" en el modelo, y quien emitió la orden es quien tiene
 * el contexto para reclamarle al proveedor.
 */
async function generarNotificaciones(
  client: PoolClient,
  detalles: DetalleInsertado[],
  orden: OrdenParaRecepcionRow,
  pendientePorLinea: Map<number, PendienteLinea>,
): Promise<NotificacionGenerada[]> {
  const generadas: NotificacionGenerada[] = [];

  for (const { detalleId, linea, diferencia } of detalles) {
    if (diferencia === 0) continue;

    const info = pendientePorLinea.get(linea.ordenCompraDetalleId)!;

    // `mensaje` es varchar(255): el detalle libre que escribió el operario
    // puede ser largo, así que el recorte va sobre el texto final.
    const motivo = linea.observacionDetalle?.trim();
    const mensaje = [
      `Diferencia en ${info.articuloNombre} (${orden.cod_ord}):`,
      `solicitado ${linea.cantidadSolicitada}, recibido ${linea.cantidadRecibida}.`,
      linea.observacion ? `Motivo: ${linea.observacion}.` : "",
      motivo ?? "",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 255);

    await repo.insertNotificacion(
      {
        recepcionDetalleId: detalleId,
        usuarioResponsableId: orden.usuario_id,
        mensaje,
      },
      client,
    );

    generadas.push({ usuarioResponsableId: orden.usuario_id, mensaje });
  }

  return generadas;
}
