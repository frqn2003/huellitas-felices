---
description: Diseña una pantalla completa de Huellitas Felices desde un brief (HU + wireframe). Flujo: audit UX → visual ui-ux-pro-max (tokens Pet Bliss) → refinamiento con Impeccable (pregunta por modo live) → código hardcodeado → verificación técnica → checkpoint de revisión. La subida a GitHub se hace con /subir.
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

## Paso 3 — Generar el visual + refinamiento

### 3a. Composición con ui-ux-pro-max

Usá la skill `ui-ux-pro-max` como guía de composición, estados y anti-patterns. Pero **los tokens finales son SIEMPRE los del MASTER Pet Bliss**:

- Paleta: verde bosque `#114F3C`, amarillo `#F9A900` (escaso, solo CTAs), crema `#FFF9EB`, blanco para cards.
- Tipografía: Baloo 2 (display, bold, uppercase) + Nunito (body).
- Radios: 8/12/16px, pill para botones/chips. Sombras discretas. Motion 150/250/500ms.
- Composición: overlaps, formas orgánicas, alternancia de fondos, una sola acción clara por viewport.

### 3b. Refinamiento con Impeccable (preguntar)

Después del visual, **preguntá explícitamente al usuario** cómo quiere el pase de refinamiento con la skill `impeccable`:

- **"¿Querés refinar el diseño con Impeccable en modo `live` (variantes visuales en el navegador) o en modo estándar sobre el código?"**

Opciones:
- **`live`** → seguí `reference/live.md` de la skill (iteración visual en navegador sobre la pantalla ya levantada).
- **Estándar** → pase de `polish`/`critique`/`audit` sobre el código/componentes, según lo que indique la skill.

Regla inquebrantable: Impeccable **refina, no redefine**. Sus instrucciones visuales NO pueden contradecir los tokens Pet Bliss del MASTER ni el archivo de página (`design-system/huellitas-felices/pages/[pantalla].md`). Si Impeccable sugiere algo fuera de tokens (colores, fuentes, radios, patrones), se descarta o se propone al usuario como actualización del MASTER (que debe aprobarse y sincronizarse en `docs/`).

## Paso 4 — Codear (componentes reutilizables + página)

- Componentes **reutilizables** en `src/components/` (pensados 1 a 1 para React), no pantallas sueltas.
- Página en `src/app/<ruta>/page.tsx` con **datos hardcodeados** del brief (en español).
  - Ruta por defecto: derivar del nombre legible de la pantalla (ej: "Dashboard de turnos" → `/dashboard`). Si el brief aclara ruta, usar esa.
- Tokens vía Tailwind (`src/app/globals.css`) — nada de colores hardcodeados.
- Iconos **Lucide**, animaciones **Framer Motion** (respetando `prefers-reduced-motion`).
- Estados: vacío, cargando, error, con datos — según corresponda a la pantalla.
- Accesibilidad: contraste ≥4.5:1, focus visible, touch targets ≥44×44px, `alt` en imágenes.

## Paso 5 — Verificación técnica (sin navegador)

Verificá el código sin levantar navegador:

1. `npm run lint` (errores solo en `src/`; los de `.opencode/skills/` y `.agents/skills/` son preexistentes y no son responsabilidad tuya).
2. `npx tsc --noEmit`.
3. Checklist de accesibilidad sobre el código: contraste de tokens usados, focus visible, touch targets ≥44px, `aria-label` en iconos-acción, `alt`/`aria` en imágenes, `prefers-reduced-motion` respetado.

Corregí todo lo que falle antes de pasar al checkpoint. **No se usa Playwright ni se toman screenshots.**

## Paso 6 — CHECKPOINT: revisión del usuario (sin git)

**IMPORTANTE: este comando NO hace commit ni push. La subida se hace aparte con el comando `/subir`.**

1. Presentá un resumen de lo creado: archivos, componentes, ruta, resultado del audit y de la verificación técnica.
2. Decile al usuario que pruebe la pantalla: `npm run dev` y abrir la ruta en el navegador.
3. Si pidió ajustes, aplicálos y volvé a correr el paso 5.
4. Recordale que cuando quiera publicar los cambios use **`/subir`** (revisa el diff, propone el mensaje de commit referenciando la HU y pushea a GitHub con su confirmación).

## Recordatorio de reglas

- Skills visuales: **ui-ux-pro-max** genera el visual; **Impeccable** refina después (con la opción de modo `live` que se pregunta al usuario). Ambas respetan los tokens Pet Bliss del MASTER.
- NO inventar colores, fuentes ni estilos fuera del MASTER Pet Bliss.
- UI en español, tono amigable pero profesional (Pet Bliss: "playful, never childish").
- Componentes reutilizables, nada de pantallas sueltas.
