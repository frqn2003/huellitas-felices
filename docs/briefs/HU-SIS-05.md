# CorreccionConfiguracionLogin: Como empleado de la veterinaria, quiero ver y editar los datos de mi propia cuenta (nombre, apellido, email y contraseña), para mantener mi perfil actualizado de forma segura

> Brief de la pantalla de **Configuración de cuenta**. No tiene HU de base: este brief es la plantilla que define el alcance.

## Contexto

- **Ruta propuesta:** `/configuracion`
- **Relacionada con:** `/login` (HU-SIS-04) y el `Sidebar` (sección Administración)
- **Prioridad:** media — es la pantalla de perfil del usuario logueado

## Wireframe (idea)

Pantalla de **perfil del usuario logueado**. El usuario puede editar su nombre, apellido y email, y cambiar su contraseña. El rol, el DNI, el estado y la fecha de ingreso son datos de lectura del sistema.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ LOGO           (sidebar verde bosque)  Operaciones / Administración      │
├────────────────────────────┬─────────────────────────────────────────────┤
│ Artículos                  │  ADMINISTRACIÓN        (subheading)         │
│ Inventario                 │  CONFIGURACIÓN          (H1, Baloo)         │
│ Compras                    │                                             │
│ Lista de Precios           │  ┌─────────────────────────────────────┐    │
│ Proveedores                │  │ TU CUENTA                            │    │
│                            │  │  Nombre     Apellido                │    │
│ ADMINISTRACIÓN             │  │ [Carlos]    [García]  (editable)     │    │
│  ► Configuración           │  │  Email *                             │    │
│  Auditoría                 │  │ [carlos.garcia@huellitasfelices.com] │    │
│                            │  └─────────────────────────────────────┘    │
│ ─────────────────────      │                                             │
│ [CG] Carlos García         │  ┌─────────────────────────────────────┐    │
│     Administrador  [⏻]     │  │ SEGURIDAD                            │    │
│                            │  │  Contraseña actual *                 │    │
│                            │  │  [•••••••]                           │    │
│                            │  │  Nueva contraseña *                  │    │
│                            │  │  [•••••••]      [mostrar/ocultar]    │    │
│                            │  │  Confirmar nueva *                   │    │
│                            │  │  [•••••••]                           │    │
│                            │  └─────────────────────────────────────┘    │
│                            │                                             │
│                            │  [ Guardar cambios ]                        │
│                            │                                             │
│                            │  ┌─────────────────────────────────────┐    │
│                            │  │ INFORMACIÓN DE CUENTA (solo lectura) │    │
│                            │  │  Rol        Administrador            │    │
│                            │  │  DNI        ·········2               │    │
│                            │  │  Estado     ● Activo                 │    │
│                            │  │  Ingreso     15/01/2024              │    │
│                            │  └─────────────────────────────────────┘    │
└────────────────────────────┴─────────────────────────────────────────────┘
```

## User flow

1. **Origen:** El usuario logueado entra a "Configuración" desde el sidebar (sección Administración).
2. **Acción:** Ve sus datos actuales, modifica nombre/apellido/email y/o la contraseña, y presiona "Guardar cambios".
3. **Destino:** Al guardar se confirma con toast y el nombre nuevo se refleja al instante en el sidebar (avatar + nombre). Los cambios viven en memoria durante la sesión.

## Datos hardcodeados

Estructura basada en la tabla `usuario` y `rol` del diagrama de BD. El usuario en sesión viene de `AuthContext`/`state.usuario` (mismo origen que HU-SIS-04).

```ts
// Se edita sobre el usuario logueado (tabla: usuario)
interface Usuario {
  id: number;
  rol_id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string; // NUEVO campo para esta pantalla
  auth_id: string | null;
  estado: "Activo" | "Inactivo";
  fecha_creacion: string;
  password: string; // Solo para demo
}

// Roles (tabla: rol) — se muestra el nombre en "Información de cuenta"
const roles = [
  { id: 1, nombre: "Administrador" },
  { id: 2, nombre: "Gerente" },
  { id: 3, nombre: "Veterinario" },
  { id: 4, nombre: "Recepcionista" },
  { id: 5, nombre: "Personal de Depósito" },
];

// Ejemplo de usuario logueado (tomado de AuthContext)
const usuario = {
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
};
```

## Estados

- [x] Con datos: Muestra el perfil del usuario logueado con sus datos actuales.
- [x] Cargando / guardando: Spinner en el botón "Guardar cambios" mientras se persiste.
- [x] Error: Errores de validación en el formulario (email inválido, contraseñas no coinciden, contraseña actual incorrecta).
- [x] Toast: "Datos actualizados correctamente" al guardar.

## Criterios de aceptación

### General

- [ ] Solo el usuario logueado ve y edita **su propia** cuenta (los datos salen de `state.usuario`).
- [ ] La pantalla opera en modo **EDICIÓN** de la sesión activa (no hay INSERCIÓN/LECTURA de otros usuarios).
- [ ] Al guardar, el `AuthContext` se actualiza (método `actualizarUsuario`) y el cambio se refleja en el sidebar.

### Campos del formulario — Tu cuenta

- [ ] **Nombre:** editable, obligatorio.
- [ ] **Apellido:** editable, obligatorio.
- [ ] **Email:** editable, obligatorio, formato válido de email.
- [ ] Cada cambio de email se confirma con la **contraseña actual**.

### Campos del formulario — Seguridad (contraseña)

- [ ] **Contraseña actual:** obligatoria al guardar (confirmación de identidad para cualquier cambio).
- [ ] **Nueva contraseña:** obligatoria solo si se cambia, mínimo 6 caracteres, input `password` con toggle mostrar/ocultar.
- [ ] **Confirmar nueva:** debe coincidir con la nueva.
- [ ] Si la contraseña actual no coincide con la demo, se muestra error y no se guarda.

### Información de cuenta (solo lectura)

- [ ] **Rol:** muestra el nombre del rol del usuario (no editable).
- [ ] **DNI:** se muestra enmascarado o parcial (no editable).
- [ ] **Estado:** muestra badge de estado (Activo).
- [ ] **Ingreso:** muestra la fecha de creación formateada.

### Guardado y feedback

- [ ] Botón "Guardar cambios" deshabilitado hasta que haya algún cambio real.
- [ ] Al guardar: toast de éxito "Datos actualizados correctamente".
- [ ] El sidebar actualiza nombre/apellido del usuario al instante.

### Seguridad

- [ ] La contraseña nunca se muestra en texto plano (input `password`).
- [ ] El DNI y el rol no son editables.

## ⚠️ Notas para el equipo de BD

1. **Campo `telefono`:** Agregar a la tabla `usuario` (varchar, nullable). Es nuevo para esta pantalla; alimentar los usuarios demo con un teléfono de ejemplo.
2. **Actualización:** `PUT /api/usuarios/:id` para nombre/apellido/email/telefono. El cambio de contraseña en `POST /api/usuarios/:id/cambiar-password` (nunca devolver el hash por GET).
3. **Convención de demo:** El `// BACKEND:` debe indicar el endpoint y qué reemplaza (el equipo de back los busca con `grep -rn "BACKEND" src/`).
