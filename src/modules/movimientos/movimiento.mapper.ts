import type { MovimientoStock, TipoMovimiento } from "@/data/movimientos";
import type { MovimientoStockRow } from "./movimiento.types";

function normalizarTipo(tipo: string): TipoMovimiento {
    const t = tipo.toLowerCase();
    if (t === "ingreso") return "Ingreso";
    if (t === "egreso") return "Egreso";
    if (t === "transferencia") return "Transferencia";
    return "Ajuste";
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
        origen: row.origen_nombre ? { nombre: row.origen_nombre } : null,
        origenEntidadId: row.origen_entidad_id,
        tipo: normalizarTipo(row.tipo),
        cantidad: Number(row.cantidad),
        fechaHora: new Date(row.fecha_hora).toISOString(),
        empleadoId: row.usuario_id,
        empleado: {
            nombre: `${row.usuario_nombre} ${row.usuario_apellido}`.trim(),
        },
        motivo: row.motivo ?? "",
        movimientoVinculadoId: row.movimiento_vinculado_id,
        createdAt: new Date(row.created_at).toISOString(),
    };
}

export function toApiList(rows: MovimientoStockRow[]): MovimientoStock[] {
    return rows.map(toApi);
}
