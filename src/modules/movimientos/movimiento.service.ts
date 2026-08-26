import type { MovimientoStock } from "@/data/movimientos";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./movimiento.repo";
import * as mapper from "./movimiento.mapper";
import type {
    AlertaStock,
    FiltrosMovimiento,
} from "./movimiento.types";
import type { RegistrarMovimientoInput } from "./movimiento.schema";

export async function listar(filtros: FiltrosMovimiento = {}): Promise<MovimientoStock[]> {
    const rows = await repo.findAll(filtros);
    return mapper.toApiList(rows);
}

export async function registrar(
    input: RegistrarMovimientoInput,
    usuarioId: number,
): Promise<{ movimientos: MovimientoStock[]; alertas: AlertaStock[] }> {
    return withTransaction(async (client) => {
        await withAuditUser(client, usuarioId);

        const alertas: AlertaStock[] = [];
        const esTransferencia = input.tipo === "Transferencia";

        if (esTransferencia && !input.depositoDestinoId) {
            throw new BusinessRuleError(
                "DESTINO_REQUERIDO",
                "Para una transferencia debes indicar el depósito de destino.",
            );
        }

        if (esTransferencia && input.depositoDestinoId === input.depositoId) {
            throw new BusinessRuleError(
                "DEPOSITOS_IGUALES",
                "El depósito de origen y destino no pueden ser el mismo.",
            );
        }

        // 1. Validar fichas de origen
        const fichasOrigen = await Promise.all(
            input.items.map(async (item) => {
                const ficha = await repo.findFicha(item.articuloId, input.depositoId, client);
                if (!ficha) {
                    throw new NotFoundError(
                        `Ficha de stock para el artículo ID ${item.articuloId} en el depósito seleccionado`,
                    );
                }
                return { item, ficha };
            }),
        );

        // 2. Si es transferencia, validar fichas de destino
        let fichasDestino: { item: (typeof input.items)[0]; ficha: Awaited<ReturnType<typeof repo.findFicha>> }[] = [];
        if (esTransferencia && input.depositoDestinoId) {
            fichasDestino = await Promise.all(
                input.items.map(async (item) => {
                    const ficha = await repo.findFicha(item.articuloId, input.depositoDestinoId!, client);
                    if (!ficha) {
                        throw new NotFoundError(
                            `Ficha de stock en depósito destino para el artículo ID ${item.articuloId}`,
                        );
                    }
                    return { item, ficha };
                }),
            );
        }

        // 3. Bloquear filas (SELECT FOR UPDATE) ordenadas por ID para evitar deadlocks
        const todasLasFichasIds = [
            ...fichasOrigen.map((f) => f.ficha.id),
            ...fichasDestino.map((f) => f.ficha!.id),
        ].sort((a, b) => a - b);

        for (const fId of todasLasFichasIds) {
            await repo.lockFicha(fId, client);
        }

        // 4. Validar stock suficiente para egresos / transferencias
        const esEgreso = input.tipo === "Egreso" || esTransferencia;
        for (const { item, ficha } of fichasOrigen) {
            const stockActual = Number(ficha.stock_actual);
            if (esEgreso && stockActual - item.cantidad < 0) {
                throw new BusinessRuleError(
                    "STOCK_INSUFICIENTE",
                    `Stock insuficiente para "${ficha.articulo_nombre}". Disponible: ${stockActual}, solicitado: ${item.cantidad}.`,
                );
            }
        }

        // 5. Insertar registros
        const idsInsertados: number[] = [];

        for (let i = 0; i < fichasOrigen.length; i++) {
            const { item, ficha } = fichasOrigen[i];
            const tipoReal = input.tipo === "Ingreso" ? "ingreso" : "egreso";

            const idMovOrigen = await repo.insertMovimiento(
                {
                    fichaStockId: ficha.id,
                    origenId: input.origenId ?? null,
                    origenEntidadId: input.origenEntidadId ?? null,
                    tipo: tipoReal,
                    cantidad: item.cantidad,
                    usuarioId,
                    motivo: input.motivo,
                    fechaHora: input.fechaHora,
                },
                client,
            );
            idsInsertados.push(idMovOrigen);

            // Si es transferencia, registrar la contraparte en destino
            if (esTransferencia && fichasDestino[i]?.ficha) {
                const fichaDest = fichasDestino[i].ficha!;
                const idMovDestino = await repo.insertMovimiento(
                    {
                        fichaStockId: fichaDest.id,
                        origenId: input.origenId ?? null,
                        origenEntidadId: input.origenEntidadId ?? null,
                        tipo: "ingreso",
                        cantidad: item.cantidad,
                        usuarioId,
                        motivo: input.motivo ?? `Transferencia desde depósito`,
                        fechaHora: input.fechaHora,
                        movimientoVinculadoId: idMovOrigen,
                    },
                    client,
                );
                await repo.setMovimientoVinculado(idMovOrigen, idMovDestino, client);
                idsInsertados.push(idMovDestino);
            }

            // 6. Evaluar alerta de stock resultante
            const stockResultante = esEgreso
                ? Number(ficha.stock_actual) - item.cantidad
                : Number(ficha.stock_actual) + item.cantidad;

            const stockMin = Number(ficha.stock_minimo);
            const stockCrit = ficha.stock_critico !== null ? Number(ficha.stock_critico) : null;

            if (stockCrit !== null && stockResultante <= stockCrit) {
                alertas.push({
                    articuloId: ficha.articulo_id,
                    articuloNombre: ficha.articulo_nombre,
                    depositoId: ficha.deposito_id,
                    depositoNombre: ficha.deposito_nombre,
                    stockActual: stockResultante,
                    stockMinimo: stockMin,
                    stockCritico: stockCrit,
                    nivel: "critico",
                });
            } else if (stockResultante <= stockMin) {
                alertas.push({
                    articuloId: ficha.articulo_id,
                    articuloNombre: ficha.articulo_nombre,
                    depositoId: ficha.deposito_id,
                    depositoNombre: ficha.deposito_nombre,
                    stockActual: stockResultante,
                    stockMinimo: stockMin,
                    stockCritico: stockCrit,
                    nivel: "bajo",
                });
            }
        }

        const rows = await repo.findAll();
        const creados = rows.filter((r) => idsInsertados.includes(r.id));

        return {
            movimientos: mapper.toApiList(creados),
            alertas,
        };
    });
}
