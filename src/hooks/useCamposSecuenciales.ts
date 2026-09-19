"use client";

/**
 * Desbloqueo secuencial de campos obligatorios (patrón "completá en orden"):
 * inicialmente solo el primer campo está habilitado; al completarlo se
 * desbloquea el siguiente, y así sucesivamente.
 *
 * Reglas del patrón (acordadas con el equipo de diseño, 2026-09-18):
 * - Aplica SOLO al alta (modo "crear"); en edición los datos ya vienen
 *   cargados y bloquear no aporta (el formulario debe decidir cuándo activarlo).
 * - Desbloqueo MONOTÓNICO: un campo desbloqueado queda habilitado para
 *   siempre; si el usuario borra un valor anterior, los posteriores NO se
 *   re-bloquean (poder volver a corregir es obligatorio).
 * - "Completado" = valor no vacío (trim). La validación completa de cada
 *   campo sigue viviendo en el submit/onBlur del form, como antes.
 * - Los campos opcionales NO participan de la cadena: quedan siempre
 *   habilitados (el `orden` solo lista los obligatorios de la secuencia).
 *
 * Uso típico: los campos bloqueados llevan `disabled={bloqueado("campo")}`
 * y el hint "Completá primero: {ETIQUETA[pendiente]}" (mismo patrón que el
 * Select de práctica del wizard de turnos).
 */
export function useCamposSecuenciales<T extends string>(
  orden: readonly T[],
  valores: Record<T, string>,
) {
  // Primer obligatorio todavía vacío (el campo "actual"). null = todos completos.
  const pendiente = orden.find((campo) => valores[campo].trim() === "") ?? null;

  /** true si el campo está bloqueado esperando que se complete uno anterior. */
  const bloqueado = (campo: T): boolean =>
    pendiente !== null && orden.indexOf(campo) > orden.indexOf(pendiente);

  return { pendiente, bloqueado };
}