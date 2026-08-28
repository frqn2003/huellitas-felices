import { NextResponse } from "next/server";
import { AppError } from "./errors";

/** 200 */
export function ok<T>(data: T) {
  return NextResponse.json(data, { status: 200 });
}

/** 201 */
export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

/** 204 */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Traduce cualquier error a la respuesta HTTP.
 *
 * Los AppError salen con su código y mensaje. Todo lo demás es un bug: al
 * cliente le llega un 500 genérico, y el detalle queda en el log del server.
 */
export function errorResponse(e: unknown) {
  if (e instanceof AppError) {
    return NextResponse.json(
      { error: { codigo: e.codigo, mensaje: e.message, campo: e.campo } },
      { status: e.status },
    );
  }

  console.error("[api] error no manejado:", e);

  // 42703 = undefined_column, 42P01 = undefined_table.
  // Casi siempre significa lo mismo en este proyecto: el código asume una
  // corrección de db/correcciones/ que todavía no se pegó en el SQL Editor.
  // El mensaje va al log del server, no al cliente.
  if (typeof e === "object" && e !== null && "code" in e) {
    const codigoPg = (e as { code: string }).code;
    if (codigoPg === "42703" || codigoPg === "42P01") {
      console.error(
        "[api] ↑ la base no tiene esa columna/tabla. " +
          "Revisa si falta aplicar alguna correccion de db/correcciones/ (ver su README.md).",
      );
    }
  }

  return NextResponse.json(
    {
      error: {
        codigo: "ERROR_INTERNO",
        mensaje: "Ocurrió un error inesperado. Intentá de nuevo.",
      },
    },
    { status: 500 },
  );
}
