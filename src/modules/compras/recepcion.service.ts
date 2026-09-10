import type { Recepcion } from "@/data/recepciones";
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
  LineaRecepcionInsert,
  ListadoRecepciones,
  NotificacionGenerada,
  OrdenParaRecepcionRow,
} from "./recepcion.types";
import type { CrearRecepcionInput } from "./recepcion.schema";

/**
 * HU-COMP-03 — reglas de negocio de la Recepción de Mercadería.
 *
 * ⚠️ REESCRITO (2026-09-08) sobre `movimiento_stock_cab` / `_det`.
 *    La versión anterior escribía en `recepcion_mercaderia*`, dos tablas que no
 *    existen. Ver el encabezado de recepcion.types.ts.
 *
 * LO QUE ESTE SERVICE **NO** HACE, PORQUE LO HACE LA BASE
 *
 *   Al reescribirlo, cinco bloques de código desaparecieron. No se "borraron
 *   por prolijidad": cada uno duplicaba un trigger, y un cálculo duplicado no
 *   es redundancia inofensiva — es dos respuestas que tarde o temprano difieren.
 *
 *   · No suma `ficha_stock.stock_actual`      → fn_actualizar_stock_det
 *   · No mueve `orden_compra.estado_id`       → fn_actualiza_oc_por_recepcion
 *   · No escribe `notificacion_compra`        → fn_notificar_diferencia_compra
 *   · No genera el `numero`                   → fn_generar_numero_movimiento
 *   · No escribe en `auditoria`               → trg_auditoria_movimiento_stock_cab
 *     (lo único que hay que recordar es `withAuditUser()` al abrir la transacción)
 *
 *   Tampoco valida que el artículo pertenezca a la OC ni que la OC no esté
 *   cerrada: eso lo hacen `fn_valida_mov_det_recepcion_compra` y
 *   `fn_valida_mov_recepcion_compra`. El service igual chequea el estado final
 *   antes, para devolver un 409 con un mensaje útil en vez del texto crudo de
 *   un RAISE de Postgres.
 *
 * LO QUE SÍ SIGUE ACÁ
 *
 *   Las reglas que la base NO impone y son criterios de aceptación: que la
 *   recepción no venga vacía, que no se repita una línea, y que no se reciba
 *   más de lo que faltaba. Esa última es la importante — la base tolera la
 *   sobre-recepción y se limita a notificarla.
 */

/** El origen del catálogo `origen_movimiento` que convierte un ingreso en recepción. */
const ORIGEN_RECEPCION = "recepcion_compra";

/** `movimiento_stock_cab.motivo` es varchar(255). */
const MAX_MOTIVO = 255;

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
// Escritura
// ---------------------------------------------------------

export type ResultadoRecepcion = {
  recepcion: Recepcion;
  /** Cómo quedó la OC. Lo movió el trigger; acá solo se lee para el front. */
  estadoOrdenResultante: string;
  /**
   * El movimiento de stock que se generó.
   *
   * Se mantiene en la respuesta aunque ahora sea la recepción misma: el front
   * ya lo muestra ("Movimiento MOV-000123 registrado") y sacarlo obligaría a
   * tocar la pantalla sin ganar nada. `id` y `numero` coinciden con los de
   * `recepcion`.
   */
  movimientoStock: { id: number; numero: string };
  /** Fichas que no existían y se crearon al vuelo (D-2). Dispara el aviso de umbrales. */
  fichasCreadas: FichaCreada[];
  /** Diferencias vivas de la OC, tal como las dejó el trigger. */
  notificaciones: NotificacionGenerada[];
};

/**
 * Registra una recepción contra una Orden de Compra.
 *
 * TODO pasa en UNA transacción. Si algo falla después de haber sumado stock, el
 * ROLLBACK lo deshace: no puede quedar stock sumado sin movimiento que lo
 * explique, ni una OC cerrada sin la entrega que la cerró.
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
    // esa máquina no admite pendiente → recibida_parcial, pero se puede recibir
    // contra CUALQUIER orden no final —Pendiente, Enviada o Recibida Parcial—.
    // Un proveedor que entrega antes de que alguien marque la orden como
    // "enviada" es lo normal, no un error que haya que frenar en el depósito.
    //
    // `fn_valida_mov_recepcion_compra` lo rechazaría igual; esto existe para
    // que el usuario reciba un mensaje con el código de la orden y su estado,
    // en vez del texto crudo de un RAISE.
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
    // 4. Validar los items contra ese pendiente
    // -----------------------------------------------------
    const lineas = validarItems(input, pendientePorLinea, orden);

    // -----------------------------------------------------
    // 5. Fichas de stock
    // -----------------------------------------------------
    // Antes de la cabecera, porque el detalle las necesita. Se crean al vuelo
    // si no existen (D-2): la recepción es la forma natural en que un artículo
    // entra por primera vez a un depósito.
    const fichasCreadas: FichaCreada[] = [];
    const fichaPorLinea = new Map<number, number>();

    for (const linea of lineas) {
      const ficha = await repo.asegurarFichaStock(linea.articuloId, input.depositoId, client);
      fichaPorLinea.set(linea.ordenCompraDetalleId, ficha.id);

      if (ficha.creada) {
        fichasCreadas.push({
          articuloId: linea.articuloId,
          articuloNombre: linea.articuloNombre,
          fichaStockId: ficha.id,
        });
      }
    }

    // -----------------------------------------------------
    // 6. La cabecera del movimiento — o sea, la recepción
    // -----------------------------------------------------
    const origen = await repo.findOrigenRecepcion(client);
    if (!origen) {
      // No es culpa del usuario: falta correr db/seeds/01_catalogos.sql. Sale
      // como 500 genérico y el detalle queda en el log del server.
      throw new Error(
        `El catálogo origen_movimiento no tiene '${ORIGEN_RECEPCION}'. Correr db/seeds/01_catalogos.sql.`,
      );
    }

    const cabecera = await movimientoRepo.insertCabecera(
      {
        depositoId: input.depositoId,
        // NOT NULL y validado por trigger: una recepción siempre suma.
        tipo: "ingreso",
        origenId: origen.id,
        // El gancho con la OC. Sin esto los cuatro triggers de recepción no se
        // activan y el movimiento queda como un ingreso suelto.
        origenEntidadId: orden.id,
        usuarioId,
        motivo: armarMotivo(input, lineas),
      },
      client,
    );

    // -----------------------------------------------------
    // 7. El detalle
    // -----------------------------------------------------
    // Uno por uno y DESPUÉS de la cabecera: `fn_actualizar_stock_det` lee
    // `movimiento_stock_cab.tipo` por `NEW.movimiento_id` para saber si suma o
    // resta. Sin la cabecera no tiene contra qué resolverlo.
    //
    // Las líneas con cantidad 0 no se insertan. "De este artículo no llegó
    // nada" es información válida para el formulario, pero como fila de
    // movimiento sería un movimiento de cero unidades — y `ck_mov_det_cantidad`
    // exige cantidad > 0. Que no haya fila ES el registro de que no llegó.
    for (const linea of lineas) {
      if (linea.cantidadRecibida <= 0) continue;

      await movimientoRepo.insertDetalle(
        {
          movimientoId: cabecera.id,
          fichaStockId: fichaPorLinea.get(linea.ordenCompraDetalleId)!,
          cantidad: linea.cantidadRecibida,
        },
        client,
      );
    }

    // -----------------------------------------------------
    // 8. Leer cómo quedó todo
    // -----------------------------------------------------
    // FIX TEMPORAL: El trigger de BD (fn_actualiza_oc_por_recepcion) tiene un 
    // bug buscando el estado en minúsculas. Actualizamos desde el backend hasta
    // que se aplique la corrección en SQL.
    let quedanPendientes = false;
    for (const [ocdId, lineaPendiente] of pendientePorLinea.entries()) {
      const itemRecibido = lineas.find((l) => l.ordenCompraDetalleId === ocdId);
      const cantRecibida = itemRecibido ? itemRecibido.cantidadRecibida : 0;
      if (lineaPendiente.pendiente - cantRecibida > 0) {
        quedanPendientes = true;
        break;
      }
    }
    const estadoNombreFijo = quedanPendientes ? "Recibida Parcial" : "Recibida Total";
    const estadoCat = await ordenRepo.findEstadoByNombre(estadoNombreFijo, client);
    if (estadoCat) {
      await ordenRepo.setEstado(orden.id, estadoCat.id, client);
    }

    const estadoOrdenResultante =
      (await repo.findEstadoOrden(orden.id, client)) ?? orden.estado_nombre;

    const notificaciones = await repo.findNotificacionesDeOrden(orden.id, client);

    const row = await repo.findById(cabecera.id, client);
    if (!row) throw new NotFoundError("la recepción", cabecera.id);

    return {
      recepcion: mapper.toApi(row, await repo.findDetalles([cabecera.id], client)),
      estadoOrdenResultante,
      movimientoStock: { id: cabecera.id, numero: cabecera.numero },
      fichasCreadas,
      notificaciones,
    };
  });
}

// ---------------------------------------------------------
// Validaciones que la base no hace
// ---------------------------------------------------------

type PendienteLinea = { articuloId: number; articuloNombre: string; pendiente: number };

/**
 * Valida las líneas del body contra el pendiente real de la OC.
 *
 * Corre DENTRO de la transacción y con la orden bloqueada. Hacerlo en el schema
 * de zod sería leer un snapshot y decidir sobre datos que pueden haber cambiado
 * un milisegundo después.
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
        "Hay un artículo repetido en la recepción. Cargá una sola línea por artículo.",
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

    // ⚠️ ESTA VALIDACIÓN NO LA HACE LA BASE.
    //
    // `fn_notificar_diferencia_compra` acepta recibir de más y se limita a
    // dejar una notificación con diferencia positiva. Que la base lo tolere no
    // significa que el negocio lo permita: recibir 60 de una línea de 50 y
    // sumarlo al stock sin que nadie lo autorice es una diferencia que hay que
    // resolver con el proveedor, no absorber en silencio.
    //
    // Si la entrega realmente trajo de más, se recibe lo pactado y el excedente
    // entra por un movimiento de ajuste, que deja constancia de quién lo aceptó.
    if (item.cantidadRecibida > linea.pendiente) {
      throw new BusinessRuleError(
        "SOBRE_RECEPCION",
        `Se intentan recibir ${item.cantidadRecibida} unidades de ${linea.articuloNombre} ` +
          `pero solo quedaban ${linea.pendiente} pendientes.`,
        "items",
      );
    }

    lineas.push({
      ordenCompraDetalleId: item.ordenCompraDetalleId,
      articuloId: linea.articuloId,
      articuloNombre: linea.articuloNombre,
      cantidadRecibida: item.cantidadRecibida,
      cantidadSolicitada: linea.pendiente,
    });
  }

  // Una recepción donde no llegó nada de nada no es una recepción. Se valida
  // acá y no en zod porque el doc le asigna un código propio que el front
  // distingue; un `.refine()` lo devolvería como DATOS_INVALIDOS genérico.
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
 * Arma el `motivo` de la cabecera juntando la observación general con las de cada línea.
 *
 * POR QUÉ SE CONCATENA EN VEZ DE GUARDARSE APARTE
 *   Al unificar la recepción con los movimientos de stock, la observación por
 *   línea se quedó sin columna: `movimiento_stock_det` solo tiene movimiento,
 *   ficha y cantidad. Las opciones eran tirar ese texto o guardarlo donde
 *   entre. Tirarlo sería perder lo que la persona del depósito escribió
 *   —"faltan 15", "2 envases rotos"—, que es exactamente lo que después se le
 *   reclama al proveedor.
 *
 *   Se pierde la atribución por línea (queda el nombre del artículo en el texto,
 *   no un FK). Recuperarla requiere una columna nueva; está anotado como
 *   decisión abierta en docs/backend/HU-COMP-03.md.
 *
 * `motivo` es varchar(255): si se pasa, se corta con "…" en vez de dejar que la
 * base rechace el INSERT entero por un texto largo.
 */
function armarMotivo(input: CrearRecepcionInput, lineas: LineaRecepcionInsert[]): string | null {
  const partes: string[] = [];

  if (input.observacionGeneral) partes.push(input.observacionGeneral);

  for (const item of input.items) {
    if (!item.observacion && !item.observacionDetalle) continue;

    const linea = lineas.find((l) => l.ordenCompraDetalleId === item.ordenCompraDetalleId);
    const nombre = linea?.articuloNombre ?? `línea ${item.ordenCompraDetalleId}`;
    const detalle = [item.observacion, item.observacionDetalle].filter(Boolean).join(": ");

    partes.push(`${nombre} — ${detalle}`);
  }

  if (partes.length === 0) return null;

  const texto = partes.join(" · ");
  return texto.length <= MAX_MOTIVO ? texto : `${texto.slice(0, MAX_MOTIVO - 1)}…`;
}
