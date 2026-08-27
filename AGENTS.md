<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Huellitas Felices

Guía de trabajo para agentes de IA en este repositorio. Es el acuerdo del equipo de diseño (Scrum) antes de pasar a backend.

## Proyecto

- **Producto:** Huellitas Felices — sistema ERP de gestión veterinaria (consultas, turnos, fichas clínicas, vacunación, stock, facturación).
- **Rol del equipo:** diseñadores UI/UX. Las interfaces se construyen **hardcodeadas** en el front para pasarlas después al equipo de backend.
- **Stack:** Next.js + React (frontend), SQL (backend/datos, lo maneja el equipo de back).
- **Control de versiones:** Git + GitHub (repo `huellitas-felices`).

## Estilo de respuesta

- Respuestas objetivas y cortas.
- Solo lo que el usuario pide; sin explicaciones extra ni acciones adicionales.

## Documentación de referencia

- `docs/COMO-USAR.md` — guía rápida viva del equipo: flujo de trabajo, cómo escribir briefs y qué hace cada comando.
- `docs/briefs/` (base `_plantilla.md`) — briefs por pantalla (HU + wireframe + datos + criterios de aceptación); son el insumo de `/disenar`.
- `docs/design-system-pet-bliss-style.md` — design system "Pet Bliss Style": tokens de color, tipografía, spacing, grid, radius, motion y reglas de composición. **Es la fuente de verdad del lenguaje visual (versión humana).**
- `design-system/huellitas-felices/MASTER.md` — design system "Pet Bliss" en el formato de la skill ui-ux-pro-max (**versión para la skill**). Ver "Regla de tokens" abajo.
- `design-system/huellitas-felices/componentes.md` — inventario de componentes de `src/components/`. Consultarlo **antes de crear componentes** y actualizarlo al crear/extender.
- `docs/errores-comunes.md` — log de errores/lecciones del equipo. Leer sus "Reglas activas" al diseñar; se alimenta a propósito con el comando `/error`.

## Workflow obligatorio (comando `/disenar`)

El flujo completo diseño → código → verificación corre con el comando **`/disenar <brief>`** (`.opencode/command/disenar.md`) sobre un brief de `docs/briefs/`. En resumen:

1. **Wondel.ai (skill UX)** → auditar wireframe/flujo antes de visual: usabilidad, jerarquía, heurísticas de Nielsen/Norman/Krug.
2. **UI/UX Pro Max (skill visual)** → generar y pulir visualmente los componentes.
3. **Verificación técnica** → `npm run lint` + `npx tsc --noEmit` + checklist de accesibilidad sobre el código (sin navegador).

> Regla del equipo: **ui-ux-pro-max** es la skill visual que genera. No se usa ningún test de navegador ni screenshots automáticos para el front.
> Antes de codear: **buscar y reusar componentes** existentes (ver inventario en `design-system/huellitas-felices/componentes.md`); extender antes que duplicar.
> Las skills se activan cuando el pedido coincide con su descripción: para activación garantizada, nombrarlas explícitamente (ej: "usá la skill ux-heuristics").

## Control de versiones

- El diseño de pantallas se lanza con `/disenar` (termina en checkpoint, **no commitea**). Publicar cambios con el comando `/subir` (revisa el diff, propone el mensaje `feat/fix/chore` referenciando la HU y pushea a `origin` tras confirmación explícita).
- Nota técnica: `git` no está en el PATH de PowerShell → usar `C:\Program Files\Git\cmd\git.exe`.

## Log de errores

- Los errores/lecciones del equipo viven en `docs/errores-comunes.md`. El agente los consulta al diseñar y verifica las "Reglas activas" en la verificación técnica.
- El log **solo se alimenta a propósito** con el comando `/error` (nunca el agente lo actualiza por su cuenta).

## Regla de tokens (IMPORTANTE)

Cuando se use la skill `ui-ux-pro-max`, leer SIEMPRE `design-system/huellitas-felices/MASTER.md`. Sus reglas **reemplazan** a los catálogos genéricos de las skills (paletas, tipografías, estilos de sus catálogos NO se usan). Los tokens Pet Bliss del MASTER son obligatorios.

- Si existe `design-system/huellitas-felices/pages/[página].md`, ese archivo tiene prioridad sobre el MASTER para esa página.
- Para el razonamiento completo detrás de cada token, ver `docs/design-system-pet-bliss-style.md` (la versión humana).
- La paleta vive en 2 lugares sincronizados: `docs/` (humana) y `design-system/huellitas-felices/` (para la skill). Si cambia una, actualizar la otra.

## Design system (resumen ejecutivo)

Tokens y reglas completos en `design-system/huellitas-felices/MASTER.md` (operativo, el que usa la skill) y `docs/design-system-pet-bliss-style.md` (razonamiento humano, 50 secciones). En resumen: fondo crema `#FFF9EB`, brand verde bosque `#114F3C`, acción amarillo `#F9A900` (**solo CTAs y highlights, debe ser escaso**), headings Baloo 2 pesados/uppercase + body Nunito, radios 8/12/16px + pill, sombras discretas, motion 150/250/500ms respetando `prefers-reduced-motion`.

## Reglas técnicas

- Componentes **reutilizables** (pensados 1 a 1 para React), no pantallas sueltas.
- Usar los tokens del design system vía Tailwind (`src/app/globals.css`, tema `@theme`) — no colores hardcodeados en componentes.
- Iconografía: **Lucide** (outline, stroke medio, esquinas redondeadas).
- Animaciones: **Framer Motion**.
- Accesibilidad: contraste verificado, focus visible, touch targets ≥ 44×44px, `alt` en imágenes.
- Verificación: `npm run lint` (cubre solo `src/`; `.opencode/skills/` y `.agents/skills/` quedan fuera de alcance) + `npx tsc --noEmit` (no hay scripts de `typecheck` ni test runner; `tsconfig.json` ya tiene `noEmit: true`).
- Antes de subir: comprimir imágenes (TinyPNG).
- Idioma de la UI: español.
- **Preparación para backend**: los datos placeholder llevan `id` numérico (la PK que mandará la base). Cada punto de integración (fetch, POST/PUT/PATCH/DELETE, selects de catálogos) lleva un comentario `// BACKEND:` con el endpoint y qué reemplazar. El equipo de back los busca con `grep -rn "BACKEND" src/`.
