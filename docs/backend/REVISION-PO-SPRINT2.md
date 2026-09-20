# Revisión de los cambios del Product Owner + estado real del proyecto

> **Fecha**: 2026-09-08 · **revisado contra el dump del 2026-09-08**
> **Insumos**: los 3 bloques de cambios del PO, `db/schema.sql` (dump del 2026-09-08),
> `docs/plan-correcciones-datos.md` (relevamiento del front) y el código de `src/`.
> **Para qué sirve**: decidir qué se aplica, qué ya está, y qué está roto.

---

## Resumen en una pantalla

**La mayoría de lo que pide el PO ya está hecho en la base.** La DBA se adelantó:
de los 9 puntos, **6 están cerrados**, 1 está a medias, 1 es del front y 1 lo
discutimos abajo.

El problema real no son los pedidos del PO. Es que **el backend quedó atrás de
la base**: el módulo de Recepciones (5 archivos, 2 endpoints) está escrito contra
tablas que **ya no existen**, y Cuentas Corrientes sigue sin backend (aunque ya
tiene su vista).

Y el dump del 08/09 trajo un bug nuevo: **anular un pago es imposible**, un
trigger quedó nombrando una columna borrada. Ver el punto 8 de los hallazgos.

| Bloque del PO | Veredicto |
|---|---|
| A.1 · letra / punto de venta / tipo / número en comprobantes | ✅ **ya está** (base + backend + validación) |
| A.1 · excluir ventas y clientes del alcance | ✅ **ya está** en la base · ⚠️ falta recortar el front |
| A.2.1 · recepción = movimiento de stock, en un solo lugar | ✅ **ya está** — el backend se reescribió el 08/09 |
| A.2.2 · sacar `cantidad_solicitada`/`cantidad_recibida` de recepción | ✅ **ya está** |
| A.2.3 · la OC lleva el pendiente de recepción | ✅ **cumplido derivando**, sin columna nueva — ver la discusión abajo |
| A.3 · `intentos_fallidos` y `bloqueado_hasta` en usuario | ✅ **ya está** (con CHECK 0–3) |
| B.1 · OCR limitado a cabeceras | ✅ **ya está** — nunca existió otra cosa |
| B.2 · carga manual de artículos por código interno | ✅ **ya está** |
| C.1 · un pago imputable a varios comprobantes | ✅ **ya está**, y bien hecho |
| C.2 · saldos por signo (+/−) | ✅ **ya está** — la vista se creó el 2026-09-08 |

---

## Sobre "no queremos borrar atributos porque no son del sprint"

**Coincido, y además casi no hay nada que borrar.** Vale la pena separar dos
cosas que en la reunión suenan igual:

- **Sacar algo del alcance** = no hay pantalla, no hay endpoint, no se prueba.
- **Borrar la columna** = `ALTER TABLE ... DROP COLUMN`, irreversible, y el día
  que vuelve al alcance hay que rehacerla *y* migrar los datos que ya entraron.

El pedido del PO ("saca los créditos del producto y la venta; no te metas en eso
para no mezclar") es un pedido de **alcance**, no de DDL. Y de hecho la base ya
está así: **no existe tabla `cliente` ni `venta`**, `tipo_pago` tiene un único
valor `pago_proveedor`, y hay un CHECK (`ck_pago_solo_proveedor`) que obliga a
que `pago.proveedor_id` no sea nulo. O sea: la base **ya no puede** registrar una
venta ni una cobranza de cliente aunque alguien quisiera.

Así que la respuesta al PO es: **cero DDL de borrado**. Lo único que sobra está
en el **front**, no en la base:

| Qué | Dónde | Qué hacer |
|---|---|---|
| Lado *cliente* de Cuentas Corrientes | `src/data/cuentas-corrientes.ts` (`EntidadCtaCte = "proveedor" \| "cliente"`, `cobranza_cliente`) | dejar solo `proveedor`; el tipo cliente queda comentado, no borrado |
| Filtro "Cliente/Proveedor" | `CtaCteListaGlobal.tsx` | ocultar el selector mientras haya una sola entidad |

Y una excepción donde **sí** conviene borrar, porque no es una columna sino un
archivo que contradice la decisión del PO: ver `14_recepcion_mercaderia.sql` abajo.

**Regla que propongo dejar escrita**: columnas que están y no se usan, se
documentan (`COMMENT ON COLUMN ... IS 'fuera de alcance sprint N'`) y no se
tocan. Columnas que faltan y hacen falta, se agregan. Nada se dropea salvo que
esté **mal modelado**, no salvo que esté "de más".

---

## Bloque A · Modelo de datos

### A.1 · Comprobantes — ✅ cerrado, nada que hacer

Los 4 campos que pide el PO existen y son obligatorios:

```
comprobante_proveedor:
  tipo_comprobante_id  int NOT NULL  → tipo_comprobante (Factura / NC / ND)
  letra                varchar(2)  NOT NULL
  punto_venta          varchar(4)  NOT NULL
  numero_comprobante   varchar(8)  NOT NULL
  UNIQUE (proveedor_id, tipo_comprobante_id, letra, punto_venta, numero_comprobante)
```

Ese UNIQUE es lo que impide cargar dos veces la misma factura, que es la razón
de fondo por la que el PO pide los 4 campos. El backend ya los valida con el
formato correcto (`comprobante.schema.ts`: letra hasta 2 chars, PV hasta 4
dígitos, número hasta 8).

### A.2.1 · Recepción unificada con stock — ✅ la base sí, ❌ el backend no

**Esto es el problema más grande del proyecto ahora mismo.**

La DBA ya hizo exactamente lo que pide el PO: **no hay tabla de recepción**. Una
recepción es un `movimiento_stock_cab` con `origen_id = recepcion_compra` y
`origen_entidad_id = orden_compra.id`, y hay 4 triggers que la sostienen:

| Trigger | Qué hace |
|---|---|
| `fn_valida_mov_recepcion_compra` | valida la cabecera contra la OC |
| `fn_valida_mov_det_recepcion_compra` | valida cada línea contra la OC |
| `fn_actualiza_oc_por_recepcion` | recalcula el estado de la OC (recibida_parcial / recibida_total) |
| `fn_notificar_diferencia_compra` | alimenta `notificacion_compra` cuando lo recibido ≠ lo pedido |

**Pero el backend no se enteró.** `src/modules/compras/recepcion.*` (5 archivos)
consulta `recepcion_mercaderia` y `recepcion_mercaderia_detalle`. Esas tablas no
están en el dump. Consecuencia concreta:

```
GET  /api/recepciones      → 500 (42P01 undefined_table)
POST /api/recepciones      → 500
GET  /api/ordenes-compra/:id/pendiente-recepcion → 500
```

**HU-COMP-03 no funciona.** No es un bug sutil: no hay contra qué consultar.

Y peor: `db/correcciones/14_recepcion_mercaderia.sql` está pendiente de aplicar y
**crea esas tablas**. Si alguien lo pega en Supabase para "arreglar" los 500,
implanta justo el modelo que el PO pidió no tener, y quedan dos verdades sobre lo
mismo (las tablas nuevas y los movimientos de stock), que van a divergir.

> **Acción inmediata**: renombrar `14_recepcion_mercaderia.sql` a
> `.DESCARTADA.sql` para que nadie lo aplique. Está hecho.
>
> **Acción de fondo** (trabajo aparte, no trivial): reescribir
> `recepcion.repo.ts` contra `movimiento_stock_cab` / `_det` filtrando por
> `origen_id = recepcion_compra`. El service pierde casi todo: la validación
> contra el pendiente, la numeración y el cambio de estado de la OC **ya los
> hacen los triggers**. Lo que hoy son ~1000 líneas queda en bastante menos.

### A.2.2 · Sin saldos en la recepción — ✅ cerrado

`cantidad_solicitada` y `cantidad_recibida` ya no viven en una recepción: están
en `notificacion_compra`, que es la alerta de diferencia, con un `UNIQUE` por
línea de OC. Ese es el lugar correcto: son el *insumo del aviso*, no el registro
de la entrega.

### A.2.3 · La OC lleva el pendiente — ⚠️ acá difiero, y creo que conviene

El PO pide: *"la orden de compra es la que debe contener el saldo pendiente de
recepción; a medida que entra mercadería, se actualiza el pendiente"*.

Hay dos formas de leerlo:

1. **Guardar** una columna `cantidad_recibida` en `orden_compra_detalle` y
   actualizarla en cada entrega.
2. **Derivarlo**: el pendiente = `cantidad` pedida − `SUM(movimiento_stock_det)`
   de esa OC.

La base hoy hace la **2**, y creo que hay que dejarla así. El motivo no es
purismo: una columna `cantidad_recibida` es una **copia cacheada de un `SUM()`**.
Mientras exista, hay dos números que dicen lo mismo, y el día que uno se
actualice y el otro no —una recepción cargada a mano desde el SQL Editor, un
rollback a medias, un trigger que se desactiva para una carga masiva— el sistema
tiene dos verdades y no hay forma de saber cuál miente. Con el `SUM()` eso no
puede pasar: los movimientos **son** la verdad.

Y la intención del PO —*"que el pendiente se vea en la orden"*— se cumple igual:
`fn_actualiza_oc_por_recepcion` ya mueve `orden_compra.estado_id` a
`recibida_parcial` / `recibida_total` en cada entrega, y el endpoint
`/api/ordenes-compra/:id/pendiente-recepcion` devuelve el pendiente línea por
línea. **Ya está donde el PO lo quiere; solo no está duplicado.**

> **Lo que sí falta**: ese endpoint hoy calcula el pendiente contra
> `recepcion_mercaderia_detalle`. Cuando se reescriba contra
> `movimiento_stock_det` (A.2.1), el pedido del PO queda cumplido sin agregar
> ninguna columna.

**Si el PO insiste en la columna**, la forma de hacerlo sin dos verdades es una
columna `GENERATED` o una vista materializada, no un `UPDATE` desde el trigger.
Vale plantearlo así en la reunión.

### A.3 · Campos de bloqueo en usuario — ✅ cerrado, y es la base de HU-SIS-04

```
usuario:
  intentos_fallidos  smallint NOT NULL DEFAULT 0   CHECK (0..3)
  bloqueado_hasta    timestamp NULL
```

Los dos comentarios de la DBA en la base dicen literalmente:

> `bloqueado_hasta`: *"HU-SIS-04: si es futuro, el login se rechaza antes de
> invocar Supabase Auth."*

Eso define la arquitectura de autenticación del proyecto, y la respeté al
implementar HU-SIS-04 (ver `docs/backend/HU-SIS-04.md`).

**Ojo con el CHECK 0–3**: al contar el 3.º intento hay que bloquear y **dejar el
contador en 3**, no seguir sumando, porque el 4.º `UPDATE` violaría el CHECK y
devolvería un 500 en el login. Está resuelto así en el service.

---

## Bloque B · OCR y carga de comprobantes

### B.1 y B.2 — ✅ cerrados, no había nada que sacar

Buscamos macheo automático de artículos por OCR en todo el front: **no existe**.
`DropzoneComprobante.tsx` solo adjunta el archivo, y las líneas del comprobante
se cargan a mano contra el catálogo interno (`articuloId` en
`comprobante.schema.ts`). El pedido del PO ya era el estado del proyecto.

---

## Bloque C · Cuentas corrientes y pagos

### C.1 · Imputación de un pago a varios comprobantes — ✅ cerrado, y bien

`pago_imputacion` (pago_id, comprobante_proveedor_id, monto_imputado) con
`UNIQUE (pago_id, comprobante_proveedor_id)` y **cuatro** triggers de validación:

| Trigger | Regla |
|---|---|
| `fn_ck_suma_imputada` | lo imputado en un pago no supera `pago.monto` |
| `fn_ck_comprobante_no_excede` | lo imputado a un comprobante (histórico, entre todos los pagos vigentes) no supera su `monto_total` |
| `fn_ck_pi_mismo_tercero` | no se puede imputar el pago de un proveedor al comprobante de otro |
| `fn_pi_upsert_monto_imputado` | consolida el monto |

Está mejor resuelto de lo que pide el PO. Las validaciones se calculan al vuelo
con subquery, no contra una columna cacheada — misma lógica que argumenté en
A.2.3.

### C.2 · Modelo de saldos — ✅ cerrado el 2026-09-08

El esquema de signos está elegido: `tipo_comprobante.afecta_saldo` con
`CHECK (afecta_saldo IN (1, -1))` — Factura y ND suman, NC resta. Es la opción
"saldos positivos y negativos" del PO.

**Y la vista ya existe.** En la revisión anterior faltaba: cinco comentarios de
la base y del front nombraban `vista_cuenta_corriente_proveedor` y en el dump
había una sola vista. El dump del 08/09 la trae, y está bien armada:

- excluye los comprobantes anulados (`WHERE cp.estado = 'vigente'`)
- suma solo las imputaciones de **pagos vigentes** — un pago anulado deja de
  descontar, que es exactamente el comportamiento que describe el COMMENT de
  `comprobante_proveedor`
- expone `numero_completo` ya armado (`A 0003-00001278`), `monto_signado`,
  `monto_pagado` y `saldo_pendiente`

**Lo que falta ahora es solo del lado nuestro**: no hay módulo ni endpoint de
cuentas corrientes, así que `/cuentas-corrientes` (333 líneas) sigue corriendo
con datos hardcodeados. Es HU-FIN-03, no la toqué.

### Dos cosas de la vista para decidir en equipo

Ninguna la cambié: son criterio de negocio, no bugs claros.

**1. Una factura pagada y vencida figura como `vencido`.** `estado_vencimiento`
mira solo la fecha:

```sql
CASE WHEN cp.fecha_vencimiento < CURRENT_DATE THEN 'vencido' ...
```

No mira `saldo_pendiente`. En la pantalla de cuenta corriente eso pinta en rojo
facturas que ya se pagaron, y el total de "vencido" queda inflado. Si la
intención es "estado de la deuda" (lo más probable, por el nombre de la vista),
falta un `AND saldo_pendiente > 0`. Si la intención es "estado del documento",
está bien como está y el filtro lo pone el front.

**2. Imputar un pago a una Nota de Crédito da un saldo al revés.**
`saldo_pendiente = monto_signado − monto_pagado`, y en una NC `monto_signado` es
negativo: imputarle $500 a una NC de $1.000 da −1.500, o sea que "pagar" una NC
agranda la deuda. Nadie debería pagar una NC, pero hoy la base lo permite
(`fn_ck_comprobante_no_excede` compara contra `monto_total`, que es positivo).
Se arregla en la vista o prohibiendo la imputación a comprobantes con
`afecta_saldo = -1`. Lo segundo me parece mejor: ataca la causa.

## Lo que encontré revisando, que nadie pidió

Cosas que estaban rotas y no figuraban en ninguna lista.

### 1. El proyecto no compilaba — `git` dejó un conflicto sin resolver ✅ arreglado

`src/app/proveedores/page.tsx` tenía marcadores `<<<<<<< HEAD` / `>>>>>>>`
**commiteados** desde el merge de `b776d77`:

```
src/app/proveedores/page.tsx(113,1): error TS1185: Merge conflict marker encountered.
```

`npm run typecheck` fallaba y `next build` también. Resolví tomando el lado
entrante: el bloque en conflicto declaraba 17 `useState` del tab "Cta. Cte." de
proveedores, que los commits `6d61193` y `e7d7535` habían eliminado a propósito
por ser redundante con `/cuentas-corrientes`. Ninguna de esas variables se usaba
en el resto del archivo.

> **Para el equipo**: correr `npm run typecheck` antes de commitear un merge.
> Un conflicto commiteado no lo detecta nadie hasta que rompe el build de otro.

### 2. Recepciones no compilaba tampoco ✅ arreglado

El front agregó `sucursal: string` a la interfaz `Recepcion` (commit `d291e46`,
"separar selector sucursal/depósito") y el backend nunca lo devolvió. Lo resolví
por JOIN (`deposito.sucursal_id → sucursal.nombre`), no agregando una columna: la
sucursal de una recepción **ya la determina el depósito**, guardarla de nuevo
sería el mismo problema de A.2.3 en chico.

### 3. `auditoria_sesion` no puede recibir ni una fila 🔴 lo arregla la corrección 15

```sql
CREATE TABLE auditoria_sesion (
  id integer NOT NULL,     -- ← sin DEFAULT nextval(...)
  ...
```

La secuencia `auditoria_sesion_id_seq` existe pero **no está conectada a la
columna**. Todo `INSERT` que no pase el `id` a mano falla con
`null value in column "id"`. Es justo la tabla que necesita el último criterio de
HU-SIS-04 ("registra en bitácora cada intento de inicio de sesión").

Comparar con `auditoria`, que sí lo tiene: `DEFAULT nextval('auditoria_id_seq')`.
Se ve como un `CREATE TABLE` escrito a mano donde se olvidó el `serial`.

### 4. El comentario de `auditoria_sesion` describe un trigger que no existe

> *"alimentada automáticamente desde `auth.audit_log_entries` de Supabase
> mediante trigger (no inserción manual)"*

No hay tal trigger en el dump. Y aunque se escribiera, **no alcanza para el
criterio**: los tres intentos fallidos los contamos nosotros y el bloqueo lo
aplicamos **antes** de llamar a Supabase, así que el evento `bloqueado` nunca
llega a `auth.audit_log_entries`. La bitácora la escribe el backend. La
corrección 15 actualiza el comentario para que diga lo que realmente pasa.

### 5. Cada intento fallido de login iba a ensuciar la bitácora de negocio

`trg_auditoria_usuario` es `AFTER INSERT OR DELETE OR UPDATE ON usuario`. Como el
login fallido hace `UPDATE usuario SET intentos_fallidos = ...`, **cada tecleo
equivocado de contraseña** escribía una fila en `auditoria` con el snapshot
completo del usuario — además de la fila correcta en `auditoria_sesion`.

Un login fallido no es un cambio de negocio. La corrección 15 parte el trigger en
dos y excluye los `UPDATE` que solo tocan `intentos_fallidos` / `bloqueado_hasta`.

### 6. `registrarEvento()` en `src/lib/audit/audit.ts` está roto

Inserta en `auditoria` las columnas `accion, modulo, entidad, entidad_id,
valor_anterior, valor_nuevo`. La tabla real tiene `tabla, operacion, registro_id,
valores_anteriores, valores_nuevos`. **Ninguna coincide.**

No explotó nunca porque **nadie la llama** (`withAuditUser` sí se usa; esta no).
La dejé como está para no mezclarla con HU-SIS-04, pero hay que borrarla o
reescribirla: es una trampa para el próximo que quiera auditar algo a mano.

### 7. El `README.md` de `db/correcciones/` describe archivos que ya no están

Lista las correcciones 01 a 13 con su orden de aplicación. En el directorio solo
quedan la 14 y el README: las demás se aplicaron y se borraron. Alguien que abra
esa carpeta hoy busca 6 archivos que no existen. Lo actualicé.

---

### 8. 🔴 Anular un pago es imposible — lo trajo el dump del 08/09

Lo arregla `db/correcciones/16_fix_pagos_cliente.sql`.

El dump del 08/09 limpió las referencias a clientes en dos funciones
(`fn_ck_pi_mismo_tercero` y `fn_pi_upsert_monto_imputado`) — lo que pidió el PO.
Pero quedaron **dos sin limpiar**, y una rompe una operación real:

```sql
CREATE OR REPLACE FUNCTION fn_bloquea_update_pago() ...
  IF row(NEW.id, NEW.tipo, NEW.proveedor_id, NEW.cliente_id, ...
                                             ^^^^^^^^^^^^^^
```

`pago` **no tiene** `cliente_id`. El cuerpo de una función plpgsql se compila la
primera vez que se ejecuta, así que esto no molestó mientras nadie anuló un pago.
Pero la ruta que lo toca es la ruta normal de anulación:

```
INSERT INTO pago (..., anula_pago_id = <original>)
  → trg_pago_anula_pago (AFTER INSERT)
    → fn_anula_pago(): UPDATE pago SET estado='anulado'
      → trg_bloquea_update_pago (BEFORE UPDATE)
        → rama vigente → anulado
          → evalúa NEW.cliente_id
            → ERROR 42703: record "new" has no field "cliente_id"
```

Y como el error sale de un trigger `AFTER INSERT`, **se cae toda la
transacción**: no queda anulado el pago original ni registrado el pago de
anulación. La operación devuelve 500 y no pasó nada.

La segunda es más leve: `fn_ck_comprobante_no_excede` conserva un `ELSE` que
consulta `comprobante_cliente`. Parece inalcanzable por el CHECK
`ck_pi_solo_comprobante_proveedor`, pero **los triggers BEFORE INSERT corren
antes de validar los CHECK**: un INSERT con `comprobante_proveedor_id = NULL`
entra al ELSE y devuelve un `42P01` confuso en vez del 23514 limpio que el
backend ya traduce a 422.

> **Para el equipo**: cuando se saca una entidad del modelo, `grep` por su nombre
> **dentro de los cuerpos de las funciones**, no solo en las tablas. El dump del
> 08/09 dejó 4 referencias a `cliente` en el esquema: 2 en funciones (estas) y 2
> en COMMENT.

## Qué haría, en orden

| # | Qué | Por qué primero |
|---|---|---|
| 1 | ✅ resolver el conflicto de git y el `sucursal` faltante | sin esto no compila nada |
| 2 | aplicar **`16_fix_pagos_cliente.sql`** | anular un pago está roto hoy; son 2 funciones, cero riesgo |
| 3 | ✅ aplicar `15_login.sql` + implementar **HU-SIS-04** | es lo que pediste; y la corrección 15 desbloquea `auditoria_sesion` |
| 4 | ✅ **Recepciones reescrito** contra `movimiento_stock_cab/_det` + conectado al front | cierra A.2.1 y A.2.3 |
| 5 | ✅ **cta. cte. de proveedores implementada** (HU-FIN-02) sobre la vista | ver docs/backend/HU-FIN-02.md |
| 6 | recortar el lado *cliente* del front | cierra el "no te metas con ventas" del PO |
| 7 | borrar o reescribir `registrarEvento()` | deuda chica, trampa grande |

Los puntos 6 y 7 **no** los toqué. El 4 (Recepciones) y el 5 (cta. cte.) están hechos.
