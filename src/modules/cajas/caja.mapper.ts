import type { Caja, CajaApertura, MovimientoCaja } from "@/data/cajas";
import type { AperturaRow, CajaRow, CajeroRow, MovimientoRow } from "./caja.types";

/**
 * HU-VTA-03 — filas de Postgres → contrato de src/data/cajas.ts.
 *
 * `numeric` llega como string desde `pg` → number. `diferencia` y
 * `montoEsperado` los calcula la base: acá solo se transportan.
 */

const num = (v: string | null): number | null => (v === null ? null : Number(v));

export function toCaja(r: CajaRow): Caja {
  return {
    id: r.id,
    sucursalId: r.sucursal_id,
    sucursal: r.sucursal,
    nombre: r.nombre,
    saldoActual: Number(r.saldo_actual),
    estado: r.estado,
  };
}

export function toApertura(r: AperturaRow): CajaApertura {
  return {
    id: r.id,
    cajaId: r.caja_id,
    sucursalId: r.sucursal_id,
    sucursal: r.sucursal,
    cajaNombre: r.caja_nombre,
    cajeroId: r.cajero_id,
    cajero: { nombre: r.cajero_nombre, apellido: r.cajero_apellido },
    montoInicial: Number(r.monto_inicial),
    saldoActual: Number(r.saldo_actual),
    fechaApertura: r.fecha_apertura,
    estado: r.estado,
    montoContado: num(r.monto_contado),
    montoEsperado: num(r.monto_esperado),
    diferencia: num(r.diferencia),
    fechaCierre: r.fecha_cierre,
  };
}

export function toMovimiento(r: MovimientoRow): MovimientoCaja {
  return {
    id: r.id,
    cajaAperturaId: r.caja_apertura_id,
    // enum de la base en minúscula → etiqueta del front.
    tipo: r.tipo === "ingreso" ? "Ingreso" : "Egreso",
    monto: Number(r.monto),
    motivo: r.motivo,
    ventaId: r.venta_id,
    usuarioId: r.usuario_id,
    fechaHora: r.fecha_hora,
  };
}

export function toCajero(r: CajeroRow) {
  return { id: r.id, nombre: r.nombre, apellido: r.apellido, sucursalId: r.sucursal_id };
}
