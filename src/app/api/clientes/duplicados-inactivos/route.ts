import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import { leerTexto } from "@/lib/http/query";
import * as service from "@/modules/clientes/cliente.service";

/**
 * HU-CLI-01 — /api/clientes/duplicados-inactivos
 * Busca clientes inactivos con el mismo documento o email (advertencia al dar de alta).
 */

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const documento = leerTexto(sp, "documento") ?? "";
  const email = leerTexto(sp, "email") ?? "";

  if (!documento && !email) {
    return ok([]);
  }

  return ok(await service.buscarDuplicadosInactivos(documento, email));
});
