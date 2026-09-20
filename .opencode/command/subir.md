---
description: Sube los cambios del repo Huellitas Felices a GitHub con confirmación. Detecta el tipo de cambio (feat/fix/chore/docs), valida el mensaje contra la convención, avisa la rama actual y pushea a origin tras tu OK. Ej: /subir "feat: pantalla artículos (HU-STK-01)".
agent: build
---

# Comando /subir — Publicar cambios en GitHub

Publica los cambios del repo **Huellitas Felices** en GitHub (`origin` → `github.com/frqn2003/huellitas-felices`). **Nunca commitear ni pushear sin confirmación explícita del usuario.**

> Nota técnica: `git` no está en el PATH de PowerShell. Usá SIEMPRE la ruta completa: `C:\Program Files\Git\cmd\git.exe` (definila una vez al inicio como `$GIT`).

---

## Paso 1 — Inspeccionar el estado

1. Definí `$GIT = "C:\Program Files\Git\cmd\git.exe"` (si no existe, buscá con `Get-Command git` o `where.exe git`).
2. Corré en el directorio del proyecto:
   - `$BRANCH = & $GIT branch --show-current` → rama actual.
   - `& $GIT status --short` → archivos modificados/nuevos/borrados.
   - `& $GIT diff --stat` → tamaño de los cambios (y `& $GIT diff --cached --stat` si hay staged).
   - `& $GIT log --oneline -8` → estilo de mensajes del repo.
3. Revisá que NO haya archivos sensibles a subir (`.env`, claves, credenciales, `node_modules/`, artefactos de build). Si hay algo dudoso, parar y preguntar.

## Paso 2 — Confirmar la rama

1. Mostrá la rama actual: **"Estás en la rama `$BRANCH`."**
2. Si hay upstream configurado, avisá a dónde va a pushear (`& $GIT rev-parse --abbrev-ref --symbolic-full-name "@{u}"`). Si NO hay upstream o la rama no coincide con la esperada, preguntá antes de continuar:
   - **"¿Pusheo a `origin/$BRANCH`?"** → sí / no (indicá otra rama o cancelá).
3. **Guarda de checkpoint:** si hay archivos sin commitear que NO forman parte del cambio que querés subir (ej: un trabajo a medias de otra tarea), avisá y preguntá si los incluís o si conviene commitearlos aparte primero.

## Paso 3 — Detectar tipo de cambio y proponer mensaje

Detectá el **tipo de cambio automáticamente** a partir de los archivos del diff (no solo se propone, se clasifica):

| Tipo | Dispara cuando toca | Prefijo |
|---|---|---|
| `feat` | `src/app/**` o `src/components/**` (pantalla/feature de HU) | `feat: <pantalla> (HU-XXX)` |
| `fix` | `src/**` (corrección de algo ya existente) | `fix: <descripción> (HU-XXX)` |
| `docs` | `docs/**`, `*.md` (documentación) | `docs: <descripción>` |
| `chore` | `.opencode/`, `.agents/`, config, herramientas, infra | `chore: <descripción>` |

Reglas de clasificación:
- Si el diff toca **solo** `.opencode/`, `.agents/`, config o herramientas → `chore`. (Ej: el cambio de hoy que agrega `brief.md` y modifica `disenar.md` es `chore: flujo brief + disenar optimizado con sub-agentes`).
- Si toca **solo** `docs/` → `docs`.
- Si toca `src/**` + otra cosa → clasificar por la parte principal de `src/**`.
- Si toca varias HUs distintas, proponer el de la acción principal; si es ambiguo, preguntar.

**Mensaje propuesto:**
- Si el usuario pasó argumento (`/subir "mensaje"`), usarlo, pero **validarlo** (paso 4).
- Si no, derivar del tipo detectado + resumen del diff (ej: `feat: stock por depósito (HU-STK-04)`).

## Paso 4 — Validar el mensaje

Antes de commitear, validá que el mensaje siga la convención del repo:

- Debe empezar con `feat:` / `fix:` / `chore:` / `docs:`.
- Las HU (feat/fix) deben referenciar la HU al final entre paréntesis `(HU-XXX)` cuando corresponda.
- Conciso, en español.

Si el mensaje NO cumple, **advertí y proponé una corrección** antes de commitear. Nunca commitees un mensaje fuera de convención sin avisar (ver evidencia real: el repo tiene `4208f95 Me quede sin tokens...`).

## Paso 5 — Confirmación y commit

1. Mostrá el **resumen del diff** (archivos + stats), la **rama** y el **mensaje propuesto** (con su tipo detectado, ej: `chore`).
2. Preguntá explícitamente: **"¿Confirmás el commit y push en `origin/$BRANCH` con el mensaje: <mensaje>?"**
   - **Sí** → `& $GIT add -A` + `& $GIT commit -m "<mensaje>"`.
   - **No / ajustes** → aplicá lo que pida (mensaje distinto, archivos excluidos) y volvé a preguntar.
   - **Solo commit, sin push** → commitear y avisar que el push queda pendiente.
   - **Dejarlo local** → no commitear nada; avisar que los cambios quedan en el working tree.
3. Si el commit falla o un hook lo rechaza, corregí el problema y creá un commit nuevo (no amendar).

## Paso 6 — Push y verificación

1. `& $GIT push origin $BRANCH` (rama explícita, no solo `origin`). Si no hay remote configurado, avisar y preguntar la URL.
2. Verificá con `& $GIT log --oneline -3` y `& $GIT status --short` (debe quedar limpio).
3. Avisá al usuario que se subió y mostrá el hash/descripción del commit.

## Recordatorio de reglas

- Nunca pushear sin confirmación explícita (preguntar siempre).
- Nunca commitear secretos ni archivos fuera del alcance del cambio pedido.
- Mensajes concisos en español, estilo convencional, referenciando la HU cuando corresponda.
- **Validar SIEMPRE el mensaje** contra la convención antes de commitear; advertir si no cumple (no commitear en silencio).
- Detectar el tipo de cambio (feat/fix/docs/chore) por los archivos que toca, no asumir.
- Confirmar la rama antes de pushear (`git push origin <rama>` explícito).
