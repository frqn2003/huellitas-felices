# Página: Recepción · Clientes y Mascotas (`/clientes`)

> HU-CLI-01 y HU-MAS-01 (briefs `docs/briefs/HU-CLI-01.md` y `docs/briefs/HU-MAS-01.md`) ·
> Extiende `../MASTER.md` (Pet Bliss). Los tokens base NO cambian; este archivo
> documenta las decisiones específicas de esta pantalla.

## Tokens aplicados

- **Canvas:** crema `--color-cream-50`; tablas y modales sobre superficie blanca con
  borde `--color-border` y sombra `--shadow-card`.
- **Header:** eyebrow small uppercase ("Gestión de recepción") + H1 Baloo 2
  extrabold uppercase ("Recepción").
- **CTA principal:** UN solo amarillo `--color-accent-500` por viewport, que
  cambia según el tab activo: "Nuevo cliente" (clientes) / "Nueva mascota"
  (mascotas). Nunca los dos a la vez.
- **Tipografía:** Baloo 2 (display uppercase) + Nunito (cuerpo) según MASTER.

## Mapeo de estados (brief → tokens Pet Bliss)

Se usa la paleta de estado del sistema (`StatusBadge`, ver MASTER.md "Status
Colors") mapeada por entidad:

| Entidad | Activo | Inactivo |
|---------|--------|----------|
| Cliente | `success` | `neutral` |
| Mascota | `success` | `neutral` |

Siempre punto + texto (nunca solo color). `EstadoMascotaBadge` delega en
`EstadoClienteBadge` (mismo enum de estados, sin duplicar StatusBadge).

## Composición

- Shell estándar: Sidebar + header crema con eyebrow uppercase + H1 display + un
  solo CTA amarillo.
- `RecepcionTabs` (Clientes / Mascotas / Turnos): espejo de `compras/ComprasTabs`
  (role=tablist, navegación con ←/→). Turnos sigue siendo panel placeholder (HU-TUR futura).
- **URL como fuente de verdad:** el tab, el dueño y la búsqueda de clientes se
  derivan de `searchParams` (`?tab=mascotas` viene de la patita de
  `ClientesTable`; `?dueno=<id>` pre-filtra la lista de mascotas; `?busqueda=`
  pre-filtra la lista de clientes por nombre/documento desde el icono 👤 "Ver
  dueño"). Cambiar de tab, tipear en el filtro o quitar el chip "Dueño" navega
  con `router.replace` — patrón ?tab= de Compras, sin setState-en-effect.
  `useSearchParams` vive bajo `<Suspense fallback={null}>` (bailout del prerender).
- **Tab Mascotas** (HU-MAS-01):
  - `FiltrosMascotas`: búsqueda privada (nombre de mascota, especie, nombre o
    documento del dueño) + filtro estado (default Activos) + chip removible
    "Dueño: …" cuando se llega pre-filtado desde la patita.
  - `MascotasTable`: columnas Id, Nombre, Especie, Estado, Acciones.
    Acciones: 👁️ Ver (Eye), 👤 Ver dueño (UserRound — navega a la tab Clientes
    con `?busqueda=<nombre completo>` pre-cargada, la tabla filtra la fila del
    titular; simétrico a la patita de clientes), ✏️ Editar (solo si activa; el
    inactivo solo ofrece Ver y Ver dueño). El id es el de la mascota (PK de
    tabla `mascota`; los números largos del wireframe eran placeholders viejos).
  - `MascotaFormModal` (crear/editar/ver): `Combobox` de dueño que lista solo
    clientes **activos** con label `documento · nombre apellido`; nombre no
    permite dígitos; especie/sexo por `Select`; raza Input + `datalist` de
    sugerencias (es texto libre, sin catálogo propio); peso con hint
    "kg · opcional"; fecha de nacimiento `type="date"`; señas particulares en
    `Textarea`; `Switch` de estado con confirmación de baja lógica vía
    `ui/ConfirmarDialog` (NO se crea BajaMascotaModal ni se muestra modal de
    "Confirmar cancelación" al cerrar — alineado con clientes).
  - Datos placeholder en `src/data/mascotas.ts` (Sólo los datos, tipos propios):
    3 mascotas (Azul activa, Dogi inactiva, Poppi activa) repartidas entre
    clientes 1 y 3.
- **Tab Clientes** (HU-CLI-01, ya existente): sin cambios visuales; solo se
  conectó la patita (`onVerMascotas`) que navega a `?tab=mascotas&dueno=id`.

## Estados de pantalla

Vacío (mensaje con estado, mascotas respeta `SIMULAR_VACIO`) · Sin resultados
(filtros: mensaje + limpiar) · Cargando (loading en tabla) · Error (card + botón
Reintentar, `SIMULAR_ERROR`) · Con datos. Ambos tabs comparten el patrón de
loading/error/sin-resultados de clientes.

## Accesibilidad

- Touch targets ≥44px (acciones de fila h-11 w-11, tanto en Clientes como Mascotas).
- Focus visible ring en todos los controles; `aria-label` en iconos-acción
  ("Ver detalles de X", "Ver dueño de X (nombre)").
- Errores por campo con `role="alert"`; validación on submit (patrón submitAttempted).
- Inputs numéricos con `inputMode` apropiado (peso con decimal).
- `prefers-reduced-motion` respetado vía Framer Motion (Modal/Toast existentes).

## Notas de integración (para el back)

Puntos marcados con `// BACKEND:` en `src/data/mascotas.ts`,
`src/components/mascotas/*` y `src/app/clientes/page.tsx`. Buscar con
`grep -rn "BACKEND" src/data/mascotas.ts src/components/mascotas/ src/app/clientes/`.

- Tabla: `mascota` (sección 8 de `docs/esquema-bd-front.md`): id serial PK;
  `cliente_id` int NOT NULL FK → `cliente.id`; nombre/especie/sexo varchar NOT
  NULL; raza varchar NULL; peso numeric NULL CHECK (peso IS NULL OR peso > 0);
  fecha_nacimiento date NULL; senas_particulares text NULL; estado enum
  activo/inactivo default activo; created_at/updated_at. Sin catálogos
  especie/raza (varchar libre).
- Endpoints esperados: GET/POST `/api/mascotas`, GET/PUT/PATCH
  `/api/mascotas/:id`, y GET `/api/clientes/:id/mascotas` (para el perfil del
  dueño y las métricas de `ClientesTable`).
- Los datos placeholder de `mascotas.ts` usan claves camelCase
  (`clienteId`, `fechaNacimiento`, `senasParticulares`); el BACKEND las pasa
  a snake_case del esquema.
- Baja = lógica: toggle en el formulario → PATCH /api/mascotas/:id con estado
  inactivo (espejo de clientes).
- Auditoría: registrar operaciones INSERT/UPDATE de `mascota` en
  `public.auditoria` (operacion + valores anterior/nuevo en jsonb), como indica
  la sección 8 del esquema.