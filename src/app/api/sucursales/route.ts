import { SUCURSALES } from "@/data/stock";
import { withRoute } from "@/lib/http/handler";
import { ok } from "@/lib/http/responses";

// Catálogo temporal: la base DEV conserva deposito.sucursal_id pero todavía
// no existe una tabla sucursal. Se reemplaza cuando entre HU-SUC-01.
export const GET = withRoute(async () => ok(SUCURSALES));
