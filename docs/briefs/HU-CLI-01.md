# HU-CLI-01: Como recepcionista, quiero registrar, editar y dar de baja lógica a un cliente mediante un formulario paramétrico único, para tener la información del cliente disponible y poder asociarlo a sus mascotas

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/clientes`
- **Relacionada con:** módulo Mascotas y Turnos (HUs futuras, mismas secciones del menú), HU-FIN-03 (cta. cte. lado cliente), HU-SIS-05 (auditoría)
- **Prioridad:** media

## Propuesta inicial (del equipo)

- ABM de clientes con formulario **paramétrico único** en 3 modos controlados por parámetro: **INSERCIÓN, EDICIÓN y LECTURA** (coincide con el enum `modo_abm` ya definido en el esquema).
- Campos: nombre, apellido, documento, dirección, teléfono, email y fecha de nacimiento.
- Valida que el documento **no esté duplicado entre clientes activos**; rechaza con mensaje claro si ya existe.
- **Baja lógica**: el estado se maneja con un **toggle Activo/Inactivo dentro del formulario**; al guardar con Inactivo (tanto en alta como en edición) se abre un **modal de confirmación de baja**. El cliente desactivado no puede registrar nuevos turnos pero conserva su historial de compras, servicios y deudas.
- Un cliente inactivo **permanece visible en búsquedas** con indicador de estado "inactivo".
- Listado: muestra por defecto solo los **activos**, con búsqueda por nombre, documento o teléfono; filtro por estado; paginación.
- **Auditoría**: registra en bitácora cada alta, modificación y baja con usuario responsable, fecha, hora y valores anterior y nuevo.
- Al crear, busca coincidencias por **documento y por email entre los registros inactivos**; si encuentra, muestra **advertencia con los registros duplicados** antes de confirmar el alta.

**Agregados del equipo (validaciones y navegación):**
- Validaciones de formato en el front: campos con formato incorrecto se marcan **en rojo SOLO esos campos**, con mensaje indicando el error al usuario.
- Al realizar una acción (guardar, modificar, dar de baja, error): **alertas toast** como en las pantallas existentes (éxito/error).
- Menú lateral: nueva sección **"Recepción"** con ítems **Clientes** (esta HU), **Mascotas** (luego) y **Turnos** (luego). Abajo, en la pantalla de clientes, se reutiliza el formato existente de búsqueda, tabla, filtro y paginación, con los colores de estados, iconos, etc. del design system.

## Wireframe (idea)

### Listado de clientes

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Recepcion]  Recepcion                              [⚙️ Nuevo cliente]   │
│ ┌────────┐  ┌──────────────────────────────────────────────────────────┐│
│ │Recepcion│  │ [⚙️ Clientes] [⚙️ Mascotas] [⚙️ Turnos]                  ││
│ │        │  │                                                          ││
│ │[bar]   │  │ [🔍_____________________________]  [⚙️ Filtros]         ││
│ │[bar]   │  │                                                          ││
│ │[bar]   │  │ [Activo x]                                              ││
│ │[bar]   │  │ ┌─────────┬──────────────────┬────────────┬────────┬───┐││
│ │        │  │ │  Dni    │ Nombre y apellido│  Telefono  │ Estado │Acc│││
│ │        │  │ ├─────────┼──────────────────┼────────────┼────────┼───┤││
│ │[bar]   │  │ │45115839 │ Pablo Celaya     │3875122693  │ Activo │👁️✏️│││
│ │        │  │ ├─────────┼──────────────────┼────────────┼────────┼───┤││
│ │        │  │ │43115839 │ Emiliano Aguirre │3876566566  │Inactivo│👁️  │││
│ │[bar]   │  │ ├─────────┼──────────────────┼────────────┼────────┼───┤││
│ │        │  │ │         │                  │            │        │   │││
│ │        │  │ └─────────┴──────────────────┴────────────┴────────┴───┘││
│ │        │  │                                       Pagina 1 de 10     ││
│ └────────┘  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

Notas:
- El menú lateral pasa a tener la sección **Recepción** (Clientes / Mascotas / Turnos) además de las secciones existentes.
- Columna acciones: 👁️ **Ver** (siempre) · ✏️ **Editar** (solo si está activo, ver criterios) · la baja se hace dentro del formulario con el toggle, no hay botón directo en la lista (definido con el equipo).

### Formulario paramétrico — modo INSERCIÓN ("Nuevo cliente")

```
┌──────────────────────────────────────────┐
│ 👁️ Nuevo cliente                          │
│                                            │
│ Nombre                Apellido            │
│ [____________]        [____________]      │
│                                            │
│ DNI                   Fecha de nacimiento │
│ [____________]        [____________]      │
│                                            │
│ Telefono              Gmail               │
│ [____________]        [____________]      │
│                                            │
│ Direccion                                 │
│ [__________________________________]      │
│ [__________________________________]      │
│                                            │
│ Estado:                                   │
│ ( ⚪──● ) Activo                          │
│                                            │
│                    [Cancelar]  [Guardar]  │
└──────────────────────────────────────────┘
```

### Formulario paramétrico — modo EDICIÓN ("Modificar cliente")

```
┌──────────────────────────────────────────────────┐
│ ✏️ Modificar cliente                              │
│                                                    │
│ Nombre                 Apellido                   │
│ [Nicolas_____]         [Celaya______]              │
│                                                    │
│ DNI                    Fecha de nacimiento        │
│ [45115839____]         [16/11/03____]              │
│                                                    │
│ Telefono               Gmail                      │
│ [3875122693__]         [pablo@gmail.com]           │
│                                                    │
│ Direccion                                         │
│ [Avenida veteranos de malvinas y juncal entre la] │
│ [comisaria de palermo y el tanque de agua_______] │
│                                                    │
│ Estado:                                           │
│ ( ⚪──● ) Activo                                  │
│                                                    │
│                          [Cancelar]  [Guardar]    │
└──────────────────────────────────────────────────┘
```

### Formulario paramétrico — modo LECTURA ("Ver cliente")

```
┌──────────────────────────────────────────────────┐
│ 🔒 Ver cliente                                    │
│                                                    │
│ Nombre                 Apellido                   │
│ [Nicolas_____]         [Celaya______] (solo lect.)│
│                                                    │
│ DNI                    Fecha de nacimiento        │
│ [45115839____]         [16/11/03____]              │
│                                                    │
│ Telefono               Gmail                      │
│ [3875122693__]         [pablo@gmail.com]           │
│                                                    │
│ Direccion                                         │
│ [Avenida veteranos de malvinas y juncal entre la] │
│ [comisaria de palermo y el tanque de agua_______] │
│                                                    │
│ Estado:                                           │
│ ( ⚪──● ) Activo                                  │
│                                                    │
│ Mascotas vinculadas                               │
│ ┌──────────┬───────────┬────────┐                │
│ │ Nombre   │ Especie   │ Estado │                │
│ ├──────────┼───────────┼────────┤                │
│ │ Poppi    │ Perro     │ Activo │                │
│ ├──────────┼───────────┼────────┤                │
│ │ Azul     │ Perro     │ Activo │                │
│ └──────────┴───────────┴────────┘                │
│                                                    │
│                                        [Volver]   │
└──────────────────────────────────────────────────┘
```

### Modal de confirmación (cancelación del formulario + baja lógica)

```
┌───────────────────────────────────────┐
│      Confirmar cancelacion             │
│                                         │
│  Desea confirmar la cancelacion        │
│         del formulario?                │
│                                         │
│              [Cancelar]  [Volver]      │
└───────────────────────────────────────┘
```

> Además de la cancelación del formulario, hay **modal de confirmación de baja lógica**: se muestra al guardar con el toggle en Inactivo (patrón `BajaProveedorModal` / `DesactivarModal` del inventario).

## User flow

1. **Entrada:** el usuario viene del menú lateral → sección **Recepción** → **Clientes** (`/clientes`). También puede venir de Turnos/Mascotas cuando existan (para asociar el cliente).
2. **Acción principal:** ver el listado de clientes (default: solo activos, con búsqueda por nombre/documento/teléfono, filtro de estado, paginación). Desde ahí: **Nuevo cliente** (abre modal en INSERCIÓN), 👁️ **Ver** (modal en LECTURA) o ✏️ **Editar** (modal en EDICIÓN).
3. **Alta:** completa el formulario → valida formato (errores por campo en rojo) → valida DNI duplicado entre activos (rechaza con mensaje claro) → busca coincidencias por documento/email entre INACTIVOS (advertencia con los duplicados antes de confirmar) → guarda → **toast de éxito** → vuelve al listado.
4. **Baja:** edita un cliente activo → pasa el toggle a Inactivo → Guardar → **modal de confirmación de baja** → confirma → se guarda con estado inactivo (conserva historial) → **toast** → el listado pasa a mostrarlo solo si el filtro lo incluye, con indicador "Inactivo".
5. **Salida:** desde Ver cliente puede **Volver**; opcionalmente navegar a los futuros módulos Mascotas/Turnos.

## Fuente de datos (BD)

> Tablas definidas en el esquema (`docs/esquema-bd-front.md`, sección 8 "Clientes, Mascotas y Turnos (Sprint 3)" — DD Sprint 3 de la DBA, 2026-09-14). Resuelve el pendiente D5 para clientes/mascotas/turnos.

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `cliente` | id, nombre, apellido, documento, direccion, telefono, email, fecha_nacimiento, estado, created_at, updated_at | `id` → mascota.cliente_id; índices únicos parciales por documento/email entre activos |
| `mascota` | id, nombre, especie, estado | FK → cliente.id |
| `auditoria` (existe) | tabla, operacion, registro_id, usuario_id, fecha_hora, valores_anteriores, valores_nuevos | FK → usuario.id, ON DELETE SET NULL |
| `usuario` (existe) | id, nombre, apellido | responsable de la operación |

Referencias del esquema para el contrato:
- enum `estado_activo_inactivo` → `activo` / `inactivo` (mapear al estado del cliente).
- enum `modo_abm` → `INSERCION` / `EDICION` / `LECTURA` (los 3 modos del formulario paramétrico).
- `cliente_documento_activo_uidx` y `cliente_email_activo_uidx`: UNIQUE parcial `WHERE estado = 'activo'` — la validación de documento duplicado (HU) se extiende a **email duplicado entre activos**.
- Nota: `pago.tipo` hoy solo tiene `pago_proveedor`; el lado comercial cliente (cobranza_cliente / comprobante_cliente) sigue pendiente D5 — no bloquea esta HU.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `Sidebar` (layout) | Extender | agregar sección "Recepción" en `SECCIONES` con items Clientes (`Users`), Mascotas (`PawPrint`, ya importado), Turnos (icono lucide a definir) |
| `ProveedoresTable` | Reusar/Adaptar → `ClientesTable` | espejo exacto: columnas DNI, nombre y apellido, teléfono, Estado, Acciones (👁️/✏️) |
| `ProveedorFormModal` | Reusar/Adaptar → `ClienteFormModal` | modos crear/editar/ver + toggle de estado; modal paramétrico por `modo` (INSERCION/EDICION/LECTURA) |
| `FiltrosProveedores` | Reusar/Adaptar → `FiltrosClientes` | búsqueda por nombre/documento/teléfono + filtro estado (default Activo) |
| `Pagination` (ui) | Reusar | — |
| `StatusBadge` (ui) | Reusar | `EstadoClienteBadge` mapea: success=Activo, neutral=Inactivo |
| `ConfirmarDialog` / `BajaProveedorModal` | Reusar/Adaptar → `BajaClienteModal` | confirmación de baja lógica (toggle → Inactivo → guardar) |
| `Modal` (ui) | Reusar | base de los formularios y el modal de advertencia de duplicados |
| `Toast` + `useToast` (ui) | Reusar | toasts de éxito/error al guardar/modificar/baja (patrón `proveedores/page.tsx`) |
| `Input` (ui) con prop `error` | Reusar | validación por campo: borde `border-destructive` + mensaje `role="alert"` (patrón `ArticuloFormModal`: state `errors`/`touched`, `showError` tras blur) |
| Switch/toggle de estado | **Crear (nuevo)** | NO existe componente switch en `ui/`; crear `Switch` (o extender con checkbox custom) justificando en el plan |

## Datos hardcodeados

> Contrato real del esquema (sección 8, Sprint 3): `documento`/`email` únicos entre activos, `direccion`/`fecha_nacimiento` nullable, `telefono` NOT NULL, `id` numérico, fechas como ISO string, estado con valores del enum `estado_activo_inactivo`.

```ts
// BACKEND: GET /api/clientes — tablas definidas en DD Sprint 3 (sección 8 del esquema)
type Cliente = {
  id: number;                 // PK (cliente.id)
  nombre: string;             // varchar NOT NULL
  apellido: string;           // varchar NOT NULL
  documento: string;          // varchar NOT NULL — único entre activos (cliente_documento_activo_uidx)
  telefono: string;           // varchar NOT NULL
  email: string;              // varchar NOT NULL — único entre activos (cliente_email_activo_uidx)
  direccion: string | null;   // varchar (nullable)
  fecha_nacimiento: string | null; // date (nullable) → ISO string "YYYY-MM-DD"
  estado: "activo" | "inactivo";
};

const clientes: Cliente[] = [
  { id: 1, nombre: "Pablo", apellido: "Celaya", documento: "45115839", telefono: "3875122693", email: "pablo@gmail.com", direccion: "Avenida veteranos de malvinas y juncal", fecha_nacimiento: "2003-11-16", estado: "activo" },
  { id: 2, nombre: "Emiliano", apellido: "Aguirre", documento: "43115839", telefono: "3876566566", email: "emiliano@gmail.com", direccion: "Calle falsa 123", fecha_nacimiento: "1998-05-02", estado: "inactivo" },
  { id: 3, nombre: "Nicolas", apellido: "Celaya", documento: "46115839", telefono: "3875122000", email: "nico@gmail.com", direccion: "Av. Central 456", fecha_nacimiento: "1990-08-21", estado: "activo" },
];

// Mascotas vinculadas (placeholder, sección Ver cliente) — tabla definida en esquema sección 8
// BACKEND: GET /api/clientes/:id/mascotas
type Mascota = { id: number; nombre: string; especie: string; estado: "activo" | "inactivo" };
const mascotasCliente1: Mascota[] = [
  { id: 1, nombre: "Poppi", especie: "Perro", estado: "activo" },
  { id: 2, nombre: "Azul", especie: "Perro", estado: "activo" },
];

// Duplicados inactivos sugeridos para la advertencia al crear (misma documento/email en inactivos)
const duplicadosInactivos: Cliente[] = [
  { id: 2, nombre: "Emiliano", apellido: "Aguirre", documento: "43115839", telefono: "3876566566", email: "emiliano@gmail.com", direccion: "Calle falsa 123", fecha_nacimiento: "1998-05-02", estado: "inactivo" },
];

// Reglas de validación front (formato por campo)
const validaciones = {
  documento: /^\d{7,8}$/,            // 7-8 dígitos
  telefono: /^\+?\d{8,15}$/,         // con/sin prefijo, 8-15 dígitos
  email: /.+@.+\..+/,                // formato email básico
  fecha_nacimiento: /^\d{4}-\d{2}-\d{2}$/, // ISO
};
```

## Estados

- [x] Vacío (listado sin clientes → estado vacío con CTA "Nuevo cliente")
- [x] Cargando (esqueleto/loader en tabla; placeholder en sección Mascotas del Ver)
- [x] Error (listado y formulario: banner/errores por campo en rojo + toast de error en acciones)
- [x] Con datos (activos por defecto; inactivos solo si el filtro los incluye)

## Criterios de aceptación

- [ ] El listado muestra por defecto **solo clientes activos**, con búsqueda por nombre, documento o teléfono, filtro de estado y paginación (patrón de proveedores).
- [ ] Un cliente inactivo es visible en búsquedas con el indicador "Inactivo"; en la columna Acciones el inactivo solo ofrece **Ver** (sin Editar).
- [ ] El formulario es **un único componente paramétrico** que opera en 3 modos (INSERCIÓN / EDICIÓN / LECTURA) según parámetro; en LECTURA los campos están deshabilitados y no hay Guardar (solo Volver).
- [ ] Campos del formulario: nombre, apellido, documento, dirección, teléfono, email y fecha de nacimiento.
- [ ] **Validación de formato en el front:** campos con formato incorrecto se marcan **en rojo solo esos campos** con mensaje del error; los errores aparecen tras blur y se revalidan al corregir (patrón `ArticuloFormModal` `errors`/`touched` + `Input` con prop `error`).
- [ ] **Documento o email duplicado entre activos:** rechaza el alta/edición con mensaje claro (no permite guardar). Respaldado por los índices únicos parciales `cliente_documento_activo_uidx` y `cliente_email_activo_uidx` (`WHERE estado = 'activo'`).
- [ ] **Al crear:** busca coincidencias por documento y por email entre los registros **inactivos**; si encuentra, muestra advertencia con los registros duplicados **antes de confirmar el alta** (modal).
- [ ] **Baja lógica:** el toggle del formulario pasa a Inactivo → al guardar (alta o edición) se abre modal de confirmación de baja; al confirmar, el cliente queda inactivo y **conserva su historial** (compras, servicios, deudas).
- [ ] Un cliente inactivo **no puede registrar nuevos turnos** (regla de negocio documentada; el bloqueo real lo valida el back cuando exista el módulo de turnos).
- [ ] **Toasts** de éxito/error al guardar, modificar y dar de baja (patrón `useToast` de proveedores).
- [ ] **Auditoría:** cada alta, modificación y baja registra `auditoria` (tabla, operacion, registro_id, usuario_id, fecha_hora, valores_anteriores, valores_nuevos) — `// BACKEND:` con el endpoint correspondiente.
- [ ] **Menú lateral:** existe la sección **Recepción** con Clientes (activa), Mascotas y Turnos (items placeholder, sin ruta definida aún o ruta futura).
- [ ] Botones/acciones con colores, radios, espacios e iconos del design system Pet Bliss (tokens, `StatusBadge` como único punto de verdad de colores de estado, Lucide outline).
- [ ] Accesibilidad: focus visible, touch targets ≥ 44×44px, `role="alert"` en errores, `aria-live` en toasts.