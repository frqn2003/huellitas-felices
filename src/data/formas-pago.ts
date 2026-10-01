// Placeholder compartido del catálogo `forma_pago` (dict: id, nombre UNIQUE).
// Es UNA sola tabla en la base: lo consumen Proveedores (GET /api/formas-pago),
// Órdenes de Compra / Cotizaciones (GET /api/condiciones-pago sirve LA MISMA
// tabla, ver src/app/api/condiciones-pago/route.ts) y el módulo Cajas (HU-VTA-03).
// El trigger trg_venta_medio_pago_ingreso_caja detecta el efectivo POR NOMBRE
// (lower(nombre) == "efectivo"): la fila "Efectivo" debe llamarse exactamente
// así, con esa capitalización, o el ingreso automático en caja no se genera.
// Regla C2: catálogo placeholder en src/data + comentario // BACKEND: hasta
// que la API lo exponga.
// BACKEND: poblar desde GET /api/formas-pago. El combo de proveedores/OC y el
// de cobro de caja consumen ESTA misma tabla: la API debe exponer el catálogo
// completo (incluida la fila "Efectivo") a todos los módulos, sin duplicar.
export interface FormaPago {
  id: number;
  nombre: string;
}

export const FORMAS_PAGO: FormaPago[] = [
  { id: 1, nombre: "Contado" },
  { id: 2, nombre: "Cta. cte. 30 días" },
  { id: 3, nombre: "Cta. cte. 60 días" },
  { id: 4, nombre: "Transferencia" },
  { id: 5, nombre: "Cheque a 30 días" },
  // El trigger de caja compara `nombre` case-insensitive contra "efectivo",
  // no el id: no renombrar esta fila.
  { id: 6, nombre: "Efectivo" },
];
