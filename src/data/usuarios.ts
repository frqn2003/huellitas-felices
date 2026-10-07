// Tipos del módulo Login (HU-SIS-04). El usuario y la sesión salen de /api/auth.

export type RolNombre = "Administrador" | "Gerente" | "Veterinario" | "Recepcionista" | "Personal de depósito" | "Cajero";

export interface Rol {
  id: number;
  nombre: RolNombre;
}

export interface Usuario {
  id: number;
  rol_id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string; // BACKEND: agregar campo a la tabla `usuario` (varchar, nullable)
  // BLOQUEADO-DBA (D6): `telefono` no está en `usuario` del diccionario. Se mantiene
  // porque el perfil ya lo usa, pero NO se alinea hasta que la DBA agrege la columna.
  auth_id: string | null; // Vínculo con Supabase Auth (auth.users)
  estado: "Activo" | "Inactivo";
  fecha_creacion: string;
  password: string; // Solo para demo
  sucursal_id?: number | null; // FK → sucursal.id (nullable)
  intentos_fallidos?: number; // default 0, CHECK 0–3 (lo persiste el back)
  bloqueado_hasta?: string | null; // ISO timestamp; si es futuro, login se rechaza antes de Supabase Auth
}

// BACKEND: reemplazar por GET /api/roles
export const roles: Rol[] = [
  { id: 1, nombre: "Administrador" },
  { id: 2, nombre: "Gerente" },
  { id: 3, nombre: "Veterinario" },
  { id: 4, nombre: "Recepcionista" },
  { id: 5, nombre: "Personal de depósito" },
  { id: 6, nombre: "Cajero" },
];
