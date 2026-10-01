// Datos placeholder del módulo Cajas (HU-VTA-03).
// Convención: camelCase en el front, id numérico (PK de la base), comentarios // BACKEND: con tabla + endpoint.
// Los nombres de sucursal usan el texto real de la base: "Sucursal Centro", no "Centro".

import { usuarios } from "./usuarios";

// BACKEND: reemplazar por GET /api/sucursales.
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

// `saldo_actual` es un valor VIVO por caja, no histórico: lo escribe la base
// en dos lugares (trg_caja_actualizar_saldo_apertura lo SOBRESCRIBE en cada
// apertura con monto_inicial; trg_caja_actualizar_saldo_movimiento suma/resta
// por movimiento). Nunca se acumula entre jornadas, y el cierre no lo toca.
export const cajas: Caja[] = [
  { id: 1, sucursalId: 1, sucursal: "Sucursal Centro", nombre: "Caja principal", saldoActual: 1600.0, estado: "activo" },
  // Apertura 3: monto_inicial 100000 sin movimientos → 100000, no 0.
  { id: 2, sucursalId: 2, sucursal: "Sucursal Norte", nombre: "Caja principal", saldoActual: 100000.0, estado: "activo" },
];

// Los cajeros NO se declaran como catálogo aparte: se derivan del mismo array
// `usuarios` (import { usuarios } from "./usuarios").
// ⚠️ PENDIENTE: `src/data/usuarios.ts` todavía no tiene usuarios con
// rol_id: 6 → agregarlos ahí (requiere dni, email, estado y fecha_creacion,
// todos NOT NULL en `usuario`) y este filtro toma solo esos.
// BACKEND: reemplazar por GET /api/usuarios?rol_id=6
export const cajeros = usuarios.filter((u) => u.rol_id === 6 && u.estado === "Activo");
// El filtro de SUCURSAL se aplica en el uso (una cajera solo ve su sucursal,
// o el gerente ve todas), no acá: rol y sucursal son ejes distintos.

// Escenario alineado con el demo del esquema (25 y 26/09/2026): la apertura 1
// se cierra con 200 de faltante; la 2 sigue abierta. Divergencia deliberada: el
// demo de `docs/esquema-bd-front.md` usa usuario_id 4 en las aperturas y en los
// movimientos; acá se reemplaza por cajeros con rol_id 6 (ids 5, 6 y 7) porque
// la HU exige que el responsable sea un Cajero. Ver PENDIENTE 5.
export const aperturasIniciales: CajaApertura[] = [
  {
    id: 1,
    cajaId: 1,
    sucursalId: 1,
    sucursal: "Sucursal Centro",
    cajaNombre: "Caja principal",
    cajeroId: 5,
    cajero: { nombre: "Carlos", apellido: "Méndez" },
    montoInicial: 20000.0,
    fechaApertura: "2026-09-25T08:00:00",
    estado: false,                 // cerrada
    montoContado: 27300.0,
    montoEsperado: 27500.0,
    diferencia: -200.0,            // faltante
    fechaCierre: "2026-09-25T18:30:00",
  },
  {
    id: 2,
    cajaId: 1,
    sucursalId: 1,
    sucursal: "Sucursal Centro",
    cajaNombre: "Caja principal",
    cajeroId: 6,
    cajero: { nombre: "Pablo", apellido: "Celaya" },
    montoInicial: 18000.0,
    fechaApertura: "2026-09-26T08:05:00",
    estado: true,                  // abierta
    montoContado: null,
    montoEsperado: null,
    diferencia: null,
    fechaCierre: null,
  },
  {
    id: 3,
    cajaId: 2,
    sucursalId: 2,
    sucursal: "Sucursal Norte",
    cajaNombre: "Caja principal",
    // Distinto de los cajeros 5/6 (sucursal 1): el CA de visibilidad obliga a
    // que el cajero pertenezca a la sucursal de la caja.
    cajeroId: 7,
    cajero: { nombre: "Lucía", apellido: "Ferreyra" },
    montoInicial: 100000.0,
    fechaApertura: "2026-09-26T15:00:00",
    estado: true,                  // abierta
    montoContado: null,
    montoEsperado: null,
    diferencia: null,
    fechaCierre: null,
  },
];

export const movimientosCajaIniciales: MovimientoCaja[] = [
  // Apertura 1 (cerrada): esperado = 20.000 + 10.000 − 2.500 = 27.500; contó 27.300.
  { id: 1, cajaAperturaId: 1, tipo: "Ingreso", monto: 10000.0, motivo: "Cobro venta N° 1 (efectivo)", ventaId: 1, usuarioId: 5, fechaHora: "2026-09-25T12:15:00" },
  { id: 2, cajaAperturaId: 1, tipo: "Egreso", monto: 2500.0, motivo: "Compra de artículos de limpieza", ventaId: null, usuarioId: 5, fechaHora: "2026-09-25T15:40:00" },
  // Apertura 2 (abierta): la tabla NO muestra la apertura como movimiento.
  { id: 3, cajaAperturaId: 2, tipo: "Egreso", monto: 24900.0, motivo: "Devolución a cliente por error de cobro", ventaId: null, usuarioId: 6, fechaHora: "2026-09-26T11:45:00" },
  { id: 4, cajaAperturaId: 2, tipo: "Ingreso", monto: 8500.0, motivo: "Fondo sencillo adicional para vueltos", ventaId: null, usuarioId: 6, fechaHora: "2026-09-26T12:30:00" },
  // Apertura 3 (Sucursal Norte) todavía sin movimientos → estado vacío de tabla.
];

// BACKEND: el trigger es la fuente de verdad del esperado y de la diferencia.
// Esta función es SOLO previsualización en vivo antes de cerrar.
// ⚠️ El cálculo tiene que correr sobre TODOS los movimientos de la apertura,
// no sobre la página visible: con `ui/Pagination` (10/25/50) pasar el array
// paginado acá devuelve un esperado malo. Recibir el total del backend o
// calcularlo sobre el dataset completo.
export const esperadoPreview = (a: CajaApertura, movs: MovimientoCaja[]): number =>
  movs.filter((m) => m.cajaAperturaId === a.id && m.tipo === "Ingreso")
      .reduce((acc, m) => acc + m.monto, a.montoInicial)
  - movs.filter((m) => m.cajaAperturaId === a.id && m.tipo === "Egreso")
      .reduce((acc, m) => acc + m.monto, 0);

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;