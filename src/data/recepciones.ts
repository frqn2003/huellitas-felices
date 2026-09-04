// Datos hardcodeados de Recepciones de Mercadería (HU-COMP-03).
// La estructura replica la tabla `recepcion_mercaderia` y `recepcion_mercaderia_detalle` de la BD.

export type TipoRecepcion = "parcial" | "total";

export type ObservacionRecepcion = "faltante" | "danado" | "error";

export type SucursalOpcion = { id: number; nombre: string };

export interface RecepcionDetalle {
  id: number;
  recepcion_id: number;
  orden_compra_detalle_id: number;
  articulo_id: number;
  articuloNombre: string;
  cantidadSolicitada: number; // BACKEND: mapear a cantidad_solicitada (snake_case)
  cantidadRecibida: number; // BACKEND: mapear a cantidad_recibida (snake_case)
  observacion: ObservacionRecepcion | null;
  observacionDetalle: string | null; // BACKEND: mapear a observacion_detalle (snake_case)
}

export interface Recepcion {
  id: number;
  numero: string;
  orden_compra_id: number;
  ordenCompra: {
    numero: string;
    proveedor: { id: number; razonSocial: string };
  };
  sucursal: string;
  deposito_id: number;
  deposito: { id: number; nombre: string };
  tipo_recepcion: TipoRecepcion;
  usuario_id: number;
  usuario: { nombre: string };
  fecha_hora: string;
  observacion_general: string | null;
  _detalles: RecepcionDetalle[];
}

export interface OrdenDisponible {
  id: number;
  numero: string;
  proveedor: { id: number; razonSocial: string };
  estado: string;
  deposito: { id: number; nombre: string };
  articulos: {
    articuloId: number;
    articuloNombre: string;
    cantidad: number;
    ordenCompraDetalleId: number;
  }[];
}

export interface NotificacionCompra {
  id: number;
  recepcionDetalleId: number; // BACKEND: mapear a recepcion_detalle_id (snake_case)
  usuarioResponsableId: number; // BACKEND: mapear a usuario_responsable_id (snake_case)
  usuarioResponsable: { nombre: string };
  mensaje: string;
  fecha_hora: string;
  leida: boolean;
}

// Formateadores

// BACKEND: generar en server-side con secuencia o UUID; front usa REC-XXXX como preview
export function numeroRecepcion(id: number): string {
  return `REC-${String(id).padStart(4, "0")}`;
}

export function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [fecha] = iso.split("T");
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

// BACKEND: reemplazar por GET /api/recepciones
export const recepcionesIniciales: Recepcion[] = [
  {
    id: 1,
    numero: "REC-0001",
    orden_compra_id: 5,
    ordenCompra: {
      numero: "OC-0005",
      proveedor: { id: 1, razonSocial: "Nutrición Animal SRL" },
    },
    sucursal: "Centro",
    deposito_id: 1,
    deposito: { id: 1, nombre: "Depósito Central" },
    tipo_recepcion: "total",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    fecha_hora: "2026-08-20T10:15:00Z",
    observacion_general: null,
    _detalles: [
      {
        id: 1,
        recepcion_id: 1,
        orden_compra_detalle_id: 1,
        articulo_id: 1,
        articuloNombre: "Amoxicilina 500mg",
        cantidadSolicitada: 50,
        cantidadRecibida: 50,
        observacion: null,
        observacionDetalle: null,
      },
      {
        id: 2,
        recepcion_id: 1,
        orden_compra_detalle_id: 2,
        articulo_id: 2,
        articuloNombre: "Jeringa 5ml",
        cantidadSolicitada: 100,
        cantidadRecibida: 100,
        observacion: null,
        observacionDetalle: null,
      },
    ],
  },
  {
    id: 2,
    numero: "REC-0002",
    orden_compra_id: 6,
    ordenCompra: {
      numero: "OC-0006",
      proveedor: { id: 2, razonSocial: "VetInsumos Norte SA" },
    },
    sucursal: "Centro",
    deposito_id: 1,
    deposito: { id: 1, nombre: "Depósito Central" },
    tipo_recepcion: "parcial",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    fecha_hora: "2026-08-22T14:30:00Z",
    observacion_general: "Entrega con demora de 2 horas",
    _detalles: [
      {
        id: 3,
        recepcion_id: 2,
        orden_compra_detalle_id: 3,
        articulo_id: 1,
        articuloNombre: "Amoxicilina 500mg",
        cantidadSolicitada: 50,
        cantidadRecibida: 50,
        observacion: null,
        observacionDetalle: null,
      },
      {
        id: 4,
        recepcion_id: 2,
        orden_compra_detalle_id: 4,
        articulo_id: 2,
        articuloNombre: "Jeringa 5ml",
        cantidadSolicitada: 100,
        cantidadRecibida: 85,
        observacion: "faltante",
        observacionDetalle: "Faltan 15 unidades",
      },
      {
        id: 5,
        recepcion_id: 2,
        orden_compra_detalle_id: 5,
        articulo_id: 3,
        articuloNombre: "Alimento Premium",
        cantidadSolicitada: 20,
        cantidadRecibida: 20,
        observacion: null,
        observacionDetalle: null,
      },
    ],
  },
  {
    id: 3,
    numero: "REC-0003",
    orden_compra_id: 7,
    ordenCompra: {
      numero: "OC-0007",
      proveedor: { id: 3, razonSocial: "Farmavet Distribuidora" },
    },
    sucursal: "Norte",
    deposito_id: 2,
    deposito: { id: 2, nombre: "Sucursal A" },
    tipo_recepcion: "total",
    usuario_id: 5,
    usuario: { nombre: "María García" },
    fecha_hora: "2026-08-25T09:00:00Z",
    observacion_general: null,
    _detalles: [
      {
        id: 6,
        recepcion_id: 3,
        orden_compra_detalle_id: 6,
        articulo_id: 4,
        articuloNombre: "Guantes descartables",
        cantidadSolicitada: 200,
        cantidadRecibida: 200,
        observacion: null,
        observacionDetalle: null,
      },
      {
        id: 7,
        recepcion_id: 3,
        orden_compra_detalle_id: 7,
        articulo_id: 5,
        articuloNombre: "Alcohol gel 500ml",
        cantidadSolicitada: 30,
        cantidadRecibida: 28,
        observacion: "danado",
        observacionDetalle: "2 envases rotos",
      },
    ],
  },
];

// BACKEND: reemplazar por GET /api/ordenes-compra?estado=pendiente,enviada
export const ordenesDisponibles: OrdenDisponible[] = [
  {
    id: 8,
    numero: "OC-0008",
    proveedor: { id: 1, razonSocial: "Nutrición Animal SRL" },
    estado: "Enviada",
    deposito: { id: 1, nombre: "Depósito Central" },
    articulos: [
      {
        articuloId: 1,
        articuloNombre: "Amoxicilina 500mg",
        cantidad: 100,
        ordenCompraDetalleId: 8,
      },
      {
        articuloId: 6,
        articuloNombre: "Spray antiséptico",
        cantidad: 25,
        ordenCompraDetalleId: 9,
      },
    ],
  },
  {
    id: 9,
    numero: "OC-0009",
    proveedor: { id: 2, razonSocial: "VetInsumos Norte SA" },
    estado: "Pendiente",
    deposito: { id: 1, nombre: "Depósito Central" },
    articulos: [
      {
        articuloId: 2,
        articuloNombre: "Jeringa 5ml",
        cantidad: 200,
        ordenCompraDetalleId: 10,
      },
      {
        articuloId: 3,
        articuloNombre: "Alimento Premium",
        cantidad: 50,
        ordenCompraDetalleId: 11,
      },
    ],
  },
];

// BACKEND: reemplazar por GET /api/notificaciones-compra
export const notificacionesIniciales: NotificacionCompra[] = [
  {
    id: 1,
    recepcionDetalleId: 4,
    usuarioResponsableId: 4,
    usuarioResponsable: { nombre: "Roberto Díaz" },
    mensaje:
      "Diferencia en Jeringa 5ml (OC-0006): solicitado 100, recibido 85. Faltante de 15 unidades.",
    fecha_hora: "2026-08-22T14:30:00Z",
    leida: false,
  },
  {
    id: 2,
    recepcionDetalleId: 7,
    usuarioResponsableId: 4,
    usuarioResponsable: { nombre: "Roberto Díaz" },
    mensaje:
      "Diferencia en Alcohol gel 500ml (OC-0007): solicitado 30, recibido 28. 2 envases dañados.",
    fecha_hora: "2026-08-25T09:00:00Z",
    leida: true,
  },
];

// Catálogos
export const TIPOS_RECEPCION: { value: TipoRecepcion; label: string }[] = [
  { value: "total", label: "Completa" },
  { value: "parcial", label: "Parcial" },
];

export const OBSERVACIONES_RECEPCION: {
  value: ObservacionRecepcion;
  label: string;
}[] = [
  { value: "faltante", label: "Faltante" },
  { value: "danado", label: "Dañado" },
  { value: "error", label: "Error" },
];

// BACKEND: reemplazar por GET /api/proveedores
export const PROVEEDORES_RECEPCIONES = [
  { id: 1, nombre: "Nutrición Animal SRL" },
  { id: 2, nombre: "VetInsumos Norte SA" },
  { id: 3, nombre: "Farmavet Distribuidora" },
];

// BACKEND: reemplazar por GET /api/depositos
export const DEPOSITOS = [
  { id: 1, sucursalId: 1, sucursal: "Centro", nombre: "Depósito Central", ubicacion: "Av. Principal 123" },
  { id: 2, sucursalId: 2, sucursal: "Norte", nombre: "Depósito Norte", ubicacion: "Calle Norte 456" },
  { id: 3, sucursalId: 3, sucursal: "Sur", nombre: "Depósito Sur", ubicacion: "Av. Sur 789" },
  { id: 4, sucursalId: 1, sucursal: "Centro", nombre: "Depósito Auxiliar", ubicacion: "Av. Principal 123 - Subsuelo" },
  { id: 5, sucursalId: 3, sucursal: "Sur", nombre: "Depósito Vacunas", ubicacion: "Av. Sur 789 - Ala este" },
];

export const SUCURSALES: SucursalOpcion[] = [
  { id: 1, nombre: "Centro" },
  { id: 2, nombre: "Norte" },
  { id: 3, nombre: "Sur" },
];

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;
