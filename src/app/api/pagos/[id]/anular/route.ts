import { NextResponse } from "next/server";
import { withRoute, parseId } from "@/lib/http/handler";
import * as pagoService from "@/modules/finanzas/pago.service";

export const POST = withRoute<{ id: string }>(async ({ session, params }) => {
  const { id } = await params;
  const pagoId = parseId(id);

  const detalleActualizado = await pagoService.anular(pagoId, session.usuarioId);
  return NextResponse.json(detalleActualizado);
});
