import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";
import * as repo from "@/modules/comprobantes/comprobante.repo";

export const GET = withRoute(async () => {
  const tipos = await repo.listarTiposComprobante();
  return ok(tipos);
});
