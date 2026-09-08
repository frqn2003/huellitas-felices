// Placeholder compartido del catálogo `forma_pago` (dict: id, nombre UNIQUE).
// Lo consumen Proveedores (GET /api/formas-pago) y Órdenes de Compra /
// Cotizaciones (GET /api/condiciones-pago sirve LA MISMA tabla, ver
// src/app/api/condiciones-pago/route.ts).
// Regla C2: catálogo placeholder en src/data + comentario // BACKEND: hasta
// que la API lo exponga.
// BACKEND: poblar desde GET /api/formas-pago.
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
];