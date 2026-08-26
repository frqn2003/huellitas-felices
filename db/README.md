# Base de datos

La base vive en **Supabase** y **el equipo la edita ahí directamente**, en el SQL
Editor. Esa es la fuente de verdad.

Este repo no la reemplaza: la **espeja**, para que el schema quede versionado en
git, sirva de entregable y se pueda recuperar si el proyecto de Supabase se
pausa o se pierde.

## El flujo de trabajo

```
   cambiás algo en el SQL Editor de Supabase
                    ↓
            npm run db:dump          ← lee la base, reescribe db/schema.sql
                    ↓
   git diff db/schema.sql            ← revisás qué cambió
                    ↓
            git commit
```

Nada más. No hay que escribir el cambio dos veces.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run db:dump` | lee la base y reescribe `db/schema.sql` |
| `npm run db:info` | qué tablas hay y cuántas filas |
| `npm run db:info:full` | + columnas, constraints, índices, triggers y funciones |
| `npm run db:seed` | carga catálogos y datos de demo (idempotente) |

## Qué hay acá

```
db/
├── schema.sql       ← GENERADO. El DDL completo. No editar a mano.
├── correcciones/    ← SQL para pegar en Supabase, una sola vez cada uno
├── seeds/           ← catálogos + datos de demo (se pueden correr muchas veces)
└── dev/             ← utilidades manuales (vaciar tablas)
```

### `schema.sql`

Lo genera `npm run db:dump`. Corre de arriba a abajo sobre una base vacía y
reconstruye todo: enums, secuencias, tablas, constraints, índices, funciones y
triggers.

Las tablas se crean primero sin foreign keys y las FK se agregan al final con
`ALTER TABLE`, así el archivo no depende de qué tabla se creó antes que cuál.

**No editarlo a mano.** Cualquier cambio se hace en Supabase y se vuelve a
dumpear; si no, el próximo dump lo pisa.

### `correcciones/`

Arreglos puntuales que todavía **no están aplicados** en la base. Se pegan en el
SQL Editor, en orden, una sola vez cada uno. Ver `correcciones/README.md`.

Los dos primeros son urgentes: falta la tabla de auditoría (criterio de las 5 HU
del sprint) y hay un bug de concurrencia en el trigger del stock.

### `seeds/`

`01_catalogos.sql` son datos de operación: sin roles, categorías, unidades,
fabricantes, depósitos, formas de pago, estados y orígenes, el sistema no
funciona. `02_demo.sql` son datos de prueba, descartables.

Los dos son idempotentes: se pueden correr muchas veces sin duplicar.

## Lo que la base hace sola (y la app NO debe repetir)

Esta base tiene lógica de negocio en triggers. Importa saberlo antes de escribir
un service:

| Trigger | Qué hace | Consecuencia |
|---|---|---|
| `trg_actualizar_stock` | actualiza `ficha_stock.stock_actual` y rechaza egresos que dejarían negativo | **el service NO debe tocar el stock** — si lo hace, se cuenta doble |
| `trg_generar_cod_articulo` | genera `codigo` con el prefijo de la categoría (`MED-000001`) | el API **no manda** `codigo` |
| `trg_generar_cod_orden_compra` | genera `cod_ord` (`OC-000001`) si viene vacío | el API **no manda** `cod_ord` |
| `tg_auditar_*` | escribe en `auditoria` (después de la corrección 01) | la app solo llama a `withAuditUser()` |

Códigos de error propios que agregan las correcciones: `HF001` stock
insuficiente, `HF002` ficha inexistente, `HF003` movimiento inmutable. Los
traduce `src/lib/http/errors.ts`.

## Supabase: RLS

El event trigger `rls_auto_enable` habilita Row Level Security en **toda tabla
nueva** de `public`. Hoy no molesta porque el rol `postgres` tiene `BYPASSRLS` y
es con el que se conecta la app.

Es una mina para más adelante: un rol de aplicación restringido, sin políticas,
vería todas las tablas **vacías** — sin ningún error, solo cero filas.
