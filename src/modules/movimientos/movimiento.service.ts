import type { MovimientoStock } from "@/data/movimientos";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./movimiento.repo";
import * as mapper from "./movimiento.mapper";
import type { AlertaStock, FichaStockRow, FiltrosMovimiento } from "./movimiento.types";
import type { RegistrarMovimientoInput } from "./movimiento.schema";

/**
 * HU-STK-04 — reglas de negocio de Movimientos.
 *
 * LO QUE ESTE SERVICE **NO** HACE, A PROPÓSITO:
 *
 *  · No actualiza `ficha_stock.stock_actual`. Lo hace el trigger
 *    `fn_actualizar_stock_det` al insertar cada detalle. Si el service lo
 *    hiciera también, el stock se contaría DOS VECES.
 *
 *  · No valida que el egreso deje stock negativo. Ese mismo trigger hace el
 *    `UPDATE ... RETURNING` atómico y lanza `HF001`. Validarlo acá significaría
 *    leer un snapshot y decidir en JS: bajo concurrencia daría un veredicto
 *    distinto al de la base, que es la que manda.
 *
 *  · No genera el `numero`. Lo pone `trg_generar_numero_movimiento`.
 */

export async function listar(filtros: FiltrosMovimiento = {}): Promise<MovimientoStock[]> {
    return mapper.toApiList(await repo.findAll(filtros));
}

/**
 * Traduce el `tipo` del contrato de la API (4 valores) al modelo de la base
 * (enum de 2 valores + origen).
 *
 * "Transferencia" y "Ajuste" no son tipos de movimiento: son el MOTIVO. Una
 * transferencia es un egreso más un ingreso; un ajuste es un ingreso o un
 * egreso según el signo.
 */
function tipoBase(
    tipoApi: RegistrarMovimientoInput["tipo"],
    cantidad: number,
): "ingreso" | "egreso" {
    if (tipoApi === "Ingreso") return "ingreso";
    if (tipoApi === "Egreso") return "egreso";
    if (tipoApi === "Transferencia") return "egreso"; // la punta de origen
    return cantidad < 0 ? "egreso" : "ingreso"; // Ajuste: lo define el signo
}

/** Nombre del origen del catálogo que corresponde a cada tipo de la API. */
const ORIGEN_POR_TIPO: Record<RegistrarMovimientoInput["tipo"], string> = {
    Ingreso: "recepcion_compra",
    Egreso: "venta",
    Transferencia: "transferencia",
    Ajuste: "ajuste",
};

export async function registrar(
    input: RegistrarMovimientoInput,
    usuarioId: number,
): Promise<{ movimientos: MovimientoStock[]; alertas: AlertaStock[] }> {
    return withTransaction(async (client) => {
        await withAuditUser(client, usuarioId);

        const esTransferencia = input.tipo === "Transferencia";

        // ---------------------------------------------------------
        // 1. Resolver el origen
        // ---------------------------------------------------------
        // `origen_id` es NOT NULL en la cabecera y el front manda null para
        // Transferencia y Ajuste. Se resuelve por NOMBRE contra el catálogo: el
        // código viejo caía en `?? 1`, que es `recepcion_compra`, y dejaba toda
        // transferencia registrada como una recepción de compra.
        let origenId = input.origenId ?? null;
        if (!origenId) {
            const nombre = ORIGEN_POR_TIPO[input.tipo];
            origenId = await repo.findOrigenByNombre(nombre, client);
            if (!origenId) {
                throw new BusinessRuleError(
                    "ORIGEN_NO_CONFIGURADO",
                    `Falta el origen "${nombre}" en el catálogo origen_movimiento.`,
                );
            }
        }

        // ---------------------------------------------------------
        // 2. Resolver las fichas afectadas
        // ---------------------------------------------------------
        // Criterio: "valida que exista ficha de stock activa para cada artículo
        // en el depósito afectado antes de confirmar; si no existe, rechaza".
        const fichasOrigen = await Promise.all(
            input.items.map(async (item) => {
                const ficha = await repo.findFicha(item.articuloId, input.depositoId, client);
                if (!ficha) {
                    throw new NotFoundError(
                        `una ficha de stock para el artículo ${item.articuloId} en el depósito seleccionado`,
                    );
                }
                return { item, ficha };
            }),
        );

        const fichasDestino: FichaStockRow[] = [];
        if (esTransferencia) {
            for (const { item } of fichasOrigen) {
                const ficha = await repo.findFicha(
                    item.articuloId,
                    input.depositoDestinoId!,
                    client,
                );
                if (!ficha) {
                    throw new NotFoundError(
                        `una ficha de stock para el artículo ${item.articuloId} en el depósito de destino`,
                    );
                }
                fichasDestino.push(ficha);
            }
        }

        // ---------------------------------------------------------
        // 3. Bloquear las fichas, ORDENADAS POR ID
        // ---------------------------------------------------------
        // El orden importa: si dos transacciones bloquean las mismas fichas en
        // orden distinto, cada una espera a la otra para siempre (deadlock).
        // Ordenando siempre igual, la segunda espera a la primera y sigue.
        const idsFichas = [
            ...fichasOrigen.map((f) => f.ficha.id),
            ...fichasDestino.map((f) => f.id),
        ].sort((a, b) => a - b);

        for (const id of idsFichas) {
            await repo.lockFicha(id, client);
        }

        // ---------------------------------------------------------
        // 4. Cabecera(s) + detalle
        // ---------------------------------------------------------
        // UNA cabecera para todos los artículos de la operación (relación
        // cabecera-detalle del criterio). La transferencia lleva DOS, una por
        // depósito, porque `deposito_id` vive en la cabecera.
        const idsCabecera: number[] = [];

        const cabOrigen = await repo.insertCabecera(
            {
                depositoId: input.depositoId,
                tipo: tipoBase(input.tipo, input.items[0].cantidad),
                origenId,
                origenEntidadId: input.origenEntidadId ?? null,
                usuarioId,
                motivo: input.motivo,
                fechaHora: input.fechaHora,
            },
            client,
        );
        idsCabecera.push(cabOrigen.id);

        for (const { item, ficha } of fichasOrigen) {
            // Siempre positiva: el signo lo define el `tipo` de la cabecera.
            await repo.insertDetalle(
                { movimientoId: cabOrigen.id, fichaStockId: ficha.id, cantidad: Math.abs(item.cantidad) },
                client,
            );
        }

        if (esTransferencia) {
            const cabDestino = await repo.insertCabecera(
                {
                    depositoId: input.depositoDestinoId!,
                    tipo: "ingreso",
                    origenId,
                    origenEntidadId: input.origenEntidadId ?? null,
                    usuarioId,
                    motivo: input.motivo ?? "Transferencia entre depósitos",
                    fechaHora: input.fechaHora,
                    movimientoVinculadoId: cabOrigen.id,
                },
                client,
            );
            idsCabecera.push(cabDestino.id);

            for (let i = 0; i < fichasOrigen.length; i++) {
                await repo.insertDetalle(
                    {
                        movimientoId: cabDestino.id,
                        fichaStockId: fichasDestino[i].id,
                        cantidad: Math.abs(fichasOrigen[i].item.cantidad),
                    },
                    client,
                );
            }

            // El enlace de vuelta. Es el único UPDATE que el trigger de
            // inmutabilidad permite sobre una cabecera.
            await repo.setMovimientoVinculado(cabOrigen.id, cabDestino.id, client);
        }

        // ---------------------------------------------------------
        // 5. Alertas de reposición
        // ---------------------------------------------------------
        // Se releen las fichas DESPUÉS de insertar: para ese momento el trigger
        // ya movió el stock, así que el saldo es el real. Calcularlo en JS desde
        // el snapshot previo podía mentir.
        const alertas: AlertaStock[] = [];
        for (const id of idsFichas) {
            const ficha = await repo.findFichaById(id, client);
            if (!ficha) continue;

            const alerta = evaluarAlerta(ficha);
            if (alerta) alertas.push(alerta);
        }

        // Con el client de la transacción: desde el pool, estas filas todavía no
        // existen (falta el COMMIT) y la respuesta saldría vacía.
        //
        // El filtro va por `movimiento_id` (la cabecera), no por `id`: `id` es
        // el del DETALLE y no coincidiría con ninguno de los ids que guardamos.
        const rows = await repo.findAll({}, client);
        const creados = rows.filter((r) => idsCabecera.includes(r.movimiento_id));

        return { movimientos: mapper.toApiList(creados), alertas };
    });
}

/**
 * Criterio: "genera alerta de reposición cuando el stock resultante cruza el
 * umbral mínimo o crítico configurado".
 *
 * Crítico primero: si el stock está por debajo de los dos umbrales, la alerta
 * que importa es la más grave.
 */
function evaluarAlerta(ficha: FichaStockRow): AlertaStock | null {
    const stockActual = Number(ficha.stock_actual);
    const stockMinimo = Number(ficha.stock_minimo);
    const stockCritico = ficha.stock_critico !== null ? Number(ficha.stock_critico) : null;

    const base = {
        articuloId: ficha.articulo_id,
        articuloNombre: ficha.articulo_nombre,
        depositoId: ficha.deposito_id,
        depositoNombre: ficha.deposito_nombre,
        stockActual,
        stockMinimo,
        stockCritico,
    };

    if (stockCritico !== null && stockActual <= stockCritico) {
        return { ...base, nivel: "critico" };
    }
    if (stockActual < stockMinimo) {
        return { ...base, nivel: "bajo" };
    }
    return null;
}
