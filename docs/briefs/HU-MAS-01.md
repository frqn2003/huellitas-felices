# HU-MAS-01: Como recepcionista, quiero registrar, editar y consultar una mascota asociada obligatoriamente a un cliente existente, para tener la ficha completa de la mascota en el sistema

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/clientes` — la tab **Mascotas** del módulo **Recepción** (ya existe en `RecepcionTabs`; hoy muestra un panel placeholder de vínculo HU-MAS en `src/app/clientes/page.tsx`).
- **Relacionada con:** HU-CLI-01 (clientes, módulo padre — la mascota vive en el perfil del cliente), HU-TUR-01 (turnos, FK `turno.mascota_id`), HU-SIS-05 (auditoría)
- **Prioridad:** media

## Propuesta inicial (del equipo)

- ABM de mascotas con formulario **paramétrico único** en 3 modos controlados por parámetro: **INSERCIÓN, EDICIÓN y LECTURA** (enum `modo_abm`, igual que clientes).
- **La asociación a un cliente es OBLIGATORIA**: no se crea una mascota sin titular. El titular se busca por **DNI o nombre** con lista de coincidencias desplegadas y se selecciona (patrón Combobox de `ui/`, label compuesto `documento · nombre apellido`).
- Campos: **nombre, especie, raza, sexo, peso, fecha de nacimiento, color y señas particulares** → ajustado con el equipo: **sexo SÍ va; color NO va** (el esquema no tiene columna `color` en `mascota`; no se inventan campos).
- Especie y raza: **no existen catálogos en el esquema** (ambas son `varchar` de texto libre). Especie se ofrece como select de opciones fijas (Perro / Gato / Otro) y raza como campo de texto libre con sugerencias, sin tabla catálogo.
- **Baja lógica**: el estado se maneja con un **toggle Activo/Inactivo dentro del formulario**; al guardar con Inactivo se abre un **modal de confirmación de baja** (patrón `BajaClienteModal`). La mascota inactiva conserva su ficha e historial.
- Listado: columnas **Id de mascota, Nombre, Especie, Estado, Acciones** con **3 acciones**: 👁️ **Ver** (siempre) · 👤 **Ver dueño** (abre el perfil del cliente titular, mismo modal Ver Cliente de clientes) · ✏️ **Editar** (solo activo, igual que clientes); búsqueda por nombre de mascota, nombre de dueño o documento del dueño; filtro por estado (default Activos); paginación.
- **Conectado con clientes**: el icono de patita de perro (🐾) de la columna Mascotas de `ClientesTable` (hoy no-op) navega a la **tab Mascotas** (`/clientes?tab=mascotas`) **pre-filtrada por ese cliente** (chip del dueño, removible).
- La mascota creada/modificada **queda visible de inmediato** en el perfil del cliente asociado (sección "Mascotas vinculadas" del modo LECTURA de clientes y columna Mascotas de `ClientesTable`).
- **Auditoría**: cada alta y modificación registra `auditoria` con valores anterior y nuevo (contrato sección 8 del esquema).

**Agregados del equipo (validaciones y UX, espejo de clientes):**
- Validaciones de formato en el front: campos con formato incorrecto se marcan **en rojo SOLO esos campos**, con mensaje al usuario (patrón `errors`/`touched` de `ArticuloFormModal`).
- Toasts de éxito/error al guardar, modificar y dar de baja (patrón `useToast`).
- Peso: opcional, numérico, **mayor a 0** (CHECK del esquema: `peso IS NULL OR peso > 0`).

## Wireframe (idea)

Espejo del módulo clientes refinado (misma composición: header de módulo, tabs, buscador, tabla, paginación).

### Listado de mascotas (tab "Mascotas" de Recepción)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Recepcion]  Recepcion                              [⚙️ Nueva mascota]   │
│ ┌────────┐  ┌──────────────────────────────────────────────────────────┐│
│ │Recepcion│  │ [⚙️ Clientes] [⚙️ Mascotas] [⚙️ Turnos]                  ││
│ │        │  │                                                          ││
│ │[bar]   │  │ [🔍_____________________________]  [⚙️ Filtros]         ││
│ │[bar]   │  │                                                          ││
│ │[bar]   │  │ [Activo x]                                              ││
│ │[bar]   │  │ ┌──────┬─────────┬─────────┬────────┬─────────────┐     ││
│ │        │  │ │  Id  │ Nombre  │ Especie │ Estado │  Acciones   │     ││
│ │        │  │ ├──────┼─────────┼─────────┼────────┼─────────────┤     ││
│ │[bar]   │  │ │  1   │  Azul   │  Perro  │ Activo │ 👁️ 👤 ✏️     │     ││
│ │        │  │ ├──────┼─────────┼─────────┼────────┼─────────────┤     ││
│ │[bar]   │  │ │  2   │  Dogi   │  Gato   │Inactivo│ 👁️ 👤       │     ││
│ │        │  │ ├──────┼─────────┼─────────┼────────┼─────────────┤     ││
│ │        │  │ │      │         │         │        │             │     ││
│ │        │  │ └──────┴─────────┴─────────┴────────┴─────────────┘     ││
│ │        │  │                                     Pagina 1 de 10       ││
│ └────────┘  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

Notas:
- Columna Acciones: 👁️ **Ver** (mascota, siempre) · 👤 **Ver dueño** (abre el perfil del cliente titular, mismo modal Ver Cliente) · ✏️ **Editar** (solo si está activo, igual que clientes). La baja se hace dentro del formulario con el toggle.
- El listado muestra el **id de la mascota** (definido con el equipo).
- La patita 🐾 de `ClientesTable` navega a esta tab **pre-filtrada por el cliente** (chip "Dueño: Pablo Celaya ×" en el filtro).

### Formulario paramétrico — modo INSERCIÓN ("Nueva mascota")

```
┌──────────────────────────────────────────┐
│ 👁️ Nueva mascota                          │
│                                            │
│ Dueño:                                    │
│ [Buscar por DNI o nombre________] [🔍]    │
│ ┌────────────────────────────────────┐   │
│ │ 45115839 · Pablo Celaya           │   │  ← coincidencias
│ │ 46115839 · Nicolas Celaya         │   │     desplegadas
│ └────────────────────────────────────┘   │
│                                            │
│ Nombre                Especie             │
│ [____________]        [Perro        v]     │
│                                            │
│ Raza                  Sexo                │
│ [Pitbull______]       [Macho        v]     │
│                                            │
│ Peso                  Fecha de nacimiento │
│ [20___________]       [____________]      │
│                                            │
│ Señas particulares                        │
│ [__________________________________]      │
│ [__________________________________]      │
│                                            │
│ Estado:                                   │
│ ( ⚪──● ) Activo                          │
│                                            │
│                    [Cancelar]  [Guardar]  │
└──────────────────────────────────────────┘
```

### Formulario paramétrico — modo EDICIÓN ("Modificar mascota")

```
┌──────────────────────────────────────────────────┐
│ ✏️ Modificar mascota                              │
│                                                    │
│ Dueño:                                            │
│ ┌──────────────────────────────────────────┐     │
│ │ 45115839 - Nicolas Celaya            ✏️  │     │  ← editable, mismo buscador
│ └──────────────────────────────────────────┘     │
│                                                    │
│ Nombre                 Especie                    │
│ [Azul________]         [Perro         v]          │
│                                                    │
│ Raza                   Sexo                       │
│ [Pitbull        v]     [Macho         v]          │
│                                                    │
│ Peso                   Fecha de nacimiento        │
│ [20 kg_______]         [13-11-23_______]          │
│                                                    │
│ Señas particulares                                │
│ [Tiene una marca de nacimiento en el pecho como]  │
│ [un corazon_____________________________________] │
│                                                    │
│ Estado:                                           │
│ ( ⚪──● ) Activo                                  │
│                                                    │
│                          [Cancelar]  [Guardar]    │
└──────────────────────────────────────────────────┘
```

### Formulario paramétrico — modo LECTURA ("Ver mascota")

```
┌──────────────────────────────────────────────────┐
│ 🔒 Ver mascota                                    │
│                                                    │
│ Dueño:                                            │
│ ┌──────────────────────────────────────────┐     │
│ │ 45115839 - Nicolas Celaya                 │     │  ← solo lectura
│ └──────────────────────────────────────────┘     │
│                                                    │
│ Nombre                 Especie                    │
│ [Azul________]         [Perro________]            │
│                                                    │
│ Raza                   Sexo                       │
│ [Pitbull_____]         [Macho_______]             │
│                                                    │
│ Peso                   Fecha de nacimiento        │
│ [20 kg_______]         [13-11-23______]           │
│                                                    │
│ Señas particulares                                │
│ [Tiene una marca de nacimiento en el pecho como]  │
│ [un corazon_____________________________________] │
│                                                    │
│ Estado:                                           │
│ ( ⚪──● ) Activo                                  │
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

> Al **cancelar** un formulario con cambios pendientes se confirma el descarte (espejo HU-CLI-01, mismo wireframe). Además hay **modal de confirmación de baja lógica**: se muestra al guardar con el toggle en Inactivo (patrón `BajaClienteModal`).

### Modal de confirmación de baja lógica

> Al guardar con el toggle en Inactivo (alta o edición) se abre el modal de confirmación, mismo patrón `BajaClienteModal` de clientes.

```
┌───────────────────────────────────────┐
│      Confirmar baja                    │
│                                         │
│  ¿Querés dar de baja a la mascota      │
│  "Azul"? Conservará su ficha y su       │
│  historial de turnos.                   │
│                                         │
│            [Cancelar]  [Confirmar]     │
└───────────────────────────────────────┘
```

## User flow

1. **Entrada:** el usuario viene del menú lateral → **Recepción** → **Recepción** (`/clientes`) → tab **Mascotas**. También entra desde la **patita 🐾** de la columna Mascotas de `ClientesTable`: navega a `/clientes?tab=mascotas` con la tab Mascotas abierta y el listado **pre-filtrado por ese cliente** (chip removible "Dueño: …").
2. **Acción principal:** ver el listado de mascotas (default: solo activas, búsqueda por nombre de mascota / nombre o DNI del dueño, filtro de estado, paginación). Desde ahí: **Nueva mascota** (modal INSERCIÓN), 👁️ **Ver** (modal LECTURA), 👤 **Ver dueño** (abre el modal Ver Cliente del titular) o ✏️ **Editar** (modal EDICIÓN).
3. **Alta:** **busca y selecciona el dueño** (obligatorio, por DNI o nombre con coincidencias) → completa el formulario → valida formato (errores por campo en rojo) → **sin dueño no puede guardar** → guarda → **toast de éxito** → vuelve al listado y **la mascota aparece en el perfil del cliente** (columna Mascotas de la tabla + sección "Mascotas vinculadas" del Ver cliente).
4. **Baja:** edita una mascota activa → pasa el toggle a Inactivo → Guardar → **modal de confirmación de baja** → confirma → queda inactiva (conserva ficha e historial) → **toast** → el listado la muestra solo si el filtro lo incluye.
5. **Salida:** desde Ver mascota puede **Volver**; la mascota queda asociada al cliente y disponible para los futuros turnos (HU-TUR-01, FK `turno.mascota_id`).

## Fuente de datos (BD)

> Tabla definida en el esquema (`docs/esquema-bd-front.md`, sección 8 "Clientes, Mascotas y Turnos (Sprint 3)" — DD Sprint 3 de la DBA, 2026-09-14). El módulo NO está en `schema2.sql`: es el contrato definitivo. **Todos los campos de la HU existen en la tabla** — sin PENDIENTE DBA.

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `mascota` | id, cliente_id, nombre, especie, raza, sexo, peso, fecha_nacimiento, senas_particulares, estado, created_at, updated_at | `cliente_id` FK → cliente.id (obligatoria); `id` ← FK `turno.mascota_id` (módulo turnos) |
| `cliente` | id, nombre, apellido, documento | alimenta el buscador de dueño (label `documento · nombre apellido`) |
| `auditoria` (existe) | tabla, operacion, registro_id, usuario_id, fecha_hora, valores_anteriores, valores_nuevos | FK → usuario.id — cada alta/modificación registra con valores anterior y nuevo |

Detalles del contrato (líneas 473-489 del esquema):
- `especie` = varchar NOT NULL — **texto libre, no hay catálogo ni enum** (la UI ofrece select de opciones fijas Perro/Gato/Otro).
- `raza` = varchar nullable — **texto libre opcional, no hay catálogo** (la UI lo trata como texto con sugerencias vía `datalist`, sin tabla raza).
- `sexo` = varchar NOT NULL (Macho/Hembra en la UI).
- `peso` = numeric nullable con `CHECK (peso IS NULL OR peso > 0)` — opcional, mayor a 0.
- `fecha_nacimiento` = date nullable → ISO "YYYY-MM-DD".
- `senas_particulares` = text nullable → `Textarea` auto-creciente.
- enum `estado_activo_inactivo` → `activo` / `inactivo` (default `activo`).
- `updated_at` no se autoactualiza (sin trigger): el front lo envía en cada modificación.

## Componentes sugeridos (reuso)

> Espejo directo del módulo clientes (HU-CLI-01): se copian los componentes clientes/ adaptando entidad y campos.

| Pieza | Acción | Nota |
|---|---|---|
| `ClientesTable` | **Extender** | la **patita 🐾** (hoy no-op con comentario HU-MAS) navega a `/clientes?tab=mascotas` + filtro por cliente (`useRouter`/`useSearchParams`, patrón `?tab=` de Compras) |
| `ClienteFormModal` | Reusar (modo LECTURA) | despliega el **perfil del dueño** desde el 👤 "Ver dueño" de `MascotasTable` |
| `ClienteFormModal` | Reusar/Adaptar → `MascotaFormModal` | modos crear/editar/ver + toggle de estado; agrega el buscador de dueño obligatorio |
| `ui/Combobox` | **Reusar** | buscador de dueño por DNI o nombre; label compuesto `` `${c.documento} · ${c.nombre} ${c.apellido}` `` (patrón multi-campo de `SolicitudFormModal`), `value: String(c.id)`. Filtra por substring del label → matchea DNI y nombre |
| `ui/Select` | Reusar | Especie (Perro/Gato/Otro) y Sexo (Macho/Hembra) como selects estilizados |
| `FiltrosClientes` | Reusar/Adaptar → `FiltrosMascotas` | búsqueda (nombre de mascota/nombre o DNI de dueño) + filtro estado (default Activo) |
| `BajaClienteModal` | Reusar/Adaptar → `BajaMascotaModal` | confirmación de baja lógica (toggle → Inactivo → guardar) |
| `EstadoClienteBadge` | Reusar/Adaptar → `EstadoMascotaBadge` | mapea `StatusBadge`: success=Activo, neutral=Inactivo |
| `Pagination` (ui) | Reusar | — |
| `Input` / `Textarea` (ui) | Reusar | Textarea auto-creciente para señas particulares; Input para nombre, raza (con `datalist`), peso, fecha |
| `Switch` (ui) | Reusar | toggle de estado (creado en HU-CLI-01) |
| `Modal` / `Toast` / `StatusBadge` (ui) | Reusar | — |
| `RecepcionTabs` | Extender (sin cambios de código) | la tab Mascotas ya existe; solo reemplaza el placeholder del panel en `src/app/clientes/page.tsx` |

## Datos hardcodeados

> Contrato real del esquema (sección 8, Sprint 3): `cliente_id` NOT NULL FK, `especie`/`sexo` NOT NULL, `raza`/`peso`/`fecha_nacimiento`/`senas_particulares` nullable, `id` numérico, fechas ISO, estado enum `activo`/`inactivo`.

```ts
// BACKEND: GET /api/mascotas — contrato sección 8 del esquema (DD Sprint 3)
// (se lista por cliente en GET /api/clientes/:id/mascotas)
type Mascota = {
  id: number;                 // PK (mascota.id)
  clienteId: number;          // FK → cliente.id — OBLIGATORIO (titular)
  nombre: string;             // varchar NOT NULL
  especie: string;            // varchar NOT NULL (Perro / Gato / Otro)
  raza: string | null;        // varchar (nullable, texto libre)
  sexo: string;               // varchar NOT NULL (Macho / Hembra)
  peso: number | null;        // numeric (nullable) — CHECK: IS NULL OR > 0
  fechaNacimiento: string | null; // date (nullable) → ISO "YYYY-MM-DD"
  senasParticulares: string | null; // text (nullable)
  estado: "activo" | "inactivo";
};

const mascotas: Mascota[] = [
  { id: 1, clienteId: 3, nombre: "Azul", especie: "Perro", raza: "Pitbull", sexo: "Macho", peso: 20, fechaNacimiento: "2023-11-13", senasParticulares: "Marca de nacimiento en el pecho con forma de corazón", estado: "activo" },
  { id: 2, clienteId: 1, nombre: "Dogi", especie: "Gato", raza: null, sexo: "Hembra", peso: 4.5, fechaNacimiento: "2021-03-02", senasParticulares: null, estado: "inactivo" },
  { id: 3, clienteId: 1, nombre: "Poppi", especie: "Perro", raza: "Labrador", sexo: "Hembra", peso: 28, fechaNacimiento: "2022-06-30", senasParticulares: "Muy cariñosa", estado: "activo" },
];

// Catálogo de opciones del form (la BD guarda el string; no hay tabla catálogo)
const especies = ["Perro", "Gato", "Otro"];
const sexos = ["Macho", "Hembra"];

// Reglas de validación front (formato por campo)
const validaciones = {
  nombre: /^.{1,100}$/,            // obligatorio
  peso: /^\d+(\.\d+)?$/,           // numérico, mayor a 0 (CHECK del esquema)
  fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/, // ISO
};
```

## Estados

- [x] Vacío (listado sin mascotas → estado vacío con CTA "Nueva mascota"; sin coincidencias en el buscador de dueño → "Sin resultados")
- [x] Cargando (esqueleto/loader en tabla; placeholder en el buscador de dueño)
- [x] Error (listado y formulario: banner/errores por campo en rojo + toast de error en acciones)
- [x] Con datos (activas por defecto; inactivas solo si el filtro las incluye)

## Criterios de aceptación

- [ ] El listado muestra por defecto **solo mascotas activas**, con búsqueda por nombre de mascota o nombre/DNI del dueño, filtro de estado y paginación (patrón clientes).
- [ ] El listado muestra el **id de la mascota** en su primera columna.
- [ ] **Acciones del listado**: 👁️ Ver (mascota, siempre), 👤 **Ver dueño** (abre el modal Ver Cliente del titular en LECTURA) y ✏️ Editar (solo activo, patrón clientes).
- [ ] **Patita 🐾 conectada** (`ClientesTable`): al hacer clic en la patita de una fila de clientes navega a `/clientes?tab=mascotas` con la tab Mascotas abierta y el listado **pre-filtrado por ese cliente** (chip removible "Dueño: …"; al quitarlo se ve el listado completo).
- [ ] Una mascota inactiva es visible en búsquedas con el indicador "Inactivo"; en la columna Acciones el inactivo solo ofrece **Ver** (sin Editar, patrón clientes).
- [ ] El formulario es **un único componente paramétrico** que opera en 3 modos (INSERCIÓN / EDICIÓN / LECTURA); en LECTURA los campos están deshabilitados y solo hay Volver.
- [ ] **La asociación al dueño es obligatoria**: no se puede guardar sin seleccionar un cliente existente. El buscador filtra por **DNI o nombre** y muestra las coincidencias desplegadas para seleccionar (patrón `ui/Combobox` con label `documento · nombre apellido`).
- [ ] **Alta**: al crear una mascota, la asociación al dueño es obligatoria y no se ofrece crear un cliente desde ese flujo (solo seleccionar existentes).
- [ ] Campos del formulario: dueño (buscador), nombre, especie, raza, sexo, peso, fecha de nacimiento y señas particulares (**sin campo color** — no existe en el esquema).
- [ ] Especie y sexo como selects de opciones fijas (Perro/Gato/Otro · Macho/Hembra); raza como texto libre con sugerencias; señas particulares en `Textarea` auto-creciente.
- [ ] **Peso**: opcional, numérico y **mayor a 0** (CHECK `peso IS NULL OR peso > 0`); error por campo si no cumple.
- [ ] **Validación de formato en el front:** campos incorrectos en **rojo solo esos campos** con mensaje; errores tras blur y revalidación al corregir (patrón `errors`/`touched`).
- [ ] **Baja lógica:** toggle del formulario a Inactivo → al guardar se abre modal de confirmación de baja; al confirmar queda inactiva y **conserva su ficha e historial**.
- [ ] **La mascota queda visible de inmediato** en el perfil del cliente asociado: columna Mascotas de `ClientesTable` y sección "Mascotas vinculadas" del Ver cliente.
- [ ] **Toasts** de éxito/error al guardar, modificar y dar de baja (patrón `useToast`).
- [ ] **Auditoría:** cada alta y modificación registra `auditoria` (tabla, operacion, registro_id, usuario_id, fecha_hora, valores_anteriores, valores_nuevos) — `// BACKEND:` con el endpoint correspondiente.
- [ ] La tab **Mascotas** de `RecepcionTabs` muestra el listado real (reemplaza el placeholder en `src/app/clientes/page.tsx`).
- [ ] Botones/acciones con colores, radios, espacios e iconos del design system Pet Bliss (tokens, `StatusBadge` como único punto de verdad de colores de estado, Lucide outline).
- [ ] Accesibilidad: focus visible, touch targets ≥ 44×44px, `role="alert"` en errores, `aria-live` en toasts.