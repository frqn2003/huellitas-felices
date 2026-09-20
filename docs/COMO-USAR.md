# Huellitas Felices — Guía de comandos OpenCode + Engram + Gentle AI

Documento de referencia para el equipo que trabaja en **Huellitas Felices** (ERP veterinario, frontend en Next.js/React). Reemplaza la vieja guía "COMO-USAR".

> **Roles importantes:** este equipo solo trabaja el **frontend**. Se define una HU (historia de usuario), se arma el brief y se diseña la pantalla con `/disenar`. El backend lo maneja el equipo de back.

---

## Sección 1 — Comandos OpenCode del equipo

Los tres comandos que se usan a diario. Van siempre precedidos de `/` y se escriben en OpenCode.

### `/brief` — Armar el brief de una pantalla

Genera el archivo `docs/briefs/HU-XXX.md` a partir de tu descripción + idea inicial. **No codea nada**, solo produce el brief. El diseño se hace después con `/disenar`.

```
/brief HU-STK-04: Como administrador, quiero ver el stock por depósito para reponer antes de que se agote. Idea: tabla con filtros por depósito, badges de estado y alerta de reposición.
```

Lo que hace:
1. Interpreta la HU + tu idea inicial → identifica las entidades de negocio (stock → `ficha_stock`, `articulo`, `deposito`).
2. **Te hace preguntas solo de lo que falta** (ruta, estados, prioridad, etc.). No lo que ya puede inferir.
3. (Espera tus respuestas.)
4. Junta contexto: esquema de BD (`docs/esquema-bd-front.md`), componentes existentes (Engram `disenar/componentes`) y HUs previas del módulo. Estas búsquedas se delegan a **sub-agentes**.
5. Genera `docs/briefs/HU-XXX.md` completo: wireframe, user flow, fuente de datos (BD), componentes sugeridos, datos hardcodeados (respetando los tipos del esquema), estados y criterios de aceptación.
6. Te muestra el resultado para revisar antes de `/disenar`.

> Regla: `/brief` pregunta **solo lo que falta de verdad**. Si la respuesta es obvia del brief o del dominio, no pregunta.

### `/disenar` — Diseñar y codear la pantalla

Diseña, codea y verifica la pantalla completa a partir del brief. **La subida a GitHub NO la hace**: eso va con `/subir` aparte.

```
/disenar HU-STK-04
```

Lo que hace (pasos en orden):
1. **Paso 1 — Contexto**: lee el brief (único archivo inline) y lanza **3 sub-agentes en paralelo** para tokens Pet Bliss, componentes + HUs previas del módulo, y reglas + esquema de BD.
2. **Paso 2 — Audit UX**: skill `ux-heuristics` sobre el wireframe (Nielsen + Krug), con severidad y puntaje 0-10.
3. **Paso 3 — Visual**: tokens del MASTER Pet Bliss (verde bosque, amarillo escaso solo en CTAs, Baloo 2 + Nunito).
4. **Paso 4 — Reuso de componentes**: consulta inventario de Engram, clasifica cada pieza (reusar/extender/crear). Si hay `Extender`/`Crear`, un **sub-agente de viabilidad** valida que no rompa retrocompatibilidad ni duplique.
5. **Paso 5 — Codea**: componentes reutilizables en `src/components/` + página en `src/app/<ruta>/page.tsx` con datos hardcodeados. Respetando el esquema de BD y con comentarios `// BACKEND:`.
6. **Paso 6 — Verificación**: `npm run lint` + `npx tsc --noEmit` + checklist de accesibilidad + reglas activas, y **prueba de renderizado real** (skill `browser-automation`, headless browser, sin instalar nada) que confirma que la pantalla monta sin `console.error` ni requests fallidos.
7. **Paso 7 — Checkpoint**: te muestra el resumen y te deja probar (`npm run dev`). Ajustes → vuelve al paso 6.
8. **Paso 8 — Post-checkpoint**: guarda en Engram las decisiones de la HU (componentes usados + decisiones de diseño) para que la próxima HU del mismo módulo arranque con contexto.

> Reutilizar antes de crear es **regla dura**. El inventario vive en Engram (`disenar/componentes`) y en `src/components/`.
> Si en el paso 6/7 se detecta un error, el agente lo registra **automáticamente** en `docs/errores-comunes.md` + Engram (no hay comando `/error`).

### `/subir` — Publicar cambios en GitHub

Sube los cambios a GitHub **con confirmación explícita**. Detecta el tipo de cambio, valida el mensaje y confirma la rama.

```
/subir
```
o con mensaje:
```
/subir "feat: stock por depósito (HU-STK-04)"
```

Lo que hace:
1. **Paso 1 — Inspecciona**: rama actual, status, diff, log.
2. **Paso 2 — Confirma la rama**: te dice en qué rama estás y a dónde va a pushear. Si hay trabajo a medias de otra tarea, avisa.
3. **Paso 3 — Detecta el tipo** automáticamente por los archivos que toca:

   | Tipo | Toca | Prefijo |
   |---|---|---|
   | `feat` | `src/app/**` o `src/components/**` | `feat: <pantalla> (HU-XXX)` |
   | `fix` | `src/**` (corrección) | `fix: <descripción> (HU-XXX)` |
   | `docs` | `docs/**`, `*.md` | `docs: <descripción>` |
   | `chore` | `.opencode/`, config, herramientas | `chore: <descripción>` |

4. **Paso 4 — Valida el mensaje** contra la convención (debe empezar con `feat:`/`fix:`/`chore:`/`docs:`, referencia HU en feat/fix, español). Advierte si no cumple.
5. **Paso 5 — Confirma**: te muestra el resumen y propone el mensaje. **Pregunta antes de commitear y pushear.**
6. **Paso 6 — Push**: `git push origin <rama>` (explícito) + verifica que quede limpio.

> Regla de oro: **nunca commitea ni pushea sin tu confirmación.**

---

## Sección 2 — Instalación de Engram + Gentle AI en una PC nueva

Guía paso a paso para dejar andando el entorno en la máquina de un desarrollador por primera vez. Al terminar, abrir OpenCode y arrancar a diseñar.

### Requisitos previos

- **Node.js 18+** (para Next.js/OpenCode).
- **OpenCode** instalado (`npm install -g opencode-ai` o el instalador del sistema).
- **Git** instalado (para el control de versiones).
- **Scoop** (Windows) — facilita instalar Engram. Si no tenés Scoop: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` y `irm get.scoop.sh | iex`.

### Paso 1 — Instalar Engram (memoria persistente)

Engram es un binario que se instala y proporciona el MCP de memoria. La vía recomendada en Windows es Scoop:

```powershell
# Con Scoop
scoop bucket add main
scoop install engram
```

> Si Scoop falla, Engram alternativamente se instala como binario de Go: `go install github.com/...@latest` (consultar la doc oficial del binario). En esta máquina el binario vive en `C:\Users\gato4\scoop\apps\engram\current\engram.exe`.

Verificá que quedó:
```powershell
engram --version
```
Debe responder una versión (si dice "cannot open shim file", probablemente el binario de scoop no se instaló bien; reinstalá o usá la ruta completa del `.exe`).

### Paso 2 — Configurar Engram como MCP en OpenCode

Engram se conecta a OpenCode como **MCP local**. Agregalo en `~/.config/opencode/opencode.json` (o el `opencode.json` del proyecto), en la sección `mcp`:

```json
{
  "mcp": {
    "engram": {
      "type": "local",
      "enabled": true,
      "command": ["engram", "mcp", "--tools=agent"]
    }
  }
}
```

Si `engram` no está en el PATH, usá la ruta completa del binario:
```json
"command": ["C:\\Users\\gato4\\scoop\\apps\\engram\\current\\engram.exe", "mcp", "--tools=agent"]
```

> El `--tools=agent` expone las herramientas de agente en Engram (`mem_search`, `mem_save`, `mem_get_observation`, etc.), que son las que usa el flujo `/disenar`.

### Paso 3 — Configurar el agente Gentle AI (orquestador)

Gentle AI consiste en:
1. El agente **`gentle-orchestrator`** (el coordinador que delega trabajo a sub-agentes).
2. Los **sub-agentes SDD** (`sdd-init`, `sdd-explore`, `sdd-apply`, etc.).
3. Las **skills** (`sdd-*`, `work-unit-commits`, `judgment-day`, etc.) que se cargan bajo demanda.

Todo esto se define en `opencode.json` en la sección `agent`. Agregá los agentes `gentle-orchestrator`, `sdd-apply`, `sdd-init`, etc., con su `mode`, permisos y prompt. Deben estar las skills instaladas en `~/.config/opencode/skills/` (ver Paso 4).

> El orquestador usa `mode: "primary"` y solo puede lanzar sub-agentes (`sdd-*`). Los ejecutores `mode: "subagent"` hacen el trabajo ellos mismos.

### Paso 4 — Instalar las skills

Las skills de Gentle AI y SDD viven en `~/.config/opencode/skills/`. Instalá al menos las relevantes para el flujo de diseño:
- `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-archive`, `sdd-onboard`
- `skill-registry`, `skill-creator`, `skill-improver`
- `work-unit-commits`, `chained-pr`, `branch-pr`, `judgment-day`, `comment-writer`, `cognitive-doc-design`

Podés copiar el directorio `skills/` desde una máquina que ya lo tenga, o descargar cada skill. Cada skill es una carpeta con su `SKILL.md`.

### Paso 5 — (Opcional) Plugins

En `~/.config/opencode/plugins/` pueden vivir plugins de apoyo: `engram.ts`, `background-agents.ts`, `model-variants.ts`, `gentle-logo.tsx`. Copialos desde la máquina fuente si querés el mismo comportamiento.

### Paso 6 — Inicializar el proyecto en la PC nueva

Con OpenCode abierto en el repo `huellitas-felices`, vos (o el agente) corren el init para detectar el stack y cachear el contexto en Engram:

```
/sdd-init
```

> Esencial: esto crea `sdd-init/huellitas-felices` en Engram con el stack, convenciones y contextos que usa `/disenar` (tokens, componentes, reglas).

### Paso 7 — Primer flujo completo (probar que ande)

Para validar que todo quedó andando, hacé un primer ciclo real:

1. **Armá un brief** con `/brief` (Sección 1).
2. **Diseñá** con `/disenar`.
3. **Publicá** con `/subir`.

Si `/disenar` recupera contexto de Engram (tokens, componentes, reglas) sin leerse vos los archivos a mano, la instalación quedó bien.

### Orden de comandos para una HU (resumen del día a día)

```
1. /brief "HU-XXX: Como <rol>, quiero <acción>, para <beneficio>. Idea: <tu propuesta>"
2. /disenar HU-XXX
3. (probar en el navegador con npm run dev)
4. /subir   (con confirmación)
```

---

## Sección 3 — Comandos rápidos de Engram y Gentle AI

Referencia rápida para usar a diario.

### Comandos de instalación / entorno

| Comando | Qué hace |
|---|---|
| `scoop install engram` | Instala el binario de Engram (memoria). |
| `engram --version` | Verifica que Engram esté instalado. |
| `engram mcp --tools=agent` | Levanta el MCP de Engram (lo usa OpenCode automáticamente). |
| `engram doctor` | Diagnóstico de la instalación/configuración de Engram. |
| `engram projects` | Lista los proyectos guardados en memoria. |
| `engram projects consolidate` | Une proyectos con nombre duplicado (drift). |
| `/sdd-init` | Inicializa el contexto SDD del proyecto en Engram. |

### Comandos OpenCode del proyecto (Sección 1 en detalle)

| Comando | Qué hace |
|---|---|
| `/brief "..."` | Genera el brief `docs/briefs/HU-XXX.md` desde descripción + idea. |
| `/disenar HU-XXX` | Diseña, codea y verifica la pantalla del brief. |
| `/subir` | Publica cambios en GitHub (con confirmación). |

> El log de errores (`docs/errores-comunes.md`) ya no usa un comando `/error`: se alimenta **automáticamente** durante `/disenar` cuando el agente detecta un problema.

### Herramientas de memoria de Engram (las que usa el agente)

Estas no las escribís vos a mano normalmente; las invoca el flujo. Pero sirven para referencia:

| Herramienta | Qué hace | Cuándo |
|---|---|---|
| `mem_search` | Busca en la memoria por palabras clave. | Recuperar contexto (tokens, componentes, reglas, HUs previas). |
| `mem_get_observation` | Trae el contenido completo de un resultado de búsqueda. | Leer el inventario completo, una regla, una decisión. |
| `mem_save` | Guarda una observación nueva. | Persistir decisiones, fixes, componentes usados por HU. |
| `mem_update` | Actualiza una observación existente (por ID). | Refrescar el esquema, el inventario, una regla. |
| `mem_context` | Muestra actividad reciente de la sesión. | Arrancar una sesión o retomar contexto. |
| `mem_session_summary` | Guarda el resumen de cierre de sesión. | Antes de terminar el día, para no perder el contexto. |
| `mem_search_prompt`/`mem_save_prompt` | Guarda/recupera los prompts del usuario. | Sonido de contexto de lo que se pidió. |

### Topic keys clave del proyecto (lo que recupera `/disenar`)

| Topic key | Qué contiene |
|---|---|
| `sdd-init/huellitas-felices` | Contexto del proyecto (stack, convenciones) — creado por `/sdd-init`. |
| `disenar/design-system` | Tokens Pet Bliss (paleta, tipografía, radios, motion). |
| `disenar/componentes` | Inventario de 72 componentes (ui/ + módulos). |
| `disenar/reglas` | Reglas del equipo + reglas activas de errores. |
| `disenar/workflow` | Los 7+ pasos del comando `/disenar`. |
| `disenar/schema` | Esquema de BD (`docs/esquema-bd-front.md`) cacheado. |
| `huellitas-felices/hu/HU-XXX/components-used` | Componentes usados por una HU específica. |
| `huellitas-felices/hu/HU-XXX/decisions` | Decisiones de diseño de una HU específica. |

### Ciclo de aprendizaje entre HUs

```
/disenar HU-STK-04  →  guarda en Engram qué componentes usó y qué decidió
                            ↓
/disenar HU-STK-05  →  recupera esa info y arranca con ventaja (no reinventa)
```

---

## Referencias del proyecto

- `docs/briefs/` — briefs por pantalla (base `_plantilla.md`).
- `docs/esquema-bd-front.md` — diccionario de datos que actualiza el DBA.
- `design-system/huellitas-felices/MASTER.md` — tokens Pet Bliss (fuente de verdad para la skill).
- `design-system/huellitas-felices/componentes.md` — inventario de componentes.
- `docs/design-system-pet-bliss-style.md` — razonamiento humano del design system.
- `docs/errores-comunes.md` — log de errores del equipo (se alimenta automáticamente durante `/disenar`).
- `AGENTS.md` — acuerdos del equipo y reglas técnicas.
