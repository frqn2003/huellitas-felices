# Backend — Huellitas Felices

Documentación del equipo de backend. Leer en este orden:

| # | Documento | Qué contiene | Cuándo leerlo |
|---|---|---|---|
| 0 | [`ENTENDER-EL-BACKEND.md`](ENTENDER-EL-BACKEND.md) | Guía de arranque: cómo levantar el proyecto, un request seguido de punta a punta por los 5 archivos que toca, los conceptos (transacción, índice parcial, trigger, N+1, race condition), la receta para agregar un módulo y los errores típicos | **Empezá por acá.** Explica el *por qué* de todo lo demás. No asume saber backend |
| 1 | [`PLAN-SPRINT1.md`](PLAN-SPRINT1.md) | Alcance del sprint, contrato de API, reglas de negocio por HU, fases, DoD | Para entender **qué** hay que construir |
| 2 | [`AJUSTES-DER.md`](AJUSTES-DER.md) | Comparación del DER real contra el contrato del front: bloqueantes, deuda, queries de verificación | Para entender **qué falta en la base** |
| 3 | [`GUIA-IMPLEMENTACION.md`](GUIA-IMPLEMENTACION.md) | Decisiones cerradas, arquitectura en capas, estructura de carpetas, métodos por módulo, convenciones, migraciones, testing | Para entender **cómo** construirlo — es la referencia del día a día |

> Los docs 1–3 son de **referencia**: asumen que ya sabés qué es una capa de
> servicio o una transacción. El doc 0 es el que enseña eso.

## Ruta de aprendizaje sugerida

Para alguien que viene del front y nunca hizo backend:

1. `ENTENDER-EL-BACKEND.md` §1–§3 — qué estamos haciendo y seguir un request completo.
2. Levantar el proyecto (§2) y pegarle a `/api/proveedores` con curl (§7).
3. Leer los 5 archivos de `src/modules/proveedores/` con el §3 al lado.
4. `ENTENDER-EL-BACKEND.md` §5 — los conceptos, ya con el código visto.
5. Elegir un módulo de `GUIA-IMPLEMENTACION.md` §9 y escribirlo con la receta del §6.

## Estado

- **Sprint:** 1 (14/08/2026 → 27/08/2026)
- **Rama:** `back-sprint1`
- **Sin acceso a la base todavía** → se trabaja contra Postgres local en Docker; el baseline se reconstruye desde el DER (`GUIA-IMPLEMENTACION.md` §4).

### Construido vs. especificado

Los documentos son mayormente **prescriptivos**: describen cómo hay que
construir, no cómo está construido. Lo que existe hoy:

| | Estado |
|---|---|
| `src/lib/` (db, http, auth, audit) | ✅ construido, `tsc` + `eslint` limpios |
| `src/modules/proveedores/` | ✅ construido — módulo de referencia |
| `/api/proveedores` + `/api/formas-pago` | ✅ construido |
| `db/correcciones/01`–`06` | 📝 escritas contra la base REAL, **sin aplicar todavía** |
| `db/correcciones/07` | ⏸️ escrita, esperando decisión |
| Los otros 5 módulos | 📋 especificación, sin código |
| Conexión del front | 📋 el front sigue 100% hardcodeado |
| Tests | 📋 ninguno escrito |

### La base

Conectada a **Supabase** y ya inspeccionada con `npm run db:info:full`. Trae
15 tablas y **lógica de negocio en triggers** — el stock lo actualiza la base,
no la aplicación. Ver `db/README.md`.

**No usamos migraciones.** El equipo edita el schema directamente en el SQL
Editor de Supabase, así que el repo lo espeja con `npm run db:dump` →
`db/schema.sql`. Con una sola base compartida, las migraciones serían escribir
el mismo cambio dos veces.

Aparte, `db/correcciones/` tiene SQL para pegar en el SQL Editor que arregla lo
que hoy falta o está mal (auditoría, el bug del trigger de stock, los CHECK).
⚠️ **Todavía no se aplicó ninguna.**

## Decisiones cerradas

- **D-A** Formas de pago → tabla catálogo + N:M `proveedor_forma_pago`.
- **D-B** Depósito = Sucursal (una sola entidad). Deuda técnica declarada, se separa en HU-SUC-01.
- **D-C** Cotizaciones fuera de alcance. `/cotizaciones` queda mock; un criterio de HU-COMP-02 sin cubrir.
- **D-D** `empleado` se fusiona en `usuario` (una sola identidad, coincide con HU-SIS-01).

## Decisiones abiertas

- **Cabecera-detalle de movimientos** — migración escrita en
  `db/migrations/pendientes/0008`. ¿Se aplica (cumple el criterio textual de
  HU-STK-04) o el movimiento se queda plano?
- **`numero_lote` / `fecha_vencimiento`** — la migración `0006` los elimina por
  estar mal normalizados y fuera de alcance. Si prefieren conservarlos, hay que
  comentar esas dos líneas.
- **`orden_compra.forma_pago_id`** usa el mismo catálogo que el proveedor. En el
  front son dos listas distintas (formas de pago del proveedor vs. condiciones
  de pago de la orden). ¿Se unifican a propósito?
- Canal de la notificación de stock crítico, edición de OC ya enviada
  (`GUIA-IMPLEMENTACION.md` §17).

## Resueltas por la versión nueva de la base

- `empleado` fusionado en `usuario` (D-D) ✅
- `categoria`, `unidad_medida` y `fabricante` como tablas catálogo ✅
- `articulo.imagen_url` ✅
- `estado_orden_compra` poblado — era una violación de FK esperando ✅
