import { redirect } from "next/navigation";

// La selección de proveedores y cotizaciones vive ahora en el módulo Compras
// (/ordenes-compra), tab "Cotizaciones". Esta ruta se mantiene como redirect
// para no romper enlaces o favoritos de la versión anterior.
export default function CotizacionesPage() {
  redirect("/ordenes-compra?tab=cotizaciones");
}
