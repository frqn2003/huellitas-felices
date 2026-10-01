import { redirect } from "next/navigation";

// HU-VTA-03: la lista de cajas pasó a ser una tab de Recepción (?tab=cajas).
// Esta ruta solo redirige para no romper enlaces o marcadores existentes; el
// detalle de la apertura sigue en /cajas/[aperturaId].
export default function CajasPage() {
  redirect("/clientes?tab=cajas");
}