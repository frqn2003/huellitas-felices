import type {
  ComprobantePendiente,
  CuentaCorriente,
  EstadoCtaCte,
  ImputacionPago,
  Pago,
} from "@/data/cuentas-corrientes";
import type {
  ComprobanteCtaCteRow,
  EstadoCuentaDb,
  ImputacionRow,
  PagoCtaCteRow,
  ResumenCtaCteRow,
} from "./ctacte.types";

/**
 * HU-FIN-02 — traduce filas de la base al contrato que consume la pantalla.
 *
 * Tres cosas y ninguna es lógica de negocio:
 *  1. los nombres de la base → el shape que espera el componente
 *  2. `numeric` → `number`. El driver `pg` los entrega como STRING para no
 *     perder precisión; si se pasaran tal cual, `saldoActual < 0` compararía
 *     strings y "-1500" < 0 daría false.
 *  3. los estados de la vista → los del front
 *
 * ⚠️ DEUDA CONOCIDA, NO ES UN DESCUIDO: `src/data/cuentas-corrientes.ts` mezcla
 *    camelCase (`saldoPendiente`, `fechaVencimiento`) con snake_case
 *    (`numero_comprobante`, `forma_pago_id`) en el mismo módulo. El mapper emite
 *    EXACTAMENTE esas formas para no tener que tocar tres componentes por una
 *    cuestión de estilo. El body del POST sí va todo en camelCase.
 */

function aNumero(valor: string | number): number {
  return typeof valor === "number" ? valor : Number(valor);
}

/**
 * El vocabulario de la vista → el del front.
 *
 * La traducción vive acá y no en la vista porque la base habla en minúscula con
 * guión bajo (es el estilo de todos sus enums) y el front habla en PascalCase.
 * Lo que NO se hace acá es *decidir* el estado: eso lo calcula la vista, que es
 * la única que ve el saldo y la fecha al mismo tiempo.
 */
const ESTADOS: Record<EstadoCuentaDb, EstadoCtaCte> = {
  credito: "Credito",
  saldado: "Saldado",
  vencido: "Vencido",
  por_vencer: "ProximoAVencer",
  pendiente: "Pendiente",
};

function aEstado(valor: EstadoCuentaDb): EstadoCtaCte {
  // El `??` cubre el caso de que alguien agregue un estado a la vista y se
  // olvide de este mapa: mejor mostrar "Pendiente" que romper la pantalla.
  return ESTADOS[valor] ?? "Pendiente";
}

export function resumenToApi(row: ResumenCtaCteRow): CuentaCorriente {
  return {
    id: row.proveedor_id,
    // Fijo: el lado cliente no existe en la base (no hay tabla `cliente` ni
    // `cliente_id` en `pago`, y `tipo_pago` tiene un solo valor). Se mantiene el
    // campo para no tocar los componentes que lo usan para el copy.
    tipo: "proveedor",
    nombre: row.razon_social,
    documento: row.cuit,
    saldoActual: aNumero(row.saldo_actual),
    estadoCta: aEstado(row.estado_vencimiento),
    proximoVencimiento: row.proximo_vencimiento,
    diasProximoVencimiento: row.dias_proximo_vencimiento,
  };
}

export function comprobanteToApi(row: ComprobanteCtaCteRow): ComprobantePendiente {
  return {
    id: row.comprobante_id,
    numero: row.numero_completo,
    tipo: row.tipo_comprobante,
    fechaEmision: row.fecha_emision,
    fechaVencimiento: row.fecha_vencimiento,
    saldoPendiente: aNumero(row.saldo_pendiente),
    estadoCta: aEstado(row.estado_vencimiento),
    // Negativo = ya venció. Lo calcula la vista: el front no vuelve a restar
    // fechas, que era donde el `DIAS_ALERTA_PROXIMO_VENCER = 7` del front
    // duplicaba el '7 days' de la vista.
    diasParaVencer: row.dias_para_vencer,
    montoTotal: Math.abs(aNumero(row.monto_signado)),
    montoPagado: aNumero(row.monto_pagado),
  };
}

export function pagoToApi(row: PagoCtaCteRow, imputaciones: ImputacionRow[]): Pago {
  return {
    id: row.id,
    tipo: "pago_proveedor",
    numero_comprobante: row.numero_comprobante,
    fecha: row.fecha,
    forma_pago_id: row.forma_pago_id,
    formaPagoNombre: row.forma_pago_nombre,
    monto: aNumero(row.monto),
    // El front lo escribe capitalizado; la base usa el enum en minúscula.
    estado: row.estado === "anulado" ? "Anulado" : "Vigente",
    usuarioNombre: row.usuario_nombre,
    imputaciones: imputaciones.map(imputacionToApi),
  };
}

function imputacionToApi(row: ImputacionRow): ImputacionPago {
  return {
    comprobanteId: row.comprobante_proveedor_id,
    numero: row.numero_completo,
    monto: aNumero(row.monto_imputado),
  };
}

/**
 * Arma los pagos con sus imputaciones agrupadas.
 *
 * Recibe TODAS las imputaciones de TODOS los pagos en un array (así las trae el
 * repo, en una consulta) y las reparte acá. Con un Map es una pasada; con
 * `imputaciones.filter(...)` dentro del map sería una pasada por pago.
 */
export function pagosToApi(rows: PagoCtaCteRow[], imputaciones: ImputacionRow[]): Pago[] {
  const porPago = new Map<number, ImputacionRow[]>();

  for (const i of imputaciones) {
    const lista = porPago.get(i.pago_id);
    if (lista) lista.push(i);
    else porPago.set(i.pago_id, [i]);
  }

  return rows.map((p) => pagoToApi(p, porPago.get(p.id) ?? []));
}
