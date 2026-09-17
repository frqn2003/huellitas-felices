# HU-TUR-02: Como recepcionista, quiero cambiar el estado de un turno (pendiente, confirmado, cancelado, atendido, no asistió) desde la vista de agenda, para mantener actualizada la agenda y saber qué pacientes fueron atendidos

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** tab nueva **Agenda** dentro de `/clientes` (sección Recepción, patrón `?tab=` de HU-TUR-01). Se agrega al array de `RecepcionTabs` (hoy: clientes, mascotas, turnos). Alternativa de ruta limpia: `/turnos/agenda`.
- **Relacionada con:** HU-TUR-01 (registro de turnos presenciales — tabla `turno`, catálogos y tab Turnos ya implementados), HU-CLI-01 / HU-MAS-01 (datos de cliente/mascota del turno). El esquema marca `estado_turno` como "Tabla de referencia fija (HU-TUR-02)".
- **Prioridad:** alta

## Propuesta inicial (del equipo)

Pantalla de **agenda semanal** (RECEPCIÓN - AGENDA) con la grilla de turnos de la semana, filtro por profesional y leyenda de estados. Desde un turno de la grilla se abre el detalle y se puede **cambiar el estado** del turno, con confirmación previa. Requerimientos de la HU:

- Estados disponibles como **tabla de referencia fija**: pendiente, confirmado, cancelado, atendido, no asistió.
- El cambio de estado se realiza **desde la vista de agenda**.
- Un turno **cancelado libera automáticamente el horario** para nuevas reservas.
- Un turno marcado **'no asistió'** queda registrado en el **historial del cliente** para seguimiento.
- Registra en **bitácora de auditoría** cada cambio de estado, con usuario responsable, fecha y hora.

> **Regla de transición de estados (confirmada con el equipo):** no se retrocede. `pendiente` → solo `confirmado` → solo `atendido | cancelado | no_asistio`. Los estados `cancelado`, `atendido` y `no_asistio` son **finales** (no admiten cambio). Un turno **pendiente no salta** directo a atendido/cancelado/no_asistio; primero debe confirmarse.

## Wireframe (idea)

### 1. Agenda semanal (tab Agenda de Recepción)

```
┌────────────────────────────────────────────────────────────────────┐
│                      📋 RECEPCIÓN - AGENDA                          │
├────────────────────────────────────────────────────────────────────┤
│ 👥 Clientes  🐾 Mascotas  ⏰ Turnos  📅 Agenda                      │
│                                                                     │
│ Filtrar por profesional: ▼ Seleccionar profesional      [⚙️ Filtros] │
│  (panel ⚙️: estado del turno, práctica, rango de fechas)            │
│                                                                     │
│ 📅 AGENDA SEMANAL — Semana del 21/09 al 27/09/2026                 │
│                                                                     │
│   LUNES    │  MARTES   │ MIÉRCOLES │  JUEVES   │  VIERNES  │  ...  │
│   21/09    │   22/09   │   23/09   │   24/09   │   25/09   │        │
│ ───────────────────────────────────────────────────────────────────│
│ 08:00-09:00│08:00-09:00│...        │08:00-09:00│08:00-09:00│        │
│ ┌─────────┐│┌─────────┐│           │┌─────────┐│┌─────────┐│        │
│ │00010     ││00012     ││           ││00015     ││00017     ││        │
│ │Pablo     ││Pablo     ││           ││Nicolas   ││Nicolas   ││        │
│ │Poppi     ││Poppi     ││           ││Azul      ││Azul      ││        │
│ │🔵ATENDIDO││✅CONFIRM.││           ││⚫CANCELAD││✅CONFIRM.││        │
│ └─────────┘└─────────┘└─────────┘└─────────┘└─────────┘│        │
│ ───────────────────────────────────────────────────────────────────│
│ (por franja horaria del profesional; celdas "Libre" vacías)        │
│                                                                     │
│ [◀] [▶]                                              Semana 1/52  │
│                                                                     │
│ LEYENDA: 🟡 PENDIENTE  ✅ CONFIRMADO  ⚫ CANCELADO  🔵 ATENDIDO  ❌ NO ASISTIÓ  │
└────────────────────────────────────────────────────────────────────┘
```

### 2. Detalle del turno + cambiar estado (modal/panel)

```
┌────────────────────────────────────────────────────────────────────┐
│                  [◀ VOLVER A AGENDA]                               │
│                                                                     │
│  🔢 00010 | Lunes 21/09/2026 — 08:00-09:00                         │
│  👤 CLIENTE                      ☐ PRÁCTICA                        │
│     Nombre: Pablo Celaya            Tipo: Consulta                 │
│     DNI: 45115839                   Duración: 30 min               │
│  🐾 MASCOTA                                                         │
│     Nombre: Poppi  •  Especie: Perro  •  Raza: Labrador            │
│  👨‍⚕️ PROFESIONAL                                                     │
│     Nombre: Dr. Juan Pérez  •  Especialidad: Médico                │
│                                                                     │
│  CAMBIAR ESTADO DEL TURNO                                          │
│                                                                     │
│  Estado actual:          Cambiar a:                                │
│  🔵 ATENDIDO (fijo)      ▼ (solo estados permitidos por la regla)  │
│                          • (para ATENDIDO: sin opciones — final)   │
│                                                                     │
│                    [Cancelar] [Guardar cambio]                     │
└────────────────────────────────────────────────────────────────────┘
```

### 3. Confirmar nuevo estado (dialog)

```
┌────────────────────────────────────────────────────────────────────┐
│                  ✅ CONFIRMAR NUEVO ESTADO                         │
│                                                                     │
│  ¿Desea confirmar el cambio de estado del turno #00010?            │
│                                                                     │
│                  [Cancelar] [Confirmar]                            │
└────────────────────────────────────────────────────────────────────┘
```

## User flow

1. **Viene de:** la sección Recepción → tab **Agenda**. La agenda semanal muestra los turnos de la semana (por profesional si se filtra); cada turno es una tarjeta/badge con su estado.
2. **Quiere:** sobre un turno de la grilla → abrir su **detalle** → **Cambiar estado** → elegir el **nuevo estado** (solo los permitidos por la regla de transición) → **Guardar cambio** → **confirmar** el cambio.
3. **Llega a:** la agenda actualizada con el nuevo badge de estado (y leyenda coherente); si fue **cancelado**, la franja queda disponible para nuevas reservas; si fue **no asistió**, el turno queda en ese estado en el historial del cliente. El cambio queda **auditado** (usuario responsable + fecha/hora).

El flujo es cancelable en cualquier momento (`[Cancelar]` descarta sin guardar). Un turno en estado **final** (cancelado/atendido/no_asistio) no ofrece opciones de cambio.

## Fuente de datos (BD)

Fuente central `turno` + catálogo `estado_turno` + `agenda_profesional` (para la grilla) + `auditoria` (bitácora). Misma Sección 8 del esquema de HU-TUR-01.

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `turno` | id, cliente_id, mascota_id, sucursal_id, agenda_profesional_id, practica_id, estado_id, fecha, hora_inicio, hora_fin, notas, usuario_id, fecha_creacion | FK → cliente, mascota, agenda_profesional, practica, estado_turno; el estado se actualiza vía `PATCH /turnos/:id` |
| `estado_turno` | id, nombre, es_final | catálogo: 1 pendiente, 2 confirmado, 3 cancelado (final), 4 atendido (final), 5 no_asistio (final). NO enum: tabla catálogo (prevista para esta HU) |
| `agenda_profesional` | id, agenda_semanal_id, usuario_id, hora_inicio, hora_fin, estado | franja del profesional; arma la grilla de la agenda (turnos agrupados por franja/fecha). FK → turno.agenda_profesional_id |
| `agenda_semanal` | id, agenda_id, dia_semana, hora_inicio, hora_fin, estado | día/horario base de la sucursal; `dia_semana` ISO 8601 (1 lunes … 7 domingo) |
| `cliente` | id, nombre, apellido, documento, estado | FK → turno.cliente_id (display en tarjeta/detalle) |
| `mascota` | id, cliente_id, nombre, especie, raza, estado | FK → turno.mascota_id (display en tarjeta/detalle) |
| `practica` | id, nombre, duracion_estimada_minutos, estado | FK → turno.practica_id (display de práctica/duración) |
| `usuario` | id, nombre, apellido, rol_id | profesional del turno (vía agenda_profesional.usuario_id); `RECEPCIONISTA_ID = 4` (Ana Martínez) para auditoría |
| `auditoria` | tabla='turno', operacion='UPDATE', registro_id=turno.id, usuario_id, fecha_hora, valores_anteriores, valores_nuevos | bitácora del cambio de estado (mismo contrato genérico de otros módulos: snapshot antes/después) |

Reglas de negocio ya modeladas en BD:

- **Cancelado libera horario:** el `EXCLUDE USING gist` anti-solapamiento de `turno` aplica `WHERE estado_id <> 3`; al pasar un turno a cancelado, el hueco deja de contar como ocupado (los helpers `haySuperposicion`/`horasOcupadas` de HU-TUR-01 ya excluyen estado 3).
- **Estados finales:** `estado_turno.es_final` (3, 4, 5) → no admiten más cambios. La regla de transición es de negocio/front + backend (`1→2`, `2→{3,4,5}`).
- Auditoría: el trigger/backend genérico de alta debe cubrir el `UPDATE` de `turno` con `valores_anteriores`/`valores_nuevos`.

> **PENDIENTE DBA:**
> - No existe tabla **"historial del cliente"** en el esquema. El requisito "no asistió queda registrado en el historial del cliente" se cumple con el **turno en estado no_asistio** (consultable en el historial de turnos del cliente/mascota — la tab Turnos de HU-TUR-01 ya filtra por estado). Si además se quiere seguimiento específico de inasistencias (ej: contador de no_asistio por cliente), falta modelo → coordinar con DBA.
> - Confirmar con el equipo de back que el `UPDATE` de `turno.estado_id` dispara el registro en `auditoria` (usuario de sesión + fecha_hora), igual que el INSERT de HU-TUR-01.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `RecepcionTabs` | Extender | agregar tab `"agenda"` (icono distinto a CalendarDays de Turnos, ej: `CalendarRange`); actualizar `TabRecepcion` |
| `EstadoTurnoBadge` | Reusar | ya mapea estado_id → variante/icono sobre `ui/StatusBadge` (1 pendiente=warning, 2 confirmado=success, 3 cancelado=danger, 4 atendido=info, 5 no_asistio=neutral); se usa en tarjetas de la grilla y en el detalle |
| `TurnoDetalleModal` | Extender | el detalle del turno ya existe (HU-TUR-01); agregarle la sección **"Cambiar estado"** (estado actual readonly + select de nuevo estado) |
| `ui/Modal` | Reusar | contenedor de detalle + formulario de cambio (sobre la grilla) |
| `ui/ConfirmarDialog` | Reusar | confirmación del cambio de estado (patrón de HU-TUR-01) |
| `ui/Select` | Reusar | cambio de estado; las opciones se filtran por la regla de transición (`transicionesEstado[estadoId]`) |
| `ui/Button`, `ui/Toast` | Reusar | guardar cambio + feedback (éxito / error al actualizar) |
| `ui/StatusBadge` | Reusar | vía `EstadoTurnoBadge` (regla 4 de reuso: nunca colores propios) |
| `Filtro por profesional` | Precedente `ui/Combobox` o `ui/Select` | "Filtrar por profesional" de la barra de filtros |
| **Grilla de agenda semanal** | **Crear** (módulo `turnos/`) | `AgendaSemanal`: grilla por día/franja con tarjetas de turno (id, cliente, mascota, badge de estado) + navegación ◀▶ de semanas + leyenda; no existe equivalente en el inventario |
| **Lista de transiciones** | **Crear** (módulo `turnos/`) | helper `transicionesEstado: Record<estadoId, estadoId[]>` (1→[2], 2→[3,4,5], 3/4/5→[]) en `src/data/turnos.ts`; alimenta el select y bloquea el botón en estados finales |

## Datos hardcodeados

Coherentes con el código existente (`src/data/turnos.ts`, `clientes.ts`, `mascotas.ts`): `id` numérico, `fecha` ISO, hora `HH:mm`, ids de FK reales. La grilla semanal deriva de turnos + franjas del profesional.

```ts
// Regla de transición de estados (HU-TUR-02, confirmada con el equipo)
// BACKEND: validar en PATCH /turnos/:id que la transición sea permitida.
const transicionesEstado: Record<number, number[]> = {
  1: [2],       // pendiente → confirmado
  2: [3, 4, 5], // confirmado → cancelado | atendido | no_asistio
  3: [],        // cancelado (final)
  4: [],        // atendido (final)
  5: [],        // no_asistio (final)
};

// Semana de ejemplo (lunes 21/09 a domingo 27/09/2026). La grilla agrupa por
// franja (agenda_profesional.id) y fecha. // BACKEND: GET /agenda/semana?fecha=&usuario_id=
const agendaTurnos: Turno[] = [
  {
    id: 10, clienteId: 1, mascotaId: 3, sucursalId: 1,
    agendaProfesionalId: 1, // Dr. Juan Pérez · lunes mañana (08-12)
    practicaId: 1, estadoId: 4, // atendido
    fecha: "2026-09-21", horaInicio: "08:00", horaFin: "08:30",
    notas: null, usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-19T10:00:00.000Z",
  },
  {
    id: 11, clienteId: 3, mascotaId: 1, sucursalId: 1,
    agendaProfesionalId: 1, practicaId: 3, estadoId: 2, // confirmado (Azul, control 15')
    fecha: "2026-09-21", horaInicio: "09:00", horaFin: "09:15",
    notas: null, usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-18T11:20:00.000Z",
  },
  {
    id: 12, clienteId: 1, mascotaId: 3, sucursalId: 1,
    agendaProfesionalId: 12, // Dra. Laura Gómez · martes tarde (14-18)
    practicaId: 2, estadoId: 2, // confirmado (cirugía 90')
    fecha: "2026-09-22", horaInicio: "14:00", horaFin: "15:30",
    notas: "Castración programada", usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-19T09:05:00.000Z",
  },
  {
    id: 13, clienteId: 3, mascotaId: 1, sucursalId: 1,
    agendaProfesionalId: 3, // Dr. Juan Pérez · martes mañana
    practicaId: 3, estadoId: 1, // pendiente
    fecha: "2026-09-22", horaInicio: "08:00", horaFin: "08:15",
    notas: null, usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-20T16:40:00.000Z",
  },
  {
    id: 14, clienteId: 1, mascotaId: 3, sucursalId: 1,
    agendaProfesionalId: 6, // Dr. Juan Pérez · miércoles tarde
    practicaId: 1, estadoId: 5, // no_asistio
    fecha: "2026-09-23", horaInicio: "15:00", horaFin: "15:30",
    notas: null, usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-17T12:30:00.000Z",
  },
  {
    id: 15, clienteId: 3, mascotaId: 1, sucursalId: 1,
    agendaProfesionalId: 7, // Dr. Juan Pérez · jueves mañana
    practicaId: 3, estadoId: 3, // cancelado (liberó el hueco)
    fecha: "2026-09-24", horaInicio: "08:00", horaFin: "08:15",
    notas: "Cliente canceló", usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-18T08:45:00.000Z",
  },
  {
    id: 16, clienteId: 1, mascotaId: 3, sucursalId: 1,
    agendaProfesionalId: 13, // Dra. Laura Gómez · jueves mañana
    practicaId: 2, estadoId: 4, // atendido
    fecha: "2026-09-24", horaInicio: "09:00", horaFin: "10:30",
    notas: null, usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-16T14:10:00.000Z",
  },
  {
    id: 17, clienteId: 3, mascotaId: 1, sucursalId: 1,
    agendaProfesionalId: 9, // Dr. Juan Pérez · viernes mañana
    practicaId: 3, estadoId: 2, // confirmado
    fecha: "2026-09-25", horaInicio: "09:00", horaFin: "09:15",
    notas: null, usuarioId: RECEPCIONISTA_ID, fechaCreacion: "2026-09-20T18:25:00.000Z",
  },
];

// Detalle del turno con datos display (JOINs que ya hace el front con
// clientes/mascotas/profesionales/practicas de src/data).
// Ejemplo: el turno id 10 seleccionado en la grilla →
// { cliente: "Pablo Celaya", dni: "45115839", mascota: "Poppi", especie: "Perro",
//   profesional: "Dr. Juan Pérez", practica: "Consulta", duracionMinutos: 30 }
```

> Al guardar el cambio: `// BACKEND: PATCH /turnos/:id { estado_id }` — el backend valida la transición permitida, completa la auditoría (UPDATE en `auditoria` con tabla='turno', operacion='UPDATE', registro_id, usuario_id de sesión, valores_anteriores/nuevos) y refresca la agenda. Si el nuevo estado es `cancelado`, el horario queda libre al instante (EXCLUDE `estado_id <> 3`).

## Estados

- [x] Vacío — semana sin turnos o profesional sin turnos en el período: celdas "Libre" / mensaje "No hay turnos para esta semana"
- [x] Cargando — carga de la agenda y guardado del cambio de estado (spinner / skeleton)
- [x] Error — fallo al consultar la agenda o al actualizar el estado (toast error, no cambia el badge)
- [x] Con datos — grilla semanal con tarjetas de turno y leyenda de estados; detalle + cambio de estado disponibles

## Criterios de aceptación

- [ ] La tab **Agenda** existe en **Recepción** (junto a Clientes/Mascotas/Turnos) y muestra la **agenda semanal** del profesional (filtro "por profesional") con navegación ◀▶ de semanas y leyenda de estados (pendiente, confirmado, cancelado, atendido, no asistió).
- [ ] Cada turno de la grilla muestra id, cliente, mascota y **badge de estado** (`EstadoTurnoBadge`); las franjas sin turno muestran "Libre".
- [ ] Click en un turno de la grilla abre el **detalle** (cliente, mascota, profesional, práctica/duración, fecha/hora) con la sección **Cambiar estado**: estado actual en solo lectura + listado de nuevos estados.
- [ ] El listado de nuevos estados ofrece **solo las transiciones permitidas** por la regla: `pendiente` → `confirmado`; `confirmado` → `atendido | cancelado | no_asistio`.
- [ ] Un turno en estado **final** (cancelado/atendido/no_asistio) **no ofrece opciones de cambio** (no se puede retroceder).
- [ ] El cambio se confirma con un dialog (`ConfirmarDialog`); al guardar se actualiza la agenda con el nuevo badge y se muestra un toast de éxito.
- [ ] Un turno **cancelado** libera el horario de agenda para nuevas reservas (mismo comportamiento que el anti-solapamiento de HU-TUR-01: los turnos cancelados no ocupan hueco).
- [ ] Un turno marcado **no asistió** queda en ese estado y es visible en el **historial de turnos del cliente** (tab Turnos, filtro por estado) para seguimiento.
- [ ] Cada cambio de estado queda en la **bitácora de auditoría**: `auditoria` con tabla='turno', operacion='UPDATE', registro_id = turno.id, usuario_id = recepcionista logueado (`RECEPCIONISTA_ID` en demo), fecha_hora, y valores_anteriores/nuevos con el cambio.
- [ ] Si el estado no cambia (se selecciona el mismo) o la transición no es válida, el botón de guardar no habilita / el backend rechaza con error claro.
- [ ] Accesibilidad: badges con texto + color (no solo color), leyenda textual, foco visible y touch targets ≥ 44px en tarjetas y controles.