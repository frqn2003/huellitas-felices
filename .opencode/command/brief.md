---
description: Arma el brief de una pantalla de Huellitas Felices. Recibe la HU en formato estándar + tu idea inicial, te hace preguntas sobre lo que falta, y genera el .md completo (con datos del esquema y componentes sugeridos). Se usa antes de /disenar.
agent: build
---

# Comando /brief — Generar brief de pantalla

Vas a armar el brief `docs/briefs/HU-XXX.md` para una pantalla de **Huellitas Felices**, a partir de:
1. La descripción de la HU (como <rol>, quiero <acción>, para <beneficio>).
2. La idea inicial que te da el equipo.

Ejecutá los pasos EN ORDEN y no te saltees ninguno. **Este comando NO codea nada**: solo produce el brief. El diseño se hace después con `/disenar HU-XXX`.

---

## Paso 1 — Diagnóstico del brief

El usuario te pasó en `$ARGUMENTS`:
- La HU en algún formato (probablemente `HU-XXX: Como ..., quiero ..., para ...`)
- Una idea inicial escrita (puede ser en prosa, lista, dibujo ASCII, lo que sea)

Interpretá qué pantalla quiere. Identificá:
- **Rol** (administrador, gerente, veterinario, recepcionista, personal de depósito, cajero)
- **Acción** (qué quiere hacer)
- **Beneficio** (para qué)
- **Entidades de negocio implicadas** (artículos, proveedores, órdenes de compra, recepciones, movimientos de stock, comprobantes, pagos, clientes, usuarios, depósitos, etc.)

Guardá el nombre del brief: `docs/briefs/$ARGUMENTS.md` (si `$ARGUMENTS` es `HU-STK-04`, el archivo es `HU-STK-04.md`).

## Paso 2 — Información que falta (preguntar)

Compará lo que el usuario te dio contra los campos del breve (ver `docs/briefs/_plantilla.md`):
- Contexto (ruta, relacionadas, prioridad)
- Wireframe (idea visual)
- User flow (de dónde viene a dónde va)
- Datos hardcodeados
- Estados (vacío / cargando / error / con datos)
- Criterios de aceptación

**Generá una lista de preguntas puntuales** que te faltan para poder generar el brief completo. Formulalas en el idioma del usuario. Preguntas habituales:

- ¿Dónde entra el usuario? ¿Viene de otra pantalla? (ruta / relacionadas)
- ¿Qué columnas/acciones necesita en la tabla o formulario?
- ¿Qué estados maneja la entidad? (ej: enuma de estado pedido/proveedor)
- ¿Hay acciones de negocio especiales (dar de baja, anular, transferir, recibir parcial)?
- ¿Prioridad de esta HU?

**Regla:** preguntá **solo lo que verdaderamente falta** y que no se pueda inferir razonablemente del brief o del dominio. Si un dato es obvio del brief (ej: el role es administrador porque gestiona stock), no preguntes.

Mostrá las preguntas como lista. **Esperá las respuestas del usuario antes de seguir.**

> En este punto NO toques archivos ni guardes nada. Solo preguntás.

## Paso 3 — Contexto del sistema (para datos correctos)

Una vez que tengas las respuestas, juntá el contexto técnico que necesitará el brief. **Delegá las búsquedas pesadas a sub-agentes** (para no inflar tu contexto y acelerar en paralelo):

1. **Sub-agente de esquema de BD** (delegate → `explore`): pasa las entidades/tablas que identificaste en el paso 1. Devuelve: campos, tipos, constraints, FKs y enums de cada tabla. Leé `docs/esquema-bd-front.md` con `grep -n "### \`<tabla>\`"` las tablas relevantes. Si una tabla no existe en el esquema, marcá "PENDIENTE DBA".

2. **Sub-agente de componentes** (delegate → `explore`): pasa la lista de piezas que probablemente necesite la pantalla. Usa `mem_search(query: "disenar/componentes", project: "huellitas-felices")` + grep sobre `src/components/**` para devolver qué componentes existen y con qué props. También `mem_search(query: "hu/HU-XXX components-used", project: "huellitas-felices")` para HUs previas del mismo módulo.

3. **(En paralelo si posible):** `mem_search(query: "disenar/design-system")` y `mem_search(query: "disenar/reglas")` para tokens y reglas (puede delegarse también o hacerse directo si es rápido).

Esperá los resultados de los sub-agentes y usalos en el paso 4.

## Paso 4 — Generar el brief

Completá el archivo `docs/briefs/$ARGUMENTS.md` usando **`docs/briefs/_plantilla.md` como plantilla de contenido** (la estructura exacta de secciones). Generá un brief completo y bien formado:

```markdown
# HU-XXX: [Como <rol>, quiero <acción>, para <beneficio>]

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/ruta-de-la-pantalla`
- **Relacionada con:** (si corresponde)
- **Prioridad:** alta / media / baja

## Propuesta inicial (del equipo)

[lo que el equipo te pasó como idea, resumido y organizado]

## Wireframe (idea)

[ASCII o descripción de las zonas. Basado en la propuesta + patrón de pantalla]

## User flow

1. ¿De dónde viene el usuario?
2. ¿Qué quiere hacer?
3. ¿A dónde llega?

## Fuente de datos (BD)

[tabla que alimenta la pantalla, con campos de la tabla principal]

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `ficha_stock` | stock_actual, stock_minimo, stock_critico | FK → deposito.id |

> Si falta una tabla en el esquema: "PENDIENTE DBA: falta tabla X para ..."

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `FichasTable` | Reusar/Extender | agregar columna depósito |
| `EstadoStockBadge` | Reusar | mapea sobre StatusBadge |

## Datos hardcodeados

[datos de ejemplo que respetan los tipos/constraints del esquema. `id` numérico.]

```ts
const datos = [
  { id: 1, codigo: "ART-001", stock_actual: 150, ... },
];
```

## Estados

- [ ] Vacío
- [ ] Cargando
- [ ] Error
- [ ] Con datos

## Criterios de aceptación

- [ ] ...
- [ ] ...
```

Reglas del datos:
- Respetar tipos del esquema (varchar→string, numeric→number, date→ISO string, timestamp→ISO string).
- `id` siempre numérico (la PK).
- No inventar campos que no existan en la tabla (salvo marcar PENDIENTE DBA).
- En español.

## Paso 5 — Revisión con el usuario

1. Mostrá el brief generado (o resumen si es largo).
2. Preguntá: "¿Querés ajustar algo antes de pasar a /disenar?"
3. Si pide cambios, aplicálos al `.md` y volvé a mostrar.
4. Recordale que el próximo paso es `/disenar HU-XXX` (diseña y codea la pantalla desde este brief).

## Recordatorio de reglas

- **Este comando solo arma el brief.** NO codea, NO diseña, NO verifica, NO sube a GitHub.
- Solo preguntá lo que falta de verdad; no seas preguntón por defecto.
- El brief respeta el esquema de BD (`docs/esquema-bd-front.md`) y sugiere componentes del inventario (Engram `disenar/componentes`).
- UI en español.
