# Ajustes al DER existente — Sprint 1

> **Contexto:** la base ya está creada y subida. Este documento compara el DER real contra el contrato del front (`src/data/*.ts`, ~85 comentarios `// BACKEND:`) y los criterios de aceptación del Excel, y lista qué hay que corregir antes de escribir endpoints.
> **Complementa** a `PLAN-SPRINT1.md` (que fue escrito antes de conocer el DER; §4 y §7 de ese doc quedan reemplazados por este).
> **Aviso:** el análisis sale del **diagrama**, no de la base viva. Los índices `UNIQUE`, los `CHECK`, los valores de los `enum` y las acciones `ON DELETE` no se ven en un DER — hay que verificarlos con las queries de §6.

---

## 1. Decisión tomada: `empleado` se fusiona en `usuario`

El ERP es solo para empleados: no hay usuarios que no sean empleados, ni empleados sin usuario. La relación 1:1 no aporta nada y obliga a un JOIN en cada consulta.

**Además, el modelo fusionado cumple el criterio de HU-SIS-01 al pie de la letra:** *"Campos: nombre, apellido, DNI, email, rol, sucursales asignadas y estado (activo/inactivo)"*. El backlog describe **una** entidad, no dos.

```sql
-- Tabla resultante
usuario (
  id             serial PRIMARY KEY,
  nombre         varchar(80)  NOT NULL,
  apellido       varchar(80)  NOT NULL,
  dni            varchar(20)  NOT NULL,
  email          varchar(120) NOT NULL,
  rol_id         int          NOT NULL REFERENCES rol(id),
  estado         estado_activo_inactivo NOT NULL DEFAULT 'Activo',
  fecha_creacion timestamp    NOT NULL DEFAULT now()
)
```

### Lo que arrastra este cambio

| Dónde | Antes | Después |
|---|---|---|
| `usuario.empleado_id` | FK a `empleado` | se elimina |
| tabla `empleado` | existe | se elimina (campos absorbidos) |
| `movimiento_stock.empleado_id` | FK a `empleado` | **`usuario_id`** → FK a `usuario` |
| `orden_compra.usuario_id` | FK a `usuario` | sin cambios ✅ |
| `GET /api/empleados` | catálogo de empleados | **`GET /api/usuarios`** (activos) |

**Impacto en el front — mínimo y mecánico.** Hay que renombrar en `src/data/movimientos.ts`: `empleadoId` → `usuarioId`, `empleado` → `usuario`, `EMPLEADOS` → `USUARIOS`, `EMPLEADO_ACTUAL` → `USUARIO_ACTUAL`; y los usos en `MovimientosTable.tsx`, `MovimientoFormModal.tsx` y `FiltrosMovimientos.tsx`. Se hace al conectar el módulo (Fase 5), no antes.

> Esto **resuelve la divergencia V3** del plan original, y la resuelve mejor: una sola identidad para toda la app.

**Consecuencia para la sesión:** `GET /api/auth/sesion` devuelve un solo `usuario_id` que sirve tanto para `movimiento_stock` como para `orden_compra` y para `auditoria`. Antes hubiera tenido que devolver dos ids.

---

## 2. Lo que el DER ya resuelve bien

Estas cosas del plan original quedan cerradas, y dos son mejores de lo que yo había propuesto:

| Punto | Estado |
|---|---|
| `articulo.fabricante` | ✅ ya está — **divergencia V4 resuelta** |
| `ficha_stock.stock_critico` nullable | ✅ ya está — **divergencia V5 resuelta** |
| `ficha_stock` **sin** campo `activo` | ✅ correcto, y yo lo había puesto de más. La actividad de la ficha se hereda del artículo (así lo filtra el front: `f.articulo.estado === "activo"`) |
| `deposito` **sin** campo `activo` | ✅ correcto, coincide con la nota explícita de `src/data/stock.ts` |
| `estado_orden_compra.es_final` | ✅ **agregado que yo no había previsto** y que sirve: hace la máquina de estados declarativa en vez de hardcodeada |
| `origen_movimiento` como tabla + `tipo` como enum | ✅ funciona (el front espera ambos catálogos) |
| `movimiento_vinculado_id` autorreferencial | ✅ el par egreso/ingreso de transferencias ya tiene dónde vincularse |
| Tipos decimales | ✅ `decimal(12,2)` y `decimal(10,2)` coinciden con lo que documentó el front |

---

## 3. Bloqueantes — el Sprint 1 no cierra sin esto

### B1 · Falta la tabla `sucursal`

`deposito.sucursal_id` es `int NOT NULL` pero **no apunta a ninguna tabla**. HU-STK-02 se llama literalmente *"Fichas de Stock **por Sucursal**"* y HU-SUC-01 exige que cada sucursal tenga su depósito.

```sql
CREATE TABLE sucursal (
  id        serial PRIMARY KEY,
  nombre    varchar(100) NOT NULL,
  direccion varchar(255),
  telefono  varchar(30),
  estado    estado_activo_inactivo NOT NULL DEFAULT 'Activo'
);
ALTER TABLE deposito
  ADD CONSTRAINT fk_deposito_sucursal
  FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);
-- Seed: Centro, Norte, Sur (las 3 del enunciado y del front)
```

### B2 · Falta la tabla `auditoria`

*"Registra en bitácora de auditoría cada alta, modificación y baja"* es criterio de aceptación de **las 5 HU del sprint**. Sin esta tabla, ninguna se puede marcar como terminada.

```sql
CREATE TABLE auditoria (
  id              serial PRIMARY KEY,
  usuario_id      int NOT NULL REFERENCES usuario(id),
  accion          varchar(20) NOT NULL,   -- alta | modificacion | baja | login
  modulo          varchar(40) NOT NULL,
  entidad         varchar(40) NOT NULL,
  entidad_id      int,
  valor_anterior  jsonb,
  valor_nuevo     jsonb,
  fecha_hora      timestamp NOT NULL DEFAULT now()
);
-- Append-only: REVOKE UPDATE, DELETE a todos los roles de app.
-- HU-SIS-06: "ningún usuario, incluido el administrador, puede editar o eliminar entradas".
```

### B3 · Faltan las 4 tablas de cotizaciones

`orden_compra.cotizacion_id` existe como `int` **sin tabla destino**. Y esto no es un detalle: HU-COMP-02 dice *"antes de adjudicar, permite registrar y comparar cotizaciones de más de un proveedor para los mismos artículos; la comparación queda documentada en la orden emitida"*, y el front **ya tiene `/cotizaciones` completo** (`SolicitudFormModal`, `CotizacionFormModal`, `CompararCotizacionesModal`, `CotizacionesContext`).

Es el hueco más grande del DER: falta la mitad de la HU de 13 puntos de función.

```sql
CREATE TABLE solicitud_cotizacion (
  id                       serial PRIMARY KEY,
  cod_sol                  varchar(30) NOT NULL,   -- SC-XXXX
  usuario_id               int NOT NULL REFERENCES usuario(id),
  fecha                    timestamp NOT NULL DEFAULT now(),
  estado                   varchar(20) NOT NULL,   -- Abierta | Adjudicada | Cancelada
  notas                    text,
  cotizacion_id_adjudicada int                     -- FK diferida a cotizacion(id)
);

CREATE TABLE solicitud_detalle (
  id                serial PRIMARY KEY,
  solicitud_id      int NOT NULL REFERENCES solicitud_cotizacion(id),
  articulo_id       int NOT NULL REFERENCES articulo(id),
  cantidad_estimada decimal(12,2) NOT NULL,
  nota              text,
  UNIQUE (solicitud_id, articulo_id)
);

CREATE TABLE cotizacion (
  id              serial PRIMARY KEY,
  solicitud_id    int NOT NULL REFERENCES solicitud_cotizacion(id),
  proveedor_id    int NOT NULL REFERENCES proveedor(id),
  condicion_pago  varchar(60) NOT NULL,
  fecha_recepcion timestamp NOT NULL DEFAULT now(),
  UNIQUE (solicitud_id, proveedor_id)   -- un proveedor cotiza una vez por solicitud
);

CREATE TABLE cotizacion_detalle (
  id            serial PRIMARY KEY,
  cotizacion_id int NOT NULL REFERENCES cotizacion(id),
  articulo_id   int NOT NULL REFERENCES articulo(id),
  precio        decimal(12,2) NOT NULL,
  UNIQUE (cotizacion_id, articulo_id)
);

ALTER TABLE solicitud_cotizacion
  ADD CONSTRAINT fk_sol_cot_adjudicada
  FOREIGN KEY (cotizacion_id_adjudicada) REFERENCES cotizacion(id);
ALTER TABLE orden_compra
  ADD CONSTRAINT fk_oc_cotizacion
  FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id);
```

### B4 · `movimiento_stock.origen_id` está `NOT NULL` y no puede estarlo

La regla de origen documentada en `src/data/movimientos.ts` dice: **Transferencia y Ajuste no tienen origen documental**, `origen_id` queda `NULL`. Con la constraint actual, **todo alta de transferencia o ajuste va a fallar**. Es un bug que aparece en el primer insert.

```sql
ALTER TABLE movimiento_stock ALTER COLUMN origen_id DROP NOT NULL;

-- Y la regla completa, que hoy no está en ningún lado:
ALTER TABLE movimiento_stock ADD CONSTRAINT ck_origen_por_tipo CHECK (
  (tipo IN ('Transferencia','Ajuste') AND origen_id IS NULL AND origen_entidad_id IS NULL)
  OR
  (tipo IN ('Ingreso','Egreso') AND origen_id IS NOT NULL AND origen_entidad_id IS NOT NULL)
);
```

### B5 · Falta `orden_compra.condicion_pago`

HU-COMP-02, primer criterio: *"Cabecera de la orden: proveedor, fecha de emisión, **condiciones de pago** y estado"*. El campo no existe en el DER, y el front lo manda (`OrdenCompra.condicion_pago`, catálogo `CONDICIONES_PAGO`).

```sql
ALTER TABLE orden_compra ADD COLUMN condicion_pago varchar(60) NOT NULL DEFAULT 'Contado';
ALTER TABLE orden_compra ADD CONSTRAINT ck_condicion_pago
  CHECK (condicion_pago IN ('Contado','Cta. cte. 30 días','Cta. cte. 60 días'));
```

### B6 · El movimiento de stock no tiene cabecera (y le falta el número)

Este es el punto de diseño más importante, y ahora es más claro que antes. El criterio de HU-STK-04 está redactado como una especificación de dos tablas:

> *"**Cabecera** del movimiento: número único generado por el sistema, fecha y hora, depósito afectado, tipo de movimiento y usuario responsable. **Detalle** del movimiento: una o más líneas, cada una referenciando un artículo y una cantidad; un mismo movimiento puede incluir varios artículos (relación cabecera-detalle)."*

El DER tiene **una sola tabla plana**, y además **le falta el campo `numero`** que el front usa como agrupador (`MOV-XXXX`, ver `proximoNumeroMovimiento()`).

**Recomiendo normalizar** (opción A). Razones: cumple el criterio textual; evita repetir fecha/tipo/usuario/motivo en las N filas de un mismo movimiento (algo que una cátedra de Sistemas III va a marcar); y el front **no se toca**, porque el listado plano que espera se sirve con una vista.

```sql
-- A) Cabecera nueva
CREATE TABLE movimiento_stock_cab (
  id                      serial PRIMARY KEY,
  numero                  varchar(30) NOT NULL UNIQUE,   -- MOV-XXXX
  deposito_id             int NOT NULL REFERENCES deposito(id),
  tipo                    tipo_movimiento_stock NOT NULL,
  origen_id               int REFERENCES origen_movimiento(id),
  origen_entidad_id       int,
  fecha_hora              timestamp NOT NULL DEFAULT now(),
  usuario_id              int NOT NULL REFERENCES usuario(id),
  motivo                  varchar(255),
  movimiento_vinculado_id int REFERENCES movimiento_stock_cab(id)
);

-- B) La tabla actual queda como detalle
ALTER TABLE movimiento_stock RENAME TO movimiento_stock_det;
-- se le agrega movimiento_cab_id y se le quitan los campos que subieron a la cabecera
-- (tipo, fecha_hora, usuario_id, motivo, origen_id, origen_entidad_id, movimiento_vinculado_id)

-- C) Vista con el shape plano que el front ya consume — cero cambios de UI
CREATE VIEW v_movimiento_stock AS
SELECT d.id, c.numero, d.ficha_stock_id, c.origen_id, c.origen_entidad_id,
       c.tipo, d.cantidad, c.fecha_hora, c.usuario_id, c.motivo,
       c.movimiento_vinculado_id
FROM movimiento_stock_det d
JOIN movimiento_stock_cab c ON c.id = d.movimiento_cab_id;
```

**Opción B (más rápida):** dejar la tabla plana y solo agregar `numero varchar(30)`. Sale en 5 minutos, pero es un desvío del criterio de aceptación y duplica la cabecera en cada fila. Si eligen esta, hay que documentarlo como desvío consciente en el acta del sprint.

**Recomiendo A**, y ahora es el momento más barato: la base está recién subida, presumiblemente solo con seed. Hacer esto en Sprint 2, con movimientos reales cargados, cuesta bastante más.

> ⚠️ Esto asume que la base **no tiene datos de producción todavía**. Si ya hay movimientos cargados que importan, decímelo y planteo la migración con backfill.

---

## 4. Altas — el front se rompe o pierde funcionalidad

| # | Falta | Por qué | Fix |
|---|---|---|---|
| **A1** | `articulo.imagen` | El front sube y muestra imagen del artículo (`ArticuloFormModal.tsx:141`, `ArticuloThumb.tsx`) | `ADD COLUMN imagen_url varchar(255)` |
| **A2** | `articulo.created_at` / `updated_at` | La interfaz `Articulo` los tiene y la UI los muestra | `ADD COLUMN created_at timestamp NOT NULL DEFAULT now()`, idem `updated_at` + trigger |
| **A3** | Formas de pago múltiples | `proveedor.forma_pago varchar(60)` es **singular**; el front hace `formasPago: string[]` (commit `10de349`) | **Decisión pendiente** — ver §5 |
| **A4** | Índices `UNIQUE` | Son criterios de aceptación, no detalles. Si no están como índice, la validación se escapa por concurrencia | ver §6 |
| **A5** | `orden_compra.estado_id smallint` vs `estado_orden_compra.id serial` | Los tipos de la FK no coinciden (`smallint` vs `integer`) | unificar a `int`, o `estado_orden_compra.id` a `smallint` |

---

## 5. Deuda y campos fuera de alcance

Nada de esto bloquea, pero conviene decidirlo ahora:

**M1 · `articulo.numero_lote` y `articulo.fecha_vencimiento` están mal ubicados.**
Un artículo tiene N lotes, cada uno con su propio vencimiento. Con estos campos en `articulo`, "Amoxicilina 500mg" solo puede tener un lote y una fecha en todo el sistema — y al recibir una compra nueva habría que sobreescribir la anterior. Además es HU-STK-05 (*Control de Fechas de Vencimiento*), que no está en el Sprint 1.
→ **Recomiendo quitarlos** y modelar `lote(id, articulo_id, numero, fecha_vencimiento)` cuando toque HU-STK-05. Si prefieren dejarlos, que queden nullable y sin uso, documentados como no implementados.

**M2 · `proveedor.calificacion` y `proveedor.rubro` están fuera del Sprint 1.**
`calificacion decimal(3,1)` es HU-PROV-02 (*Historial y Evaluación de Desempeño*). `rubro` no aparece en ningún criterio del backlog ni en el front. Dejarlos nullable sin uso está bien; solo que no se llenen a mano.

**M3 · `categoria` y `unidad_medida` son `varchar` sin restricción.**
El front tiene listas cerradas (`CATEGORIAS`, `UNIDADES`). Sin FK ni `CHECK`, cualquier string entra y los filtros por categoría se ensucian con el primer typo.
→ Mínimo un `CHECK IN (...)`; mejor, tablas catálogo como el resto (`origen_movimiento` ya lo es, así que el modelo sería más consistente).

**M4 · `usuario` no tiene sucursal ni contraseña.**
HU-SIS-01 pide *"sucursales asignadas"* (plural → N:M) y *"genera una contraseña temporal"*. HU-SIS-03 (multi-tenant por sucursal) depende de eso. Ambas son Sprint 2, pero definir ahora la forma evita migrar de nuevo:
```sql
-- Sprint 2, dejar previsto:
usuario_sucursal (usuario_id, sucursal_id)   -- PK compuesta
usuario.password_hash varchar(255)
usuario.debe_cambiar_password boolean DEFAULT true
```

**M5 · `movimiento_stock.origen_entidad_id` es una FK polimórfica.**
Apunta a `orden_compra` o a una venta según `origen_id`, así que no puede ser FK real. El `CHECK` de B4 cubre lo mínimo (que exista cuando corresponde). La integridad fina queda a cargo de la aplicación — vale documentarlo para que no parezca un olvido.

**M6 · `proveedor.plazo_entrega_d_habitual`** parece un nombre truncado. El front usa `plazoEntregaDias`. Renombrar a `plazo_entrega_dias` ahorra una traducción en cada endpoint.

---

## 6. Verificaciones — lo que el diagrama no muestra

Antes de escribir la primera migración, correr esto sobre la base real. Ninguna de estas cosas se ve en un DER, y varias **son criterios de aceptación**:

```sql
-- 1. ¿Qué UNIQUE / CHECK existen realmente?
SELECT conrelid::regclass AS tabla, conname, contype,
       pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY tabla, contype;

-- 2. ¿Qué índices hay?
SELECT tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' ORDER BY tablename;

-- 3. Valores reales de los enum
SELECT t.typname, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
ORDER BY t.typname, e.enumsortorder;

-- 4. ¿Hay datos cargados? (define si se puede migrar libremente)
SELECT 'articulo' t, count(*) FROM articulo
UNION ALL SELECT 'movimiento_stock', count(*) FROM movimiento_stock
UNION ALL SELECT 'orden_compra', count(*) FROM orden_compra
UNION ALL SELECT 'proveedor', count(*) FROM proveedor;
```

**Los `UNIQUE` que tienen que existir** (cada uno es un criterio de aceptación textual):

```sql
-- HU-STK-01: "valida que el nombre no se encuentre duplicado entre artículos activos"
CREATE UNIQUE INDEX uq_articulo_nombre_activo ON articulo (lower(nombre))
  WHERE estado = 'Activo';
CREATE UNIQUE INDEX uq_articulo_codigo ON articulo (codigo);

-- HU-PROV-01: "valida que el CUIT no se encuentre duplicado entre proveedores activos"
CREATE UNIQUE INDEX uq_proveedor_cuit_activo ON proveedor (cuit)
  WHERE estado = 'Activo';

-- HU-SIS-01: "valida que el email y el DNI no se encuentren duplicados entre usuarios activos"
CREATE UNIQUE INDEX uq_usuario_email_activo ON usuario (lower(email)) WHERE estado = 'Activo';
CREATE UNIQUE INDEX uq_usuario_dni_activo   ON usuario (dni)          WHERE estado = 'Activo';

-- HU-STK-02: una sola ficha por artículo+depósito
CREATE UNIQUE INDEX uq_ficha_articulo_deposito ON ficha_stock (articulo_id, deposito_id);

-- Numeración única
CREATE UNIQUE INDEX uq_orden_compra_cod ON orden_compra (cod_ord);
```

Nótese el **índice parcial** (`WHERE estado = 'Activo'`): es la traducción exacta de "duplicado **entre activos**". Un `UNIQUE` común impediría reutilizar el CUIT de un proveedor dado de baja, que sí debe poder reutilizarse.

---

## 7. Orden de migraciones propuesto

| # | Migración | Contenido | Bloquea a |
|---|---|---|---|
| `0007` | `fusion_usuario` | absorber `empleado` en `usuario`, renombrar `movimiento_stock.empleado_id` → `usuario_id`, drop `empleado` | todo |
| `0008` | `sucursal` | crear `sucursal` + FK desde `deposito` + seed de las 3 | HU-STK-02 |
| `0009` | `auditoria` | tabla + trigger genérico + `SET LOCAL app.usuario_id` + revoke UPDATE/DELETE | las 5 HU |
| `0010` | `constraints` | los `UNIQUE` parciales de §6 + FK types (A5) | HU-STK-01, HU-PROV-01 |
| `0011` | `articulo_ajustes` | `imagen_url`, `created_at`, `updated_at`; quitar `numero_lote`/`fecha_vencimiento` (M1); CHECK de categoría y unidad (M3) | HU-STK-01 |
| `0012` | `movimiento_cabecera` | cabecera + detalle + vista plana (B6) + `CHECK` de origen (B4) | HU-STK-04 |
| `0013` | `cotizaciones` | las 4 tablas + FKs (B3) | HU-COMP-02 |
| `0014` | `orden_compra_ajustes` | `condicion_pago` (B5), `plazo_entrega_dias` (M6) | HU-COMP-02 |

La numeración arranca en `0007` asumiendo que el DER actual ya vino de migraciones `0001`–`0006`. **Si la base se creó a mano y no hay migraciones versionadas, hay que generar el baseline primero** (`pg_dump --schema-only` → `0001_baseline.sql`), porque sin eso no hay forma de reproducir la base en otra máquina ni de entregarla a la cátedra.

---

## 8. Decisiones que necesito de ustedes

> ✅ **Actualización — cerradas por el equipo.** Ver [`GUIA-IMPLEMENTACION.md`](GUIA-IMPLEMENTACION.md) §2:
> - **A3 / punto 4** → formas de pago pasa a tabla catálogo + N:M. **(D-A)**
> - **B1** → no se crea `sucursal`: **depósito = sucursal**, se elimina `deposito.sucursal_id`. **(D-B)**
> - **B3** → las 4 tablas de cotizaciones **quedan fuera de alcance**. **(D-C)**
>
> Siguen abiertas: **B6** (cabecera-detalle de movimientos), **M1** (`numero_lote`/`fecha_vencimiento`), **M3** (`categoria`/`unidad_medida`).
> Los puntos 1 y 2 de abajo quedaron respondidos: **no hay acceso a la base**, así que el baseline se reconstruye desde el DER (ver `GUIA-IMPLEMENTACION.md` §4).

1. **¿La base tiene datos que importen, o es solo seed?** Define si las migraciones `0011` y `0012` pueden ser destructivas o necesitan backfill.
2. **¿Hay migraciones versionadas o la base se armó a mano?** Si es lo segundo, primer paso: baseline con `pg_dump`.
3. **B6 — ¿opción A (cabecera-detalle) u opción B (plano + `numero`)?** Recomiendo A; es la única que cumple el criterio de HU-STK-04 tal como está escrito.
4. **A3 — formas de pago del proveedor: ¿una o varias?** El front ya hace varias. Si vamos a N:M, `proveedor.forma_pago` se reemplaza por `forma_pago` + `proveedor_forma_pago`. Si es una sola, hay que revertir el front (y el commit `10de349`).
5. **M1 — ¿saco `numero_lote` y `fecha_vencimiento` de `articulo`?** Están fuera del Sprint 1 y mal normalizados.
6. **M3 — ¿`categoria` y `unidad_medida` pasan a tablas catálogo, o alcanza un `CHECK`?**
