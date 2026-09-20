import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerEntero, leerTexto } from "@/lib/http/query";
import * as service from "@/modules/finanzas/ctacte.service";
import type { EstadoCtaCteApi } from "@/modules/finanzas/ctacte.types";

/**
 * GET /api/cuentas-corrientes — HU-FIN-02, Pantalla A
 *
 * El resumen: un renglón por proveedor con su saldo neto, el vencimiento más
 * cercano y el peor estado de sus comprobantes.
 *
 * Devuelve `{ items, total, pagina, porPagina }` — un objeto, no un array
 * pelado: sin `total` el front no puede dibujar el paginador.
 */

const ESTADOS: EstadoCtaCteApi[] = [
  "Vencido",
  "ProximoAVencer",
  "Credito",
  "Saldado",
  "Pendiente",
];

/**
 * Un `?estado=` fuera de la lista se ignora en vez de llegar al SQL.
 *
 * El filtro del front arranca en "Todos", que significa "sin filtrar". Si se
 * dejara pasar, el HAVING buscaría un estado llamado "Todos" y la lista saldría
 * vacía sin ninguna explicación.
 */
function leerEstado(sp: URLSearchParams): EstadoCtaCteApi | undefined {
  const v = leerTexto(sp, "estado");
  return ESTADOS.find((e) => e === v);
}

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  return ok(
    await service.listarResumen({
      busqueda: leerTexto(sp, "busqueda"),
      estado: leerEstado(sp),
      pagina: leerEntero(sp, "pagina"),
      porPagina: leerEntero(sp, "porPagina"),
    }),
  );
});
