---
description: Define (o ajusta) el contrato de API de una entidad antes de que se escriba su pantalla. Recibe entidad + operaciones + campos, contrasta con la autoridad (PLAN-SPRINT1 §5, GUIA-IMPLEMENTACION §5/§6/§7/§14) y materializa el módulo de 5 capas en src/modules/ + los route handlers flacos en src/app/api/. Se usa antes de /brief y antes de /disenar de esa entidad.
agent: build
---

# Comando /contract — Contrato de API de una entidad

Vas a definir el **contrato de API** de una entidad de **Huellitas Felices** (ERP veterinario): qué operaciones expone, qué campos entra y salen, cómo se validan, qué errores de dominio existen y en qué archivos queda materializado.

**Contrato recibido:** `$ARGUMENTS`

Parseá el argumento así (los comandos hermanos de `.opencode/command/` usan el mismo patrón: `brief.md` toma la HU + idea, `disenar.md` toma el nombre del brief, `subir.md` toma un mensaje):

- **Primer token = la entidad**, en el nombre que usa el flujo: `articulos` → carpeta `src/modules/articulos/`, archivos `articulo.types.ts` + `articulo.schema.ts` + `articulo.repo.ts` + `articulo.service.ts` + `articulo.mapper.ts`, ruta `src/app/api/articulos/`. Singularizá para los archivos.
- **Después = las operaciones** (`GET /api/x`, `POST`, `PUT /:id`, `PATCH /:id/baja`...) y los filtros.
- **Después = los campos** de entrada y salida.
- Si `$ARGUMENTS` es solo una HU (ej: `HU-STK-01`) y no hay detalle, leé el brief de `docs/briefs/` y derivá el contrato de ahí.

Ejemplos válidos:

```
/contract articulos — GET /api/articulos (busqueda, categoriaId, estado), POST, PUT /:id, PATCH /:id (baja lógica), GET /:id/ultimo-precio-compra. Campos: nombre, descripcion, categoriaId, unidadMedidaId, fabricanteId, presentacionId, contenidoNeto, imagen
```

```
/contract HU-STK-01
```

**Este comando NO escribe la pantalla.** Define el contrato; la pantalla la dibuja `/disenar` y se conecta a este contrato. **El contrato va ANTES**: si la pantalla se dibuja contra un contrato que después cambia, se rompe el formulario entero. Tampoco commitea — eso va con `/subir`.

---

## Paso 0 — Leer la autoridad y relevar lo que ya existe

Ejecutá este paso entero antes de escribir una línea. Su salida es la lista de qué se crea y qué se reusa.

### 0a. Leer la autoridad

1. **`docs/backend/PLAN-SPRINT1.md` §5 "Contrato de API"** — la autoridad de **qué** endpoints y campos pide cada HU. Ningún endpoint se inventa: todos salen de un `// BACKEND:`. Revisá además §6 (reglas de negocio) y §10 (definición de Terminado).
2. **`docs/backend/GUIA-IMPLEMENTACION.md`**:
   - **§5 Arquitectura en capas** — la dirección de dependencia y qué hace y qué no hace cada capa.
   - **§6 Estructura de carpetas** — dónde vive cada cosa.
   - **§7 Convenciones** — *Naming: base vs API*, *Errores* y *Reglas duras*.
   - **§9 Métodos por módulo** — qué métodos debería tener el módulo. Si la sección dice "especificación", es lo que hay que escribir; si dice "CONSTRUIDO", el código manda sobre el doc.
   - **§14 Checklist por endpoint** — la lista de cierre, la repetís en el paso 4.
3. **`docs/backend/ENTENDER-EL-BACKEND.md` §6** — la receta de "cómo agregar un módulo nuevo", con el criterio de cuándo NO hacen falta las cinco capas. **Ojo: el paso 8 de §6 está viejo — ya no se borra el import de `src/data/` ni se pone `fetch` a mano.**
4. **`docs/backend/README.md`** — el estado real: qué está construido y qué es solo especificación. **Ojo: esa sección "Estado" puede estar desactualizada**; verificala contra el código, no la creas.

> **Hay DOS fuentes de la base, y el dump va atrasado.** No es que una sea "la real" y la otra sea el diccionario.
>
> | Fuente | Qué cubre | Rol |
> |---|---|---|
> | `db/schema.sql` | 33 tablas, Sprints 1–3. Generado con `npm run db:dump` desde Supabase. | **Realidad aplicada** de esas 33 tablas. |
> | `docs/esquema-bd-front.md` | El incremento de Sprint 4 (HU-STK-03, HU-CLIN-01, HU-VTA-01/02/03) + ajustes sobre tablas existentes. | **Spec más nueva, todavía NO aplicada al dump.** |
>
> **Regla de precedencia, según dónde esté la entidad:**
>
> 1. Si la tabla o la columna está en `esquema-bd-front.md` → manda el **doc**. Es el incremento pendiente: el dump todavía no lo tiene y no "lo contradice", simplemente va atrasado.
> 2. Si solo está en `db/schema.sql` → manda el **dump**. Es lo que ya está en la base.
> 3. Si está en ambos y discrepan → gana el **doc** para las columnas del incremento, el **dump** para el resto, y la diferencia se anota en el reporte del paso 5.
> 4. ⚠️ `deposito.es_punto_venta` es el ejemplo del caso 3: la columna NO está en el dump todavía.
>
> **Los triggers y los CHECK los define la base, no el service.** `esquema-bd-front.md` §7 los lista con qué hace cada uno — leelos antes de escribir el `repo`, porque varios hacen el trabajo que en otro proyecto escribirías en el service (los totales, los saldos, los precios de línea).

### 0b. Relevar lo que YA existe (no duplicar)

1. `ls src/modules/*/` y leé el módulo de referencia completo: **`src/modules/articulos/`** (`articulo.types.ts`, `articulo.schema.ts`, `articulo.repo.ts`, `articulo.service.ts`, `articulo.mapper.ts`) y **`src/modules/proveedores/`** (los mismos 5). Son el molde: estructura, orden de secciones, tono de los comentarios y detalle de los comentarios.
2. `ls src/app/api/` y leé las rutas ya construidas: `src/app/api/articulos/route.ts`, `src/app/api/articulos/[id]/route.ts`, `src/app/api/articulos/catalogos/route.ts`. Mirá el tamaño de los handlers: son 4 líneas por método en las escrituras; los GET crecen con los filtros.
3. Mirá el tipo del front que va a definir el contrato: `src/data/<modulo>.ts` (ej: `src/data/articulos.ts`, `src/data/proveedores.ts`).

**De este relevo salís con una decisión:**

- **El módulo NO existe** → se crea de cero copiando la estructura de `articulos`/`proveedores`.
- **El módulo YA existe** → **se revisa y se ajusta contra lo pedido; no se regenera.** Listá endpoint por endpoint qué falta, qué sobra y qué cambió. Presentalo antes de tocar nada.
- **La tabla no existe en NINGUNA de las dos fuentes** → es un bloqueante: el contrato se puede escribir hasta la capa de service, pero el repo necesita la tabla. Decilo y **preguntá** en vez de inventar el SQL de la tabla (eso es DDL contra Supabase, no parte de este comando). Ojo: si la tabla está en `esquema-bd-front.md` pero no en el dump, **NO es bloqueante** — es el caso normal del incremento de Sprint 4.

### 0c. Cross-check con lo que el front ya espera

- Corré el barrido de puntos de integración pendientes: `grep -rn "// BACKEND:" src/`. Los que tocan esta entidad son los que este contrato tiene que resolver.
- Leé las "Reglas activas" de `docs/errores-comunes.md` y las divergencias pendientes del sprint en `docs/backend/PENDIENTE-FRONT.md` y `docs/backend/AJUSTES-DER.md`.

## Paso 1 — Entender el contexto (preguntar lo que falta)

Si hay un brief de la entidad en `docs/briefs/` (base `docs/briefs/_plantilla.md`), **leelo primero**: de ahí salen los criterios de aceptación, que son la fuente de las reglas de negocio.

Juntá y dejá escrito:

- **Entidad:** qué es, qué tabla la backs (según la precedencia del paso 0a) y qué catálogos entran por JOIN.
- **Operaciones:** método + ruta + qué devuelve cada una (filtros, orden, paginación si aplica).
- **Campos de entrada:** obligatorios, opcionales, defaults, y cuáles **no** entran porque los genera la base (§3 del contrato).
- **Campos de salida:** el shape exacto que ya espera el front, con el casing de ESE módulo.
- **Errores de dominio:** una fila por criterio "valida que…", con el código y el `campo` que se devuelven.

> **No inventes los errores de dominio: ya están escritos.** `docs/esquema-bd-front.md` §"Códigos de error personalizados (SQLSTATE)" trae una tabla de códigos `HF0xx` con la situación exacta de cada uno (HF041 "modificar una consulta médica cerrada", HF047 "artículo sin precio de venta cargado", HF051 "suma de medios de pago distinta del total", HF060 "facturar una consulta que aún no está cerrada"…). Cada fila de esa tabla es un error de dominio del contrato, con su código ya decidido.
>
> Cada uno se traduce a la clase de `src/lib/http/errors.ts` según **quién lo detecta**:
> - Si lo detecta un **trigger o un CHECK** de la base → llega como `23502`/`23514`/`P0001` y ya hay traducción en `traducirErrorPostgres`. Traducilo al código `HF0xx` correspondiente en `src/lib/http/errors.ts` y **no** lo reimplementes en el service.
> - Si lo detecta el **service** (consultar antes de insertar) → `ConflictError` (409) si es duplicado, `BusinessRuleError` (409) si es regla de negocio.
> - Los `HF0xx` que no están en `esquema-bd-front.md` sí se inventan, pero con criterio: se numeran a continuación del último código existente y se anotan como decisión del contrato.

**Generá una lista de preguntas puntuales** solo con lo que falta de verdad. Formulalas en el idioma del usuario. Preguntas habituales:

- ¿Este endpoint es catálogo o entidad con reglas? (un catálogo de solo lectura puede tener la query en el handler: `ENTENDER-EL-BACKEND.md` §6)
- ¿La operación multi-tabla? → entonces va en `withTransaction` sí o sí.
- ¿Qué pasa con [campo]: ¿entra al request, lo deriva el server, o lo genera un trigger?
- ¿El Front ya tiene la interfaz en `src/data/`? → si no, hay que definirla antes del mapper.
- ¿El error es *duplicado* (`ConflictError`) o *regla de negocio* (`BusinessRuleError`)?

> **En este punto no toques archivos.** Solo preguntás. **Esperá las respuestas antes de seguir.**
> Si un dato se deduce del brief, del módulo de referencia o de `db/schema.sql`, **no preguntes**: preguntá lo que no se puede inferir razonablemente. Si el contexto sigue faltando, se pregunta — nunca se inventa un campo, un endpoint ni un tipo.

## Paso 2 — Definir el contrato (`src/modules/{entidad}/`)

El contrato de una entidad se materializa en **cinco archivos** con una responsabilidad cada uno (`GUIA-IMPLEMENTACION.md` §5). La dirección de dependencia es de una sola vía:

```
HTTP → route handler → service → repository → Postgres
          validar      reglas de    SQL
          mapear       negocio
          errores
```

> **Excepción conocida:** un catálogo de solo lectura y sin reglas puede tener la query en el route handler (`src/app/api/formas-pago/route.ts`, `src/app/api/sucursales/route.ts`). La capa de service se agrega el día que aparezca la primera regla, no antes.

### 2a. `{entidad}.types.ts`

- `{Entidad}Row`: lo que devuelve el SELECT, en `snake_case` — **más los nombres resueltos por JOIN** (`categoria_nombre`, `razon_social`). El `numeric` llega como `string` desde `pg`; tipalo así y convertilo en el mapper.
- `Filtros{Entidad}`: los filtros del listado, con el comentario de qué componente de filtro los origina.
- `{Entidad}Input`: lo que se inserta/actualiza. **Acá va el comentario de por qué NO incluye un campo** (el `codigo` del artículo, el `numero` de la orden — ver 2b).
- `Catalogos{Entidad}`: si el formulario necesita listas para sus selects, van en un tipo propio y se sirven desde un endpoint agrupado (ver 3c).

**El shape público NO se define acá.** Se importa del front. Ver 2e.

### 2b. `{entidad}.schema.ts` (Zod)

- Validación de **forma** solamente: que el campo exista, sea del tipo correcto, no exceda el largo, tenga el formato. Las reglas que necesitan consultar la base ("no puede haber otro activo con este nombre") son del **service**.
- Reutilizá los mensajes en español y las reglas con `trim()`, `.min(1)`, `.max()` que ya usan `src/modules/proveedores/proveedor.schema.ts` y `src/modules/articulos/articulo.schema.ts`.
- Si la edición reutiliza el alta, `export const editar{X}Schema = crear{X}Schema;`
- Exportá `export type Crear{X}Input = z.infer<typeof crear{X}Schema>;`

> ⚠️ **El schema no es `.strict()`: descarta en silencio las claves que no conoce.** Si el front manda un campo y el schema no lo declara, el valor se pierde ANTES del INSERT y la columna NOT NULL revienta con un `23502` que hoy se traduce en un 422 `CAMPO_OBLIGATORIO` (`errors.ts:341`) — antes era un 500 pelado. Ya pasó: en artículos faltaba `presentacionId`. **Cada campo que agrega el formulario, agregalo al schema.**

### 2c. `{entidad}.repo.ts` (SQL)

- **SQL parametrizado, `$1, $2`. Nunca interpolación de strings.** Columnas explícitas, **nunca `SELECT *`**.
- Lecturas con `query<T>()` de `@/lib/db/client`; escrituras siempre con `client: PoolClient`, porque las abre el service.
- El SQL vive en **un** solo lugar: si el service necesita releer dentro de la transacción, que sea con un parámetro `ejecutor` (mismo patrón que `src/modules/articulos/articulo.repo.ts:126`), no con el SELECT copiado a mano.
- N+1 prohibido: los listados que traen relaciones las resuelven con JOIN, con `LEFT JOIN LATERAL` si hace falta, o con un método que tome el array de ids (ej. `formasPagoDe(proveedorIds: number[])`).

> **Primero: ¿esa tabla tiene una función ABM en la base? Si la tiene, el repo la LLAMA — no escribe directo.**
>
> Es un patrón ya establecido en el repo: existen `fn_abm_sucursal` (`db/schema.sql:636`) y `fn_abm_lista_precio` (`esquema-bd-front.md:220`). La función es el ABM sanctioned: valida adentro y devuelve un código de error tipado. Reimplementar esas reglas en el service las duplica y las desincroniza — y la base sigue siendo la que gana.
>
> Ejemplo real de `lista_precio`: `fn_abm_lista_precio(p_modo, p_id, p_articulo_id, p_precio, p_usuario_id)` acepta INSERCION (primer precio), EDICION (update in place) y LECTURA, y **rechaza artículos inexistentes o inactivos, precios negativos y usuario nulo**. El repo la invoca y traduce su código de retorno al error de `src/lib/http/errors.ts`; no escribe el `INSERT` a mano.
>
> Y fijate si alguna tabla es **solo lectura** desde la app: `historial_precios` la escribe únicamente el trigger `fn_historial_precios()` (al cambiar el precio cierra la vigencia anterior y abre la nueva). La app solo la consulta — un `POST /api/lista-precio/:id/historial` es un `SELECT`, no un alta.

### 2d. `{entidad}.service.ts` (reglas de negocio)

- **Una función por criterio de aceptación** de la HU, en español en el nombre (`listar`, `obtener`, `crear`, `editar`, `inactivar`).
- Escrituras: `withTransaction` (de `@/lib/db/tx`) + **`withAuditUser(client, usuarioId)` PRIMERO** (de `@/lib/audit/audit`). Si falta, el trigger de auditoría guarda `usuario_id` NULL.
- El `usuarioId` **siempre viene de la sesión** — de los params del handler, jamás del body.
- Traducí cada "valida que…" a un `if` con su error de `src/lib/http/errors.ts`:
  - no existe → `NotFoundError("el artículo", id)` (404)
  - el dato ya existe (CUIT, nombre, código) → `ConflictError("NOMBRE_DUPLICADO", "…", "nombre")` (409)
  - regla de negocio (stock insuficiente, proveedor con órdenes abiertas) → `BusinessRuleError("CODIGO", "…")` (409)
  - sin sesión → `UnauthorizedError` (401) — lo tira el `withRoute`, no el service
- Releé con el `client` de la transacción, no contra el pool: desde otra conexión, lo no-confirmado no se ve.
- **Las funciones puras** (cálculos, transiciones de estado, validaciones de tipo) van acá sueltas, sin BD: son las más testeables del módulo.

### 2e. `{entidad}.mapper.ts` (fila → shape del front)

- **El mapper importa el tipo del front** desde `src/data/<modulo>.ts` (ej: `import type { Articulo } from "@/data/articulos";`). Si el front cambia la interfaz, esto deja de compilar — que es exactamente lo que se quiere.
- `toApi(row)` y `toApiList(rows)`, y nada más.

**Naming base vs API — OJO: `GUIA-IMPLEMENTACION.md` §7 quedó viejo (dice camelCase para todo); esta tabla sale del código, que es el que manda. Base: `snake_case` singular; API: el shape que el front ya espera, módulo por módulo — no se inventa:**

| Módulo | Estilo en la API | Ejemplos reales |
|---|---|---|
| Proveedores | `snake_case` directo | `razon_social`, `plazo_entrega_dias`, `formasPago` |
| Artículos | mixto: catálogos históricos en `camelCase`, campos nuevos en `snake_case` | `categoriaId` (histórico) + `fabricante_id`, `imagen_url`, `created_at` (nuevos) |
| Compras | `snake_case` + relaciones prefijadas con `_` | `proveedor_id`, `_proveedor`, `_detalles` |

Traducciones que el mapper **siempre** tiene que hacer (son las que se olvidan y rompen la pantalla en silencio):

- `Date` → **string ISO** (el tipo del front dice `string`).
- `numeric`/`decimal` (que llega como `string` desde `pg`) → `number`.
- `NULL` → `""` o el valor por defecto que espera el front, no `null` (el front hace `.trim()` sin chequear).
- El enum de estado **se pasa crudo** (`'activo'`/`'inactivo'` en minúscula). El badge traduce a "Activo"/"Inactivo" en el display.

**Contrapartida, del lado del front:** los datos NO se tipan con interfaces nuevas en la pantalla. Se tipan con la de `src/data/`, y el acceso HTTP es con los helpers de `@/lib/api-client`: `apiGet` (el listado que da sentido a la pantalla), `apiGetOpcional` (un catálogo caído no tira abajo la página) y `apiSend` (POST/PUT/PATCH/DELETE), con `mensajeDeError` para el toast y `ApiError` para el campo marcado en rojo. No se escribe `fetch` a mano en un componente.

## Paso 3 — Conectar la ruta (`src/app/api/{entidad}/`)

Rutas según `PLAN-SPRINT1.md` §5: `src/app/api/{entidad}/route.ts` para el recurso y `src/app/api/{entidad}/[id]/route.ts` para el detalle. Acciones con nombre propio van en su subcarpeta: `src/app/api/{entidad}/[id]/<accion>/route.ts`.

**Handlers flacos: leer, validar, delegar, responder.** Cuatro líneas por método. En un `route.ts` no hay reglas de negocio ni cálculos; tampoco SQL, salvo la excepción de un catálogo de solo lectura y sin reglas (ver Paso 2).

```ts
import { withRoute, parseBody, parseId } from "@/lib/http/handler";
import { ok, created } from "@/lib/http/responses";
import { leerTexto, leerEntero, leerEstado } from "@/lib/http/query";
import { crear{X}Schema } from "@/modules/{entidad}/{entidad}.schema";
import * as service from "@/modules/{entidad}/{entidad}.service";

export const GET = withRoute(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  return ok(
    await service.listar({
      busqueda: leerTexto(sp, "busqueda"),
      categoriaId: leerEntero(sp, "categoriaId"),
      estado: leerEstado(sp),
    }),
  );
});

export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crear{X}Schema);
  return created(await service.crear(input, session.usuarioId));
});
```

Piezas que ya existen y hay que usar (`src/lib/http/`):

| Qué | De dónde | Para qué |
|---|---|---|
| `withRoute` | `src/lib/http/handler.ts` | Envuelve todo: resuelve sesión, captura errores, traduce errores de Postgres. |
| `withPublicRoute` | `src/lib/http/handler.ts` | Solo para lo que NO puede exigir sesión (el login). |
| `parseBody(req, schema)` | `src/lib/http/handler.ts` | Valida el body con Zod; un fallo → `ValidationError` 422 con el `campo` señalado. |
| `parseId(valor)` | `src/lib/http/handler.ts` | Lee y valida el id de la URL → 422 `ID_INVALIDO` si no es entero positivo. |
| `ok` / `created` / `noContent` | `src/lib/http/responses.ts` | 200 / 201 / 204. |
| `errorResponse` | `src/lib/http/responses.ts` | Traduce `AppError` a `{ error: { codigo, mensaje, campo } }`; todo lo demás, 500 genérico **sin filtrar el error de Postgres al cliente**. |
| `leerTexto`, `leerEntero`, `leerDecimal`, `leerBooleano`, `leerEstado`, `leerFecha` | `src/lib/http/query.ts` | Parseo de filtros de la query string. `leerEstado` normaliza "Activo" → `'activo'`. |

Reglas de la ruta:

1. **Next 16: los `params` son una Promise.** `withRoute<Params>(async ({ params }) => { const { id } = await params; ... })` con `type Params = { id: string }`. No lo pases por alto.
2. **Shape de error único:** `{ "error": { "codigo", "mensaje", "campo" } }`, porque el front ya tiene estados de error por duplicado. Lo arma `errorResponse`, no el handler.
3. **Ids que genera la base, no van en el request.** Ejemplos reales: `articulo.codigo` lo pone el trigger `trg_generar_cod_articulo` (`fn_generar_cod_articulo`) con el prefijo de la categoría; el número de la orden lo pone `trg_generar_cod_orden_compra`. El request los ignora y la respuesta los trae ya generados. Lo mismo con lo que el server **deriva** (ej: el proveedor preferido del artículo, que sale de la última orden de compra): se acepta si llega, se descarta en silencio y la respuesta trae el valor derivado.
4. **`DELETE` no existe en las bajas de negocio.** Todas son lógicas: `PATCH /api/{entidad}/:id` o `PATCH /api/{entidad}/:id/inactivar`.
5. **Acciones de dominio = subcarpeta con su método.** `/enviar`, `/cancelar`, `/anular`, `/adjudicar` — no un `PATCH` con un discriminador en el body.
6. **Catálogos agrupados en un endpoint** si el formulario los necesita juntos: `src/app/api/articulos/catalogos/route.ts` devuelve las cuatro listas en una respuesta en vez de cuatro round-trips.
7. **Sin sesión, la resuelve `withRoute`.** No reimplementar el chequeo en cada handler.

## Paso 4 — Verificar las reglas clave

Antes de dar el contrato por terminado, recorré las tres listas y corregí lo que falte.

### Reglas duras del repo (`GUIA-IMPLEMENTACION.md` §7 + las que el código ya hizo obligatorias)

- [ ] **Todo SQL parametrizado** (`$1, $2`). Cero interpolación de strings.
- [ ] **`stock_actual` de una ficha existente solo lo cambia el trigger de la base** (`trg_actualizar_stock_det`, disparado al insertar en `movimiento_stock_det`). Ni el service de movimientos, ni ningún repo, ni el front. La única escritura legítima en TS es el `INSERT` que **crea** la ficha con su stock inicial. ⚠️ La regla #2 de `GUIA-IMPLEMENTACION.md` §7 dice "no se escribe fuera del service de movimientos" y **quedó vieja**: el service tampoco lo escribe. Si algo necesita mover stock, se inserta el movimiento — no se actualiza la ficha.
- [ ] **Los ids y números de documento los genera la base**, no el front (`codigo` del artículo, número de la orden).
- [ ] **`usuario_id` sale de la sesión**, nunca del body.
- [ ] **Toda operación multi-tabla va en `withTransaction`.** Sin excepción.
- [ ] **`withAuditUser` llamado al principio de toda transacción que escribe** — si falta, `auditoria` queda con `usuario_id` NULL.
- [ ] **Los números que manda el front se recalculan en el server** (totales de una orden, precios). No se confían.
- [ ] **Un valor derivado no se persiste** (el proveedor preferido del artículo se deriva de la última orden; guardarlo sería un segundo origen de verdad que se desincroniza).
- [ ] **Cero `DELETE`** en entidades de negocio: todas las bajas son lógicas.

### Checklist por endpoint (`GUIA-IMPLEMENTACION.md` §14)

- [ ] Input validado con schema (422 con `campo` señalado).
- [ ] Sesión resuelta; `usuario_id` **de la sesión**.
- [ ] Reglas del criterio de aceptación en el **service**, no en la UI.
- [ ] Operación multi-tabla en `withTransaction`.
- [ ] `withAuditUser` llamado si escribe.
- [ ] Auditoría verificable: `SELECT * FROM auditoria ORDER BY id DESC LIMIT 1`.
- [ ] Respuesta con el shape exacto del módulo (§7 — camelCase vs snake_case).
- [ ] Relaciones resueltas por JOIN, no con N+1.
- [ ] **Probado el camino de error, no solo el feliz.**

### Estructura y contrato compartido

- [ ] El contrato se materializó **antes** de la pantalla: si la pantalla ya existe, el ajuste lo rompe a propósito y en un solo lugar.
- [ ] Los 5 archivos existen y cada uno hace **una** cosa. Un service que importa `Request` es un service mal partido.
- [ ] El mapper importa el tipo desde `src/data/` y compila contra la interfaz real del front.
- [ ] Cada campo del formulario está declarado en el schema (o descartado a propósito, con el motivo escrito).
- [ ] Cero SQL en el front, cero reglas de negocio en el front, cero `fetch` a mano en un componente.
- [ ] Los comentarios `// BACKEND:` de esta entidad quedaron resueltos o justificados (barrido: `grep -rn "// BACKEND:" src/`).
- [ ] **El diseño visual no se toca acá.** Si el contrato obliga a cambiar la pantalla, eso vuelve a `/disenar`. El design system (`design-system/huellitas-felices/MASTER.md`) no aplica a este comando: acá no hay UI.

### Verificación técnica

```bash
npm run lint        # eslint src
npm run typecheck   # tsc --noEmit
```

Los dos tienen que salir limpios. **No hay test runner en este repo** — no inventes comandos de tests.

Si querés probar el endpoint antes de que exista la pantalla, levantá `npm run dev` y usá `curl` contra `/api/{entidad}` (el camino feliz y el de error: duplicado, no existe, sin sesión), más el `SELECT` de auditoría de arriba. Ver `ENTENDER-EL-BACKEND.md` §7.

> Si en este paso aparece un error (lint, typecheck, un 500 sin traducir, un shape que no calza con el front), **registralo automáticamente** en `docs/errores-comunes.md` con el formato del archivo: título `### YYYY-MM-DD · <área> · <componente> (\`<ruta>\`, HU-XXX)`, y los campos **Qué pasó**, **Cómo se detectó**, **Causa** (marcá como hipótesis si no la sabés), **Regla para no repetirlo** y **Fix** (archivo + patrón). Las entradas nuevas van **arriba** de las existentes. Sumá la regla a las "Reglas activas" si aplica a futuros módulos.

## Paso 5 — Reportar

Cerrá con este reporte, en este orden:

1. **Qué se reusó:** qué contratos ya existentes se relevaron y se reusaron (módulo, `src/data/`, rutas de `src/app/api/`), y qué se ajustó en vez de regenerar.
2. **Qué se creó:** lista de archivos con su ruta exacta, marcados como nuevo o ajustado.
3. **Operaciones:** tabla con método, ruta, qué hace y qué devuelve.
4. **Campos:** los de entrada (con obligatorios/opcionales/defaults) y los de salida, con el casing elegido para ese módulo y el motivo.
5. **Errores de dominio:** código, mensaje, `campo`, status, y qué criterio de la HU lo origina.
6. **Bloqueantes o divergencias:** lo que no se pudo cerrar (tabla que no existe, decisión abierta de `AJUSTES-DER.md`, pendiente de `PENDIENTE-FRONT.md`, endpoint que §5 promete y el código no tiene). Si §5 de `PLAN-SPRINT1.md` y `src/app/api/` divergen, **gana el código** y se anota la divergencia.
7. **Verificación:** resultado de `npm run lint` y `npm run typecheck`, y qué camino de error se probó.
8. **Próximos pasos:** que la pantalla se diseña con `/brief` + `/disenar` contra este contrato, y que se publica con `/subir`.

## Recordatorio de reglas

- **El contrato va antes que la pantalla.** `/contract` → `/brief` → `/disenar` → `/subir`.
- **Este comando NO commitea ni pushea.** Eso es de `/subir`.
- **No inventar nada:** ni un endpoint, ni un campo, ni un tipo. Si falta contexto, se pregunta (paso 1). Si falta la tabla en `db/schema.sql`, se dice; no se escribe el DDL.
- **Reusar antes de crear:** copiar la estructura de `src/modules/articulos/` y `src/modules/proveedores/`, y las rutas de `src/app/api/articulos/`. Un módulo que ya existe se ajusta, no se regenera.
- **El tipo del contrato vive en `src/data/<modulo>.ts`** y lo importa el mapper. Cambiarlo en el mapper es copiar el contrato y dejar que se desincronice.
- **Los handlers son flacos:** leen, validan, delegan, responden. SQL en el repo, reglas en el service, HTTP en la capa de route.
- **Los comentarios explican el porqué**, como los de `src/modules/articulos/articulo.schema.ts` y `src/modules/articulos/articulo.repo.ts`: un `// ?` no vale.
