// Datos placeholder de `venta_medio_pago` (§5 de docs/esquema-bd-front.md).
// Cada fila es UN medio de pago de una venta: una venta puede ser de pago MIXTO
// (varias filas por venta) y un trigger DEFERRABLE exige
// SUM(monto) == venta.total por cada venta.
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

import { FORMAS_PAGO } from "./formas-pago";
import { VENTAS_INICIALES } from "./ventas";

// Refleja `venta_medio_pago`: id, venta_id FK → venta.id (ON DELETE CASCADE),
// forma_pago_id FK → forma_pago.id, monto numeric CHECK > 0.
export interface VentaMedioPago {
  id: number; // PK
  ventaId: number; // FK → venta.id
  formaPagoId: number; // FK → forma_pago.id
  monto: number; // CHECK monto > 0
}

// Filas alineadas con las ventas de src/data/ventas.ts (la suma por venta es
// igual a `total`): venta 3 → 13500, venta 4 → 22000. Ambas cobradas 100% por
// transferencia (forma_pago id 4).
export const ventaMediosPago: VentaMedioPago[] = [
  { id: 1, ventaId: 3, formaPagoId: 4, monto: 13500 }, // Transferencia
  { id: 2, ventaId: 4, formaPagoId: 4, monto: 22000 }, // Transferencia
];

// BACKEND: GET /api/venta-medios-pago
// El cálculo real es un JOIN venta ⋈ venta_medio_pago ⋈ forma_pago, filtrado
// por sucursal y por la ventana de la apertura (fecha_apertura → fecha_cierre).
// El efectivo se EXCLUYE de este cálculo: ya impacta movimiento_caja por
// trg_venta_medio_pago_ingreso_caja; contarlo acá duplicaría el efectivo.
export function cobradoFueraDeCaja(
  sucursalId: number,
  desde: string,
  hasta: string,
): number {
  const d = new Date(desde).getTime();
  const h = new Date(hasta).getTime();

  // Ventana [desde, hasta] inclusive, sobre ventas vigentes de la sucursal.
  const ventasDeLaJornada = VENTAS_INICIALES.filter(
    (v) =>
      v.sucursalId === sucursalId &&
      v.estado === "vigente" &&
      new Date(v.fecha).getTime() >= d &&
      new Date(v.fecha).getTime() <= h,
  );

  // Medios de pago de esas ventas cuya forma de pago NO es efectivo.
  return ventaMediosPago
    .filter((m) => {
      if (!ventasDeLaJornada.some((v) => v.id === m.ventaId)) return false;
      return FORMAS_PAGO.find((f) => f.id === m.formaPagoId)?.nombre.toLowerCase() !== "efectivo";
    })
    .reduce((acc, m) => acc + m.monto, 0);
}
