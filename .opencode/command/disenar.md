---
description: Diseña una pantalla completa de Huellitas Felices desde un brief (HU + wireframe). Flujo: audit UX → reuso de componentes (inventario) → visual ui-ux-pro-max (tokens Pet Bliss) → código hardcodeado → verificación técnica → checkpoint de revisión. La subida a GitHub se hace con /subir.
agent: build
---

# Comando /diseñar — Pantalla completa desde brief

Vas a diseñar, codear y verificar una pantalla de **Huellitas Felices** (sistema de gestión veterinaria) a partir del brief indicado. Ejecutá los pasos EN ORDEN y no te saltees ninguno.

**Brief a procesar:** `docs/briefs/$ARGUMENTS.md`
($ARGUMENTS es el nombre del brief, ej: `HU-001` o `dashboard`. Si no se indica o el archivo no existe, listá los briefs disponibles en `docs/briefs/` y pedí cuál procesar.)

---

## Paso 1 — Leer contexto (obligatorio, optimizado con Engram)

**Objetivo:** obtener todo el contexto necesario sin leer archivos pesados cada vez. Usá `mem_search` por topic_keys para recuperar lo cacheado. **Delegá las búsquedas de contexto a sub-agentes en paralelo** para acelerar y no inflar tu contexto.

1. **Brief (inline):** leé directamente `docs/briefs/$ARGUMENTS.md` — la HU, wireframe, datos y criterios de aceptación. Este es el **único archivo que lees inline tú** (es único por HU).

2. **Lanzá los sub-agentes en paralelo** (delegate → `explore`):
   - **Sub-agente A — tokens:** `mem_search(query: "disenar/design-system")` + si es necesario `grep` sobre `MASTER.md`. Devuelve: paleta, tipografía, radios, motion, composición.
   - **Sub-agente B — componentes + HUs previas:** `mem_search(query: "disenar/componentes")` + `grep` sobre `src/components/**` + `mem_search(query: "hu/HU-XXX components-used")` del mismo módulo. Devuelve: inventario + decisiones previas.
   - **Sub-agente C — reglas + esquema:** `mem_search(query: "disenar/reglas")` + `grep` de las tablas del brief sobre `docs/esquema-bd-front.md`. Devuelve: reglas activas + campos/tipos de las entidades.

3. **Consolidá** los 3 resultados y seguí con el paso 2.

4. **Override de página:** (directo, es rápido) si existe `design-system/huellitas-felices/pages/[pantalla].md`, leelo directamente (tiene prioridad sobre el MASTER para esa pantalla). Si NO existe, lo crea el paso 5.

5. **Razonamiento de token puntual:** si te falta el "por qué" de un token, `grep -n "<token>" docs/design-system-pet-bliss-style.md` y leé solo ese fragmento. **NUNCA** leas el archivo completo (1951 líneas).

## Paso 2 — Audit UX (antes de codear)

Usá la skill `ux-heuristics` (Wondel.ai) sobre el wireframe del brief:

- Aplicá las heurísticas de Nielsen y las leyes de Krug ("Don't make me think").
- Asigná severidad a cada problema (catastrophic / major / minor / cosmetic).
- Dá un puntaje (0-10) y explicá qué corregir para llegar a 10.
- Si el brief no trae wireframe, proponé vos la estructura y auditála.

> **Presupuesto de contexto:** activá la skill `ux-heuristics`, pero leé **solo** `SKILL.md` + `references/nielsen-heuristics.md` + `references/krug-principles.md`. Las demás references (dark-patterns, wcag-checklist, audit-template, etc.) quedan bajo demanda: se leen solo si el caso las amerita.

Presentá un resumen corto del audit antes de seguir. Corregí problemas de lógica y jerarquía en el plan de implementación.

## Paso 3 — Generar el visual

> **Presupuesto de contexto:** **no actives la skill `ui-ux-pro-max`** salvo que tengas una duda puntual de composición/estados que el MASTER (paso 1) no resuelva. Si la activás, consultá su catálogo con `scripts/search.py` (consultas puntuales) y **no** leas el SKILL ni los data CSVs de corrido.

### 3a. Composición con ui-ux-pro-max

Usá la skill `ui-ux-pro-max` como guía de composición, estados y anti-patterns. Pero **los tokens finales son SIEMPRE los del MASTER Pet Bliss**:

- Paleta: verde bosque `#114F3C`, amarillo `#F9A900` (escaso, solo CTAs), crema `#FFF9EB`, blanco para cards.
- Tipografía: Baloo 2 (display, bold, uppercase) + Nunito (body).
- Radios: 8/12/16px, pill para botones/chips. Sombras discretas. Motion 150/250/500ms.
- Composición: overlaps, formas orgánicas, alternancia de fondos, una sola acción clara por viewport.

## Paso 4 — Buscar y reusar componentes (antes de codear)

**Regla dura: reusar antes de crear. Nada de duplicar componentes que ya existen.**

1. **Consultá el inventario de Engram** (recuperado en el paso 1, topic_key `disenar/componentes`) y armá la lista de piezas que va a necesitar la pantalla: tablas, filtros, modales, badges, forms, tabs, paginación, toasts.
2. **Verificá contra el código real**: el inventario en Engram puede estar desactualizado; ante duda, hacé grep en `src/components/**` por nombre o propósito para confirmar que el componente existe y tiene las props que necesitás.
3. **Buscá en Engram decisiones previas del mismo módulo:** `mem_search(query: "hu/HU-XXX components-used", project: "huellitas-felices")` para ver qué componentes se usaron en HUs anteriores del mismo módulo (ej: si estás haciendo HU-STK-04, buscá las decisiones de HU-STK-01 y HU-STK-02).
4. **Clasificá cada pieza** en una de tres categorías y presentalo como lista explícita antes de codear:
   - **Reusar tal cual:** existe en `ui/` o en el módulo y cubre la necesidad (Button, Modal, StatusBadge, Pagination, etc.).
   - **Extender:** existe algo similar pero le falta una prop/variante → extender el componente existente manteniendo retrocompatibilidad con quienes ya lo usan.
   - **Crear nuevo:** no hay equivalente razonable → justificar por qué no conviene reusar ni extender ninguno.
5. Si un badge/estado de negocio es necesario (ej: estado de orden), construiló **sobre `StatusBadge`** (mapear estado → variante + label + icono), nunca con colores propios.

Este listado (reusar/extender/crear) forma parte del plan que se muestra al usuario en el checkpoint final.

### 4b. Sub-agente de viabilidad (pre-check antes de codear)

Cuando la clasificación tenga algún **"Extender"** o **"Crear nuevo"**, delegá el chequeo de viabilidad a un sub-agente con contexto fresco (delegar el trabajo de análisis para no inflar tu contexto):

- **Input al sub-agente:** la lista de piezas clasificadas (los "extender" y "crear").
- **Lo que hace el sub-agente:**
  - Para cada **"Extender"**: lee el componente existente en `src/components/**` y verifica que la prop/variante nueva **no rompa retrocompatibilidad** con quienes ya lo usan.
  - Para cada **"Crear"**: hace una búsqueda real en `src/components/**` para confirmar que NO existe equivalente razonable.
- **Output:** para cada pieza → `✅ viable` / `⚠️ ajustar` (con la prop que conflictúa) / `❌ no hacer` (por qué).

Si el sub-agente marca algo como `❌`, ajustá la clasificación (reusar un equivalente en vez de crear, o posponer la extensión) antes de codear.

## Paso 5 — Codear (componentes reutilizables + página)

- Componentes **reutilizables** en `src/components/` (pensados 1 a 1 para React), no pantallas sueltas.
- Página en `src/app/<ruta>/page.tsx` con **datos hardcodeados** del brief (en español).
  - Ruta por defecto: derivar del nombre legible de la pantalla (ej: "Dashboard de turnos" → `/dashboard`). Si el brief aclara ruta, usar esa.
- **Datos placeholder listos para backend**: cada registro lleva un `id` numérico (la PK que mandará la base de datos). Los campos y tipos deben **respetar el esquema** de `docs/esquema-bd-front.md` (consultado en el paso 1): no inventes campos que no existen, usá los tipos correctos (varchar, numeric, enum, date, timestamp), y respetá las constraints (CHECK ≥ 0, UNIQUE, etc.). En cada punto de integración (fetch inicial, POST/PUT/PATCH/DELETE, selects de catálogos) dejar un comentario con prefijo `// BACKEND:` indicando **la tabla y endpoint** exactos (ej: `// BACKEND: GET /api/articulos → tabla articulo, JOIN categoria/unidad_medida/fabricante`).
- Tokens vía Tailwind (`src/app/globals.css`) — nada de colores hardcodeados.
- Iconos **Lucide**, animaciones **Framer Motion** (respetando `prefers-reduced-motion`).
- Estados: vacío, cargando, error, con datos — según corresponda a la pantalla.
- Accesibilidad: contraste ≥4.5:1, focus visible, touch targets ≥44×44px, `alt` en imágenes.
- **Al terminar:** actualizar `design-system/huellitas-felices/componentes.md` con los componentes nuevos creados (y ajustar filas de los que se extendieron).

## Paso 6 — Verificación técnica (sin navegador)

Verificá el código sin levantar navegador:

1. `npm run lint` (cubre solo `src/`; `.opencode/skills/` y `.agents/skills/` quedan fuera de alcance).
2. `npx tsc --noEmit`.
3. Checklist de accesibilidad sobre el código: contraste de tokens usados, focus visible, touch targets ≥44px, `aria-label` en iconos-acción, `alt`/`aria` en imágenes, `prefers-reduced-motion` respetado.
4. Repasá las **"Reglas activas"** del topic_key `disenar/reglas` en Engram (recuperado en el paso 1) y verificá que ninguna se esté repitiendo.

Corregí todo lo que falle antes de pasar al checkpoint. **No se usan test de navegador ni screenshots automáticos.**

## Paso 7 — CHECKPOINT: revisión del usuario (sin git)

**IMPORTANTE: este comando NO hace commit ni push. La subida se hace aparte con el comando `/subir`.**

1. Presentá un resumen de lo creado: archivos, componentes (marcando cuáles se reusaron, extendieron o crearon), ruta, resultado del audit y de la verificación técnica.
2. Decile al usuario que pruebe la pantalla: `npm run dev` y abrir la ruta en el navegador.
3. Si pidió ajustes, aplicálos y volvé a correr el paso 6.
4. Recordale que cuando quiera publicar los cambios use **`/subir`** (revisa el diff, propone el mensaje de commit referenciando la HU y pushea a GitHub con su confirmación).
5. Si durante la sesión apareció un error digno de registro (propio o del feedback del usuario), sugerile registrarlo con **`/error`**. No lo registres vos por tu cuenta.

## Paso 8 — Guardar en Engram (post-checkpoint)

Después de que el usuario apruebe el checkpoint, guardá las decisiones de esta HU en Engram para que la próxima HU del mismo módulo arranque con contexto:

1. **Componentes usados:** `mem_save` con topic_key `huellitas-felices/hu/$ARGUMENTS/components-used`:
   - Qué componentes se reusaron (nombre + archivo)
   - Cuáles se extendieron (nombre + prop/variante agregada)
   - Cuáles se crearon de nuevo (justificación)
   - Ejemplo: `topic_key: "huellitas-felices/hu/HU-STK-04/components-used"`

2. **Decisiones de diseño:** si hubo decisiones no obvias (ej: "los chips de stock bajo siempre van en warning con icono AlertTriangle"), `mem_save` con topic_key `huellitas-felices/hu/$ARGUMENTS/decisions`.

3. **Actualizar inventario en Engram:** si se crearon o extendieron componentes, actualizar `disenar/componentes` con `mem_update` para que la próxima HU tenga el inventario actualizado.

4. **Refrescar esquema si cambió:** si el usuario indica que el DBA entregó un nuevo script/DBML, re-leer `docs/esquema-bd-front.md` y actualizar `disenar/schema` en Engram con `mem_update`.

## Recordatorio de reglas

- **Reusar antes de crear** — consultar el inventario en Engram (`disenar/componentes`) y verificar contra `src/components/**`. Mantenerlo actualizado con lo nuevo (paso 8).
- El log `docs/errores-comunes.md` solo se alimenta con `/error` (a propósito, decisión del usuario). Las "Reglas activas" viven en Engram (`disenar/reglas`).
- UI en español, tono amigable pero profesional (Pet Bliss: "playful, never childish").
- **Cada HU exitosa deja contexto en Engram** (paso 8): componentes usados + decisiones de diseño. La próxima HU del mismo módulo arranca con ventaja.
- **Esquema de BD:** los datos hardcodeados y los comentarios `// BACKEND:` deben respetar los campos, tipos y constraints de `docs/esquema-bd-front.md`. No inventar campos que no existen en la tabla.
