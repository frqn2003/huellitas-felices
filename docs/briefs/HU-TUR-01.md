# HU-TUR-01: Como recepcionista, quiero registrar un turno para un cliente y su mascota con fecha, hora y profesional, para organizar la agenda de atención de la sucursal

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/recepcion/turnos` — la tab "Turnos" ya existe en `RecepcionTabs` (icono `CalendarDays`); hoy muestra un placeholder "La agenda de turnos llega en una próxima entrega (HU-TUR)" en `src/app/clientes/page.tsx` (líneas 472–487). `/disenar` completa esa tab (posiblemente página propia `/turnos`).
- **Relacionada con:** HU-CLI-01 (clientes), HU-MAS-01 (mascotas). Futuras: HU-TUR-02 (agenda), HU-TUR-03 (editar/cancelar turno — ver nota de alcance abajo).
- **Prioridad:** alta

## Propuesta inicial (del equipo)

Registrar un turno presencial en recepción para un cliente y una de sus mascotas, asignando profesional, práctica, fecha y hora. El flujo es un wizard de 3 pasos (cliente → mascota → profesional/fecha/hora), con resumen, confirmación y detalle. El turno queda visible de inmediato en la agenda y se audita su alta.

Requerimientos de la HU:

- Selección de cliente, mascota (asociada al cliente), profesional, fecha y hora.
- Valida la disponibilidad del profesional en el horario solicitado antes de confirmar; rechaza la superposición.
- Muestra confirmación visual del turno creado, con resumen de los datos cargados.
- El turno queda visible de inmediato en la agenda del profesional y de la sucursal.
- Registra en bitácora de auditoría el alta del turno.

> **Nota de alcance (supuesto):** el wireframe incluye "Editar turno" (una pantalla con scroll siguiendo el mismo recorrido de crear). Este brief documenta esa pantalla como diseño relacionado; si el equipo quiere, el alta de turno (HU-TUR-01) cubre solo crear + detalle, y editar/cancelar pasa a HU-TUR-03.

> **Nota de estados (supuesto):** el estado del turno proviene del catálogo `estado_turno` (1 pendiente, 2 confirmado, 3 cancelado, 4 atendido, 5 no_asistio). Un turno se crea **pendiente**; si la práctica requiere confirmación ("Requiere confirmación"), queda pendiente hasta que el profesional la confirme (confirmación = HU futura).

## Wireframe (idea)

### 1. Tab Turnos (Recepción) — lista con filtros y paginación

```
┌────────────────────────────────────────────────────────────────────┐
│                      📋 RECEPCIÓN                                  │
├────────────────────────────────────────────────────────────────────┤
│ 👥 Clientes  🐾 Mascotas  ⏰ Turnos  📅 Agenda                     │
│                                            [🔍] [⚙️ Filtros]       │
│ Activo x                                                           │
├────────────────────────────────────────────────────────────────────┤
│ ID   │ Fecha    │ DNI    │ Cliente  │ Mascota │ Especie│ Estado    │
├────────────────────────────────────────────────────────────────────┤
│ 0001 │11/10/26 │444444 │Juan Pérez│Firulais│Perro  │Pendiente ✅  │
├────────────────────────────────────────────────────────────────────┤
│                                                  Página 1 de 10    │
└────────────────────────────────────────────────────────────────────┘
```

Aclaración de búsqueda y filtros:

- **[🔍] Buscador:** busca por **cliente** (nombre/DNI), **profesional** (nombre/DNI) y **especialidad**.
- **[⚙️ Filtros]:** filtra por **estado del turno** (pendiente, confirmado, cancelado, atendido, no asistió) y por **fecha** (rango; patrón `FiltrosMovimientos`). El switch "Activo x" de la idea aplica al filtro por defecto del módulo.

### 2. Nuevo turno — Paso 1: Cliente (buscar y seleccionar)

```
┌────────────────────────────────────────────────────────────────────┐
│              ➕ NUEVO TURNO - PASO 1: CLIENTE                      │
├────────────────────────────────────────────────────────────────────┤
│  Buscar cliente por DNI, Nombre        [🔍]                        │
│                                                                     │
│  📍 Resultados encontrados:                                        │
│  ☑️ Juan Pérez          DNI: 24092601                               │
│  ☐ Pablo Celaya         DNI: 55678987                               │
│                                    [Cancelar] [Seleccionar]         │
└────────────────────────────────────────────────────────────────────┘
```

### 3. Nuevo turno — Paso 2: Mascota (seleccionar mascota del cliente)

```
┌────────────────────────────────────────────────────────────────────┐
│              ➕ NUEVO TURNO - PASO 2: MASCOTA                      │
├────────────────────────────────────────────────────────────────────┤
│  🐾 Mascotas registradas del cliente:                              │
│  ☑️ Mascota 1                                                      │
│     Nombre: Firulais      Especie: Perro                           │
│     Raza: Labrador retriever                                       │
│  ☐ Mascota 2                                                       │
│     Nombre: Rex           Especie: Perro                           │
│     Raza: Pastor alemán                                            │
│                                    [Cancelar] [Seleccionar]        │
└────────────────────────────────────────────────────────────────────┘
```

### 4. Nuevo turno — Paso 3: Profesional + práctica + fecha + hora

```
┌────────────────────────────────────────────────────────────────────┐
│              ➕ NUEVO TURNO - PASO 3: PROFESIONAL                  │
├────────────────────────────────────────────────────────────────────┤
│  Buscar por especialidad         [🔍]                               │
│  👨‍⚕️ Profesionales encontrados:                                     │
│  ☑️ Julio García         DNI: 25765897                              │
│     Especialidad: Médico                                           │
│  ☐ Franco Giardino       DNI: 26567444                             │
│     Especialidad: Cirujano                                         │
│     Práctica: ☑️ Seleccionar práctica                              │
│            • Cirugía (90 min)  • Control (15 min)                  │
│                                                                     │
│  📅 Seleccionar fecha:      ⏰ Seleccionar hora:                    │
│  ◉ Lun 23/09/2026             ◉ 08:00-12:00                        │
│  ○ Mar 24/09/2026             ○ 14:00-18:00                        │
│  ○ Mié 25/09/2026             ○ 20:00-22:00                        │
│  ○ Jue 26/09/2026                                                  │
│  ○ Vie 27/09/2026                                                  │
│  ○ Dom 29/09/2026                                                  │
│                                    [Cancelar] [Continuar]          │
└────────────────────────────────────────────────────────────────────┘
```

### 5. Resumen del turno

```
┌────────────────────────────────────────────────────────────────────┐
│                    📋 RESUMEN DEL TURNO                            │
├────────────────────────────────────────────────────────────────────┤
│  👤 DATOS DEL CLIENTE                                              │
│     Nombre: Juan Pérez  •  DNI: 24092601                           │
│     Email: juanperez@gmail.com  •  Teléfono: 3875678944            │
│  🐾 DATOS DE LA MASCOTA                                            │
│     Nombre: Firulais  •  Especie: Perro  •  Raza: Labrador         │
│     Sexo: Macho  •  Peso: 28.5 kg  •  Edad: 4 años                 │
│  👨‍⚕️ DATOS DEL TURNO                                                │
│     Profesional: Julio García  •  Fecha: Lunes, 23 Sept 2026       │
│     Hora: 08:00 - 12:00  •  Especialidad: Médico                   │
│     Práctica: Consulta  •  Duración: 30 min (Requiere confirmación)│
│  📝 Notas (opcional): [ Control anual                         ]    │
│                                    [Cancelar] [Finalizar]          │
└────────────────────────────────────────────────────────────────────┘
```

### 6. Confirmar turno (dialog)

```
┌────────────────────────────────────────────────────────────────────┐
│                  ✅ CONFIRMAR TURNO                                │
├────────────────────────────────────────────────────────────────────┤
│  ¿Desea confirmar la creación del turno?                           │
│                           [Cancelar] [Confirmar]                   │
└────────────────────────────────────────────────────────────────────┘
```

### 7. Detalle del turno (post-alta / ver)

```
┌────────────────────────────────────────────────────────────────────┐
│                    👁️ DETALLE DEL TURNO                            │
├────────────────────────────────────────────────────────────────────┤
│  👤 DATOS DEL CLIENTE (nombre, DNI, email, teléfono)               │
│  🐾 DATOS DE LA MASCOTA (nombre, especie, raza, sexo, peso, edad)  │
│  👨‍⚕️ DATOS DEL TURNO                                                │
│     Profesional, fecha, hora, especialidad, práctica, duración     │
│     Estado: PENDIENTE (Requiere confirmación)                      │
│     Creado por: Juan Martínez (Recepcionista)                      │
│     Fecha/hora de creación: 20/09/2026 - 14:35                     │
│  📝 Notas: Control anual                                           │
│                                                          [Volver]  │
└────────────────────────────────────────────────────────────────────┘
```

### 8. Editar turno (futuro — HU-TUR-03) — una pantalla con scroll

```
┌────────────────────────────────────────────────────────────────────┐
│                     ✏️ EDITAR TURNO                                │
├────────────────────────────────────────────────────────────────────┤
│  (Todo en una pantalla con barra de desplazamiento, mostrando el   │
│   mismo recorrido de crear)                                        │
│  PASO 1: SELECCIONAR CLIENTE    ┌────────────────────────────┐     │
│                                 │                            │     │
│                                 └────────────────────────────┘     │
│  PASO 2: SELECCIONAR MASCOTA    ┌────────────────────────────┐     │
│                                 │                            │     │
│                                 └────────────────────────────┘     │
│  PASO 3: SELECCIONAR PROFESIONAL ┌───────────────────────────┐     │
│                                  │                           │     │
│                                  └───────────────────────────┘     │
│                                    [Cancelar] [Continuar]          │
└────────────────────────────────────────────────────────────────────┘
```

## User flow

1. **Viene de:** la sección Recepción → tab **Turnos** (lista de turnos de la sucursal con filtros y paginación). También puede llegar desde el detalle de un cliente o mascota si se quiere cargar un turno directo (opcional, ver relacionadas).
2. **Quiere:** crear un turno → botón **Nuevo turno** → wizard: buscar/seleccionar **cliente** → seleccionar **mascota** (del cliente) → seleccionar **profesional** + **práctica** + **fecha** + **hora** (franja del profesional) → ver **resumen** (con notas opcionales) → **confirmar**.
3. **Llega a:** detalle del turno creado con confirmación visual; el turno queda visible de inmediato en la agenda del profesional y de la sucursal (misma vista/consulta). Al volver, la lista de turnos muestra el nuevo registro. El alta queda registrada en la bitácora de auditoría.

Flujo cancelable en cualquier paso (`[Cancelar]` descarta sin guardar).

## Fuente de datos (BD)

Tabla central `turno` + catálogos y tablas relacionadas del esquema (`docs/esquema-bd-front.md`, Sección 8 — Sprint 3).

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `turno` | id, cliente_id, mascota_id, sucursal_id, agenda_profesional_id, practica_id, estado_id, fecha, hora_inicio, hora_fin, notas, usuario_id, fecha_creacion | FK → cliente, mascota, sucursal, agenda_profesional, practica, estado_turno, usuario (quien carga = recepcionista) |
| `cliente` | id, nombre, apellido, documento, telefono, email, estado | FK → turno.cliente_id |
| `mascota` | id, cliente_id, nombre, especie, raza, sexo, peso, fecha_nacimiento, estado | FK → turno.mascota_id |
| `usuario` | id, nombre, apellido, dni, rol_id | rol `Veterinario` = profesional; FK → agenda_profesional.usuario_id |
| `practica` | id, nombre, duracion_estimada_minutos, estado | valores: consulta, cirugia, control; FK → turno.practica_id |
| `estado_turno` | id, nombre, es_final | catálogo: 1 pendiente, 2 confirmado, 3 cancelado (final), 4 atendido (final), 5 no_asistio (final). **No es enum: es tabla catálogo** |
| `agenda_semanal` | id, agenda_id, dia_semana, hora_inicio, hora_fin, estado | franjas generales de atención de la sucursal; FK → agenda_profesional.agenda_semanal_id. `dia_semana` = 1 lunes … 7 domingo (ISO 8601) |
| `agenda_profesional` | id, agenda_semanal_id, usuario_id, hora_inicio, hora_fin, estado | franjas del veterinario; FK → turno.agenda_profesional_id |
| `sucursal` | id, nombre | derivada: turno.sucursal_id se completa desde agenda_profesional (no la carga la recepcionista) |
| `auditoria` | tabla='turno', operacion='INSERT', registro_id, usuario_id, fecha_hora, valores_nuevos | bitácora de alta del turno |

Reglas de negocio ya modeladas en BD (para validación de disponibilidad):

- Anti-solapamiento: constraint `EXCLUDE USING gist` sobre (agenda_profesional_id, fecha, rango hora_inicio–hora_fin) **solo cuando estado_id <> 3** (cancelado libera el hueco). El backend igual valida con `OVERLAPS` antes del INSERT.
- CHECK `hora_fin > hora_inicio` en `turno` y en las agenda*.
- La franja del profesional debe caer dentro de `agenda_semanal` y el usuario debe tener rol veterinario (validado en backend).

> **PENDIENTE DBA:**
> - Falta modelo de **especialidad** del veterinario (el wireframe muestra "Especialidad: Médico/Cirujano"; `usuario` no tiene ese campo ni existe tabla `especialidad`).
> - Falta enum/CHECK para `mascota.especie` y `mascota.sexo` (hoy `varchar` sin restricción).
> - La Sección 8 (tablas cliente, mascota, practica, estado_turno, agenda_semanal, agenda_profesional, turno) aún no está creada en BD (`schema2.sql`); el equipo de back debe crearla con índices y el EXCLUDE.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `RecepcionTabs` | Reusar | la tab "turnos" ya está declarada (`TabRecepcion = "clientes" \| "mascotas" \| "turnos"`, icono CalendarDays); hoy placeholder |
| `ui/Combobox` | Reusar | Paso 1 (buscar cliente: `documento · nombre apellido`) y Paso 3 (profesional por especialidad). Ya se usa para dueño en `MascotaFormModal` |
| `ui/Modal` | Reusar | contenedor del wizard por pasos, detalle y edición; `max-h-[90vh]` + `overflow-y-auto` resuelve la edición con scroll |
| `ui/ConfirmarDialog` | Reusar | confirmación de creación del turno (sobre Modal, botón destructive) |
| `ui/StatusBadge` | Extender | crear wrapper `EstadoTurnoBadge` (nuevo, módulo `turnos/`): mapea estado_turno → variante (pendiente→warning, confirmado→success, cancelado→danger, atendido→info, no_asistio→neutral); nunca define colores |
| `ui/Pagination` | Reusar | lista de turnos; pasar `itemLabel: "turnos"` |
| `ui/Input` | Reusar | `type="date"` para fecha (precedente en modales); hora dentro de la franja con `ui/Select` o `type="datetime-local"` (precedente `movimientos/MovimientoFormModal`) |
| `ui/Select` | Reusar | práctica, franja/hora |
| `ui/Button`, `ui/Toast` | Reusar | acciones y feedback de creación/error de disponibilidad |
| Stepper/wizard | **Crear** (módulo `turnos/`) | no existe wizard genérico; precedente de flujo por pasos: `comprobantes/ComprobantesContent` (estado `paso === 1/2` con `AnimatePresence mode="wait"`) |
| Filtros de turnos | Crear/Extender | buscador por cliente/profesional/especialidad (patrón `FiltrosClientes`) + filtro por estado y fecha (patrón `FiltrosMovimientos`) |
| Empty state | Patrón inline | `{hasActiveFilters ? "Sin resultados" : "No hay turnos registrados"}` (no es componente compartido) |

## Datos hardcodeados

Respetan el esquema: `id` numérico, `fecha` ISO (`YYYY-MM-DD`), hora `HH:mm`, ids de FKs coherentes, estados del catálogo `estado_turno`.

```ts
// Catálogo estado_turno (id → nombre, es_final)
const estadosTurno = [
  { id: 1, nombre: "pendiente", es_final: false },
  { id: 2, nombre: "confirmado", es_final: false },
  { id: 3, nombre: "cancelado", es_final: true },
  { id: 4, nombre: "atendido", es_final: true },
  { id: 5, nombre: "no_asistio", es_final: true },
];

// Prácticas
const practicas = [
  { id: 1, nombre: "consulta", duracion_estimada_minutos: 30 },
  { id: 2, nombre: "cirugia", duracion_estimada_minutos: 90 },
  { id: 3, nombre: "control", duracion_estimada_minutos: 15 },
];

// Clientes (FK cliente.id)
const clientes = [
  { id: 1, nombre: "Juan", apellido: "Pérez", documento: "24092601", telefono: "3875678944", email: "juanperez@gmail.com" },
  { id: 2, nombre: "Pablo", apellido: "Celaya", documento: "55678987", telefono: "3875210098", email: "pcelaya@mail.com" },
];

// Mascotas (FK mascota.id → cliente.id). especie/sexo varchar libres (PENDIENTE DBA)
const mascotas = [
  { id: 1, cliente_id: 1, nombre: "Firulais", especie: "Perro", raza: "Labrador retriever", sexo: "Macho", peso: 28.5, fecha_nacimiento: "2022-06-10" },
  { id: 2, cliente_id: 1, nombre: "Rex", especie: "Perro", raza: "Pastor alemán", sexo: "Macho", peso: 24.0, fecha_nacimiento: "2023-01-15" },
];

// Profesionales (usuario rol Veterinario; especialidad PENDIENTE DBA)
const profesionales = [
  { id: 2, nombre: "Julio", apellido: "García", dni: "25765897", especialidad: "Médico" },
  { id: 3, nombre: "Franco", apellido: "Giardino", dni: "26567444", especialidad: "Cirujano" },
];

// Franjas del profesional para la fecha elegida (agenda_profesional)
const franjas = [
  { id: 1, usuario_id: 2, fecha: "2026-09-23", hora_inicio: "08:00", hora_fin: "12:00" },
  { id: 2, usuario_id: 2, fecha: "2026-09-23", hora_inicio: "14:00", hora_fin: "18:00" },
  { id: 3, usuario_id: 2, fecha: "2026-09-23", hora_inicio: "20:00", hora_fin: "22:00" },
];

// Lista de turnos de la sucursal (tab Turnos); campos display desnormalizados,
// pero con ids reales de FK. // BACKEND: GET /turnos?fecha=&estado_id=&q=
const turnos = [
  {
    id: 1,
    cliente_id: 1, mascota_id: 1, sucursal_id: 1, agenda_profesional_id: 1,
    practica_id: 1, estado_id: 1, // pendiente
    fecha: "2026-10-11", hora_inicio: "09:00", hora_fin: "09:30",
    notas: "Control anual", usuario_id: 4, // recepcionista que cargó
    // display:
    cliente: "Juan Pérez", dni: "24092601", mascota: "Firulais", especie: "Perro",
    profesional: "Julio García",
  },
  {
    id: 2,
    cliente_id: 2, mascota_id: 2, sucursal_id: 1, agenda_profesional_id: 1,
    practica_id: 2, estado_id: 2, // confirmado
    fecha: "2026-10-11", hora_inicio: "10:00", hora_fin: "11:30",
    notas: null, usuario_id: 4,
    // display:
    cliente: "Pablo Celaya", dni: "55678987", mascota: "Rex", especie: "Perro",
    profesional: "Julio García",
  },
];
```

> Al confirmar el alta: `// BACKEND: POST /turnos` con { cliente_id, mascota_id, agenda_profesional_id, practica_id, fecha, hora_inicio, hora_fin, notas } — `sucursal_id` y `estado_id` los completa el backend (deriva sucursal de agenda_profesional, estado inicial pendiente) y registra el INSERT en `auditoria`.

## Estados

- [x] Vacío — tabla sin turnos: "No hay turnos registrados"
- [x] Cargando — lista y búsquedas del wizard (spinner / skeleton)
- [x] Error — fallo de lista, búsqueda o alta; **error de disponibilidad**: superposición con otro turno del profesional en fecha/hora (mensaje claro, no avanza)
- [x] Con datos — lista paginada; flujo wizard con datos cargados

## Criterios de aceptación

- [ ] Desde la tab **Turnos** de Recepción, el recepcionista abre **Nuevo turno** y recorre el wizard: Paso 1 cliente → Paso 2 mascota → Paso 3 profesional + práctica + fecha + hora.
- [ ] En la lista de turnos, el **buscador** encuentra por cliente (nombre/DNI), profesional (nombre/DNI) y especialidad; el **panel de filtros** permite filtrar por estado del turno (pendiente, confirmado, cancelado, atendido, no asistió) y por rango de fecha.
- [ ] Paso 1: buscador de cliente por DNI o nombre (Combobox, solo clientes `activo`); al seleccionar, avanza. No se puede crear turno sin cliente.
- [ ] Paso 2: lista las mascotas `activo` del cliente seleccionado; al seleccionar, avanza.
- [ ] Paso 3: buscador de profesional por especialidad; selección de práctica (consulta/cirugia/control) que determina la duración estimada; selección de fecha (días hábiles siguientes) y franja horaria del profesional (agenda_profesional).
- [ ] **Validación de disponibilidad:** antes de confirmar, valida que el profesional no tenga superposición (regla anti-solapamiento, estado <> cancelado) en la fecha/hora; si la hay, rechaza con mensaje claro y no avanza.
- [ ] El **resumen** muestra datos del cliente, la mascota y el turno (profesional, fecha, hora, práctica, duración) con campo de notas opcional.
- [ ] La **confirmación** es un dialog; al confirmar se crea el turno con estado `pendiente` (1) y se muestra **confirmación visual** con el resumen (detalle del turno).
- [ ] El turno creado queda **visible de inmediato** en la agenda del profesional y de la sucursal (misma fuente de datos / consulta).
- [ ] El alta queda registrada en **bitácora de auditoría**: `auditoria` con tabla='turno', operacion='INSERT', usuario_id = recepcionista logueado, valores_nuevos con los datos del turno.
- [ ] `sucursal_id` del turno se deriva del profesional/franja (backend), no se pide en el formulario.
- [ ] `[Cancelar]` en cualquier paso descarta el flujo sin guardar.
- [ ] El formulario respeta el esquema: `id` numérico, fecha ISO, hora `HH:mm`, `hora_fin > hora_inicio`, duración según práctica.
- [ ] (Futuro — HU-TUR-03) **Editar turno** en una pantalla con scroll que repite el recorrido de crear; **cancelar turno** libera el hueco de agenda (estado 3 es_final).