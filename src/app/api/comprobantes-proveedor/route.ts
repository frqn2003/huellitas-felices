import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerFecha } from "@/lib/http/query";
import { crearComprobanteSchema } from "@/modules/comprobantes/comprobante.schema";
import * as service from "@/modules/comprobantes/comprobante.service";
import type { EstadoDocumento } from "@/modules/comprobantes/comprobante.types";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const estadoRaw = leerTexto(sp, "estado");

  // El front manda el estado capitalizado; la base lo guarda en minúscula.
  //
  // `pagado` faltaba acá: filtrar por "Pagado" caía en `undefined`, que este
  // handler interpreta como "sin filtro", así que la lista devolvía TODO en vez
  // de los pagados. Un filtro que silenciosamente no filtra.
  const ESTADOS: Record<string, EstadoDocumento> = {
    vigente: "vigente",
    anulado: "anulado",
    pagado: "pagado",
  };
  const estado: EstadoDocumento | undefined = estadoRaw
    ? ESTADOS[estadoRaw.toLowerCase()]
    : undefined;

  const resultado = await service.listar({
    busqueda: leerTexto(sp, "busqueda"),
    proveedorId: leerEntero(sp, "proveedorId"),
    tipoComprobanteId: leerEntero(sp, "tipoComprobanteId"),
    ordenCompraId: leerEntero(sp, "ordenCompraId"),
    desde: leerFecha(sp, "desde"),
    hasta: leerFecha(sp, "hasta"),
    estado,
  });

  return ok(resultado);
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearComprobanteSchema);
  return created(await service.crear(input, session.usuarioId));
});
