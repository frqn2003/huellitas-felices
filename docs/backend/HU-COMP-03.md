# HU-COMP-03 — Recepción de Mercadería contra Orden de Compra

> Documento de **implementación backend**. El brief de diseño (pantallas,
> wireframes, componentes) es [`docs/briefs/HU-COMP-03.md`](../briefs/HU-COMP-03.md).
> Este archivo define qué se construye del lado de la base y de la API, y por qué.
>
> **Sprint:** 2 (28/08/2026 → 10/09/2026) · **Puntos de función:** 8 · **Rama:** `back-sprint2`
>
> ⚠️ Hay **cuatro criterios del brief del front que este documento contradice a
> propósito**. Están todos en la sección §8. Leerla antes de tocar el front.

---

## 1. Por qué esta HU va primera

No estaba en el pedido original del Product Owner: se incorporó como
prerrequisito técnico. HU-PROV-04 exige que la Orden de Compra vinculada al
comprobante esté **en estado recibida (parcial o total)**, y en el Sprint 1 solo
se emitió la OC (HU-COMP-02) — nunca se registró su recepción. Sin esta HU, el
estado `Recibida Parcial` / `Recibida Total` es inalcanzable y el módulo de
comprobantes no tiene contra qué validar.

Es además la única HU del sprint que engancha con dos módulos ya terminados
(Órdenes de Compra y Movimientos de Stock), así que se demuestra de punta a punta
sin depender de nada nuevo.

## 2. Qué ya existe y se reusa

El Sprint 1 dejó preparado casi todo el andamiaje. **No hay que construirlo de nuevo:**

| Pieza | Dónde | Estado |
|---|---|---|
| Estados `Recibida Parcial` (id 3) y `Recibida Total` (id 4) | [`db/seeds/01_catalogos.sql`](../../db/seeds/01_catalogos.sql) | ✅ sembrados, con la nota "solo se llega desde HU-COMP-03" |
| Origen de movimiento `recepcion_compra` | [`db/seeds/01_catalogos.sql`](../../db/seeds/01_catalogos.sql) | ✅ sembrado |
| `movimiento_stock_cab.origen_entidad_id` | [`db/schema.sql:147`](../../db/schema.sql) | ✅ existe, es el gancho a la recepción |
| Ingreso de stock automático | trigger `fn_actualizar_stock_det` | ✅ suma solo al insertar el detalle — **el service NO debe tocar `ficha_stock`** |
| Numeración por secuencia + trigger | patrón `fn_generar_numero_movimiento` ([`db/schema.sql:549`](../../db/schema.sql)) | ✅ se clona para `REC-` |
| Bitácora de auditoría | `fn_auditoria()` genérica | ✅ solo hay que enganchar el trigger |
| Máquina de estados de la OC | `puedeTransicionar()` en [`orden.service.ts:78`](../../src/modules/compras/orden.service.ts) | ✅ ya respeta `es_final` |

Lo único que falta de verdad son **tres tablas y dos enums**.

## 3. Decisiones cerradas

Estas cinco se discutieron y quedaron definidas. El resto del documento las asume.

### D-1 · `tipo_recepcion` lo calcula el backend, no lo elige el usuario

**El campo deja de ser un input.** Si el usuario puede marcar "Total" a mano, la
OC se cierra aunque falten artículos; y el criterio "si es total, todos los
artículos deben tener diferencia 0" es directamente falso cuando hubo una parcial
previa que ya completó algunas líneas.

Se deriva comparando, **por línea de OC**, la cantidad pedida contra la suma de
todo lo recibido en **todas** las recepciones de esa orden — no solo la actual.
La columna se conserva en la tabla, pero cambia de significado: pasa a ser una
etiqueta histórica ("esta fue la entrega que cerró la orden"), útil para el
listado y la auditoría.

### D-2 · La ficha de stock se crea al vuelo, solo en el camino de recepción

El trigger de stock tira `HF002` si no existe `ficha_stock` para ese
artículo/depósito, y el módulo de Movimientos (HU-STK-04) rechaza en ese caso.
**Ahí el rechazo tiene sentido:** un egreso o un ajuste contra una ficha
inexistente casi siempre significa que la persona eligió mal el depósito, y el
error atrapa el tipeo.

En una recepción no hay esa ambigüedad — el artículo viene de una línea de OC y
el depósito se eligió a propósito. Rechazar ahí significaría "no podés descargar
el camión hasta que alguien con otro permiso entre a otra pantalla y cree una
ficha en cero". La recepción es, justamente, la forma natural en que un artículo
entra por primera vez a un depósito.

Se crea con `INSERT ... ON CONFLICT (articulo_id, deposito_id) DO NOTHING` dentro
de la misma transacción, antes del movimiento. El unique ya existe, así que el
conflicto de dos recepciones simultáneas se resuelve solo.

> **Costo asumido:** la ficha nace con `stock_minimo = 0`, así que **nunca
> dispara alerta de reposición**. El endpoint devuelve qué fichas se crearon para
> que la pantalla avise "se crearon N fichas nuevas, configurá sus umbrales" con
> link a HU-STK-02. Sin ese aviso quedan artículos silenciosamente fuera del
> control de stock mínimo.

### D-3 · La diferencia se notifica a quien creó la OC

El criterio dice "notificando al responsable de compras", pero no existe tal rol
ni tal campo en ninguna tabla. Se usa `orden_compra.usuario_id`: es quien emitió
la orden y por lo tanto quien tiene el contexto para reclamarle al proveedor.

### D-4 · `cantidad_solicitada` guarda el **pendiente al momento**, no el total de la OC

Guardar el total de la OC sería redundante: es recuperable con un JOIN en
cualquier momento, y copiarlo solo habilita que difieran.

El **pendiente al momento de esa entrega**, en cambio, no es recuperable después:
es un hecho que existe solo en ese instante. Una vez que entran dos recepciones
más, para saber qué faltaba en la primera habría que reproducir toda la secuencia
en orden por fecha. Eso lo convierte en información histórica genuina, no en una
copia.

Esto además hace que `diferencia` signifique lo que uno espera —"de lo que
faltaba, esto no vino"— en vez de mostrar un faltante fantasma en cada entrega
parcial.

**El valor lo calcula el service**, con la OC ya bloqueada. Lo que mande el front
en ese campo se descarta, mismo criterio que ya está escrito en la base para
`orden_compra.descuento`: *"El back recalcula siempre: el total que manda el
front se descarta"* ([`db/schema.sql:596`](../../db/schema.sql)).

### D-5 · El movimiento de stock lo genera el service, no un trigger

El brief del front y el DBML piden un `AFTER INSERT ON recepcion_mercaderia` que
genere el movimiento. **No puede funcionar:** en el instante en que se inserta la
cabecera todavía no existe ninguna fila de `recepcion_mercaderia_detalle`, así
que no hay nada que mover — el movimiento saldría vacío.

Se hace en el service, después de insertar los detalles, dentro de la misma
transacción. Es además el patrón que ya usa el módulo de Movimientos.

---

## 4. Cambios en la base

Todo va en un archivo nuevo: **`db/correcciones/14_recepcion_mercaderia.sql`**,
para pegar en el SQL Editor de Supabase y después correr `npm run db:dump`.

No toca ninguna tabla existente: son tablas nuevas más un seed. **Cero riesgo
para lo del Sprint 1.**

### 4.1 Enums

```
tipo_recepcion             → parcial | total
tipo_observacion_recepcion → faltante | danado | error
```

(`danado` sin ñ, a propósito: es un valor de enum, no texto de UI. La pantalla
muestra "Dañado".)

### 4.2 `recepcion_mercaderia` — cabecera

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `numero` | varchar(30) NOT NULL UNIQUE | `REC-000001`, lo pone el trigger |
| `orden_compra_id` | int NOT NULL → `orden_compra` | |
| `deposito_id` | int NOT NULL → `deposito` | |
| `tipo_recepcion` | enum NOT NULL | **derivado** (D-1) |
| `usuario_id` | int NOT NULL → `usuario` | quién recibió |
| `fecha_hora` | timestamp NOT NULL DEFAULT now() | |
| `observacion_general` | text | opcional |

Índices: `orden_compra_id`, `fecha_hora DESC`.

Más `recepcion_numero_seq` + `fn_generar_numero_recepcion()` +
`trg_generar_numero_recepcion BEFORE INSERT`, clonando literalmente
`fn_generar_numero_movimiento` con el prefijo `REC-`.

Y `trg_auditoria_recepcion_mercaderia AFTER INSERT`, apuntando a la
`fn_auditoria()` que ya existe.

### 4.3 `recepcion_mercaderia_detalle`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `recepcion_id` | int NOT NULL → `recepcion_mercaderia` ON DELETE CASCADE | |
| `orden_compra_detalle_id` | int NOT NULL → `orden_compra_detalle` | |
| `cantidad_solicitada` | numeric(12,2) NOT NULL, CHECK > 0 | **pendiente al momento** (D-4) |
| `cantidad_recibida` | numeric(12,2) NOT NULL, CHECK >= 0 | |
| `diferencia` | numeric(12,2) GENERATED ALWAYS AS (solicitada - recibida) STORED | |
| `observacion` | enum, nullable | obligatoria si `diferencia <> 0` (se valida en el service) |
| `observacion_detalle` | text | opcional |

Índices: unique `(recepcion_id, orden_compra_detalle_id)`, más
`orden_compra_detalle_id`, más el parcial `WHERE cantidad_solicitada <> cantidad_recibida`
que hace barato listar las recepciones con faltantes.

> El detalle apunta a `orden_compra_detalle_id`, **no** a `articulo_id`. Así queda
> anclado a la línea concreta de la orden y el acumulado se calcula sin ambigüedad
> si el mismo artículo apareciera dos veces. (Hoy no puede: existe
> `uq_ocd_orden_articulo`. Pero la FK correcta es esta igual.)

### 4.4 `notificacion_compra`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `recepcion_detalle_id` | int NOT NULL → `recepcion_mercaderia_detalle` ON DELETE CASCADE | |
| `usuario_responsable_id` | int NOT NULL → `usuario` | = `orden_compra.usuario_id` (D-3) |
| `mensaje` | varchar(255) NOT NULL | lo arma el service |
| `fecha_hora` | timestamp NOT NULL DEFAULT now() | |
| `leida` | boolean NOT NULL DEFAULT false | |

Índice parcial por `usuario_responsable_id WHERE leida = false`.

> ⚠️ El brief del front dice que esta tabla "ya existe en BD". **No existe.** Se
> crea acá.

### 4.5 Un estado más en el catálogo

```sql
INSERT INTO estado_orden_compra (nombre, es_final) VALUES ('Cerrada con Faltante', true);
```

Resuelve el problema de **la orden que nunca cierra**: si el proveedor avisa que
un artículo no lo va a mandar nunca (discontinuado, sin stock), esa línea queda
corta para siempre y la OC se quedaría en `Recibida Parcial` eternamente. Sin una
salida, en producción se juntan órdenes zombie.

Es solo una fila de seed y encaja con cómo `puedeTransicionar()` ya lee la máquina
de estados. La acción que lo usa (`POST /api/ordenes-compra/[id]/cerrar`) queda
**fuera del alcance de esta HU** — se agrega el estado ahora para no tener que
hacer un `ALTER` después, y se implementa cuando se pida.

### 4.6 Opcional: red de seguridad contra sobre-recepción

Con el lock que toma el service alcanza para el camino de la aplicación. Un
trigger que rechace `SUM(recibido) > pedido` sería la protección para alguien
escribiendo desde el SQL Editor — que es exactamente el criterio con el que este
proyecto ya puso `ck_ficha_stock_no_negativo` sobre el stock. Coherente, pero no
imprescindible para cerrar la HU.

---

## 5. Contrato de API

Módulo nuevo: **`src/modules/compras/recepcion.{schema,repo,service,mapper,types}.ts`**
(dentro de `compras`, junto a `orden` y `cotizacion` — es el mismo dominio).

### `GET /api/ordenes-compra/[id]/pendiente-recepcion`

Lo que la pantalla necesita para armar el formulario. Por cada línea de la OC:

```
{ ordenCompraDetalleId, articuloId, articuloNombre, cantidadPedida,
  cantidadRecibidaAcumulada, cantidadPendiente }
```

Devuelve **solo las líneas con `cantidadPendiente > 0`**. Es lo que hace que la
segunda recepción parcial muestre lo que falta y no lo que ya llegó.

### `GET /api/recepciones`

Listado con filtros por `proveedorId`, `ordenCompraId`, `tipoRecepcion`,
`fechaDesde`, `fechaHasta`, `busqueda` (número de recepción o razón social), más
paginación. Mismo patrón de `query.ts` que usan Órdenes y Movimientos.

### `GET /api/recepciones/[id]`

Cabecera + detalle resuelto (nombre de artículo, depósito, usuario, OC, proveedor)
para el modal de solo lectura.

### `POST /api/recepciones`

```jsonc
{
  "ordenCompraId": 8,
  "depositoId": 1,
  "observacionGeneral": "Entrega con demora",
  "items": [
    { "ordenCompraDetalleId": 21, "cantidadRecibida": 50 },
    { "ordenCompraDetalleId": 22, "cantidadRecibida": 85,
      "observacion": "faltante", "observacionDetalle": "Faltan 15 unidades" }
  ]
}
```

**No recibe `tipoRecepcion`** (D-1) ni `cantidadSolicitada` (D-4). Si vienen, zod
los ignora.

Respuesta:

```jsonc
{
  "recepcion": { /* cabecera + detalle */ },
  "estadoOrdenResultante": "Recibida Parcial",
  "movimientoStock": { "id": 44, "numero": "MOV-000044" },
  "fichasCreadas": [ { "articuloId": 6, "articuloNombre": "Spray antiséptico" } ],
  "notificaciones": [ { "usuarioResponsableId": 4, "mensaje": "..." } ]
}
```

`fichasCreadas` es lo que dispara el aviso de umbrales (D-2). `notificaciones`
alimenta el toast de alerta.

---

## 6. El algoritmo del service, paso a paso

Todo dentro de **una sola transacción** (`withTransaction`), arrancando con
`withAuditUser(client, usuarioId)` — si se olvida, la fila de auditoría queda con
`usuario_id NULL` y no sirve para auditar.

1. **Bloquear la OC.** `SELECT ... FOR UPDATE` sobre `orden_compra`. Es lo primero.
   Sin esto, dos personas recibiendo contra la misma orden pueden leer las dos
   "todavía falta" y ninguna cerrarla — o cerrarla dos veces.

2. **Validar la OC.** Que exista y que su estado no sea final (`es_final`). Eso solo
   ya impide recibir contra una orden cancelada o ya cerrada, reusando
   `puedeTransicionar()`.

3. **Traer el pendiente por línea.** Por cada `orden_compra_detalle` de esa OC:
   `cantidad` menos la suma de `cantidad_recibida` de **todas** las recepciones
   anteriores. Una sola query con `LEFT JOIN` + `GROUP BY`, no un loop — cuidado
   con el N+1.

4. **Validar los items del body** contra ese pendiente (ver §7).

5. **Insertar la cabecera** con un `tipo_recepcion` provisorio; el trigger le pone
   el `numero`.

6. **Insertar los detalles**, con `cantidad_solicitada` = el pendiente calculado en
   el paso 3, nunca lo que vino en el body.

7. **Recalcular el acumulado, ahora incluyendo esta recepción**, y preguntar:
   *¿queda alguna línea cuyo acumulado sea menor a lo pedido?*
   - No queda ninguna → `total`, la OC pasa a `Recibida Total`.
   - Queda al menos una → `parcial`, la OC pasa a `Recibida Parcial`.

   Se actualizan las dos cosas: `recepcion_mercaderia.tipo_recepcion` y
   `orden_compra.estado_id`.

8. **Asegurar las fichas de stock** de los artículos recibidos en ese depósito
   (`ON CONFLICT DO NOTHING`), guardando cuáles se crearon (D-2).

9. **Generar el movimiento de ingreso**: una cabecera `movimiento_stock_cab` con
   `tipo = 'ingreso'`, `origen_id` = el de `recepcion_compra` resuelto **por
   nombre** contra el catálogo (nunca hardcodear el id — ese bug ya pasó, ver el
   comentario en [`movimiento.service.ts:68`](../../src/modules/movimientos/movimiento.service.ts)),
   y `origen_entidad_id = recepcion_mercaderia.id`. Un detalle por artículo con
   `cantidad_recibida > 0`.

   > **El service no toca `ficha_stock`.** El trigger `fn_actualizar_stock_det` suma
   > al insertar cada detalle. Si el service lo hiciera también, el stock se
   > contaría dos veces.

10. **Generar las notificaciones** por cada línea con `diferencia <> 0`, dirigidas a
    `orden_compra.usuario_id` (D-3).

11. **Commit.** La auditoría de la recepción la escribió el trigger sola.

---

## 7. Reglas de negocio y validaciones

Códigos de `BusinessRuleError`, siguiendo la convención del proyecto:

| Regla | Código | Mensaje |
|---|---|---|
| La OC existe | `NotFoundError` | — |
| La OC no está en estado final | `OC_ESTADO_FINAL` | "La orden ya está cerrada, no admite recepciones." |
| Al menos una línea con `cantidadRecibida > 0` | `RECEPCION_VACIA` | "La recepción no registra ningún artículo recibido." |
| `cantidadRecibida` ≤ pendiente de esa línea | `SOBRE_RECEPCION` | "Se recibieron N unidades de X pero solo quedaban M pendientes." |
| Cada `ordenCompraDetalleId` pertenece a la OC | `LINEA_AJENA` | "La línea no pertenece a la orden indicada." |
| Sin líneas repetidas en el body | `LINEA_DUPLICADA` | — |
| `observacion` obligatoria si `diferencia <> 0` | `OBSERVACION_REQUERIDA` | "Indicá el motivo de la diferencia en X." |
| `observacion` no permitida si `diferencia = 0` | `OBSERVACION_INVALIDA` | — |
| El depósito existe | `NotFoundError` | — |

Zod cubre lo de forma (tipos, `cantidadRecibida >= 0`, enum de observación). Todo
lo que depende del estado de la base se valida en el service, dentro del lock.

---

## 8. Cuatro conflictos con el brief del front

**Hay que corregir el brief y la pantalla.** Ninguno es opcional.

### 8.1 Se cae el select "Tipo de recepción (*)"

El brief lo pide obligatorio en el formulario. Con D-1 el campo desaparece del
alta: lo calcula el backend y se muestra recién en el resultado. También se caen
estas dos validaciones del brief, que son incorrectas:

- ~~"Si tipo = Total, todos los artículos deben tener diferencia = 0"~~ — falso
  cuando una parcial previa ya completó líneas.
- ~~"Si tipo = Parcial, al menos un artículo debe tener diferencia ≠ 0"~~ — falso
  por lo mismo.

### 8.2 El select de OC deja fuera el caso principal

El brief dice: *"Select con OC en estado Pendiente o Enviada (no recibidas totales)"*.

Eso **impide la segunda recepción parcial**, que es el caso de uso central de la
HU: una OC que ya recibió algo está en `Recibida Parcial`, y con ese filtro no
aparecería nunca en la lista. El filtro correcto es **cualquier OC cuyo estado no
sea final** (`es_final = false`): Pendiente, Enviada y Recibida Parcial.

### 8.3 "Solicitado" no es la cantidad de la OC

El brief calcula la diferencia en el front como `solicitada - recibida`, con
`solicitada` = la cantidad de la OC. Con D-4 la columna "Solicitado" del
formulario pasa a mostrar **el pendiente**, que es lo que devuelve
`GET /api/ordenes-compra/[id]/pendiente-recepcion`. En una primera recepción total
coinciden; en la segunda parcial, no.

### 8.4 Las notas para BD del brief describen un diseño que no funciona

- El `trg_recepcion_stock AFTER INSERT ON recepcion_mercaderia` no puede generar el
  movimiento (D-5): en ese momento no hay detalles.
- `notificacion_compra` **no existe** en la base; se crea en esta HU.
- El comentario de `movimiento_stock_cab.origen_entidad_id` en
  [`db/schema.sql:593`](../../db/schema.sql) dice `recepcion_mercaderia_detalle`.
  Es incorrecto: la cabecera de movimiento es una sola por recepción, con varios
  detalles, así que apunta a `recepcion_mercaderia.id`. Hay que actualizar el
  `COMMENT`.

**Menor:** el brief numera `REC-0001` (4 dígitos); la convención de la base es
`LPAD(..., 6, '0')` como `OC-000001` y `MOV-000001`. Se usa 6.

---

## 9. Decisiones abiertas

- **`POST /api/ordenes-compra/[id]/cerrar`** — la acción que usa el estado
  `Cerrada con Faltante` (§4.5). El estado se crea ahora; la acción, ¿entra en este
  sprint o se difiere?
- **Trigger de sobre-recepción** (§4.6) — ¿se agrega la red de seguridad a nivel
  motor o alcanza con el lock del service?
- **Exportar CSV** del listado — está en el brief. ¿Backend (endpoint que devuelve
  `text/csv`) o front sobre los datos ya paginados? El resto del sistema todavía no
  exporta nada, así que no hay precedente.

---

## 10. Plan de trabajo

| Fase | Qué | Verificación |
|---|---|---|
| 1 | Escribir `db/correcciones/14_recepcion_mercaderia.sql`, pegarlo en Supabase, `npm run db:dump` | `git diff db/schema.sql` muestra 3 tablas, 2 enums, 2 triggers |
| 2 | `recepcion.types.ts` + `recepcion.schema.ts` (zod del POST y de los filtros) | `npm run typecheck` |
| 3 | `recepcion.repo.ts` — query del pendiente por línea, inserts de cabecera/detalle, listado | — |
| 4 | `recepcion.service.ts` — el algoritmo de §6 completo | — |
| 5 | `recepcion.mapper.ts` + rutas `/api/recepciones` y `/api/ordenes-compra/[id]/pendiente-recepcion` | curl de los 4 endpoints |
| 6 | Seed de demo: una OC enviada con 2 líneas, para poder probar parcial → total | `npm run db:seed` |

### Definition of Done

- [ ] Recepción parcial: la OC queda en `Recibida Parcial` y el stock sube solo por lo recibido.
- [ ] Segunda recepción que completa la orden: pasa a `Recibida Total` **sin que nadie elija "total"**.
- [ ] Sobre-recepción rechazada con `SOBRE_RECEPCION`.
- [ ] Recibir contra una OC ya en estado final rechazado con `OC_ESTADO_FINAL`.
- [ ] Artículo sin ficha en el depósito: la recepción funciona y `fichasCreadas` lo reporta.
- [ ] Cada línea con diferencia genera una fila en `notificacion_compra` para el usuario de la OC.
- [ ] Cada recepción deja una fila en `auditoria` con `usuario_id` **no nulo**.
- [ ] `npm run lint` y `npm run typecheck` limpios.
