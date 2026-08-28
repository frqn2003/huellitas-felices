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

### Cómo lanzar la pantalla: `/diseñar`

Con el brief escrito, desde OpenCode ejecutar:

```
/diseñar HU-001
```

(`HU-001` es el nombre del archivo en `docs/briefs/`; si no se indica, el comando lista los briefs disponibles.)

El comando ejecuta solo:

1. **Lee el contexto** — brief + `MASTER.md` (tokens obligatorios) + inventario de componentes + log de errores + `AGENTS.md`. Crea el override en `design-system/huellitas-felices/pages/[pantalla].md`.
2. **Audita UX** — skill `ux-heuristics` sobre el wireframe (Nielsen/Krug), con puntaje, antes de codear.
3. **Genera el visual** — skill `ui-ux-pro-max` solo como guía; los tokens finales siempre del Pet Bliss.
4. **Busca y reusa componentes** — consulta el inventario (`design-system/huellitas-felices/componentes.md`), verifica contra `src/components/` y clasifica cada pieza: reusar tal cual / extender / crear nuevo (justificado).
5. **Codea** — componentes reutilizables en `src/components/` + página en `src/app/<ruta>/` con datos hardcodeados. Al terminar actualiza el inventario con lo nuevo.
6. **Verifica** — `npm run lint` + `tsc --noEmit` + checklist de accesibilidad + repaso de las "Reglas activas" del log de errores (sin navegador).
7. **⏸️ CHECKPOINT** — te dejás probar y el comando **pregunta antes de subir a GitHub**. Nada se commitea sin tu confirmación explícita.

La ruta por defecto deriva del nombre legible de la pantalla (ej: "Dashboard de turnos" → `/dashboard`).

### Qué hace OpenCode al recibir el brief

1. Lee el brief + `design-system/huellitas-felices/MASTER.md` + inventario de componentes + `docs/errores-comunes.md` + `AGENTS.md`.
2. Audita usabilidad del wireframe (skill `ux-heuristics` — Nielsen/Krug) y corrige lógica antes del visual.
3. Genera el visual (skill `ui-ux-pro-max`) con los tokens Pet Bliss obligatorios.
4. Reusa o extiende componentes existentes antes de crear nuevos (inventario en `design-system/huellitas-felices/componentes.md`).
5. Crea componentes reutilizables en `src/components/` y la página en `src/app/<ruta>/`, y mantiene actualizado el inventario.
6. Verifica el código (lint + tipos + accesibilidad + reglas del log de errores) y hace checkpoint para que pruebes antes de subir.
7. La subida a GitHub se hace aparte con `/subir` y tu confirmación explícita.

### Registrar un error aprendido: `/error`

Cuando detectes un error (en una prueba tuya, en la verificación técnica o en revisión), registralo para no repetirlo:

```
/error "el modal no cerraba con Escape"
```

El comando pregunta lo que falte (pantalla/HU, qué pasó, cómo se detectó, causa), redacta la entrada con el formato del archivo, la inserta en `docs/errores-comunes.md` (más reciente primero) y, si aplica, suma la regla a las "Reglas activas". El log **solo** se alimenta así, a propósito: nunca se actualiza solo.

## Skills instaladas (proyecto)

- **Wondel.ai UX** (`.agents/skills/`): ux-heuristics, design-everyday-things, refactoring-ui, microinteractions, web-typography, lean-ux.
- **GitHub** (`.agents/skills/github/`): repo, commits, PRs.
- **UI/UX Pro Max** (`.opencode/skills/ui-ux-pro-max/`). Requiere Python 3 (`python --version` para verificar).

> Poda de skills: se eliminaron las que el flujo del equipo no usa (skills de negocio/producto/código y el pack extra de Pro Max: banner-design, brand, design, design-system, slides, ui-styling). Si alguna hace falta, se puede reinstalar desde `wondelai/skills` o el pack original.

> Las skills se disparan cuando el pedido coincide con su descripción; para activación garantizada, nombrarlas explícitamente: *"usá la skill ux-heuristics"*.

## Comandos útiles

```bash
npm run dev        # servidor local
npm run build      # build de producción
```

## Pendientes del equipo

- [ ] Definir moodboard final (carpeta compartida).
- [ ] Primera pantalla + HU.
