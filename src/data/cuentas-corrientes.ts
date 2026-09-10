// CONECTADO AL BACKEND (HU-FIN-02, 2026-09-09).
//
// Este archivo ya NO tiene datos: quedan los tipos y los formateadores. Los
// datos salen de la API (ver el bloque de abajo).
// Coherente con: vista_cuenta_corriente_proveedor + comprobante_proveedor + pago + pago_imputacion.
// Convención de signo: saldo positivo = adeudado al proveedor; negativo = crédito a favor.

export type EstadoCtaCte =
  | "Saldado"
  | "Pendiente"
  | "ProximoAVencer"
  | "Vencido"
  | "Credito";

export interface ProveedorCtaCte {
  id: number; // PK del back (proveedor.id)
  razonSocial: string;
  cuit: string;
  saldoActual: number; // BACKEND: derivado de vista_cuenta_corriente_proveedor (proveedor NO tiene saldo_actual)
  estadoCta: EstadoCtaCte; // derivado del peor estado de sus comprobantes
  proximoVencimiento: string | null; // ISO date del vencimiento más cercano (null si sin pendientes)
}

export interface ComprobantePendiente {
  id: number; // PK del back (comprobante_proveedor.id)
  numero: string; // formato AFIP: puntoVenta-numero
  tipo: string; // Factura A / Nota de Crédito A, etc.
  fechaVencimiento: string; // comprobante_proveedor.fecha_vencimiento (ISO date)
  saldoPendiente: number; // BACKEND: derivado de vista_cuenta_corriente_proveedor (monto_total - imputaciones vigentes); no es columna
  estadoCta: EstadoCtaCte;
  /**
   * Días hasta el vencimiento. NEGATIVO = ya venció.
   *
   * Lo calcula `vista_cuenta_corriente_proveedor` (corrección 17), en hora
   * argentina. El front NO vuelve a restar fechas: acá es donde el
   * `DIAS_ALERTA_PROXIMO_VENCER = 7` de abajo duplicaba el '7 days' de la vista.
   */
  /** Fecha de emisión del comprobante (la de vencimiento va aparte). */
  fechaEmision: string;
  diasParaVencer: number;
  /** El importe del comprobante, siempre positivo (aun en una Nota de Crédito). */
  montoTotal: number;
  /** Lo ya imputado por pagos vigentes. */
  montoPagado: number;
}

export interface ImputacionPago {
  comprobanteId: number;
  numero: string;
  monto: number; // pago_imputacion.monto_imputado
}

export interface PagoProveedor {
  id: number; // PK del back (pago.id)
  numero_comprobante: string; // nro. de recibo/cheque/comprobante externo del pago; NO autogenerado
  fecha: string; // ISO date
  forma_pago_id: number; // FK → forma_pago.id (catálogo único)
  monto: number;
  imputaciones: ImputacionPago[]; // pago_imputacion
}

// Umbral de alerta "próximo a vencer" = vencimiento dentro de ≤ 7 días (decisión de la HU).
/**
 * Solo para el TEXTO de la leyenda ("próximo a vencer = 7 días").
 *
 * ⚠️ YA NO ES LÓGICA. Quién está vencido y quién por vencer lo decide
 *    `vista_cuenta_corriente_proveedor` (corrección 17), en hora argentina, y
 *    viaja en `estadoCta` y `diasParaVencer`.
 *
 *    Antes este 7 se usaba para calcular el estado en el navegador, duplicando
 *    el '7 days' de la vista — con la diferencia de que el front usaba el reloj
 *    de la máquina del usuario. Si algún día cambia el umbral, se cambia en la
 *    vista y este número queda para actualizar el copy.
 */
export const DIAS_ALERTA_PROXIMO_VENCER = 7;




// ─── Módulo global "Cuentas Corrientes" (HU-FIN-03) ───────────────────────────
// Maneja AMBOS lados: proveedores (pago_proveedor) y clientes (cobranza_cliente).
// Coherente con: vista_cuenta_corriente_proveedor + pago (tipo) + pago_imputacion.
//
// BLOQUEADO-DBA (D5): el lado CLIENTE (tipo "cliente" / cobranza_cliente) está
// pendiente con la DBA: el diccionario no define tabla `cliente` ni `cliente_id`
// en `pago`. Hasta desbloquear, los datos de clientes en este módulo NO se alinean
// con el esquema y solo se muestran como preview de diseño.
//
// Convección de signo por entidad:
//   - proveedor: positivo = adeudado a él (le debés). Negativo = crédito a favor.
//   - cliente:   positivo = el cliente te debe.    Negativo = saldo a favor del cliente.

/**
 * ⚠️ EL LADO CLIENTE NO EXISTE EN LA BASE (decisión D5, y el PO pidió sacar las
 *    ventas del alcance).
 *
 *    No hay tabla `cliente` ni columna `cliente_id` en `pago`, y el enum
 *    `tipo_pago` tiene un único valor. La pantalla ya no ofrece el filtro
 *    Proveedor/Cliente: un filtro que nunca puede devolver nada es peor que no
 *    tenerlo.
 *
 *    El valor se conserva en el tipo, no se borra: varios componentes lo usan
 *    para elegir el copy ("Pagar" vs "Cobrar") y el día que exista el módulo
 *    comercial se destraba desde acá.
 */
export type EntidadCtaCte = "proveedor" | "cliente";
export type TipoPago = "pago_proveedor" | "cobranza_cliente";

// Acá vivían CUENTAS_CORRIENTES_GLOBAL, COMPROBANTES_GLOBAL y PAGOS_GLOBAL, más
// tres arrays muertos (PROVEEDORES_CTA_CTE, COMPROBANTES_POR_PROVEEDOR,
// PAGOS_POR_PROVEEDOR) que ya no importaba ningún componente.
//
// Los reemplazan tres endpoints reales (HU-FIN-02):
//   GET  /api/cuentas-corrientes                    → CuentaCorriente[]
//   GET  /api/cuentas-corrientes/{proveedorId}      → { cuenta, comprobantes, pagos }
//   POST /api/pagos                                 → devuelve ese mismo detalle
//
// El POST devuelve el detalle completo a propósito: así la pantalla hace un
// setState con la respuesta y el saldo queda actualizado sin un segundo viaje y
// sin recalcular nada en el navegador.

export interface CuentaCorriente {
  id: number; // PK (proveedor.id | cliente.id)
  tipo: EntidadCtaCte; // discrimina la entidad
  nombre: string; // razón social (prov) | nombre apellido (cli)
  documento: string; // cuit | dni
  saldoActual: number; // BACKEND: derivado de vista_cuenta_corriente_proveedor (proveedor NO tiene saldo_actual); signo según entidad
  estadoCta: EstadoCtaCte;
  proximoVencimiento: string | null;
  /**
   * Días hasta `proximoVencimiento`. Negativo = ya venció, null = no debe nada.
   * Lo calcula la vista en hora argentina; el front no resta fechas.
   */
  diasProximoVencimiento?: number | null;
}

export interface Pago {
  id: number; // PK del back (pago.id)
  tipo: TipoPago; // pago_proveedor | cobranza_cliente
  numero_comprobante: string; // nro. de recibo/cheque/comprobante externo del pago; NO autogenerado
  fecha: string; // ISO date
  forma_pago_id: number; // FK → forma_pago.id (catálogo único)
  monto: number;
  imputaciones: ImputacionPago[]; // pago_imputacion (apunta a comprobante de la entidad)
  estado?: "Vigente" | "Anulado"; // estado del comprobante de pago
  anulaPagoId?: number | null; // si está seteado, esta es la anulación de otro pago
  /**
   * Resueltos por el backend con un JOIN.
   *
   * El nombre de la forma de pago se resolvía en el front contra el array
   * FORMAS_PAGO de src/data/formas-pago.ts, que es un placeholder inventado: si
   * un id de la base no coincidía con el del array, la pantalla mostraba la
   * forma de pago equivocada.
   */
  formaPagoNombre?: string;
  usuarioNombre?: string;
}




// ─── Helpers de presentación ─────────────────────────────────────────────────

export function formatARS(monto: number) {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function formatFecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR");
}

/** Info de color/etiqueta de un saldo. Regla de la HU: rojo si ≠ 0 (deuda),
 *  verde si es crédito a favor (negativo), neutral si es 0. */
export function infoSaldo(saldo: number) {
  if (saldo < 0) return { tone: "text-status-success-strong", sign: "−", label: "Crédito a favor" };
  if (saldo > 0) return { tone: "text-destructive", sign: "", label: "Deuda" };
  return { tone: "text-text-secondary", sign: "", label: "Saldado" };
}
