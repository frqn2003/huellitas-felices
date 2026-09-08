import type { MovimientoStock, TipoMovimiento } from "@/data/movimientos";
import type { MovimientoStockRow } from "./movimiento.types";

/**
 * Reconstruye el tipo que espera el front (4 valores) a partir del modelo de la
 * base (enum de 2 + origen).
 *
 * La versión anterior comparaba `tipo` contra "transferencia" y "ajuste" como
 * si fueran valores del enum. Nunca lo fueron: `tipo_movimiento_stock` tiene dos
 * labels. Esas dos categorías son ORÍGENES, así que hay que mirar el origen.
 */
function normalizarTipo(tipo: string, origenNombre: string): TipoMovimiento {
    const origen = origenNombre.toLowerCase();
    if (origen === "transferencia") return "Transferencia";
    if (origen === "ajuste") return "Ajuste";

    return tipo.toLowerCase() === "ingreso" ? "Ingreso" : "Egreso";
}

export function toApi(row: MovimientoStockRow): MovimientoStock {
    return {
        id: row.id,
        numero: row.numero,
        fichaStockId: row.ficha_stock_id,
        fichaStock: {
            articuloNombre: row.articulo_nombre,
            articuloUnidad: row.articulo_unidad,
            depositoNombre: row.deposito_nombre,
        },
        origenId: row.origen_id,
        origen: { nombre: row.origen_nombre },
        origenEntidadId: row.origen_entidad_id,
        tipo: normalizarTipo(row.tipo, row.origen_nombre),
        cantidad: Number(row.cantidad),
        fechaHora: new Date(row.fecha_hora).toISOString(),
        // Contrato directo (C1): `usuario_id`/`usuario` como en el dict; la
        // vista plana de la API resuelve nombre+apellido en `usuario.nombre`.
        usuario_id: row.usuario_id,
        usuario: {
            nombre: `${row.usuario_nombre} ${row.usuario_apellido}`.trim(),
        },
        motivo: row.motivo ?? "",
        movimientoVinculadoId: row.movimiento_vinculado_id,
    };
}

export function toApiList(rows: MovimientoStockRow[]): MovimientoStock[] {
    return rows.map(toApi);
}
