/**
 * HU-SIS-04 — Inicio y Cierre de Sesión.
 *
 * Tipos del contrato de la API y de las filas que devuelve el repo.
 */

/** Los 4 valores del enum `tipo_evento_sesion` de la base. */
export type EventoSesion = "login" | "logout" | "login_fallido" | "bloqueado";

/**
 * Fila de `usuario` con lo que hace falta para decidir un login.
 *
 * No trae la contraseña porque `usuario` no tiene contraseña: la verifica
 * Supabase Auth (ver src/lib/auth/gotrue.ts).
 */
export type UsuarioLoginRow = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol_id: number;
  rol: string;
  auth_id: string | null;
  intentos_fallidos: number;
  bloqueado_hasta: Date | null;
};

/** Lo que devuelve POST /api/auth/login y GET /api/auth/sesion. */
export type SesionApi = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  /**
   * Si el rol necesita 2FA. Hoy siempre `false`.
   *
   * El criterio dice "Los perfiles Administrador y Gerente deben validar un
   * segundo factor (2FA) antes de completar el inicio de sesión. (para el
   * final)". Ese "(para el final)" lo pone fuera de esta entrega, pero el campo
   * ya viaja: cuando se implemente, el front no cambia de forma — cambia de
   * valor. Ver docs/backend/HU-SIS-04.md §"Lo que queda afuera".
   */
  requiere2FA: boolean;
};
