import { redirect } from "next/navigation";

// La bitácora y creación de movimientos de stock viven ahora en el módulo
// Inventario (/stock), tab "Movimientos". Esta ruta se mantiene como redirect
// para no romper enlaces o favoritos de la versión anterior.
export default function MovimientosStockPage() {
  redirect("/stock?tab=movimientos");
}