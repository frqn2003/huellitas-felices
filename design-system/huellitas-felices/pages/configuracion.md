# Página: configuracion

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Contexto

Pantalla de **configuración de cuenta del usuario logueado** (`/configuracion`). Perfil personal: el usuario ve y edita sus propios datos (nombre, apellido, email, teléfono) y cambia su contraseña. Rol, DNI, estado y fecha de ingreso son solo lectura. Brief: `docs/briefs/HU-SIS-05.md`. 

## Desviaciones y decisiones

- **Cotización de acciones**:
  - Primer CTA amarillo: **"Guardar cambios"** (abre modal de confirmación con contraseña).
  - Secundario outline: **"Cambiar contraseña"** (abre modal dedicado).
- **Orden de la pantalla** (de arriba a abajo):
  1. **Información de cuenta** — rol, DNI (enmascarado), estado (`StatusBadge`), fecha de ingreso (solo lectura, `dl`/`dt`/`dd`). **Primero arriba.**
  2. **Tu cuenta** — nombre, apellido, email, teléfono (editables, **pre-cargados** con los valores de sesión).
  3. Botones de acción.
- **Modal "Confirmar cambios"**: al pulsar "Guardar cambios" se valida primero los datos y luego se pide la **contraseña actual** para confirmar cualquier cambio (incluido solo email). Si no coincide con la demo → error inline en el modal y no se guarda. `// BACKEND: PUT /api/usuarios/:id` + confirmación de identidad con token/cookie.
- **Modal "Cambiar contraseña"**: contraseña actual (debe coincidir) + nueva (mín. 6) + confirmación (debe coincidir). Cada campo con toggle mostrar/ocultar. `// BACKEND: POST /api/usuarios/:id/cambiar-password`.
- **Validación de campos (controles)** inline con `role="alert"` (on blur + al guardar):
  - **Nombre/Apellido**: obligatorios, solo letras y espacios (`NOMBRE_RE`).
  - **Email**: obligatorio, formato válido (`EMAIL_RE`).
  - **Teléfono**: opcional; si tiene contenido → solo números/espacios/guiones/`+` y mín. 8 dígitos.
  - Todos los obligatorios llevan `*`.
- **Botón "Guardar cambios" deshabilitado** hasta que haya un cambio real; texto "No hay cambios para guardar." como feedback.
- **Toast** de éxito tras guardar datos y tras cambiar contraseña (mensajes distintos).
- **Contexto de sesión**: se extiende `AuthContext` con el método `actualizarUsuario` (actualiza `state.usuario` en memoria y se refleja al instante en el `Sidebar`). Campo `telefono` agregado a `Usuario` y a los usuarios demo.
- **Modales**: se reusan los `Modal` de `ui/` (scrim verde, radius 16px, Escape cierra, focus visible, `prefers-reduced-motion`). Ambos modales se manejan con un estado `modal: "guardar" | "contrasena" | null` **dentro del mismo componente** `ConfiguracionForm` (no se crean archivos separados).
- **Fondo del cuerpo**: crema `bg-cream-50`; sin tablas ni paginación (es un form de perfil, no un listado).

## Estados de la pantalla

| Estado | Trigger | UI |
|--------|---------|----|
| Con datos | usuario autenticado | Info de cuenta + campos pre-cargados |
| Error de validación | blur / guardar con datos inválidos | Mensajes inline bajo el campo con `role="alert"` |
| Sin cambios | campo == valor inicial | Botón "Guardar cambios" deshabilitado + "No hay cambios para guardar." |
| Modal confirmar | pulsar "Guardar cambios" (datos válidos) | Modal pide contraseña actual; error inline si no coincide |
| Modal cambiar contraseña | pulsar "Cambiar contraseña" | Modal con actual + nueva + confirmación |
| Guardando | confirmar en modal | Botón del modal "Guardando…" deshabilitado |
| Sesión no autenticada | deep-link sin login | Form vacío + acciones deshabilitadas (no aplica route guard, Opción A) |

## Tokens usados (todos del MASTER)

Fondo crema `--color-cream-50` · cards `bg-surface` + `--shadow-card` + borde `--color-border` · texto `--color-text-primary` / `--color-text-secondary` · CTA `--color-accent-500` (hover `--color-accent-600`) · secundario `--color-brand-900` · destructivo `--color-destructive` (errores) · estado `--color-status-success` (Activo) · radius: pill (botones/toggle para contraseña), 8px (inputs), 12px (cards) · motion 150/250/500ms con `useReducedMotion`.
