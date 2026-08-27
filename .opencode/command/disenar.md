---
description: Diseña una pantalla completa de Huellitas Felices desde un brief (HU + wireframe). Flujo: audit UX → reuso de componentes (inventario) → visual ui-ux-pro-max (tokens Pet Bliss) → código hardcodeado → verificación técnica → checkpoint de revisión. La subida a GitHub se hace con /subir.
agent: build
---

# Comando /diseñar — Pantalla completa desde brief

Vas a diseñar, codear y verificar una pantalla de **Huellitas Felices** (sistema de gestión veterinaria) a partir del brief indicado. Ejecutá los pasos EN ORDEN y no te saltees ninguno.

**Brief a procesar:** `docs/briefs/$ARGUMENTS.md`
($ARGUMENTS es el nombre del brief, ej: `HU-001` o `dashboard`. Si no se indica o el archivo no existe, listá los briefs disponibles en `docs/briefs/` y pedí cuál procesar.)

---

## Paso 1 — Leer contexto (obligatorio)

1. `docs/briefs/$ARGUMENTS.md` — la HU, wireframe, datos y criterios de aceptación.
2. `design-system/huellitas-felices/MASTER.md` — **tokens OBLIGATORIOS** (Pet Bliss). Sus reglas reemplazan al catálogo de cualquier skill.
3. `design-system/huellitas-felices/componentes.md` — **inventario de componentes existentes** (para reusar antes de crear).
4. `docs/errores-comunes.md` — log de errores del equipo. Leer las "Reglas activas" y tenerlas presentes durante todo el diseño.
5. `AGENTS.md` — acuerdos del equipo y reglas técnicas.
6. Si existe `design-system/huellitas-felices/pages/[pantalla].md`, tiene prioridad sobre el MASTER.
7. Si NO existe el archivo de página en `design-system/huellitas-felices/pages/`, crearlo documentando los tokens/reglas específicos de esta pantalla.
8. `docs/design-system-pet-bliss-style.md` (1951 líneas) **NO se lee de corrido**. El MASTER ya trae los tokens; si te falta el razonamiento de un token puntual, buscá la sección con `grep -n "<token>" docs/design-system-pet-bliss-style.md` y leé solo ese fragmento.

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

1. **Consultá el inventario** `design-system/huellitas-felices/componentes.md` (leído en el paso 1) y armá la lista de piezas que va a necesitar la pantalla: tablas, filtros, modales, badges, forms, tabs, paginación, toasts.
2. **Verificá contra el código real**: el inventario puede estar desactualizado; ante duda, buscá en `src/components/**` (glob/grep por nombre o propósito).
3. **Clasificá cada pieza** en una de tres categorías y presentalo como lista explícita antes de codear:
   - **Reusar tal cual:** existe en `ui/` y cubre la necesidad (Button, Modal, StatusBadge, Pagination, etc.).
   - **Extender:** existe algo similar pero le falta una prop/variante → extender el componente existente manteniendo retrocompatibilidad con quienes ya lo usan.
   - **Crear nuevo:** no hay equivalente razonable → justificar por qué no conviene reusar ni extender ninguno.
4. Si un badge/estado de negocio es necesario (ej: estado de orden), construiló **sobre `StatusBadge`** (mapear estado → variante + label + icono), nunca con colores propios.

Este listado (reusar/extender/crear) forma parte del plan que se muestra al usuario en el checkpoint final.

## Paso 5 — Codear (componentes reutilizables + página)

- Componentes **reutilizables** en `src/components/` (pensados 1 a 1 para React), no pantallas sueltas.
- Página en `src/app/<ruta>/page.tsx` con **datos hardcodeados** del brief (en español).
  - Ruta por defecto: derivar del nombre legible de la pantalla (ej: "Dashboard de turnos" → `/dashboard`). Si el brief aclara ruta, usar esa.
- **Datos placeholder listos para backend**: cada registro lleva un `id` numérico (la PK que mandará la base de datos). En cada punto de integración (fetch inicial, POST/PUT/PATCH/DELETE, selects de catálogos) dejar un comentario con prefijo `// BACKEND:` indicando el endpoint y qué reemplazar, para que el equipo de back conecte sin reescribir el front (ej: `// BACKEND: reemplazar por GET /api/articulos`).
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
4. Repasá las **"Reglas activas"** del log `docs/errores-comunes.md` y verificá que ninguna se esté repitiendo.

Corregí todo lo que falle antes de pasar al checkpoint. **No se usan test de navegador ni screenshots automáticos.**

## Paso 7 — CHECKPOINT: revisión del usuario (sin git)

**IMPORTANTE: este comando NO hace commit ni push. La subida se hace aparte con el comando `/subir`.**

1. Presentá un resumen de lo creado: archivos, componentes (marcando cuáles se reusaron, extendieron o crearon), ruta, resultado del audit y de la verificación técnica.
2. Decile al usuario que pruebe la pantalla: `npm run dev` y abrir la ruta en el navegador.
3. Si pidió ajustes, aplicálos y volvé a correr el paso 6.
4. Recordale que cuando quiera publicar los cambios use **`/subir`** (revisa el diff, propone el mensaje de commit referenciando la HU y pushea a GitHub con su confirmación).
5. Si durante la sesión apareció un error digno de registro (propio o del feedback del usuario), sugerile registrarlo con **`/error`**. No lo registres vos por tu cuenta.

## Recordatorio de reglas

- **Reusar antes de crear** — consultar el inventario `design-system/huellitas-felices/componentes.md` y mantenerlo actualizado con lo nuevo.
- El log `docs/errores-comunes.md` solo se alimenta con `/error` (a propósito, decisión del usuario).
- UI en español, tono amigable pero profesional (Pet Bliss: "playful, never childish").
