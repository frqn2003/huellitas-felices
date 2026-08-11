<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Huellitas Felices

Guía de trabajo para agentes de IA en este repositorio. Es el acuerdo del equipo de diseño (Scrum) antes de pasar a backend.

## Proyecto

- **Producto:** Huellitas Felices — sistema de gestión veterinaria (consultas, turnos, fichas clínicas, vacunación, stock, facturación).
- **Rol del equipo:** diseñadores UI/UX. Las interfaces se construyen **hardcodeadas** en el front para pasarlas después al equipo de backend.
- **Stack:** Next.js + React (frontend), SQL (backend/datos, lo maneja el equipo de back).
- **Control de versiones:** Git + GitHub (repo `huellitas-felices`).

## Documentación de referencia

- `docs/guia-diseno-huellitas-felices.md.pdf` — guía de proceso de diseño (investigación → moodboard → wireframes → sistema → pruebas).
- `docs/design-system-pet-bliss-style.md` — design system "Pet Bliss Style": tokens de color, tipografía, spacing, grid, radius, motion y reglas de composición. **Es la fuente de verdad del lenguaje visual (versión humana).**
- `design-system/huellitas-felices/MASTER.md` — design system "Pet Bliss" en el formato de la skill ui-ux-pro-max (**versión para la skill**). Ver "Regla de tokens" abajo.

## Workflow obligatorio (de la guía, paso 7)

1. **Wondel.ai (skill UX)** → auditar wireframe/flujo antes de visual: usabilidad, jerarquía, heurísticas de Nielsen/Norman/Krug.
2. **UI/UX Pro Max (skill visual)** → generar y pulir visualmente los componentes.
3. **Impeccable (refinamiento)** → pase de pulido/crítica tras el visual de ui-ux-pro-max (se pregunta al usuario si quiere el modo `live`). **Refina, no redefine**: nunca contradice los tokens Pet Bliss.
4. **Verificación técnica** → `npm run lint` + `tsc --noEmit` + checklist de accesibilidad sobre el código (sin navegador).

> Regla del equipo: **ui-ux-pro-max** es la skill visual que genera; **Impeccable** se usa como pase de refinamiento posterior (opcional modo `live` con confirmación del usuario). NO se usa Playwright para testear el front.

## Control de versiones

- Publicar cambios con el comando `/subir` (revisa el diff, propone el mensaje `feat/fix/chore` referenciando la HU y pushea a `origin` tras confirmación explícita).
- Nota técnica: `git` no está en el PATH de PowerShell → usar `C:\Program Files\Git\cmd\git.exe`.

## Regla de tokens (IMPORTANTE)

Cuando se usen las skills `ui-ux-pro-max` o `impeccable`, leer SIEMPRE `design-system/huellitas-felices/MASTER.md`. Sus reglas **reemplazan** a los catálogos genéricos de las skills (paletas, tipografías, estilos de sus catálogos NO se usan). Los tokens Pet Bliss del MASTER son obligatorios para ambas.

- Si existe `design-system/huellitas-felices/pages/[página].md`, ese archivo tiene prioridad sobre el MASTER para esa página.
- Para el razonamiento completo detrás de cada token, ver `docs/design-system-pet-bliss-style.md` (la versión humana).
- La paleta vive en 2 lugares sincronizados: `docs/` (humana) y `design-system/huellitas-felices/` (para la skill). Si cambia una, actualizar la otra.

## Design system (resumen ejecutivo)

- **Fondo:** crema `#FFF9EB` (canvas principal).
- **Brand:** verde bosque `#114F3C` (títulos, nav, footer, botones secundarios).
- **Acción:** amarillo `#F9A900` (solo CTAs y highlights, debe ser escaso).
- **Tipografía:** headings pesados, bold/extra bold (800–900), generalmente **uppercase**, line-height compacto. Cuerpo neutro y legible. Familias: Baloo 2 (display) + Nunito (body).
- **Radios moderados:** 8/12/16px, pill (999px) para botones y chips.
- **Sombras discretas:** `0 4px 16px rgba(17, 79, 60, 0.08)`.
- **Composición:** overlaps, formas orgánicas, recortes, alternancia de fondos (crema/blanco/verde/amarillo), mucho espacio negativo, una sola acción clara por viewport.
- **Motion:** 150/250/500ms, ease-out, respetar `prefers-reduced-motion`.

Detalles completos y checklist de fidelidad en `docs/design-system-pet-bliss-style.md` y `design-system/huellitas-felices/MASTER.md`.

## Reglas técnicas

- Componentes **reutilizables** (pensados 1 a 1 para React), no pantallas sueltas.
- Usar los tokens del design system vía Tailwind (`src/app/globals.css`, tema `@theme`) — no colores hardcodeados en componentes.
- Iconografía: **Lucide** (outline, stroke medio, esquinas redondeadas).
- Animaciones: **Framer Motion**.
- Accesibilidad: contraste verificado, focus visible, touch targets ≥ 44×44px, `alt` en imágenes.
- Antes de subir: comprimir imágenes (TinyPNG).
- Idioma de la UI: español.
