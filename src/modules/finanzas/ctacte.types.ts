/**
 * HU-FIN-02 — Cuenta Corriente de Proveedores.
 *
 * QUÉ ES UNA CUENTA CORRIENTE ACÁ
 *   No es una tabla. Es la lectura de `vista_cuenta_corriente_proveedor`, que
 *   devuelve un renglón por comprobante VIGENTE con su saldo y su estado, ya
 *   descontadas las imputaciones de pagos vigentes.
 *
 *   El saldo de un proveedor es `SUM(saldo_pendiente)` — neto, porque las Notas
 *   de Crédito entran con `monto_signado` negativo. Por eso una NC descuenta
 *   sola, sin que nadie tenga que "imputarla".
 *
 * ⚠️ `proveedor.saldo_actual` EXISTE COMO COLUMNA Y ESTÁ MUERTA.
 *    Ningún trigger la mantiene: vale 0 para todos. El brief del front dice
 *    "Deuda Total = proveedor.saldo_actual" y es incorrecto. No leerla.
 *
 * ⚠️ LA VISTA NO ALCANZA PARA EL LISTADO.
 *    Arranca en `comprobante_proveedor`, así que un proveedor SIN comprobantes
 *    no tiene filas y desaparecería del resumen — justo la fila
 *    "Pet Food SA / $0 / Saldado" del wireframe. El listado hace
 *    `proveedor LEFT JOIN vista`.
 *
 * ⚠️ REQUIERE LA CORRECCIÓN 17.
 *    Antes de ella la vista exponía `estado_vencimiento` con 3 valores y sin
 *    mirar el saldo (una factura pagada y vencida figuraba 'vencido'). El
 *    rename a `estado_cuenta` es a propósito: sin la corrección aplicada, la
 *    consulta falla con 42703 y `responses.ts` lo loguea, en vez de pintar mal
 *    los colores en silencio.
 */

/** Los 5 valores de `estado_cuenta` de la vista (corrección 17). */
export type EstadoCuentaDb = "credito" | "saldado" | "vencido" | "por_vencer" | "pendiente";

/** Lo que habla el front (`src/data/cuentas-corrientes.ts`). */
export type EstadoCtaCteApi =
  | "Credito"
  | "Saldado"
  | "Vencido"
  | "ProximoAVencer"
  | "Pendiente";

// ---------------------------------------------------------
// Filas
// ---------------------------------------------------------

/**
 * Un renglón del resumen: un proveedor con su saldo.
 *
 * Los `numeric` y los `count()` llegan como STRING: el driver `pg` no los
 * convierte para no perder precisión. El mapper los pasa a number — si se
 * usaran tal cual, `saldoActual < 0` compararía strings.
 */
export type ResumenCtaCteRow = {
  proveedor_id: number;
  razon_social: string;
  cuit: string;
  saldo_actual: string;
  /**
   * El vencimiento más cercano ENTRE LOS QUE TODAVÍA DEBEN algo.
   * Sin ese filtro saldría la fecha de una factura ya saldada.
   */
  proximo_vencimiento: string | null;
  /** El PEOR estado entre sus comprobantes. Se calcula en SQL, no en el mapper. */
  estado_cuenta: EstadoCuentaDb;
};

/** Un comprobante de la cuenta corriente. */
export type ComprobanteCtaCteRow = {
  comprobante_id: number;
  numero_completo: string;
  tipo_comprobante: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_signado: string;
  monto_pagado: string;
  saldo_pendiente: string;
  /** Negativo = ya venció. El front lo muestra como "vence en N días". */
  dias_para_vencer: number;
  estado_cuenta: EstadoCuentaDb;
};

/** Un pago registrado, con sus imputaciones ya resueltas. */
export type PagoCtaCteRow = {
  id: number;
  numero_comprobante: string;
  fecha: string;
  forma_pago_id: number;
  forma_pago_nombre: string;
  monto: string;
  estado: "vigente" | "anulado";
  usuario_nombre: string;
};

export type ImputacionRow = {
  pago_id: number;
  comprobante_proveedor_id: number;
  numero_completo: string;
  monto_imputado: string;
};

/** La cabecera del detalle. */
export type ProveedorCtaCteRow = {
  id: number;
  razon_social: string;
  cuit: string;
};

// ---------------------------------------------------------
// Filtros
// ---------------------------------------------------------

export type FiltrosCtaCte = {
  /** Busca en razón social y CUIT. */
  busqueda?: string;
  /**
   * Filtra por el estado del proveedor.
   *
   * Se aplica en el `WHERE`, sobre el estado calculado en SQL. Si se derivara
   * en el mapper, el filtro no podría entrar en la consulta y el paginador
   * mentiría: diría "23 resultados" sobre una lista de 18.
   */
  estado?: EstadoCtaCteApi;
  pagina?: number;
  porPagina?: number;
};

export type ListadoCtaCte<T> = {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
};
