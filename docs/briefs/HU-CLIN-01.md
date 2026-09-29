# HU-CLIN-01: Como veterinario, necesito registrar el detalle de la atención de una consulta médica: diagnóstico, signos vitales, tratamiento/prescripción e insumos aplicados, para documentar la atención de la mascota en su historia clínica y habilitar su cobro en mostrador

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/consulta/:turnoId` — pantalla dedicada de atención. Se abre automáticamente al cambiar el estado de un turno a "atendido" desde la Agenda (HU-TUR-02). También es accesible desde el historial clínico de la mascota.
- **Relacionada con:**
  - HU-TUR-02 (Agenda — dispara la apertura al cambiar estado a "atendido")
  - HU-MAS-01 (Mascotas — historia clínica)
  - HU-CLI-01 (Clientes — titular)
  - HU-STK-01 (Artículos — catálogo de insumos/medicamentos aplicados)
  - HU-VTA-01 (Caja — recibe el detalle de insumos para cobro; futura HU)
- **Prioridad:** alta
- **Menú lateral:** El sistema tiene el menú colapsable del `Sidebar` en todas las pantallas.

## Wireframe (idea)

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  🩺 Registro de Consulta Médica                                       [Perfil] │
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │  [← Volver a Agenda]                                                            │
│      │                                                                                  │
│      │  ┌── DATOS DEL TURNO (solo lectura, precargados) ────────────────────────────┐  │
│      │  │  📋 Turno #10  •  Lunes 21/09/2026  •  08:00 – 08:30                     │  │
│      │  │                                                                            │  │
│      │  │  👤 Cliente       Pablo Celaya (DNI: 45115839)                            │  │
│      │  │  🐾 Mascota       Poppi — Perro Labrador, Hembra, 28 kg                   │  │
│      │  │  👨‍⚕️ Profesional   Dr. Juan Pérez                                         │  │
│      │  │  📌 Práctica      Consulta (30 min)                                        │  │
│      │  └───────────────────────────────────────────────────────────────────────────┘  │
│      │                                                                                  │
│      │  ┌── SIGNOS VITALES ──────────────────────────────────────────────────────────┐  │
│      │  │  Temperatura (°C) *  [ 38.5     ]   Frec. Cardíaca (lpm)  [ 90      ]    │  │
│      │  │  Peso (kg)           [ 28.0     ]   (actualiza el peso de la mascota)     │  │
│      │  │  Estado físico general   [_________________________________] (texto libre) │  │
│      │  └───────────────────────────────────────────────────────────────────────────┘  │
│      │                                                                                  │
│      │  ┌── ANAMNESIS Y DIAGNÓSTICO ─────────────────────────────────────────────────┐  │
│      │  │  Motivo de consulta *   [___________________________________]              │  │
│      │  │  Diagnóstico *          [___________________________________]              │  │
│      │  │  Tratamiento indicado   [___________________________________] (textarea)   │  │
│      │  └───────────────────────────────────────────────────────────────────────────┘  │
│      │                                                                                  │
│      │  ┌── MEDICACIÓN / INSUMOS APLICADOS ──────────────────────────────────────────┐  │
│      │  │  [➕ Agregar ítem]                                                         │  │
│      │  │  ┌───────────────────────────────────────────────────────────────────┐    │  │
│      │  │  │  Artículo/Insumo            │ Cantidad │ Unidad │              │  │    │  │
│      │  │  ├───────────────────────────────────────────────────────────────────┤    │  │
│      │  │  │  Amoxicilina 500mg          │   2.00   │ Unidad │  [🗑 Quitar]  │  │    │  │
│      │  │  │  Jeringa 5ml                │   1.00   │ Unidad │  [🗑 Quitar]  │  │    │  │
│      │  │  └───────────────────────────────────────────────────────────────────┘    │  │
│      │  └───────────────────────────────────────────────────────────────────────────┘  │
│      │                                                                                  │
│      │                          [Cancelar]  [Finalizar consulta]                        │
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

--- ESTADO: CONSULTA CERRADA (solo lectura) ---

┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│      │  🩺 Consulta #10  •  Lunes 21/09/2026  08:00                          [Perfil] │
│      │──────────────────────────────────────────────────────────────────────────────────│
│      │  [← Volver]                                              [➕ Agregar nota]       │
│      │                                                                                  │
│      │  🔒 Esta consulta está cerrada. Solo puede agregar una nota aclaratoria.         │
│      │                                                                                  │
│      │  [DATOS DEL TURNO — solo lectura, igual que arriba]                             │
│      │  [SIGNOS VITALES — solo lectura]                                                 │
│      │  [ANAMNESIS Y DIAGNÓSTICO — solo lectura]                                        │
│      │  [MEDICACIÓN / INSUMOS — solo lectura]                                           │
│      │                                                                                  │
│      │  ┌── NOTAS ACLARATORIAS ──────────────────────────────────────────────────────┐  │
│      │  │  [Sin notas aclaratorias]   — o listado de notas con autor + fecha/hora — │  │
│      │  └───────────────────────────────────────────────────────────────────────────┘  │
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

--- MODAL: Agregar nota aclaratoria ---

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Agregar nota aclaratoria]                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  📝 Agregar nota aclaratoria                                                    │   │
│  │                                                                                  │   │
│  │  Nota *  [___________________________________________________]  (texto libre)   │   │
│  │                                                                                  │   │
│  │  Profesional  [ Dr. Juan Pérez ]  (solo lectura, usuario logueado)              │   │
│  │  Fecha/hora   [ 28/09/2026 23:11 ]  (auto)                                      │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Guardar nota]                   │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

--- MODAL: Confirmar finalizar consulta ---

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Confirmar finalización]                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ ¿Finalizar la consulta?                                                     │   │
│  │                                                                                  │   │
│  │  Al finalizar, la consulta quedará cerrada y el turno habilitado para cobro      │   │
│  │  en mostrador. Esta acción no se puede deshacer.                                │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Confirmar y finalizar]           │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Notas del wireframe:
- El bloque "Datos del turno" siempre en solo lectura (precargado desde el turno).
- Todos los campos de registro son editables solo mientras la consulta está **abierta** (estado `abierta`). Al cerrarla, todo pasa a solo lectura.
- La sección "Medicación/Insumos" es una mini-tabla dinámica: el botón "➕ Agregar ítem" abre un Combobox inline para buscar en el catálogo de artículos (HU-STK-01) + un campo de cantidad. Se pueden agregar N ítems; cada uno tiene un botón "🗑 Quitar".
- "Finalizar consulta" abre un `ConfirmarDialog` antes de cerrar.

## User flow

1. **Origen A (flujo principal):** El recepcionista/veterinario cambia el estado de un turno a "atendido" en la Agenda (HU-TUR-02). La aplicación navega automáticamente a `/consulta/:turnoId` con los datos del turno precargados.
2. **Origen B (historial):** El veterinario accede desde el historial clínico de la mascota (`/clientes?tab=mascotas` → ver mascota → historia clínica) y hace clic en una consulta existente para verla en modo solo lectura.
3. **Acción principal (consulta abierta):** Completa motivo, signos vitales, diagnóstico, tratamiento e insumos aplicados → "Finalizar consulta" → confirma.
4. **Destino:** Al finalizar, la consulta queda cerrada (estado `cerrada`), el turno queda habilitado para cobro (el módulo de Caja HU-VTA-01 puede leerlo), y el sistema muestra un toast "Consulta registrada. Paciente derivado a mostrador." Navega de vuelta a la Agenda.
5. **Post-cierre:** Solo se pueden agregar notas aclaratorias (no editar el registro principal).

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `consulta` | id, turno_id, profesional_id, motivo_consulta, diagnostico, tratamiento, estado_fisico_general, temperatura, frecuencia_cardiaca, peso_momento, estado (`abierta`/`cerrada`), fecha_hora_apertura, fecha_hora_cierre | Una consulta por turno (1:1). FK → turno.id, usuario.id (profesional) |
| `consulta_insumo` | id, consulta_id, articulo_id, cantidad (decimal 10,2) | Detalle N:M de insumos aplicados. FK → consulta.id, articulo.id. Disponible para HU-VTA-01. |
| `nota_consulta` | id, consulta_id, profesional_id, nota, fecha_hora | Notas aclaratorias post-cierre. FK → consulta.id, usuario.id |
| `turno` | id, estado_id | Al cerrar la consulta, el backend puede marcar el turno como listo para cobro (o se maneja por estado de la consulta). FK ya existente (HU-TUR-01/02). |
| `mascota` | id, peso | El `peso_momento` se registra en `consulta`; opcionalmente el backend actualiza `mascota.peso` con el valor registrado en la consulta. |
| `articulo` | id, codigo, nombre, unidad_medida, estado | Catálogo de insumos para el Combobox. Solo activos. |
| `auditoria` | tabla='consulta', operacion='INSERT'/'UPDATE', usuario_id, fecha_hora, valores | Bitácora de cada consulta registrada y cierre. |

> **PENDIENTE DBA:** confirmar nombre exacto de la tabla (`consulta`, `historia_clinica`, `atencion` — depende del esquema final). Confirmar si el peso registrado en la consulta actualiza automáticamente `mascota.peso` vía trigger o lo hace el backend explícitamente.

## Datos hardcodeados

```ts
// src/data/consultas.ts
// Tablas: `consulta`, `consulta_insumo`, `nota_consulta`.
// BACKEND: GET /api/consultas/:turnoId → consulta de ese turno (si existe).
//          POST /api/consultas → abrir nueva consulta.
//          PATCH /api/consultas/:id/cerrar → finalizar consulta.
//          POST /api/consultas/:id/notas → agregar nota aclaratoria.
//          GET /api/consultas?mascota_id= → historial clínico de la mascota.

export type EstadoConsulta = "abierta" | "cerrada";

export interface ConsultaInsumo {
  id: number;               // PK de consulta_insumo
  consultaId: number;       // FK → consulta.id
  articuloId: number;       // FK → articulo.id
  codigo: string;           // articulo.codigo (join, solo display)
  nombre: string;           // articulo.nombre (join, solo display)
  unidadMedida: string;     // articulo.unidad_medida (join, solo display)
  cantidad: number;         // decimal(10,2)
}

export interface NotaConsulta {
  id: number;               // PK de nota_consulta
  consultaId: number;       // FK → consulta.id
  profesionalId: number;    // FK → usuario.id
  profesional: string;      // nombre display del profesional (join)
  nota: string;
  fechaHora: string;        // ISO 8601
}

export interface Consulta {
  id: number;               // PK de consulta
  turnoId: number;          // FK → turno.id (1:1)
  profesionalId: number;    // FK → usuario.id (veterinario actuante)
  // Datos del turno (join para display, solo lectura):
  turnoFecha: string;       // "YYYY-MM-DD"
  turnoHoraInicio: string;  // "HH:mm"
  turnoHoraFin: string;     // "HH:mm"
  clienteId: number;
  clienteNombre: string;    // join
  clienteDni: string;       // join
  mascotaId: number;
  mascotaNombre: string;    // join
  mascotaEspecie: string;   // join
  mascotaRaza: string | null; // join
  mascotaSexo: string;      // join
  mascotaPesoAnterior: number | null; // mascota.peso antes de esta consulta
  profesionalNombre: string; // join
  practicaNombre: string;   // join
  // Campos clínicos:
  motivoConsulta: string;
  diagnostico: string;
  tratamiento: string | null;
  estadoFisicoGeneral: string | null; // texto libre
  temperatura: number | null;        // °C, decimal(4,1)
  frecuenciaCardiaca: number | null; // lpm, integer
  pesoMomento: number | null;        // kg al momento de la consulta, decimal(5,2)
  estado: EstadoConsulta;
  fechaHoraApertura: string;         // ISO 8601
  fechaHoraCierre: string | null;    // null si abierta
  insumos: ConsultaInsumo[];
  notas: NotaConsulta[];
}

// Consulta abierta — turno #10 (Dr. Juan Pérez · Pablo Celaya · Poppi, lunes 21/09)
const consultaAbierta: Consulta = {
  id: 1,
  turnoId: 10,
  profesionalId: 3, // Dr. Juan Pérez
  turnoFecha: "2026-09-21",
  turnoHoraInicio: "08:00",
  turnoHoraFin: "08:30",
  clienteId: 1,
  clienteNombre: "Pablo Celaya",
  clienteDni: "45115839",
  mascotaId: 3,
  mascotaNombre: "Poppi",
  mascotaEspecie: "Perro",
  mascotaRaza: "Labrador",
  mascotaSexo: "Hembra",
  mascotaPesoAnterior: 28,
  profesionalNombre: "Dr. Juan Pérez",
  practicaNombre: "Consulta",
  motivoConsulta: "",
  diagnostico: "",
  tratamiento: null,
  estadoFisicoGeneral: null,
  temperatura: null,
  frecuenciaCardiaca: null,
  pesoMomento: null,
  estado: "abierta",
  fechaHoraApertura: "2026-09-21T08:00:00Z",
  fechaHoraCierre: null,
  insumos: [],
  notas: [],
};

// Consulta cerrada — turno #16 (Dra. Laura Gómez · Pablo Celaya · Poppi, jueves 24/09)
const consultaCerrada: Consulta = {
  id: 2,
  turnoId: 16,
  profesionalId: 5, // Dra. Laura Gómez
  turnoFecha: "2026-09-24",
  turnoHoraInicio: "09:00",
  turnoHoraFin: "10:30",
  clienteId: 1,
  clienteNombre: "Pablo Celaya",
  clienteDni: "45115839",
  mascotaId: 3,
  mascotaNombre: "Poppi",
  mascotaEspecie: "Perro",
  mascotaRaza: "Labrador",
  mascotaSexo: "Hembra",
  mascotaPesoAnterior: 28,
  profesionalNombre: "Dra. Laura Gómez",
  practicaNombre: "Cirugía",
  motivoConsulta: "Castración electiva",
  diagnostico: "Indicación de castración. Paciente en buen estado general.",
  tratamiento: "Castración bajo anestesia general. Post-op: Amoxicilina 500mg 2 veces/día por 7 días.",
  estadoFisicoGeneral: "Buen estado general. Mucosas rosadas. Hidratación normal.",
  temperatura: 38.5,
  frecuenciaCardiaca: 88,
  pesoMomento: 28.2,
  estado: "cerrada",
  fechaHoraApertura: "2026-09-24T09:00:00Z",
  fechaHoraCierre: "2026-09-24T10:25:00Z",
  insumos: [
    { id: 1, consultaId: 2, articuloId: 1, codigo: "ART001", nombre: "Amoxicilina 500mg", unidadMedida: "Unidad", cantidad: 2 },
    { id: 2, consultaId: 2, articuloId: 2, codigo: "ART002", nombre: "Jeringa 5ml", unidadMedida: "Unidad", cantidad: 3 },
  ],
  notas: [
    {
      id: 1,
      consultaId: 2,
      profesionalId: 5,
      profesional: "Dra. Laura Gómez",
      nota: "El paciente toleró bien la anestesia. Se recomienda revisión a los 10 días.",
      fechaHora: "2026-09-24T10:30:00Z",
    },
  ],
};

export const consultasIniciales: Consulta[] = [consultaCerrada];
// La consulta abierta se crea on-the-fly al abrir la pantalla desde la Agenda.

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;
```

## Estados

- [x] **Nueva / Abierta:** formulario editable con datos del turno precargados. Botón "Finalizar consulta" activo.
- [x] **Cerrada (solo lectura):** todos los campos deshabilitados, banner "🔒 Consulta cerrada", visible botón "➕ Agregar nota".
- [x] **Cargando:** skeleton/spinner mientras se obtiene el turno y, si existe, la consulta asociada.
- [x] **Error:** mensaje de error con opción "Reintentar" (toast error o banner inline).
- [x] **Sin historial:** si se accede desde el historial de la mascota y no hay consultas, mostrar "Sin consultas registradas".

## Criterios de aceptación

### General
- [ ] La pantalla opera en dos modos: **edición** (consulta abierta) y **lectura** (consulta cerrada). El modo se determina por `consulta.estado`.
- [ ] La consulta es 1:1 con el turno: no puede haber dos consultas para el mismo turno.
- [ ] Una vez cerrada, **no se puede editar** el registro principal. Solo se pueden agregar notas aclaratorias.
- [ ] Se registra en bitácora de auditoría cada consulta creada y cerrada, con profesional actuante, fecha y hora.
- [ ] El menú lateral es colapsable y recuerda su estado.

### Precarga desde el turno (modo edición — flujo desde Agenda)
- [ ] Al abrir la pantalla vía `/consulta/:turnoId`, los datos del turno se precargan automáticamente en solo lectura: fecha/hora, cliente (nombre + DNI), mascota (nombre, especie, raza, sexo, peso anterior), profesional y práctica.
- [ ] Los datos precargados **no son editables** (siempre solo lectura en el bloque "Datos del turno").

### Signos vitales
- [ ] **Temperatura (°C):** campo numérico decimal, opcional. Rango sugerido: 37–41 °C (warn si fuera del rango, no bloquea).
- [ ] **Frecuencia cardíaca (lpm):** campo numérico entero, opcional. Rango sugerido: 60–200 lpm.
- [ ] **Peso (kg):** campo numérico decimal, opcional. Si se ingresa, se muestra el peso anterior de la mascota como referencia (no edita `mascota.peso` directamente — eso lo hace el backend al cerrar: `// BACKEND: PATCH /mascotas/:id { peso }`).
- [ ] **Estado físico general:** textarea de texto libre, opcional, sin límite estricto de caracteres (máximo sugerido 500).

### Anamnesis y diagnóstico
- [ ] **Motivo de consulta:** obligatorio (*), texto libre (varchar 255).
- [ ] **Diagnóstico:** obligatorio (*), texto libre (varchar 500).
- [ ] **Tratamiento indicado:** opcional, textarea de texto libre (varchar 1000).

### Medicación / Insumos aplicados
- [ ] Tabla dinámica de ítems: cada fila tiene **Artículo** (Combobox del catálogo de artículos activos — HU-STK-01) + **Cantidad** (decimal positivo > 0) + botón "🗑 Quitar".
- [ ] El Combobox de artículos permite buscar por código o nombre. Solo muestra artículos con `estado = activo`.
- [ ] No se puede agregar el mismo artículo dos veces (validación front: si ya está en la lista, mostrar error inline "Este artículo ya fue agregado").
- [ ] La lista de insumos puede estar vacía (la sección es opcional).
- [ ] Los insumos quedan disponibles para cobro en el módulo de Caja (HU-VTA-01): `// BACKEND: GET /api/consultas/:id/insumos → la caja lee estos datos para generar la factura`.

### Finalizar consulta
- [ ] Botón "Finalizar consulta" valida que **Motivo de consulta** y **Diagnóstico** estén completos. Si no, muestra errores inline y no continúa.
- [ ] Abre un `ConfirmarDialog` con tone "success": "¿Finalizar la consulta? Al confirmar, quedará cerrada y habilitada para cobro en mostrador."
- [ ] Al confirmar: cierra la consulta (`estado = cerrada`, `fecha_hora_cierre = now()`), muestra toast "Consulta registrada. Paciente derivado a mostrador." y navega de vuelta a la Agenda.
- [ ] `// BACKEND: PATCH /api/consultas/:id/cerrar → { estado: 'cerrada', fecha_hora_cierre }; opcionalmente PATCH /api/mascotas/:id { peso: pesoMomento } si peso fue ingresado.`

### Modo solo lectura (consulta cerrada)
- [ ] Banner informativo "🔒 Esta consulta está cerrada. Solo puede agregar una nota aclaratoria."
- [ ] Todos los campos en solo lectura (no inputs, mostrar como texto).
- [ ] Botón "➕ Agregar nota" visible y activo.
- [ ] Sección "Notas aclaratorias" muestra el listado de notas (autor + fecha/hora + texto) ordenadas cronológicamente. Si no hay notas, texto "Sin notas aclaratorias".

### Modal: Agregar nota aclaratoria
- [ ] Campo "Nota" obligatorio, textarea libre.
- [ ] "Profesional" y "Fecha/hora" en solo lectura (usuario logueado + now()).
- [ ] Al guardar: agrega la nota a `nota_consulta`, actualiza la lista en pantalla, muestra toast "Nota agregada correctamente".
- [ ] `// BACKEND: POST /api/consultas/:id/notas { nota, profesional_id }`

### Notificaciones
- [ ] Consulta finalizada → toast éxito "Consulta registrada. Paciente derivado a mostrador."
- [ ] Nota agregada → toast éxito "Nota agregada correctamente."
- [ ] Error en cualquier operación → toast error "Error al guardar: [descripción]."
- [ ] Toast se cierra automáticamente o con "✕".

### Accesibilidad
- [ ] Todos los campos tienen `label` asociado.
- [ ] Errores de validación con `role="alert"` o aria-describedby.
- [ ] Focus visible en todos los controles interactivos.
- [ ] Touch targets ≥ 44×44px en botones y filas de insumos.
- [ ] El banner de "consulta cerrada" tiene contraste suficiente y no es solo color.
