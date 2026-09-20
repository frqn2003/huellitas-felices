// Contrato de Recepciones de Mercadería (HU-COMP-03).
//
// DESBLOQUEADO (2026-09-08). Antes decía "BLOQUEADO-DBA (D1)" porque estos
// tipos replicaban `recepcion_mercaderia` y `recepcion_mercaderia_detalle`,
// tablas que la base ya no define.
//
// Se resolvió como pidió el Product Owner: **una recepción es un movimiento de
// stock** (`movimiento_stock_cab` con origen `recepcion_compra`, más sus
// `movimiento_stock_det`). El shape de estos tipos casi no cambió —la pantalla
// sigue viendo "una recepción con sus líneas"— pero ahora lo llena la API.
//
// Tres cosas que cambiaron de significado y conviene saber:
//
//  · `numero` ahora es "MOV-000123", no "REC-0001". Lo emite la secuencia de
//    movimientos de stock, que es lo que la recepción es.
//  · `tipo_recepcion` es DERIVADO: el backend responde "¿quedó algo pendiente
//    después de esta entrega?". Ya no es un campo que el usuario elija.
//  · `observacion` / `observacionDetalle` de cada línea llegan SIEMPRE en null:
//    `movimiento_stock_det` no tiene dónde guardarlas. El texto que se carga en
//    el formulario se conserva en `observacion_general` de la cabecera.
//
// Ver docs/backend/HU-COMP-03.md.

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

// Acá había un `numeroRecepcion(id)` que armaba "REC-0004" a partir del id.
// Se eliminó: el número real lo genera un trigger de la base al insertar, viene
// en `Recepcion.numero`, y tiene otro formato. Derivarlo del id mostraba un
// número que no existía en ninguna parte.


export function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [fecha] = iso.split("T");
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}




// Catálogos
//
// Se fueron PROVEEDORES_RECEPCIONES, DEPOSITOS y SUCURSALES: eran listas
// hardcodeadas que la pantalla ahora pide a /api/proveedores y /api/depositos.
// La de sucursales se arma con los depósitos que devuelve la API, así el select
// no puede ofrecer una sucursal sin depósitos donde descargar.
/**
 * Solo para MOSTRAR el tipo en el listado y el filtro.
 *
 * Ya no alimenta ningún select de alta: el tipo lo deriva el backend (D-1). Si
 * el usuario pudiera marcar "Completa" a mano, la orden de compra se cerraría
 * aunque falten artículos.
 */
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




export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;
