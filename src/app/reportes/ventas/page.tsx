import { redirect } from "next/navigation";

/**
 * HU-REP-02: Reportes de Ventas está integrado como pestaña de /dashboard (?tab=reportes).
 * Esta ruta redirige automáticamente para no romper accesos o marcadores directos.
 */
export default function SalesReportRedirect() {
  redirect("/dashboard?tab=reportes");
}
