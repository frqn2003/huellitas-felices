// Datos placeholder del módulo Login (HU-SIS-04).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

export type RolNombre = "Administrador" | "Gerente" | "Veterinario" | "Recepcionista" | "Personal de Depósito";

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
  auth_id: string | null; // Vínculo con Supabase Auth (auth.users)
  estado: "Activo" | "Inactivo";
  fecha_creacion: string;
  password: string; // Solo para demo
}

// BACKEND: reemplazar por GET /api/roles
export const roles: Rol[] = [
  { id: 1, nombre: "Administrador" },
  { id: 2, nombre: "Gerente" },
  { id: 3, nombre: "Veterinario" },
  { id: 4, nombre: "Recepcionista" },
  { id: 5, nombre: "Personal de Depósito" },
];

// BACKEND: reemplazar por POST /api/auth/login
export const usuarios: Usuario[] = [
  {
    id: 1,
    rol_id: 1,
    nombre: "Carlos",
    apellido: "García",
    dni: "30123456",
    email: "carlos.garcia@huellitasfelices.com",
    telefono: "381 555-1234",
    auth_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    estado: "Activo",
    fecha_creacion: "2024-01-15T10:00:00Z",
    password: "admin123",
  },
  {
    id: 2,
    rol_id: 2,
    nombre: "María",
    apellido: "López",
    dni: "28765432",
    email: "maria.lopez@huellitasfelices.com",
    telefono: "381 555-7890",
    auth_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    estado: "Activo",
    fecha_creacion: "2024-02-20T09:30:00Z",
    password: "gerente123",
  },
  {
    id: 3,
    rol_id: 3,
    nombre: "Dr. Juan",
    apellido: "Pérez",
    dni: "32456789",
    email: "juan.perez@huellitasfelices.com",
    telefono: "381 555-4321",
    auth_id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    estado: "Activo",
    fecha_creacion: "2024-03-10T08:15:00Z",
    password: "vet123",
  },
  {
    id: 4,
    rol_id: 4,
    nombre: "Ana",
    apellido: "Martínez",
    dni: "35678912",
    email: "ana.martinez@huellitasfelices.com",
    telefono: "381 555-6789",
    auth_id: "d4e5f6a7-b8c9-0123-defa-234567890123",
    estado: "Activo",
    fecha_creacion: "2024-04-05T11:00:00Z",
    password: "recepcion123",
  },
];

// Registro de auditoría (tabla: auditoria)
export interface AuditoriaLogin {
  id: number;
  tabla: "usuario";
  operacion: "login_exitoso" | "login_fallido" | "login_bloqueado" | "logout";
  registro_id: number;
  usuario_id: number;
  fecha_hora: string;
  valores_anteriores: null;
  valores_nuevos: {
    email: string;
    ip_origen: string;
    intento_numero?: number;
    motivo?: string;
  };
}

// BACKEND: reemplazar por GET /api/auditoria
export const auditoriaEjemplo: AuditoriaLogin[] = [
  {
    id: 1,
    tabla: "usuario",
    operacion: "login_exitoso",
    registro_id: 1,
    usuario_id: 1,
    fecha_hora: "2025-06-20T08:30:15Z",
    valores_anteriores: null,
    valores_nuevos: {
      email: "carlos.garcia@huellitasfelices.com",
      ip_origen: "192.168.1.100",
    },
  },
  {
    id: 2,
    tabla: "usuario",
    operacion: "login_fallido",
    registro_id: 3,
    usuario_id: 3,
    fecha_hora: "2025-06-20T09:15:22Z",
    valores_anteriores: null,
    valores_nuevos: {
      email: "juan.perez@huellitasfelices.com",
      ip_origen: "192.168.1.105",
      intento_numero: 1,
      motivo: "Credenciales inválidas",
    },
  },
];
