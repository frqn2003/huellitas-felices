import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerFecha } from "@/lib/http/query";
import { crearComprobanteSchema } from "@/modules/comprobantes/comprobante.schema";
import * as service from "@/modules/comprobantes/comprobante.service";
import type { EstadoDocumento } from "@/modules/comprobantes/comprobante.types";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const estadoRaw = leerTexto(sp, "estado");

  let estado: EstadoDocumento | undefined = undefined;
  if (estadoRaw === "Vigente" || estadoRaw === "vigente") estado = "vigente";
  if (estadoRaw === "Anulado" || estadoRaw === "anulado") estado = "anulado";

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
