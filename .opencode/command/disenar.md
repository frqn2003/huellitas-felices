---
description: Diseña una pantalla completa de Huellitas Felices desde un brief (HU + wireframe). Flujo: audit UX → visual ui-ux-pro-max (tokens Pet Bliss) → código hardcodeado → test Playwright → checkpoint de revisión antes de subir a GitHub.
agent: build
---

# Comando /diseñar — Pantalla completa desde brief

Vas a diseñar, codear y testear una pantalla de **Huellitas Felices** (sistema de gestión veterinaria) a partir del brief indicado. Ejecutá los pasos EN ORDEN y no te saltees ninguno.

**Brief a procesar:** `docs/briefs/$ARGUMENTS.md`
($ARGUMENTS es el nombre del brief, ej: `HU-001` o `dashboard`. Si no se indica o el archivo no existe, listá los briefs disponibles en `docs/briefs/` y pedí cuál procesar.)

---

## Paso 1 — Leer contexto (obligatorio)

1. `docs/briefs/$ARGUMENTS.md` — la HU, wireframe, datos y criterios de aceptación.
2. `design-system/huellitas-felices/MASTER.md` — **tokens OBLIGATORIOS** (Pet Bliss). Sus reglas reemplazan al catálogo de la skill.
3. `AGENTS.md` — acuerdos del equipo y reglas técnicas.
4. Si existe `design-system/huellitas-felices/pages/[pantalla].md`, tiene prioridad sobre el MASTER.
5. Si NO existe el archivo de página en `design-system/huellitas-felices/pages/`, crearlo documentando los tokens/reglas específicos de esta pantalla.

## Paso 2 — Audit UX (antes de codear)

Usá la skill `ux-heuristics` (Wondel.ai) sobre el wireframe del brief:

- Aplicá las heurísticas de Nielsen y las leyes de Krug ("Don't make me think").
- Asigná severidad a cada problema (catastrophic / major / minor / cosmetic).
- Dá un puntaje (0-10) y explicá qué corregir para llegar a 10.
- Si el brief no trae wireframe, proponé vos la estructura y auditála.

Presentá un resumen corto del audit antes de seguir. Corregí problemas de lógica y jerarquía en el plan de implementación.

## Paso 3 — Generar el visual (guía de composición)

Usá la skill `ui-ux-pro-max` como guía de composición, estados y anti-patterns. Pero **los tokens finales son SIEMPRE los del MASTER Pet Bliss**:

- Paleta: verde bosque `#114F3C`, amarillo `#F9A900` (escaso, solo CTAs), crema `#FFF9EB`, blanco para cards.
- Tipografía: Baloo 2 (display, bold, uppercase) + Nunito (body).
- Radios: 8/12/16px, pill para botones/chips. Sombras discretas. Motion 150/250/500ms.
- Composición: overlaps, formas orgánicas, alternancia de fondos, una sola acción clara por viewport.

## Paso 4 — Codear (componentes reutilizables + página)

- Componentes **reutilizables** en `src/components/` (pensados 1 a 1 para React), no pantallas sueltas.
- Página en `src/app/<ruta>/page.tsx` con **datos hardcodeados** del brief (en español).
  - Ruta por defecto: derivar del nombre legible de la pantalla (ej: "Dashboard de turnos" → `/dashboard`). Si el brief aclara ruta, usar esa.
- Tokens vía Tailwind (`src/app/globals.css`) — nada de colores hardcodeados.
- Iconos **Lucide**, animaciones **Framer Motion** (respetando `prefers-reduced-motion`).
- Estados: vacío, cargando, error, con datos — según corresponda a la pantalla.
- Accesibilidad: contraste ≥4.5:1, focus visible, touch targets ≥44×44px, `alt` en imágenes.

## Paso 5 — Testear con Playwright

Usá la skill `playwright-cli`:

1. Levantá el servidor (`npm run dev`) en segundo plano.
2. Navegá a la ruta de la pantalla.
3. Verificá: render correcto, navegación, clics en elementos interactivos, estados (si aplica).
4. Probá responsive: desktop y mobile (375px).
5. Guardá **screenshots como evidencia** en `docs/evidencia/<pantalla>.png` (nombre legible, ej: `docs/evidencia/dashboard.png`).
6. Cerrá el navegador y el servidor.

## Paso 6 — CHECKPOINT: revisión del usuario (NO subir automáticamente)

**IMPORTANTE: NO hacés commit ni push sin confirmación explícita del usuario.**

1. Presentá un resumen de lo creado: archivos, componentes, ruta, resultado del audit y del test.
2. Decile al usuario que pruebe la pantalla: `npm run dev` y abrir la ruta en el navegador.
3. Preguntá explícitamente: **"¿Confirmás la subida a GitHub?"**
   - **Sí** → commit con mensaje referenciando la HU (ej: `feat: pantalla dashboard (HU-001)`) + push.
   - **No / pedir ajustes** → aplicá los cambios que pida, repetí el test (paso 5) y volvé a preguntar.
   - **Dejarlo local** → todo queda sin commitear para que revise cuando quiera.

## Recordatorio de reglas

- NO usar la skill Impeccable (regla del equipo).
- NO inventar colores, fuentes ni estilos fuera del MASTER Pet Bliss.
- UI en español, tono amigable pero profesional (Pet Bliss: "playful, never childish").
- Componentes reutilizables, nada de pantallas sueltas.
