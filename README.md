# Huellitas Felices 🐾

Sistema de gestión veterinaria — interfaces **hardcodeadas** en front (Next.js + React) para pasar al equipo de backend (SQL).

Equipo de diseño UI/UX trabajando en Scrum. Este README documenta cómo dejar el proyecto configurado igual en ambas máquinas.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS (tokens del design system)
- Lucide (iconos) + Framer Motion (animaciones)

## Requisitos

- Node.js 20+ (`node -v`)
- Git
- GitHub CLI (`gh`) — opcional, para crear el repo

## Puesta a punto (una sola vez por máquina)

### 1. Clonar el repo

```bash
git clone https://github.com/<org>/huellitas-felices.git
cd huellitas-felices
npm install
```

### 2. Skills de OpenCode (mismas para todo el equipo)

Las skills de proyecto ya están commiteadas en el repo. Verificar que OpenCode las detecte:

1. Reiniciar OpenCode desde la raíz del proyecto.
2. Ejecutar: `¿Qué skills tenés cargadas?` — deben aparecer:
   - **Wondel.ai (UX)** — auditar usabilidad (heurísticas Nielsen/Norman/Krug).
   - **UI/UX Pro Max** — generar y pulir visual (con los tokens Pet Bliss del MASTER).
   - **GitHub** — manejo de repo, commits, PRs.

Si falta alguna, instalarla manualmente:

```bash
# Wondel.ai (UX)
npx skills add wondelai/skills -a opencode -y --skill ux-heuristics --skill design-everyday-things --skill refactoring-ui --skill microinteractions --skill web-typography --skill lean-ux

# UI/UX Pro Max
npx ui-ux-pro-max-cli init -a opencode -f

# GitHub
gh skill install Dimillian/Skills github --agent opencode --scope project --force
```

> Las skills se instalan a nivel de **proyecto** y se commitean, así ambos usan la misma configuración.

### 3. Autenticación GitHub

```bash
gh auth login
```

### 4. Correr el proyecto

```bash
npm run dev
```

## Workflow de diseño (obligatorio)

1. **El equipo** → investigación + wireframes (fuera del repo).
2. **Escribir el brief** → HU + wireframe en `docs/briefs/` (ver plantilla).
3. **Wondel.ai** → auditar wireframe/flujo (usabilidad, jerarquía) antes de visual.
4. **UI/UX Pro Max** → generar y pulir los componentes (siempre con los tokens de `design-system/huellitas-felices/MASTER.md`).
5. **Verificación técnica** → `npm run lint` + `tsc --noEmit` + checklist de accesibilidad sobre el código.

## Documentación

- `docs/guia-diseno-huellitas-felices.md.pdf` — guía del proceso de diseño.
- `docs/design-system-pet-bliss-style.md` — design system (versión humana, fuente de verdad).
- `design-system/huellitas-felices/MASTER.md` — design system para la skill ui-ux-pro-max (reglas que reemplazan al catálogo de la skill).
- `docs/briefs/_plantilla.md` — plantilla de brief por pantalla (HU + wireframe).
- `docs/COMO-USAR.md` — guía rápida del flujo de trabajo.
- `AGENTS.md` — acuerdos del equipo y reglas para agentes de IA.

## Convenciones del equipo

- Componentes reutilizables (1 a 1 con React), no pantallas sueltas.
- Tokens del design system vía Tailwind — nada de colores hardcodeados.
- Iconos Lucide, animaciones Framer Motion.
- UI en español.
- Antes de subir: comprimir imágenes (TinyPNG).
