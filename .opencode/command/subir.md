---
description: Sube los cambios del repo Huellitas Felices a GitHub con confirmación. Revisa el diff, propone el mensaje de commit (feat/fix/chore + referencia HU si aplica) y pushea a origin tras tu OK. Ej: /subir "feat: pantalla artículos (HU-STK-01)".
agent: build
---

# Comando /subir — Publicar cambios en GitHub

Publica los cambios del repo **Huellitas Felices** en GitHub (`origin` → `github.com/frqn2003/huellitas-felices`). **Nunca commitear ni pushear sin confirmación explícita del usuario.**

> Nota técnica: `git` no está en el PATH de PowerShell. Usá SIEMPRE la ruta completa: `C:\Program Files\Git\cmd\git.exe` (definila una vez al inicio como `$GIT`).

---

## Paso 1 — Inspeccionar el estado

1. Definí `$GIT = "C:\Program Files\Git\cmd\git.exe"` (si no existe, buscá con `Get-Command git` o `where.exe git`).
2. Corré en el directorio del proyecto:
   - `& $GIT status --short` → archivos modificados/nuevos/borrados.
   - `& $GIT diff --stat` → tamaño de los cambios (y `& $GIT diff --cached --stat` si hay staged).
   - `& $GIT log --oneline -5` → estilo de mensajes del repo.
3. Revisá que NO haya archivos sensibles a subir (`.env`, claves, credenciales, `node_modules/`, artefactos de build). Si hay algo dudoso, parar y preguntar.

## Paso 2 — Proponer mensaje de commit

Convención del repo (conventional commits en español, referenciando la HU):

| Tipo de cambio | Prefijo |
|---|---|
| Pantalla/feature nueva | `feat: <pantalla> (HU-XXX)` |
| Corrección | `fix: <descripción> (HU-XXX)` |
| Infra/doc/herramientas | `chore:` o `docs:` |

- Si el usuario pasó argumento al comando (`/subir "mensaje"`), usar ese mensaje.
- Si no, proponé el mensaje derivado del diff (ej: `feat: pantalla artículos (HU-STK-01)`). Si el cambio toca varias HUs o es infraestructura, proponé el que más sentido tenga.

## Paso 3 — Confirmación y commit

1. Mostrá el **resumen del diff** (archivos + stats) y el **mensaje propuesto**.
2. Preguntá explícitamente: **"¿Confirmás el commit y push con el mensaje: <mensaje>?"**
   - **Sí** → `& $GIT add -A` + `& $GIT commit -m "<mensaje>"`.
   - **No / ajustes** → aplicá lo que pida (mensaje distinto, archivos excluidos) y volvé a preguntar.
   - **Solo commit, sin push** → commitear y avisar que el push queda pendiente.
   - **Dejarlo local** → no commitear nada; avisar que los cambios quedan en el working tree.
3. Si el commit falla o un hook lo rechaza, corregí el problema y creá un commit nuevo (no amendar).

## Paso 4 — Push y verificación

1. `& $GIT push origin` (rama actual). Si no hay remote configurado, avisar y preguntar la URL.
2. Verificá con `& $GIT log --oneline -3` y `& $GIT status --short` (debe quedar limpio).
3. Avisá al usuario que se subió y mostrá el hash/descripción del commit.

## Recordatorio de reglas

- Nunca pushear sin confirmación explícita (preguntar siempre).
- Nunca commitear secretos ni archivos fuera del alcance del cambio pedido.
- Mensajes concisos en español, estilo convencional, referenciando la HU cuando corresponda.
