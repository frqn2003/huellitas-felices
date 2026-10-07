// Contrato del módulo Proveedores (HU-PROV-01): la forma EXACTA que devuelve
// GET /api/proveedores.
//
// REGLA: un campo entra acá cuando la API lo manda, no cuando nos gustaría que
// lo mandara. Un campo opcional "a futuro" apaga al compilador (leerlo devuelve
// `undefined` para siempre y nadie se entera) — que es justo lo contrario de
// para qué existe este archivo.

// Valor crudo del enum de la BD (C3): el front muestra "Activo"/"Inactivo" en
// tablas y filtros; el dato viaja en minúscula como lo define el dict.
export type EstadoProveedor = "activo" | "inactivo";

// Banderas de demo para simular los estados de la pantalla (ver src/app/proveedores/page.tsx).
export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

export interface Proveedor {
  id: number;
  /** dict: razon_social varchar NOT NULL. */
  razon_social: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto: string;
  /** Nombres de las formas de pago del proveedor (N:M, resuelto por JOIN). */
  formasPago: string[];
  /** dict: plazo_entrega_dias int NOT NULL. */
  plazo_entrega_dias: number;
  estado: EstadoProveedor;
}

// ─────────────────────────────────────────────────────────────────────────────
// SE QUITARON DOS CAMPOS DE ESTA INTERFAZ, y conviene saber por qué:
//
//   forma_pago_id?: number;
//   calificacion?: number;
//
// Los dos estaban declarados como opcionales y el mapper del back NO los emite
// (`calificacion` a propósito: es HU-PROV-02, fuera de alcance). O sea que
// `proveedor.calificacion` valía `undefined` SIEMPRE, y el `?` hacía que
// TypeScript no dijera nada.
//
// El síntoma real: en ProveedorFormModal, al editar un proveedor el campo
// "Calificación" nunca se precargaba. No fallaba, no avisaba, simplemente
// aparecía vacío cada vez.
//
// Cuando la API empiece a mandarlos, se agregan acá SIN el `?` y el compilador
// marca todos los lugares que hay que tocar. Ese es el valor de este archivo.
// ─────────────────────────────────────────────────────────────────────────────
