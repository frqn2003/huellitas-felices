# HU-SIS-04: Como empleado de la veterinaria, quiero iniciar y cerrar sesión con mi email y contraseña, para acceder al sistema según los permisos de mi rol de forma segura

## Contexto

- **Ruta propuesta:** `/login`
- **Relacionada con:** Todas las pantallas del sistema (protegidas por autenticación)
- **Prioridad:** alta — es la puerta de entrada al sistema

## Wireframe (idea)

### Pantalla de Login

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    ┌─────────────────────────────┐                      │
│                    │         🐾 HUELLITAS         │                      │
│                    │           FELICES            │                      │
│                    │                              │                      │
│                    │  ┌───────────────────────┐  │                      │
│                    │  │ Email *               │  │                      │
│                    │  │ [_______________]     │  │                      │
│                    │  │                       │  │                      │
│                    │  │ Contraseña *          │  │                      │
│                    │  │ [_______________]     │  │                      │
│                    │  │                       │  │                      │
│                    │  │    [Iniciar Sesión]   │  │                      │
│                    │  └───────────────────────┘  │                      │
│                    │                              │                      │
│                    │  ¿Olvidaste tu contraseña?  │                      │
│                    └─────────────────────────────┘                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estado de Error (credenciales inválidas)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ┌─────────────────────────────┐                      │
│                    │         🐾 HUELLITAS         │                      │
│                    │           FELICES            │                      │
│                    │                              │                      │
│                    │  ┌───────────────────────┐  │                      │
│                    │  │ Email *               │  │                      │
│                    │  │ [_______________]     │  │                      │
│                    │  │                       │  │                      │
│                    │  │ Contraseña *          │  │                      │
│                    │  │ [_______________]     │  │                      │
│                    │  │ ⚠️ Email o contraseña │  │                      │
│                    │  │    incorrectos        │  │                      │
│                    │  │                       │  │                      │
│                    │  │    [Iniciar Sesión]   │  │                      │
│                    │  └───────────────────────┘  │                      │
│                    │                              │                      │
│                    │  Intentos restantes: 2       │                      │
│                    └─────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Estado de Bloqueo (3 intentos fallidos)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ┌─────────────────────────────┐                      │
│                    │         🐾 HUELLITAS         │                      │
│                    │           FELICES            │                      │
│                    │                              │                      │
│                    │  ┌───────────────────────┐  │                      │
│                    │  │ 🔒 Cuenta bloqueada    │  │                      │
│                    │  │                       │  │                      │
│                    │  │ Demasiados intentos   │  │                      │
│                    │  │ fallidos. Tu cuenta   │  │                      │
│                    │  │ está bloqueada por    │  │                      │
│                    │  │ 15 minutos.           │  │                      │
│                    │  │                       │  │                      │
│                    │  │ Tiempo restante:      │  │                      │
│                    │  │ 12:34                 │  │                      │
│                    │  │                       │  │                      │
│                    │  │  [Iniciar Sesión]     │  │                      │
│                    │  └───────────────────────┘  │                      │
│                    │                              │                      │
│                    └─────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Modal 2FA (Solo Administrador)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Verificación de dos factores]                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  🔐 Verificación de seguridad                                    │   │
│  │                                                                  │   │
│  │  Se ha enviado un código de verificación a tu email.            │   │
│  │                                                                  │   │
│  │  Código de verificación *  [________]                           │   │
│  │                                                                  │   │
│  │                                    [Reenviar código]  [Verificar]│   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## User flow

1. **Origen:** El usuario accede al sistema desde el navegador, ingresa a la ruta `/login`.
2. **Acción:** Ingresa email y contraseña → el sistema valida → si es correcto, redirige al Dashboard; si no, muestra error.
3. **Destino:** Si tiene permisos de Administrador, se muestra modal 2FA antes de completar el login. Gerente y demás roles ingresan directamente.

## Datos hardcodeados

Estructura basada en las tablas `usuario`, `rol` y `auditoria` del diagrama de BD.

```ts
// Roles del sistema (tabla: rol)
const roles = [
  { id: 1, nombre: "Administrador" },
  { id: 2, nombre: "Gerente" },
  { id: 3, nombre: "Veterinario" },
  { id: 4, nombre: "Recepcionista" },
  { id: 5, nombre: "Personal de Depósito" },
];

// Usuarios del sistema (tabla: usuario)
const usuarios = [
  {
    id: 1,
    rol_id: 1,
    nombre: "Carlos",
    apellido: "García",
    dni: "30123456",
    email: "carlos.garcia@huellitasfelices.com",
    estado: "Activo",
    fecha_creacion: "2024-01-15T10:00:00Z",
    password: "admin123", // Solo para demo
  },
  {
    id: 2,
    rol_id: 2,
    nombre: "María",
    apellido: "López",
    dni: "28765432",
    email: "maria.lopez@huellitasfelices.com",
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
    estado: "Activo",
    fecha_creacion: "2024-04-05T11:00:00Z",
    password: "recepcion123",
  },
];

// Registro de auditoría (tabla: auditoria)
interface AuditoriaLogin {
  id: number;
  tabla: "usuario";
  operacion: "login_exitoso" | "login_fallido" | "login_bloqueado" | "logout";
  registro_id: number; // usuario_id
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

// Ejemplo de registros de auditoría
const auditoriaEjemplo: AuditoriaLogin[] = [
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
```

## Estados

- [x] Vacío: Formulario de login sin datos, listo para ingresar credenciales.
- [x] Cargando: Spinner en botón "Iniciar Sesión" mientras se valida.
- [x] Error: Mensaje "Email o contraseña incorrectos" debajo del campo de contraseña.
- [x] Bloqueado: Pantalla de bloqueo con countdown de 15 minutos.
- [x] 2FA: Modal de verificación solo para Administrador.

## Criterios de aceptación

### General
- [ ] La pantalla opera en modo **LOGIN** (no hay modos INSERCIÓN/EDICIÓN/LECTURA).
- [ ] Todos los campos están marcados con asterisco (*).
- [ ] Se registra en bitácora de auditoría cada intento de inicio de sesión (exitoso, fallido o bloqueado).

### Campos del formulario
- [ ] **Email:** Obligatorio, formato válido de email.
- [ ] **Contraseña:** Obligatorio, mínimo 6 caracteres.

### Validación de credenciales
- [ ] Al enviar, se valida email y contraseña contra la tabla `usuario`.
- [ ] Si las credenciales son inválidas, se muestra mensaje genérico: "Email o contraseña incorrectos" (sin indicar cuál falló).
- [ ] Se muestra contador de intentos restantes después de cada falla.

### Bloqueo de cuenta
- [ ] Tras 3 intentos fallidos consecutivos, la cuenta se bloquea automáticamente por 15 minutos.
- [ ] Se informa al usuario el tiempo restante de bloqueo (formato MM:SS).
- [ ] Durante el bloqueo, el formulario queda deshabilitado.
- [ ] El bloqueo se registra en bitácora de auditoría.

### Cierre de sesión
- [ ] Botón "Cerrar sesión" en el header/perfil invalida el token de acceso activo.
- [ ] Redirige a la pantalla de login.
- [ ] Se registra el cierre en bitácora de auditoría.

### 2FA (Solo Administrador)
- [ ] Solo el perfil Administrador debe validar un segundo factor antes de completar el login.
- [ ] Gerente y demás roles ingresan directamente sin 2FA.
- [ ] Se muestra un modal con campo para código de verificación.
- [ ] El código se envía al email registrado (simulado).
- [ ] El código expira en 5 minutos.
- [ ] La verificación 2FA se registra en bitácora de auditoría.

### Notificaciones
- [ ] Cada acción (login exitoso, fallido, bloqueado, logout) muestra una notificación toast:
  - **Éxito:** "Bienvenido, [nombre] [apellido]"
  - **Error:** "Email o contraseña incorrectos"
  - **Bloqueado:** "Cuenta bloqueada por 15 minutos"
- [ ] La notificación persiste unos segundos y se cierra automáticamente (o con "✕").

### Seguridad
- [ ] La contraseña no se muestra en texto plano (input type="password").
- [ ] El token de acceso se almacena de forma segura (httpOnly cookie o similar).
- [ ] La sesión expira tras 30 minutos de inactividad.
- [ ] Se implementa protección contra fuerza bruta (rate limiting).

## ⚠️ Notas para el equipo de BD

1. **Tabla `usuario`:** Los campos email y estado ya existen. Se debe agregar campo `intentos_fallidos` (integer, default 0) y `bloqueado_hasta` (timestamp, nullable).

2. **Tabla `rol`:** Ya existe con los roles necesarios. No requiere cambios.

3. **Tabla `auditoria`:** Ya existe. Se debe agregar valor `login_bloqueado` al ENUM de `operacion_auditoria`.

4. **Token de sesión:** Se recomienda crear tabla `sesion` con: id, usuario_id, token, fecha_expiracion, activa (boolean).

5. **Código 2FA:** Se recomienda crear tabla `codigo_2fa` con: id, usuario_id, codigo, fecha_expiracion, usado (boolean).
