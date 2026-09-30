// Catálogo de Lista de Precios vigente (HU-STK-03).
// Los precios son administrados centralmente y se aplican automáticamente en mostrador (HU-VTA-01).
// No son editables por el cajero al momento de la venta.
//
// BACKEND: GET /api/lista-precios?vigente=true
// Cada item tiene un id numérico (PK) y pertenece a las categorías del sistema:
// Medicamentos, Insumos, Alimentos, Accesorios o Servicios/Prácticas.

import type { Categoria } from "@/data/articulos";

export interface ItemListaPrecio {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "Medicamentos" | "Insumos" | "Alimentos" | "Accesorios" | "Servicios";
  unidad: string;
  precioUnitario: number; // Precio final vigente con IVA incluido
  ivaPorcentaje: number; // 21% general, 10.5% diferencial o 0% exento
}

export const LISTA_PRECIOS_PRACTICAS: Record<number, number> = {
  1: 15000, // Consulta médica general
  2: 65000, // Cirugía de mediana/alta complejidad
  3: 12000, // Control post-operatorio / Vacunación
};
export const PRECIO_PRACTICA_DEFAULT = 15000;

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// ---------------------------------------------------------------------------
// HU-STK-03 — Gestión del precio de venta vigente
//
// Cada fila de la pantalla es un artículo con LEFT JOIN sobre `lista_precio`:
// un artículo SIN precio también se lista (badge "Sin precio"), porque si no
// la venta fallaría con HF047 de manera invisible para el administrador.
//
// BACKEND: GET /api/lista-precios → tabla lista_precio LEFT JOIN articulo
//          (+ categoria, unidad_medida, fabricante) y costo de referencia desde
//          GET /api/articulos/:id/ultimo-precio-compra.
// ---------------------------------------------------------------------------

/** Una fila del listado: artículo + su precio vigente (null = sin precio cargado). */
export interface FilaListaPrecio {
  /** PK de `lista_precio`; null = el artículo todavía no tiene precio (HF047). */
  precioId: number | null;
  /** FK → articulo.id. Es la identidad de la fila en pantalla y en el historial. */
  articuloId: number;
  /**
   * `articulo.codigo`, NO una columna de `lista_precio`. Lo genera el trigger
   * `fn_generar_cod_articulo` a partir del PREFIJO DE LA CATEGORÍA, con 6
   * dígitos: MED-000001, INS-000001, ALI-000001, ACC-000001.
   *
   * Los seeds respetan esa regla para que esta pantalla muestre el mismo
   * código que la de Artículos (HU-STK-01/02). Solo hay 4 prefijos porque hay
   * 4 categorías: un "Antiparasitario" es un MED, no un ANT. Cuando la API
   * reemplace los seeds, el código llega de la base y esto deja de aplicar.
   */
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: Categoria;
  /** La tabla `unidad_medida` tiene más valores que el dict viejo del front. */
  unidadMedida: string;
  fabricante: string;
  /** Fecha ISO (YYYY-MM-DD) o null. Solo lectura en el modal. */
  fechaVencimiento: string | null;
  /** Ruta pública de la imagen. Vacío = sin imagen (ArticuloThumb muestra el placeholder). */
  imagenUrl: string;
  /**
   * `articulo.estado` (enum `estado_activo_inactivo`), NO una columna de
   * `lista_precio`. Se muestra acá porque define qué artículos aceptan precio:
   * `fn_abm_lista_precio` rechaza los inactivos (esquema l.40) y los combos
   * deben filtrar por `estado = 'activo'` (esquema l.308).
   */
  estado: "activo" | "inactivo";
  /** numeric(12,2) CHECK >= 0. null = sin fila en `lista_precio`. */
  precio: number | null;
  /** date de `lista_precio.vigencia_desde`; lo reasigna el trigger al cambiar el precio. */
  vigenciaDesde: string | null;
  /**
   * usuario_id de `lista_precio` (FK NOT NULL) y su nombre resuelto por JOIN.
   * En pantalla es SIEMPRE el de la sesión: nunca es un input.
   */
  usuarioId: number | null;
  usuarioNombre: string | null;
  /**
   * `lista_precio.fecha_registro` (esquema l.37): cuándo se INSERTÓ la fila.
   * NO cambia nunca — la base no tiene ningún trigger que lo toque. Sirve para
   * saber desde cuándo existe el precio, no cuándo se lo tocó por última vez.
   */
  fechaRegistro: string | null;
  /**
   * `lista_precio.updated_at` (esquema l.38): cuándo fue el último UPDATE. Lo
   * mantiene `trg_lista_precio_updated_at` en CADA update (l.201), por eso se
   * mueve aunque el importe no cambie. Es el campo que significa "último cambio".
   */
  updatedAt: string | null;
  /**
   * No es columna de `lista_precio`: viene de la última orden de compra.
   * BACKEND: GET /api/articulos/:id/ultimo-precio-compra → { precio } (null = nunca se compró).
   */
  costoRefOc: number | null;
}

/** Una vigencia archivada. Solo lectura desde la app: la escribe el trigger `fn_historial_precios`. */
export interface HistorialPrecio {
  /** PK de `historial_precios`. */
  id: number;
  articuloId: number;
  precio: number;
  /**
   * date YYYY-MM-DD (esquema l.48). Marca el INICIO del período. Ojo: es una
   * `date`, no un timestamp — la hora de la columna "Vigencia desde" de la
   * pantalla sale de `fechaHora`, que es otro campo.
   */
  vigenciaDesde: string;
  /**
   * date YYYY-MM-DD; null = vigencia abierta (vigente) (esquema l.49). La cierra
   * el trigger `fn_historial_precios` con `vigencia_desde - 1 día`, así que es
   * siempre una `date` y nunca lleva hora.
   *
   * NO hay columna `estado` en `historial_precios`, y no hace falta: de este
   * campo se deriva el badge de la columna "Estado" — null = "Vigente",
   * con fecha = "Finalizada". No persistir el estado: ya está en el dato.
   */
  vigenciaHasta: string | null;
  usuarioId: number;
  usuarioNombre: string;
  /** timestamp ISO: fecha_hora del cambio, orden de la pantalla de historial. */
  fechaHora: string;
}

// BACKEND: reemplazar por GET /api/lista-precios. Los precios coinciden con los
// de LISTA_PRECIOS_ARTICULOS (HU-VTA-01): esa lista se deriva de acá, así que
// hay una sola fuente de verdad por precio.
const SEMILLA: Omit<FilaListaPrecio, "updatedAt">[] = [
  // ── Medicamentos ────────────────────────────────────────────────────────────
  {
    precioId: 1,
    articuloId: 1,
    codigo: "MED-000001",
    nombre: "Amoxicilina 500mg suspensión",
    descripcion: "Antibiótico de amplio espectro",
    categoria: "Medicamentos",
    unidadMedida: "Frasco",
    fabricante: "Laboratorios Pharma S.A.",
    fechaVencimiento: "2026-11-13",
    imagenUrl: "",
    estado: "activo",
    precio: 4500,
    vigenciaDesde: "2026-07-01",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-07-01T10:20:00Z",
    costoRefOc: 2600,
  },
  {
    precioId: 2,
    articuloId: 2,
    codigo: "MED-000002",
    nombre: "Meloxicam Gotas 10ml (Antiinflamatorio)",
    descripcion: "Antiinflamatorio y analgésico para perros y gatos",
    categoria: "Medicamentos",
    unidadMedida: "Frasco",
    fabricante: "Vetmed Labs",
    fechaVencimiento: "2027-02-28",
    imagenUrl: "",
    estado: "activo",
    precio: 5200,
    vigenciaDesde: "2026-06-15",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaRegistro: "2026-06-15T09:05:00Z",
    costoRefOc: 3100,
  },
  {
    precioId: 3,
    articuloId: 3,
    codigo: "MED-000003",
    nombre: "Prednisolona 20mg (Corticosteroide)",
    descripcion: "Corticosteroide de uso oral",
    categoria: "Medicamentos",
    unidadMedida: "Blister",
    fabricante: "Laboratorios Pharma S.A.",
    fechaVencimiento: "2026-12-31",
    imagenUrl: "",
    estado: "activo",
    precio: 3800,
    vigenciaDesde: "2026-05-20",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-05-20T16:40:00Z",
    costoRefOc: 2150,
  },
  {
    precioId: 4,
    articuloId: 4,
    codigo: "MED-000004",
    nombre: "Pipeta Antiparasitaria Externa 10-20kg",
    descripcion: "Control de pulgas y garrapatas",
    categoria: "Medicamentos",
    unidadMedida: "Pipeta",
    fabricante: "Vetmed Labs",
    fechaVencimiento: "2027-04-30",
    imagenUrl: "",
    estado: "activo",
    precio: 6800,
    vigenciaDesde: "2026-08-01",
    usuarioId: 5,
    usuarioNombre: "María García",
    fechaRegistro: "2026-08-01T11:15:00Z",
    costoRefOc: 4100,
  },
  {
    precioId: 5,
    articuloId: 5,
    codigo: "MED-000005",
    nombre: "Comprimido Antiparasitario Interno",
    descripcion: "Desparasitante interno en comprimido",
    categoria: "Medicamentos",
    unidadMedida: "Pastilla",
    fabricante: "Laboratorios Pharma S.A.",
    fechaVencimiento: "2026-10-20",
    imagenUrl: "",
    estado: "inactivo",
    precio: 3100,
    vigenciaDesde: "2026-04-10",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaRegistro: "2026-04-10T14:00:00Z",
    costoRefOc: 1750,
  },
  {
    precioId: 6,
    articuloId: 6,
    codigo: "MED-000006",
    nombre: "Vacuna Antirrábica Obligatoria",
    descripcion: "Aplicación anual obligatoria",
    categoria: "Medicamentos",
    unidadMedida: "Dosis",
    fabricante: "Vetmed Labs",
    fechaVencimiento: "2027-01-31",
    imagenUrl: "",
    estado: "activo",
    precio: 5500,
    vigenciaDesde: "2026-01-15",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-01-15T08:30:00Z",
    costoRefOc: 3200,
  },
  {
    precioId: 7,
    articuloId: 7,
    codigo: "MED-000007",
    nombre: "Vacuna Séxtuple Canina (Refuerzo)",
    descripcion: "Refuerzo anual del esquema séxtuple",
    categoria: "Medicamentos",
    unidadMedida: "Dosis",
    fabricante: "Vetmed Labs",
    fechaVencimiento: "2027-03-15",
    imagenUrl: "",
    estado: "activo",
    precio: 8900,
    vigenciaDesde: "2026-08-20",
    usuarioId: 5,
    usuarioNombre: "María García",
    fechaRegistro: "2026-08-20T10:50:00Z",
    costoRefOc: 5400,
  },
  // ── Insumos clínicos ────────────────────────────────────────────────────────
  {
    precioId: 8,
    articuloId: 8,
    codigo: "INS-000001",
    nombre: "Jeringa descartable 5ml c/ aguja",
    descripcion: "Uso único, aguja 21G",
    categoria: "Insumos",
    unidadMedida: "Unidad",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: 950,
    vigenciaDesde: "2026-03-01",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaRegistro: "2026-03-01T09:45:00Z",
    costoRefOc: 520,
  },
  {
    precioId: 9,
    articuloId: 9,
    codigo: "INS-000002",
    nombre: "Gasas hidrófilas estériles (pack x 10)",
    descripcion: "Para curaciones y limpieza de heridas",
    categoria: "Insumos",
    unidadMedida: "Sobre",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: 1200,
    vigenciaDesde: "2026-03-01",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaRegistro: "2026-03-01T09:47:00Z",
    costoRefOc: 680,
  },
  {
    precioId: 10,
    articuloId: 10,
    codigo: "INS-000003",
    nombre: "Suero Fisiológico 500ml c/ guía",
    descripcion: "Solución salina al 0,9%",
    categoria: "Insumos",
    unidadMedida: "Sachet",
    fabricante: "Laboratorios Pharma S.A.",
    fechaVencimiento: "2027-05-31",
    imagenUrl: "",
    estado: "inactivo",
    precio: 4200,
    vigenciaDesde: "2026-02-10",
    usuarioId: 5,
    usuarioNombre: "María García",
    fechaRegistro: "2026-02-10T13:20:00Z",
    costoRefOc: 2450,
  },
  {
    precioId: 11,
    articuloId: 11,
    codigo: "INS-000004",
    nombre: "Curabichera spray cicatrizante",
    descripcion: "Cicatrización tópica de heridas leves",
    categoria: "Insumos",
    unidadMedida: "Aerosol",
    fabricante: "Vetmed Labs",
    fechaVencimiento: "2026-12-01",
    imagenUrl: "",
    estado: "activo",
    precio: 4900,
    vigenciaDesde: "2026-07-10",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-07-10T15:05:00Z",
    costoRefOc: 2800,
  },
  // ── Alimentos ───────────────────────────────────────────────────────────────
  {
    precioId: 12,
    articuloId: 12,
    codigo: "ALI-000001",
    nombre: "Royal Canin Maxi Adult 15kg",
    descripcion: "Alimento balanceado, bolsa 15kg",
    categoria: "Alimentos",
    unidadMedida: "Bolsa",
    fabricante: "Agroalimentos del Sur",
    fechaVencimiento: "2027-06-30",
    imagenUrl: "",
    estado: "activo",
    precio: 48500,
    vigenciaDesde: "2026-09-01",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-09-01T08:45:00Z",
    costoRefOc: 31500,
  },
  {
    precioId: 13,
    articuloId: 13,
    codigo: "ALI-000002",
    nombre: "Purina Pro Plan Gastrointestinal 7.5kg",
    descripcion: "Dieta veterinaria para problemas digestivos",
    categoria: "Alimentos",
    unidadMedida: "Bolsa",
    fabricante: "Agroalimentos del Sur",
    fechaVencimiento: "2027-04-30",
    imagenUrl: "",
    estado: "activo",
    precio: 36200,
    vigenciaDesde: "2026-06-01",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaRegistro: "2026-06-01T12:00:00Z",
    costoRefOc: 23800,
  },
  {
    precioId: 14,
    articuloId: 14,
    codigo: "ALI-000003",
    nombre: "Cat Chow Gatitos Carne y Leche 3kg",
    descripcion: "Alimento para gatitos en crecimiento",
    categoria: "Alimentos",
    unidadMedida: "Bolsa",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: "2027-02-28",
    imagenUrl: "",
    estado: "activo",
    precio: 14200,
    vigenciaDesde: "2026-05-05",
    usuarioId: 5,
    usuarioNombre: "María García",
    fechaRegistro: "2026-05-05T09:30:00Z",
    costoRefOc: 9400,
  },
  // ── Accesorios ──────────────────────────────────────────────────────────────
  {
    precioId: 15,
    articuloId: 15,
    codigo: "ACC-000001",
    nombre: "Collar Isabelino Postquirúrgico Regulable N° 3",
    descripcion: "Recuperación post cirugía",
    categoria: "Accesorios",
    unidadMedida: "Unidad",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: 4200,
    vigenciaDesde: "2026-04-20",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-04-20T10:10:00Z",
    costoRefOc: 2300,
  },
  {
    precioId: 16,
    articuloId: 16,
    codigo: "ACC-000002",
    nombre: "Correa de Paseo Reforzada 1.5m",
    descripcion: "Correa con mango acolchado",
    categoria: "Accesorios",
    unidadMedida: "Unidad",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: 7800,
    vigenciaDesde: "2026-08-12",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaRegistro: "2026-08-12T17:25:00Z",
    costoRefOc: 4600,
  },
  {
    precioId: 17,
    articuloId: 17,
    codigo: "ACC-000003",
    nombre: "Transportadora Rígida N° 2 p/ Felinos y Caninos Chicos",
    descripcion: "Transporte aéreo y terrestre",
    categoria: "Accesorios",
    unidadMedida: "Unidad",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: 24500,
    vigenciaDesde: "2026-07-25",
    usuarioId: 5,
    usuarioNombre: "María García",
    fechaRegistro: "2026-07-25T11:55:00Z",
    costoRefOc: 15900,
  },
  {
    precioId: 18,
    articuloId: 18,
    codigo: "ACC-000004",
    nombre: "Placa Identificatoria Grabada c/ QR de Seguridad",
    descripcion: "Grabado con QR y datos de contacto",
    categoria: "Accesorios",
    unidadMedida: "Unidad",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: 2600,
    vigenciaDesde: "2026-06-18",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaRegistro: "2026-06-18T14:35:00Z",
    costoRefOc: 1150,
  },
  // ── Sin precio cargado (aparecen con badge "Sin precio") ────────────────────
  {
    precioId: null,
    articuloId: 19,
    codigo: "MED-000008",
    nombre: "Cefalexina 500mg cápsulas",
    descripcion: "Antibiótico cephalosporínico de primera generación",
    categoria: "Medicamentos",
    unidadMedida: "Blister",
    fabricante: "Laboratorios Pharma S.A.",
    fechaVencimiento: "2027-03-31",
    imagenUrl: "",
    estado: "activo",
    precio: null,
    vigenciaDesde: null,
    usuarioId: null,
    usuarioNombre: null,
    fechaRegistro: null,
    costoRefOc: 5100,
  },
  {
    precioId: null,
    articuloId: 20,
    codigo: "INS-000005",
    nombre: "Termómetro digital para mascotas",
    descripcion: "Lectura rápida en 10 segundos",
    categoria: "Insumos",
    unidadMedida: "Unidad",
    fabricante: "Vetmed Labs",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: null,
    vigenciaDesde: null,
    usuarioId: null,
    usuarioNombre: null,
    fechaRegistro: null,
    costoRefOc: 3800,
  },
  {
    precioId: null,
    articuloId: 21,
    codigo: "ACC-000005",
    nombre: "Mochila transportera ventilada",
    descripcion: "Transporte cómodo con malla ventilada",
    categoria: "Accesorios",
    unidadMedida: "Unidad",
    fabricante: "Distribuidora Mascotas Felices",
    fechaVencimiento: null,
    imagenUrl: "",
    estado: "activo",
    precio: null,
    vigenciaDesde: null,
    usuarioId: null,
    usuarioNombre: null,
    fechaRegistro: null,
    costoRefOc: null,
  },
];

/**
 * Los seeds no traen `updated_at`: arrancan igual a `fecha_registro` porque a
 * ninguno de esos artículos se lo re-preció después dedbo de cargarlo.
 * `updated_at` es NOT NULL en la base (l.38); acá se deriva para no repetir 20
 * veces el mismo timestamp y para que el seed siga siendo legible.
 */
const FILAS_SEED: FilaListaPrecio[] = SEMILLA.map((f) => ({
  ...f,
  updatedAt: f.fechaRegistro,
}));

// HU-VTA-01 consume esta lista en el mostrador. Se DERIVA de FILAS para que un
// precio tenga una sola fuente de verdad: si cambia acá, cambia en las dos
// pantallas. El orden y los ids son los de siempre (articuloId 1..18).
export const LISTA_PRECIOS_ARTICULOS: ItemListaPrecio[] = FILAS_SEED.filter(
  (f) => f.precio !== null,
).map((f) => ({
  id: f.articuloId,
  codigo: f.codigo,
  nombre: f.nombre,
  categoria: f.categoria,
  unidad: f.unidadMedida,
  precioUnitario: f.precio as number,
  ivaPorcentaje: 21,
}));

// ---------------------------------------------------------------------------
// Historial de precios (solo lectura: lo escribe el trigger `fn_historial_precios`).
// ---------------------------------------------------------------------------

/** Períodos ya cerrados, además de la vigencia actual de cada fila. */
// BACKEND: GET /api/lista-precios/historial?articuloId= → tabla historial_precios.
const HISTORIAL_CERRADO_SEED: HistorialPrecio[] = [
  {
    id: 101,
    articuloId: 12,
    precio: 44900,
    vigenciaDesde: "2026-03-01",
    vigenciaHasta: "2026-08-31",
    usuarioId: 3,
    usuarioNombre: "Carlos López",
    fechaHora: "2026-03-01T09:10:00Z",
  },
  {
    id: 102,
    articuloId: 12,
    precio: 39900,
    vigenciaDesde: "2025-09-01",
    vigenciaHasta: "2026-02-28",
    usuarioId: 1,
    usuarioNombre: "Ana Martínez",
    fechaHora: "2025-09-01T11:00:00Z",
  },
  {
    id: 103,
    articuloId: 1,
    precio: 3900,
    vigenciaDesde: "2025-11-01",
    vigenciaHasta: "2026-06-30",
    usuarioId: 5,
    usuarioNombre: "María García",
    fechaHora: "2025-11-01T15:30:00Z",
  },
];

/** La vigencia abierta de cada fila es, a su vez, una fila del historial. */
function vigenciasVigentes(): HistorialPrecio[] {
  return FILAS_SEED.filter(
    (f) => f.precio !== null && f.precioId !== null && f.vigenciaDesde && f.updatedAt,
  ).map((f) => ({
    id: f.precioId as number,
    articuloId: f.articuloId,
    precio: f.precio as number,
    vigenciaDesde: f.vigenciaDesde as string,
    vigenciaHasta: null,
    usuarioId: f.usuarioId as number,
    usuarioNombre: f.usuarioNombre as string,
    // La fila abierta del historial se escribe cuando el precio entra en
    // vigencia, así que su `fecha_hora` es el `updated_at` (el UPDATE que la
    // creó), NO el `fecha_registro` del INSERT.
    fechaHora: f.updatedAt as string,
  }));
}

// Estado local de la demo: guarda en memoria los cambios hechos en la sesión
// para que la pantalla de historial refleje el alta/edición recién hecha.
// BACKEND: se reemplaza por GET/POST de las rutas de lista_precio; la
// persistencia real la hace la base (fn_abm_lista_precio + triggers).
let filas: FilaListaPrecio[] = FILAS_SEED;
let historial: HistorialPrecio[] = [...vigenciasVigentes(), ...HISTORIAL_CERRADO_SEED];
let proximoPrecioId = 1000;
let proximoHistorialId = 5000;

export function listarListaPrecios(): FilaListaPrecio[] {
  return filas;
}

/** Vigencias de un artículo, ordenadas por fecha_hora DESC. */
export function historialDe(articuloId: number): HistorialPrecio[] {
  return historial
    .filter((h) => h.articuloId === articuloId)
    .sort((a, b) => (a.fechaHora < b.fechaHora ? 1 : a.fechaHora > b.fechaHora ? -1 : 0));
}

/**
 * Alta o edición del precio vigente. Simula lo que hace la base:
 * fn_abm_lista_precio (INSERT o UPDATE in place: UNA fila por artículo) y los
 * triggers de `lista_precio` (esquema l.200-202).
 *
 * La base es la autoridad: sus triggers de vigencia e historial solo actúan
 * "si cambia el precio", así que esta función replica esa condición en vez de
 * archivar un período en cada guardado.
 *
 * No hay campo `motivo`: el esquema de Sprint 4 no define tal columna en
 * `lista_precio` ni en `historial_precios` (ver docs/esquema-bd-front.md §1),
 * así que ni el formulario lo pide ni la función lo recibe.
 */
export function guardarPrecio(params: {
  articuloId: number;
  precio: number;
  usuario: { id: number; nombre: string };
}): FilaListaPrecio[] {
  const ahora = new Date().toISOString();
  const vigenciaDesde = ahora.slice(0, 10);
  const diaAnterior = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const actual = filas.find((f) => f.articuloId === params.articuloId);
  if (!actual) return filas;

  // Los triggers de la base son CONDICIONALES: tanto
  // trg_lista_precio_actualizar_vigencia como trg_historial_precios actúan
  // "si cambia el precio" (esquema l.35, l.53, l.200, l.202). Guardar el mismo
  // importe NO mueve la vigencia ni abre un período nuevo: la base manda.
  const cambioDePrecio = params.precio !== actual.precio;

  const actualizada: FilaListaPrecio = {
    ...actual,
    precioId: actual.precioId ?? proximoPrecioId++,
    precio: params.precio,
    vigenciaDesde: cambioDePrecio ? vigenciaDesde : actual.vigenciaDesde,
    usuarioId: params.usuario.id,
    usuarioNombre: params.usuario.nombre,
    // `fecha_registro` NO se toca: es el INSERT y la base no tiene trigger que
    // lo mueva. Lo que cambia en cada UPDATE es `updated_at`
    // (trg_lista_precio_updated_at, esquema l.201).
    updatedAt: ahora,
  };
  filas = filas.map((f) => (f.articuloId === params.articuloId ? actualizada : f));

  // Sin cambio de precio no hay período nuevo que archivar.
  if (!cambioDePrecio) return filas;

  // Cierra la vigencia abierta (si la hay) y abre la recién creada: a lo sumo
  // una fila con vigencia_hasta = NULL por artículo.
  historial = [
    ...historial.map((h) =>
      h.articuloId === params.articuloId && h.vigenciaHasta === null
        ? { ...h, vigenciaHasta: diaAnterior }
        : h,
    ),
    {
      id: proximoHistorialId++,
      articuloId: params.articuloId,
      precio: params.precio,
      vigenciaDesde,
      vigenciaHasta: null,
      usuarioId: params.usuario.id,
      usuarioNombre: params.usuario.nombre,
      fechaHora: ahora,
    },
  ];
  return filas;
}
