/**
 * Helpers para leer filtros de la query string.
 *
 * Los filtros de cada módulo salen de los componentes Filtros*.tsx que el front
 * ya tiene: búsqueda por texto, estado, categoría, rango de fechas y rango de
 * importes. Estos helpers evitan repetir el parseo en cada endpoint.
 */

export function leerTexto(sp: URLSearchParams, clave: string): string | undefined {
  const v = sp.get(clave)?.trim();
  return v ? v : undefined;
}

export function leerEntero(sp: URLSearchParams, clave: string): number | undefined {
  const v = sp.get(clave);
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

export function leerDecimal(sp: URLSearchParams, clave: string): number | undefined {
  const v = sp.get(clave);
  if (v === null || v.trim() === "") return undefined;
  // El front usa teclado es-AR: acepta coma decimal.
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
}

export function leerBooleano(sp: URLSearchParams, clave: string): boolean | undefined {
  const v = sp.get(clave);
  if (v === null) return undefined;
  return v === "true" || v === "1";
}

/**
 * Estado activo/inactivo.
 *
 * OJO con el casing: el enum de la base es 'activo'/'inactivo' en minúscula,
 * pero el front manda "Activo"/"Inactivo" capitalizado. Se normaliza acá.
 */
export function leerEstado(
  sp: URLSearchParams,
  clave = "estado",
): "activo" | "inactivo" | undefined {
  const v = sp.get(clave)?.toLowerCase();
  if (v === "activo" || v === "inactivo") return v;
  return undefined;
}

/** Fecha ISO (yyyy-mm-dd o timestamp completo). */
export function leerFecha(sp: URLSearchParams, clave: string): string | undefined {
  const v = sp.get(clave)?.trim();
  if (!v) return undefined;
  return Number.isNaN(Date.parse(v)) ? undefined : v;
}
