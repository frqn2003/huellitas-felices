import { withRoute, parseBody } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEstado, leerEntero } from "@/lib/http/query";
import { crearMascotaSchema } from "@/modules/mascotas/mascota.schema";
import * as service from "@/modules/mascotas/mascota.service";

/**
 * HU-MAS-01 — /api/mascotas
 *
 * Leer, validar, delegar, responder. Ni SQL ni reglas de negocio acá: eso vive
 * en el service, que se puede testear sin levantar el servidor.
 *
 * Los errores no se capturan: withRoute() los traduce a HTTP.
 * El `usuario_id` tampoco se lee del body: sale de la sesión.
 */

/** Un `?especie=` o `?sexo=` fuera de la lista se ignora, en vez de llegar al SQL. */
const ESPECIES = ["Perro", "Gato", "Otro"];
const SEXOS = ["Macho", "Hembra"];

function leerDeLista(sp: URLSearchParams, clave: string, validos: string[]) {
  const v = leerTexto(sp, clave);
  return validos.find((x) => x === v);
}

/**
 * GET /api/mascotas — reemplaza `mascotasIniciales` (src/data/mascotas.ts).
 *
 * Los filtros son los de FiltrosMascotas.tsx. Se resuelven en SQL y no en el
 * front: hoy son tres mascotas de demo, pero el padrón de una veterinaria no se
 * manda entero al navegador para filtrarlo ahí.
 *
 * El filtro del front arranca en "Todas"/"Todos", que significa "sin filtrar":
 * `leerDeLista` lo descarta por no estar en la lista, así el WHERE no busca una
 * especie llamada "Todas" y devuelve la lista vacía.
 */
export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;

  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      estado: leerEstado(sp),
      especie: leerDeLista(sp, "especie", ESPECIES),
      sexo: leerDeLista(sp, "sexo", SEXOS),
      clienteId: leerEntero(sp, "clienteId"),
    }),
  );
});

/**
 * POST /api/mascotas — alta (modo INSERCIÓN del formulario).
 *
 * El criterio "la asociación a un cliente existente es obligatoria" se valida
 * en el service: `clienteId` tiene que apuntar a un cliente que exista y esté
 * activo. La FK NOT NULL de la base es la red de seguridad.
 */
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearMascotaSchema);
  return created(await service.crear(input, session.usuarioId));
});
