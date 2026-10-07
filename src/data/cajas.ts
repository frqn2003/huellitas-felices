// Contrato del módulo Cajas (HU-VTA-03): la forma EXACTA que devuelve /api/cajas
// (src/modules/cajas/caja.mapper.ts). Los datos salen de la base.
// Convención: camelCase en el front, id numérico (PK de la base), comentarios // BACKEND: con tabla + endpoint.
// Los nombres de sucursal usan el texto real de la base: "Sucursal Centro", no "Centro".

// Refleja `caja`: id, sucursal_id, nombre, saldo_actual, estado (estado_activo_inactivo).
export interface Caja {
  id: number;
  sucursalId: number;
  sucursal: string;
  nombre: string;
  saldoActual: number;
  estado: "activo" | "inactivo";
}

// El estado es boolean en la base (no hay enum). El texto es SOLO de presentación.
// EstadoCajaBadge recibe el boolean y arma el chip.
export type EstadoAperturaTexto = "Abierta" | "Cerrada";
export const etiquetaEstado = (abierto: boolean): EstadoAperturaTexto =>
  abierto ? "Abierta" : "Cerrada";

// Refleja `caja_apertura`. `diferencia` y `monto_esperado` los calcula el
// trigger: el front los RECIBE, nunca los escribe.
// `sucursalId`, `sucursal`, `cajaNombre` y `cajero` NO están en la tabla: son
// el JOIN con `caja` → `sucursal` y con `usuario` (la apertura solo guarda
// `caja_id` y `usuario_id`).
export interface CajaApertura {
  id: number;
  cajaId: number;
  sucursalId: number;
  sucursal: string;
  cajaNombre: string;
  cajeroId: number;
  cajero: { nombre: string; apellido: string };
  montoInicial: number;
  /** inicial + ingresos − egresos; lo calcula la API (opcional en los datos de prueba). */
  saldoActual?: number;
  fechaApertura: string;          // ISO timestamp → la tabla separa FECHA y HORA
  estado: boolean;                // TRUE = abierta, FALSE = cerrada (columna boolean, no enum)
  montoContado: number | null;    // NULL mientras está abierta
  montoEsperado: number | null;   // NULL mientras está abierta
  diferencia: number | null;      // GENERATED: positivo = sobrante, negativo = faltante
  fechaCierre: string | null;
}

export type TipoMovimientoCaja = "Ingreso" | "Egreso";

export interface MovimientoCaja {
  id: number;
  cajaAperturaId: number;
  tipo: TipoMovimientoCaja;       // enum tipo_movimiento_caja: ingreso | egreso
  monto: number;                  // CHECK monto > 0
  motivo: string;                 // varchar(255) NOT NULL
  ventaId: number | null;         // NULL = carga manual; con valor = ingreso por cobro en efectivo
  usuarioId: number;
  fechaHora: string;
}

// La base es la fuente de verdad del esperado y de la diferencia (trigger de
// cierre). Esta función es SOLO previsualización en vivo antes de cerrar.
// ⚠️ El cálculo tiene que correr sobre TODOS los movimientos de la apertura,
// no sobre la página visible: con `ui/Pagination` (10/25/50) pasar el array
// paginado acá devuelve un esperado malo. Recibir el total del backend o
// calcularlo sobre el dataset completo.
export const esperadoPreview = (a: CajaApertura, movs: MovimientoCaja[]): number =>
  movs.filter((m) => m.cajaAperturaId === a.id && m.tipo === "Ingreso")
      .reduce((acc, m) => acc + m.monto, a.montoInicial)
  - movs.filter((m) => m.cajaAperturaId === a.id && m.tipo === "Egreso")
      .reduce((acc, m) => acc + m.monto, 0);
