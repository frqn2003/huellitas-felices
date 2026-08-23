/**
 * Errores de dominio.
 *
 * Los services lanzan estos; el wrapper withRoute() los traduce a HTTP. Así el
 * service no sabe nada de status codes y se puede testear sin servidor.
 *
 * Shape de respuesta (único para toda la API, porque el front ya tiene estados
 * de error por CUIT/nombre duplicado):
 *
 *   { "error": { "codigo": "CUIT_DUPLICADO", "mensaje": "...", "campo": "cuit" } }
 */

export abstract class AppError extends Error {
  abstract readonly status: number;

  constructor(
    readonly codigo: string,
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/** 422 — el input no cumple el schema. */
export class ValidationError extends AppError {
  readonly status = 422;
}

/** 404 — el recurso no existe. */
export class NotFoundError extends AppError {
  readonly status = 404;

  constructor(entidad: string, id?: number | string) {
    super(
      "NO_ENCONTRADO",
      id === undefined ? `No se encontró ${entidad}.` : `No se encontró ${entidad} con id ${id}.`,
    );
  }
}

/**
 * 409 — choca con un único: CUIT o nombre duplicado, código repetido.
 * Distinto de BusinessRuleError: acá el problema es que el dato YA EXISTE.
 */
export class ConflictError extends AppError {
  readonly status = 409;
}

/**
 * 409 — una regla de negocio lo prohíbe. Ejemplos del Sprint 1:
 *  · egreso que dejaría stock negativo (HU-STK-04)
 *  · baja de proveedor con órdenes abiertas (HU-PROV-01)
 *  · editar una orden que ya no está Pendiente (HU-COMP-02)
 *  · movimiento sobre un artículo sin ficha de stock en ese depósito (HU-STK-02)
 */
export class BusinessRuleError extends AppError {
  readonly status = 409;
}

/** 401 — sin sesión válida. */
export class UnauthorizedError extends AppError {
  readonly status = 401;

  constructor() {
    super("SIN_SESION", "Necesitás iniciar sesión.");
  }
}

/**
 * Traduce un error de Postgres a error de dominio.
 *
 * Es la red de seguridad de los índices UNIQUE: el service chequea antes para
 * dar un mensaje lindo, pero bajo concurrencia dos requests pasan los dos el
 * chequeo y uno choca contra el índice. Ese 23505 se traduce acá.
 *
 * IMPORTANTE: nunca devolver el mensaje crudo de Postgres al cliente — filtra
 * nombres de tablas, columnas y constraints. Al log del server sí.
 */
export function traducirErrorPostgres(e: unknown): AppError | null {
  if (typeof e !== "object" || e === null || !("code" in e)) return null;

  const codigo = (e as { code: string }).code;
  const constraint = (e as { constraint?: string }).constraint ?? "";

  // 23505 = unique_violation
  if (codigo === "23505") {
    if (constraint.includes("proveedor_cuit")) {
      return new ConflictError("CUIT_DUPLICADO", "Ya existe un proveedor activo con ese CUIT.", "cuit");
    }
    if (constraint.includes("articulo_nombre")) {
      return new ConflictError("NOMBRE_DUPLICADO", "Ya existe un artículo activo con ese nombre.", "nombre");
    }
    if (constraint.includes("articulo_codigo")) {
      return new ConflictError("CODIGO_DUPLICADO", "Ya existe un artículo con ese código.", "codigo");
    }
    if (constraint.includes("usuario_email")) {
      return new ConflictError("EMAIL_DUPLICADO", "Ya existe un usuario activo con ese email.", "email");
    }
    if (constraint.includes("usuario_dni")) {
      return new ConflictError("DNI_DUPLICADO", "Ya existe un usuario activo con ese DNI.", "dni");
    }
    if (constraint.includes("ficha_articulo_deposito") || constraint.includes("ficha_stock_articulo")) {
      return new ConflictError(
        "FICHA_DUPLICADA",
        "Ese artículo ya tiene una ficha de stock en ese depósito.",
      );
    }
    if (constraint.includes("deposito_nombre")) {
      return new ConflictError("DEPOSITO_DUPLICADO", "Ya existe un depósito con ese nombre.", "nombre");
    }
    return new ConflictError("DUPLICADO", "El registro ya existe.");
  }

  // 23514 = check_violation
  if (codigo === "23514") {
    if (constraint.includes("stock_no_negativo")) {
      return new BusinessRuleError(
        "STOCK_NEGATIVO",
        "La operación dejaría el stock en negativo.",
      );
    }
    if (constraint.includes("critico_menor")) {
      return new ValidationError(
        "UMBRAL_INVALIDO",
        "El umbral crítico no puede ser mayor que el mínimo.",
        "stockCritico",
      );
    }
    return new ValidationError("DATO_INVALIDO", "Algún valor no cumple las reglas de la base.");
  }

  // 23503 = foreign_key_violation
  if (codigo === "23503") {
    return new ValidationError(
      "REFERENCIA_INVALIDA",
      "Se referencia un registro que no existe.",
    );
  }

  return null;
}
