import { z } from "zod";
import { requireSession, type Session } from "@/lib/auth/session";
import { ValidationError, traducirErrorPostgres } from "./errors";
import { errorResponse } from "./responses";

/**
 * Wrapper de todos los route handlers.
 *
 * Hace tres cosas que si no habría que repetir en ~25 archivos:
 *  1. resuelve la sesión (y tira 401 si no hay)
 *  2. captura cualquier error y lo mapea a HTTP
 *  3. traduce los errores de Postgres a errores de dominio
 *
 * Uso:
 *
 *   export const GET = withRoute(async ({ session }) => {
 *     return ok(await service.listar());
 *   });
 *
 *   export const PUT = withRoute<{ id: string }>(async ({ req, session, params }) => {
 *     const { id } = await params;
 *     ...
 *   });
 */

type Ctx<P> = {
  req: Request;
  session: Session;
  params: Promise<P>;
};

export function withRoute<P = Record<string, never>>(
  fn: (ctx: Ctx<P>) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const session = await requireSession();
      return await fn({ req, session, params: ctx.params });
    } catch (e) {
      return errorResponse(traducirErrorPostgres(e) ?? e);
    }
  };
}

/**
 * Valida el body con un schema de zod y lo devuelve tipado.
 * Un error de zod se convierte en ValidationError, que señala el primer campo
 * que falló — el front lo usa para marcar el input en rojo.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ValidationError("BODY_INVALIDO", "El cuerpo de la petición no es JSON válido.");
  }

  const resultado = schema.safeParse(json);
  if (!resultado.success) {
    const primero = resultado.error.issues[0];
    throw new ValidationError(
      "DATOS_INVALIDOS",
      primero?.message ?? "Los datos enviados no son válidos.",
      primero?.path.join(".") || undefined,
    );
  }

  return resultado.data;
}

/** Lee y valida un id numérico de la URL. */
export function parseId(valor: string | undefined): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("ID_INVALIDO", "El id debe ser un entero positivo.", "id");
  }
  return n;
}
