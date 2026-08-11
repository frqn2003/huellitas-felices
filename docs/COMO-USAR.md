# Cómo usar este proyecto (guía rápida del equipo)

Documento vivo del equipo de diseño. Describe cómo se trabaja con OpenCode y dónde vive cada cosa.

## El design system Pet Bliss vive en 2 lugares (SINCRONIZADOS)

| Dónde | Para quién | Qué contiene |
|-------|-----------|--------------|
| `docs/design-system-pet-bliss-style.md` | **El equipo (versión humana)** | Razonamiento completo de cada token: por qué crema, por qué el amarillo es escaso, reglas de composición, checklist de fidelidad (50 secciones). |
| `design-system/huellitas-felices/MASTER.md` | **La skill ui-ux-pro-max** | La misma información en el formato que la skill entiende (variables CSS, component specs, anti-patterns, checklist). |
| `design-system/huellitas-felices/pages/[página].md` | **La skill ui-ux-pro-max** | Overrides por pantalla. Si existe, tiene prioridad sobre el MASTER para esa página. |

**Regla de oro:** si cambian un token en un lugar, actualizarlo en el otro. Los colores, tipografías y reglas del catálogo genérico de la skill **nunca** se usan: manda el MASTER.

## Cómo se diseña (flujo del equipo)

```
1. INVESTIGACIÓN + WIREFRAMES   → los hace el equipo a mano (Figjam/papel)
2. IDEA REFINADA                → se escribe en un .md (ver "Cómo escribir el brief")
3. OPENCODE CODEA               → /diseñar <brief> con las skills
4. ENTREGA                      → pantalla hardcodeada + testeada
```

### Cómo escribir el brief de una pantalla

En un `.md` de `docs/briefs/` (usar `_plantilla.md` como base):

```markdown
# HU-001: [Como <rol>, quiero <acción>, para <beneficio>]

## Wireframe (idea)
[dibujo ASCII o descripción: qué se ve en cada zona de la pantalla]

## User flow
[de dónde viene el usuario → qué hace → a dónde va]

## Datos hardcodeados
[pacientes, turnos, veterinarios de ejemplo]

## Estados
[vacío / cargando / error]

## Criterios de aceptación
[qué debe cumplir la pantalla para darse por terminada]
```

### Qué hace OpenCode al recibir el brief

1. Lee el brief + `design-system/huellitas-felices/MASTER.md` + `AGENTS.md`.
2. Audita usabilidad del wireframe (skill `ux-heuristics` — Nielsen/Krug) y corrige lógica antes del visual.
3. Genera el visual (skill `ui-ux-pro-max`) con los tokens Pet Bliss obligatorios.
4. Crea componentes reutilizables en `src/components/` y la página en `src/app/<ruta>/`.
5. Testea con Playwright (navegación, clics, responsive, screenshots).
6. Commitea con referencia a la HU.

## Skills instaladas (proyecto)

- **Wondel.ai UX** (`.agents/skills/`): ux-heuristics, design-everyday-things, refactoring-ui, microinteractions, web-typography, lean-ux.
- **UI/UX Pro Max** (`.opencode/skills/`): ui-ux-pro-max + banner, brand, design, design-system, slides, ui-styling. Requiere Python 3 (`python --version` para verificar).
- **Playwright CLI** (`.agents/skills/`): automatización de navegador.
- **GitHub** (`.agents/skills/`): repo, commits, PRs.

> Las skills se disparan cuando el pedido coincide con su descripción; para activación garantizada, nombrarlas explícitamente: *"usá la skill ux-heuristics"*.

## Comandos útiles

```bash
npm run dev        # servidor local
npm run build      # build de producción
```

## Pendientes del equipo

- [ ] Definir moodboard final (carpeta compartida).
- [ ] Primera pantalla + HU.
