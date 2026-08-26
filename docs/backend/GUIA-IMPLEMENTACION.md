# Guía de implementación del backend — Huellitas Felices

> Documento operativo: cómo está organizado el backend, qué va en cada carpeta, qué métodos tiene cada capa y en qué orden trabajar.
> **Lee antes:** [`PLAN-SPRINT1.md`](PLAN-SPRINT1.md) (alcance y contrato de API) y [`AJUSTES-DER.md`](AJUSTES-DER.md) (huecos del DER).
> Este doc **cierra** las decisiones que esos dos dejaron abiertas.

---

## 0. Qué de esto ya existe y qué es especificación

**Casi todo este documento es prescriptivo: describe cómo hay que construir, no cómo está construido.** Importa no confundirlo, porque si alguien lee §9 pensando que ese código existe, va a buscar archivos que no están.

| Parte | Estado |
|---|---|
| `src/lib/` — db, http, auth, audit | ✅ **construido** y verificado (`tsc` + `eslint` limpios) |
| `src/modules/proveedores/` (5 archivos) | ✅ **construido** — es el módulo de referencia |
| `/api/proveedores` (3 rutas) + `/api/formas-pago` | ✅ **construido** |
| `db/migrations/0001`–`0009` | 📝 **escritas, NUNCA ejecutadas** — ver aviso abajo |
| `db/seeds/`, `db/dev/`, `scripts/` | 📝 escritos, nunca ejecutados |
| §9.3 (artículos), §9.5 (movimientos), §9.6 (compras) | ✅ **construido** — `src/modules/{articulos,movimientos,compras}/` |
| §9.4 (stock) | 📋 **especificación** — no hay código |
| §9.1 (catálogos) | 📋 especificación parcial — ver la nota de esa sección |
| §11 (conexión del front) | 📋 especificación — el front sigue 100% hardcodeado |
| §13 (testing) | 📋 especificación — no hay ni un test escrito |

> ⚠️ **Ninguna migración corrió en ninguna parte.** No se aplicaron a la base del
> servidor (no tenemos acceso) ni en local (no hay Docker instalado en la máquina
> donde se escribieron). Se revisaron a mano, no se ejecutaron. La primera corrida
> real puede sacar errores.
>
> Para el **estado de la base**, entonces: lo único que existe de verdad es lo
> que describe `0001_baseline.sql` — y eso mismo es una reconstrucción del DDL
> que pasó el equipo, no un `pg_dump` de la base real.

---

## 1. Punto de partida

**Lo que tenemos:**
- Front completo y funcionando con datos hardcodeados (6 pantallas, 6 módulos).
- El contrato de API prácticamente escrito: ~85 comentarios `// BACKEND:` + las interfaces de `src/data/*.ts`.
- El DER de la base, en imagen.

**Lo que NO tenemos:**
- Acceso a la base real. No podemos hacer `pg_dump`, ni verificar `UNIQUE`/`CHECK`/enums, ni correr migraciones contra ella.

**Esto no bloquea nada.** El 90% del trabajo (DDL, capas, endpoints, reglas de negocio) se hace contra una Postgres local. Ver §4.

---

## 2. Decisiones cerradas

Tres cambios acordados por el equipo que estaban pendientes en el DER:

### D-A · Formas de pago pasa a tabla

Confirma lo que el front ya hacía (`formasPago: string[]`, commit `10de349`). `proveedor.forma_pago varchar(60)` se reemplaza por catálogo + N:M.

```sql
CREATE TABLE forma_pago (
  id     serial PRIMARY KEY,
  nombre varchar(60) NOT NULL UNIQUE
);
-- Seed: Contado, Cuenta Corriente, Transferencia, Cheque a 30 días

CREATE TABLE proveedor_forma_pago (
  proveedor_id  int NOT NULL REFERENCES proveedor(id) ON DELETE CASCADE,
  forma_pago_id int NOT NULL REFERENCES forma_pago(id),
  PRIMARY KEY (proveedor_id, forma_pago_id)
);

ALTER TABLE proveedor DROP COLUMN forma_pago;
```

✅ Cierra la divergencia **V1** / **A3**.

### D-B · Depósito = Sucursal

Una sola entidad: cada sucursal tiene un depósito y solo uno. Se elimina la idea de tabla `sucursal` separada y `deposito.sucursal_id` desaparece.

**A favor:** HU-STK-02 dice *"cada sucursal tiene su propio depósito, con stock independiente del resto"* — el backlog describe un 1:1. Resuelve el bloqueante **B1** (la FK huérfana `deposito.sucursal_id`) sin crear tabla nueva.

```sql
ALTER TABLE deposito DROP COLUMN sucursal_id;
-- deposito(id, nombre, ubicacion) — nombre = nombre de la sucursal
-- Seed: Centro, Norte, Sur
```

⚠️ **Conflicto con el front — hay que tocarlo.** El front modela 1 sucursal : N depósitos y trae 5 depósitos sobre 3 sucursales (`Dep. Central` y `Dep. Auxiliar` ambos en Centro; `Dep. Sur` y `Dep. Vacunas` ambos en Sur). Con esta decisión eso se colapsa a 3. Cambios concretos:

| Archivo | Qué hacer |
|---|---|
| `src/data/stock.ts` | `SUCURSALES` se elimina; `Deposito` pierde `sucursalId` y `sucursal`; `depositosIniciales` baja de 5 a 3 |
| `DepositoFormModal.tsx:97` | el select de sucursal deja de tener sentido → se quita |
| `FiltrosStock.tsx:115` | el filtro por sucursal duplica al de depósito → se quita, o se renombra a "Depósito" |
| `FichaStock.deposito` | `{ id, nombre, sucursal }` → el API puede devolver `sucursal = nombre` para no romper la tabla mientras se limpia |

⚠️ **Deuda técnica consciente, con punto de quiebre conocido.** HU-SUC-01 (Sprint 2+) pide que la sucursal tenga *"horarios de atención y datos fiscales"*, y HU-VTA-03 le cuelga una caja. Eso son atributos de sucursal, no de depósito. Cuando entren esas HU va a haber que separar las tablas de nuevo. Para Sprint 1 es una simplificación válida; **dejarlo asentado en el acta** para que no aparezca como sorpresa después.

### D-C · Cotizaciones queda fuera de alcance — ❌ **REVERTIDA**

> 🔴 **Esta decisión se dio de baja al implementar HU-COMP-02.** Las 4 tablas se crean en `db/correcciones/09_cotizaciones.sql` y el módulo `compras/` implementa el circuito completo (solicitud → cotizaciones → comparación → adjudicación → órdenes).
>
> **Por qué se revirtió:** D-C daba por equivalentes dos cosas distintas. HU-COMP-01 (necesidades de compra) es el *disparador* de la compra; la cotización es el paso de *selección de proveedor*. Que no haya necesidades no elimina la selección — y el criterio de HU-COMP-02 la pide textual. Con D-C, un criterio de aceptación quedaba sin cubrir y `/cotizaciones`, que el front ya tiene entero, se quedaba en mock.
>
> **Consecuencias actualizadas:** `orden_compra.cotizacion_id` ya **no** es columna muerta (tiene FK y se llena al adjudicar), y `/cotizaciones` **sí** se conecta. Lo único que sigue sin cubrirse de HU-COMP-02 es "generar la orden a partir de una o más necesidades pendientes", que depende de HU-COMP-01 y esa sí está descartada.
>
> El texto original queda abajo como registro de lo que se había decidido.

No se crean `solicitud_cotizacion`, `solicitud_detalle`, `cotizacion` ni `cotizacion_detalle`. Cierra el bloqueante **B3** por descarte.

**Es coherente** con la baja de HU-COMP-01 (*"no va, pasamos directo a la emisión de la orden de compra"*): sin necesidades de compra ni cotizaciones, el circuito es directo → OC.

**Consecuencias a asentar:**
1. El criterio de HU-COMP-02 *"antes de adjudicar, permite registrar y comparar cotizaciones de más de un proveedor"* **no se implementa en Sprint 1**. Es un criterio de aceptación que queda sin cubrir: hay que declararlo, no dejarlo pasar en silencio.
2. `orden_compra.cotizacion_id` queda como **columna muerta**: siempre `NULL`, sin FK. Recomiendo dejarla (evita migrar de nuevo en Sprint 2) y documentarla como reservada.
3. `/cotizaciones` y `CotizacionesContext` **siguen siendo mock**. No se conectan. Hay que avisarle al equipo de front para que no lo den por integrado.
4. La OC se crea directo desde `OrdenFormModal`, eligiendo proveedor a mano.

**PF reales del Sprint 1:** 34 (37 − 3 de HU-COMP-01) − parte de los 13 de HU-COMP-02 que quedan sin cubrir. Conviene recalcularlo con el equipo para el acta.

---

## 3. Alcance final del backend Sprint 1

| Módulo | HU | Tablas | Endpoints |
|---|---|---|---|
| Piso técnico | HU-SIS-01/04/06 | `usuario`, `rol`, `auditoria` | `/api/auth/sesion`, `/api/auth/logout`, `/api/usuarios` |
| Proveedores | HU-PROV-01 | `proveedor`, `forma_pago`, `proveedor_forma_pago` | 4 |
| Artículos | HU-STK-01 | `articulo` | 5 |
| Stock | HU-STK-02 | `deposito`, `ficha_stock` | 6 |
| Movimientos | HU-STK-04 | `movimiento_stock_cab`, `movimiento_stock_det`, `origen_movimiento` | 3 |
| Compras | HU-COMP-02 | `orden_compra`, `orden_compra_detalle`, `estado_orden_compra`, `solicitud_cotizacion`, `solicitud_detalle`, `cotizacion`, `cotizacion_detalle` | 10 |

**Fuera:** sucursal como entidad propia (D-B), lotes y vencimientos (HU-STK-05), lista de precios (HU-STK-03), recepción de mercadería (HU-COMP-03), necesidades de compra (HU-COMP-01, descartada en el acta).

---

## 4. La base: Supabase, sin migraciones

La base está en **Supabase** y el equipo la edita **directamente en el SQL
Editor**. Esa es la fuente de verdad.

El repo la espeja:

```
   cambiás en el SQL Editor  →  npm run db:dump  →  git commit
```

`db:dump` lee la base y reescribe `db/schema.sql` con el DDL completo. El cambio
se hace **una sola vez**, en Supabase.

**Por qué no usamos migraciones.** Un sistema de migraciones (archivos numerados
que se aplican una vez y quedan registrados) resuelve el problema de que cada
persona tenga su propia base y haya que sincronizarlas. Acá hay **una sola base
compartida**: escribir el cambio en Supabase y además en un archivo sería
hacerlo dos veces.

Lo que sí conservamos del enfoque: **el schema versionado en git**. Sin eso no
hay entregable para la cátedra, no se ve qué cambió ni cuándo, y no hay forma de
reconstruir la base si el proyecto de Supabase se pausa o se pierde.

**Conexión.** Supabase → Connect → Direct → **session pooler** (host
`pooler.supabase.com`, puerto 5432; la *direct connection* es IPv6 only y falla
en redes IPv4). La URL termina en `?sslmode=no-verify`.

**Correcciones pendientes.** `db/correcciones/` tiene SQL para pegar en el SQL
Editor que arregla lo que hoy falta o está mal en la base. Ver
`db/correcciones/README.md`.

---

## 5. Arquitectura en capas

Cuatro capas, una dirección de dependencia. Nunca al revés.

```
HTTP  →  route handler  →  service  →  repository  →  Postgres
              ↓               ↓            ↓
           validar        reglas de       SQL
           mapear         negocio      (y nada más)
           errores       transacción
```

**La regla de oro:** cada capa hace **una** cosa.

| Capa | Sí | No |
|---|---|---|
| **route handler** | leer request, validar shape, llamar al service, mapear la respuesta y los errores a HTTP | SQL, reglas de negocio, cálculos |
| **service** | reglas de negocio, orquestar transacciones, decidir errores de dominio, escribir auditoría | SQL directo, saber que existe HTTP (nada de `Request`/`Response`) |
| **repository** | SQL parametrizado, devolver filas crudas | validar, decidir reglas, abrir transacciones |
| **mapper** | traducir fila de BD → shape que el front espera | tocar la base, aplicar reglas |

**Por qué importa acá en particular:** las reglas de HU-STK-04 (validar ficha activa → validar stock no negativo → insertar → actualizar stock → calcular alertas → auditar) son 6 pasos en una transacción. Metidas en un `route.ts` son imposibles de testear y se van a duplicar cuando HU-COMP-03 (recepción de mercadería) tenga que generar movimientos desde otro lado. En un service, se reusan con una línea.

---

## 6. Estructura de carpetas

```
huellitas-felices/
├── docker-compose.yml              # Postgres local
├── .env.example                    # commiteado, sin secretos
├── .env.local                      # NO commitear
│
├── db/
│   ├── migrations/
│   │   ├── 0001_baseline.sql       # DDL del equipo, sin cambios de diseño
│   │   ├── 0002_fusion_usuario.sql
│   │   └── ...                     # ver §12
│   ├── seeds/
│   │   ├── 01_catalogos.sql        # rol, forma_pago, origen_movimiento, estado_orden_compra
│   │   └── 02_demo.sql             # los datos del front, para la demo
│   └── README.md                   # cómo correr migraciones y seeds
│
└── src/
    ├── app/
    │   ├── (pantallas del front — no se tocan salvo al conectar)
    │   └── api/                    # ← SOLO route handlers
    │       ├── auth/
    │       │   ├── sesion/route.ts
    │       │   └── logout/route.ts
    │       ├── usuarios/route.ts
    │       ├── proveedores/
    │       │   ├── route.ts                    # GET, POST
    │       │   └── [id]/
    │       │       ├── route.ts                # GET, PUT
    │       │       └── inactivar/route.ts      # PATCH
    │       ├── articulos/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       └── ultimo-precio-compra/route.ts
    │       ├── depositos/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── fichas-stock/
    │       │   ├── route.ts
    │       │   └── [id]/route.ts
    │       ├── movimientos-stock/route.ts
    │       ├── transferencias/route.ts
    │       ├── ordenes-compra/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       ├── enviar/route.ts
    │       │       ├── cancelar/route.ts
    │       │       ├── remito/route.ts
    │       │       └── notas-reclamo/route.ts
    │       ├── formas-pago/route.ts
    │       ├── condiciones-pago/route.ts
    │       ├── tipos-movimiento/route.ts
    │       └── origenes-movimiento/route.ts
    │
    ├── lib/                        # ← infraestructura, sin lógica de negocio
    │   ├── db/
    │   │   ├── client.ts           # pool de conexión
    │   │   ├── tx.ts               # withTransaction()
    │   │   └── types.ts            # tipos de fila crudos
    │   ├── http/
    │   │   ├── handler.ts          # withRoute() — wrapper de todos los endpoints
    │   │   ├── errors.ts           # clases de error de dominio
    │   │   ├── responses.ts        # ok(), created(), noContent()
    │   │   └── query.ts            # parseo de filtros y paginación
    │   ├── auth/
    │   │   └— session.ts           # getSession(), requireSession()
    │   └── audit/
    │       └── audit.ts            # withAuditUser(), registrar()
    │
    └── modules/                    # ← el backend de verdad, un folder por dominio
        ├── proveedores/
        │   ├── proveedor.schema.ts     # validación de input
        │   ├── proveedor.repo.ts       # SQL
        │   ├── proveedor.service.ts    # reglas
        │   ├── proveedor.mapper.ts     # fila → shape del front
        │   └── proveedor.types.ts
        ├── articulos/
        ├── stock/                      # depositos + fichas
        ├── movimientos/
        ├── compras/
        └── catalogos/
```

> **Estado del scaffold:** están creados `src/lib/` completo y
> `src/modules/proveedores/` completo, más sus route handlers y
> `/api/formas-pago`. Los demás módulos se van creando a medida que se
> implementan, copiando la estructura de proveedores — no se dejan carpetas
> vacías. El árbol de arriba es el destino, no el estado actual.

**Por qué `src/modules/` y no todo dentro de `src/app/api/`:** las carpetas de `app/api/` están dictadas por la URL, no por el dominio. Si la lógica vive ahí, `movimientos-stock` y `transferencias` terminan duplicando las mismas validaciones porque están en rutas distintas. Con `modules/`, ambos llaman al mismo service.

---

## 7. Convenciones

### Naming: base vs API

- **Base de datos:** `snake_case`, singular (`orden_compra`, `ficha_stock`).
- **API:** exactamente el shape que ya espera el front. **No inventar.**

⚠️ **El front NO es consistente, y hay que respetarlo módulo por módulo:**

| Módulo del front | Estilo | Ejemplo |
|---|---|---|
| `proveedores.ts`, `stock.ts`, `articulos.ts`, `movimientos.ts` | **camelCase** | `razonSocial`, `stockActual`, `fichaStockId` |
| `ordenes-compra.ts` | **snake_case + relaciones con `_`** | `proveedor_id`, `precio_acordado`, `_proveedor`, `_detalles` |

Esto es feo pero es lo que hay, y **cambiarlo es trabajo del front, no del back**. Cada mapper copia el estilo de *su* módulo. Si se unifica algún día, se unifica en los dos lados a la vez.

### Errores

Un solo shape, porque el front ya tiene estados de error por CUIT/nombre duplicado:

```json
{ "error": { "codigo": "CUIT_DUPLICADO", "mensaje": "Ya existe un proveedor activo con ese CUIT.", "campo": "cuit" } }
```

| Situación | HTTP | Clase |
|---|---|---|
| Input mal formado | 422 | `ValidationError` |
| No existe | 404 | `NotFoundError` |
| Duplicado (CUIT, nombre, código) | 409 | `ConflictError` |
| Regla de negocio (stock insuficiente, proveedor inactivo, OC ya enviada) | 409 | `BusinessRuleError` |
| Sin sesión | 401 | `UnauthorizedError` |
| Bug | 500 | genérico, **sin filtrar el error de Postgres al cliente** |

### Reglas duras

1. **Todo SQL parametrizado.** `$1, $2`. Nunca interpolación de strings.
2. **`stock_actual` no se escribe fuera del service de movimientos.** Ningún otro repo tiene un método para tocarlo.
3. **Los totales se recalculan en el server.** El `total` que manda el front se ignora.
4. **La numeración (`MOV-XXXX`, `OC-XXXX`) la genera el back**, dentro de la transacción.
5. **El `usuario_id` sale de la sesión**, nunca del body.
6. **Toda operación multi-tabla va en transacción.** Sin excepción.

---

## 8. Piezas transversales

### `lib/db/client.ts`

```ts
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
```

### `lib/db/tx.ts`

```ts
import type { PoolClient } from "pg";
import { pool } from "./client";

/** Corre fn dentro de una transacción. Commit si resuelve, rollback si lanza. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
```

### `lib/audit/audit.ts`

El trigger de auditoría lee el usuario de una variable de sesión de Postgres. Hay que fijarla **al principio de cada transacción que escriba**:

```ts
/** Deja el usuario responsable disponible para el trigger de auditoría. */
export async function withAuditUser(client: PoolClient, usuarioId: number) {
  await client.query("SELECT set_config('app.usuario_id', $1, true)", [
    String(usuarioId),
  ]);
}
```

`true` = `SET LOCAL`: vive solo lo que dura la transacción. Si se olvida, el trigger no sabe quién hizo el cambio.

### `lib/http/handler.ts`

Envuelve todos los endpoints: resuelve sesión, captura errores y los mapea a HTTP. Evita repetir `try/catch` en 25 archivos.

```ts
export function withRoute<T>(
  fn: (ctx: { req: Request; session: Session; params: T }) => Promise<Response>,
) {
  return async (req: Request, { params }: { params: T }) => {
    try {
      const session = await requireSession(req);
      return await fn({ req, session, params });
    } catch (e) {
      return toHttpResponse(e);   // AppError → status + shape; resto → 500
    }
  };
}
```

### `lib/auth/session.ts` (stub de Sprint 1)

```ts
// Sprint 1: cookie httpOnly firmada con el usuario semilla.
// Sprint 2 (HU-SIS-04): login real con password_hash. La firma de
// requireSession() no cambia, así que ningún endpoint se toca.
export async function requireSession(req: Request): Promise<Session>;
// Session = { usuarioId, nombre, rol }
```

---

## 9. Métodos por módulo

Lo que tiene que existir en cada capa. Los nombres son sugerencia; lo que importa es el reparto de responsabilidades.

**Solo §9.2 (proveedores) existe como código.** El resto es especificación: sirve para saber qué escribir, no para buscar archivos.

### 9.1 Catálogos — la excepción a la regla de capas

> ⚠️ **Acá la guía y el código no coinciden, a propósito.** Esta sección decía
> "un service fino sobre queries simples" con un `catalogo.repo.ts`. Al construir
> `/api/formas-pago` quedó claro que era sobre-ingeniería: son 4 filas, un
> `ORDER BY` y cero reglas. Repo + service + mapper para eso son 3 archivos que
> solo reenvían la llamada. **La query vive en el route handler** (ver
> `src/app/api/formas-pago/route.ts`).

**La regla, entonces:** un catálogo de solo lectura y sin reglas puede tener la
query en el handler. La capa de service se agrega **el día que aparezca la
primera regla**, no antes.

Dónde está el límite: si el endpoint necesita validar algo, decidir un error de
dominio, tocar más de una tabla o abrir una transacción → ya no es un catálogo,
va con las capas completas.

Endpoints de catálogo del Sprint 1 (todos con este patrón):

```
GET /api/formas-pago          ✅ construido
GET /api/depositos            📋 (ojo: depósito = sucursal, decisión D-B)
GET /api/tipos-movimiento     📋 (los 2 valores del enum: ingreso, egreso)
GET /api/origenes-movimiento  📋
GET /api/usuarios             📋 (reemplaza a /api/empleados — decisión D-D)
GET /api/condiciones-pago     📋 constante fija, sin tabla: devuelve el array duro
```

### 9.2 `proveedores/` — HU-PROV-01 · ✅ CONSTRUIDO

Es el único módulo que existe. Lo de abajo describe archivos reales: compará con
`src/modules/proveedores/` mientras leés.

```ts
// proveedor.repo.ts
findAll(f: { busqueda?, estado?, formaPagoId? }): Promise<ProveedorRow[]>
findById(id): Promise<ProveedorRow | null>
findActivoByCuit(cuit): Promise<ProveedorRow | null>      // chequeo de duplicado
insert(data, client): Promise<ProveedorRow>
update(id, data, client): Promise<ProveedorRow>
setEstado(id, estado, client): Promise<void>
formasPagoDe(proveedorIds: number[]): Promise<Map<number, string[]>>   // evita N+1
reemplazarFormasPago(proveedorId, formaPagoIds, client): Promise<void>
contarOrdenesAbiertas(proveedorId): Promise<number>       // para bloquear la baja
```

```ts
// proveedor.service.ts
listar(filtros)
obtener(id)                                  // 404 si no existe
crear(input, usuarioId)                      // tx: valida CUIT dup → insert → formas de pago → auditoría
editar(id, input, usuarioId)                 // tx: idem, excluyéndose a sí mismo del dup
inactivar(id, usuarioId)                     // tx: valida sin OC abiertas → baja lógica → auditoría
```

Reglas que van acá y en ningún otro lado:
- CUIT duplicado **entre activos** → `ConflictError('CUIT_DUPLICADO')`. El índice parcial es la red de seguridad; el chequeo previo da el mensaje lindo.
- Baja con OC abiertas → `BusinessRuleError`. Lo pide `ProveedoresContext.tsx:67`.
- Baja lógica siempre: nunca `DELETE`.

```ts
// proveedor.mapper.ts
toApi(row, formasPago: string[]): Proveedor   // camelCase: razonSocial, formasPago, plazoEntregaDias
```

### 9.3 `articulos/` — HU-STK-01 · 📋 especificación

```ts
// articulo.repo.ts
findAll(f: { busqueda?, categoria?, estado?, proveedorId? }): Promise<ArticuloRow[]>
findById(id)
findActivoByNombre(nombre): Promise<ArticuloRow | null>
findByCodigo(codigo): Promise<ArticuloRow | null>
insert(data, client)
update(id, data, client)
setEstado(id, estado, client)
ultimoPrecioCompra(articuloId): Promise<number | null>   // MAX(fecha) sobre orden_compra_detalle
tieneMovimientos(articuloId): Promise<boolean>
```

```ts
// articulo.service.ts
listar(filtros)
obtener(id)
crear(input, usuarioId)             // valida nombre dup entre activos + código único
editar(id, input, usuarioId)
desactivar(id, usuarioId)           // baja lógica
ultimoPrecioCompra(articuloId)      // GET /api/articulos/:id/ultimo-precio-compra
```

- **El artículo no tiene precio.** Criterio explícito del Excel. Si aparece en el input, se ignora.
- `imagen`: decidir el manejo (ver §14). El service recibe una URL ya resuelta; **la subida del archivo no va en el service**.

### 9.4 `stock/` — HU-STK-02 · 📋 especificación

```ts
// deposito.repo.ts
findAll(): Promise<DepositoRow[]>
findById(id)
findByNombre(nombre)                // duplicados
insert(data, client)
update(id, data, client)

// ficha.repo.ts
findAll(f: { depositoId?, articuloId?, estado? }): Promise<FichaRow[]>
findById(id)
findByArticuloYDeposito(articuloId, depositoId): Promise<FichaRow | null>
insert(data, client)                // stock_actual arranca en 0, sin excepción
updateUmbrales(id, { stockMinimo, stockCritico }, client)
lockById(id, client): Promise<FichaRow>            // SELECT ... FOR UPDATE
sumarStock(id, delta: number, client): Promise<FichaRow>   // ← ÚNICO camino a stock_actual
```

```ts
// stock.service.ts
listarFichas(filtros)
crearFicha(input, usuarioId)        // valida que no exista ya (articulo+deposito), stock 0
editarUmbrales(id, input, usuarioId)
listarDepositos()
crearDeposito(input, usuarioId)
editarDeposito(id, input, usuarioId)

// Función pura, sin BD — se testea sola
calcularEstado(f): "normal" | "bajo" | "critico"
```

- `sumarStock` y `lockById` son **internos**: los usa el service de movimientos, nunca un route handler. No hay endpoint que escriba `stock_actual`.
- `calcularEstado` replica `calcularEstadoStock()` de `src/data/stock.ts`. **Ojo:** el front ya lo calcula del lado del cliente, así que el API no necesita devolverlo — pero el back lo necesita internamente para las alertas de reposición.

### 9.5 `movimientos/` — HU-STK-04 · 📋 especificación · el módulo crítico

```ts
// movimiento.repo.ts
proximoNumero(client): Promise<string>                     // MOV-XXXX, dentro de la tx
insertCabecera(data, client): Promise<CabRow>
insertDetalle(cabId, lineas, client): Promise<DetRow[]>
vincular(cabIdA, cabIdB, client): Promise<void>            // par de transferencia
findAll(f: { tipo?, depositoId?, articuloId?, desde?, hasta? }): Promise<MovimientoPlanoRow[]>
findById(id)
```

```ts
// movimiento.service.ts

/**
 * Registra un movimiento con N líneas. TODO EN UNA TRANSACCIÓN:
 *  1. withAuditUser
 *  2. validar que exista ficha activa para cada (articulo, deposito) → si falta, rechaza TODO
 *  3. lockById de cada ficha afectada (FOR UPDATE, ordenadas por id para evitar deadlock)
 *  4. validar que ningún egreso deje stock negativo
 *  5. proximoNumero + insertCabecera + insertDetalle
 *  6. sumarStock por línea (signo según el tipo)
 *  7. calcular alertas de reposición sobre el stock resultante
 *  8. auditoría
 * Devuelve { movimiento, alertas } — el front espera las alertas en la respuesta
 * del POST (src/app/stock/page.tsx:617).
 */
registrar(input, usuarioId): Promise<{ movimiento; alertas: Alerta[] }>

/**
 * Transferencia entre depósitos. Genera DOS cabeceras (egreso en origen,
 * ingreso en destino) vinculadas por movimiento_vinculado_id, en UNA transacción.
 * Reusa la validación de registrar(): si una punta falla, no se escribe nada.
 */
transferir(input, usuarioId): Promise<{ egreso; ingreso; alertas: Alerta[] }>

listar(filtros)

// Funciones puras
signoDe(tipo): 1 | -1
alertasDe(fichasResultantes): Alerta[]
validarOrigenPorTipo(tipo, origenId): void   // Transferencia/Ajuste → origen NULL
```

Detalles que se pasan por alto y duelen después:

- **Ordenar los locks por `id` ascendente.** Dos movimientos concurrentes que tocan las mismas dos fichas en orden distinto se deadlockean. Ordenar los `FOR UPDATE` lo evita.
- **`proximoNumero` dentro de la transacción**, con secuencia de Postgres, no con `MAX(numero)+1` — dos requests simultáneos sacarían el mismo número.
- El signo lo pone el service: Ingreso `+`, Egreso `−`, Ajuste según corresponda, Transferencia `−` en origen y `+` en destino.

### 9.6 `compras/` — HU-COMP-02 · ✅ CONSTRUIDO

```ts
// orden.repo.ts
proximoCodOrd(client): Promise<string>                     // OC-XXXX
findAll(f: { proveedorId?, estadoId?, desde?, hasta?, totalMin?, totalMax? })
findById(id): Promise<OrdenConDetallesRow | null>
insertCabecera(data, client)
insertDetalles(ordenId, lineas, client)
updateCabecera(id, data, client)
reemplazarDetalles(id, lineas, client)
setEstado(id, estadoId, client)
findEstadoByNombre(nombre): Promise<EstadoOcRow>
```

```ts
// orden.service.ts
listar(filtros)
obtener(id)
crear(input, usuarioId)      // tx: valida proveedor ACTIVO + artículos ACTIVOS
                             //     → recalcula totales → proximoCodOrd → cabecera + detalles → auditoría
editar(id, input, usuarioId) // solo si estado = Pendiente, si no BusinessRuleError
enviar(id, usuarioId)        // Pendiente → Enviada
cancelar(id, usuarioId)      // no permitido si el estado es final (es_final = true)
remito(id)                   // GET /api/ordenes-compra/:id/remito
crearNotaReclamo(id, input, usuarioId)

// Función pura — la más testeable del proyecto
calcularTotales(detalles, descuento, gastosEnvio): { subtotal; total }
puedeTransicionar(estadoActual, estadoDestino): boolean
```

- `calcularTotales`: `total = subtotal − (subtotal × descuento/100) + gastosEnvio`, redondeado a 2 decimales. **Se recalcula siempre**, el número del front se descarta.
- `puedeTransicionar` se apoya en `estado_orden_compra.es_final`, que ya está en el DER. Nada hardcodeado.
- `Recibida Parcial` / `Recibida Total` **no son alcanzables en Sprint 1** (llegan de HU-COMP-03). Están en el catálogo pero sin transición que las produzca.
- `cotizacion_id` se llena al adjudicar y queda `NULL` en las órdenes cargadas a mano (D-C revertida, ver §2).
- El lado cotizaciones vive en `cotizacion.{types,schema,repo,mapper,service}.ts` del mismo módulo: `crear`, `registrarCotizacion`, `adjudicar` y `cancelar`. La adjudicación reusa `orden.service.crearEnTransaccion()` para que las órdenes generadas pasen por las mismas validaciones que una orden manual.
- `proximoCodOrd()` no hizo falta: el número lo genera el trigger `trg_generar_cod_orden_compra` (BEFORE INSERT) que ya estaba en la base.
- `remito()` y `crearNotaReclamo()` quedaron **sin implementar**: no están en los criterios de HU-COMP-02 y la nota de reclamo no tiene tabla en el DER.

---

## 10. Slice de ejemplo: `POST /api/proveedores`

El molde para los otros 24 endpoints.

```ts
// src/app/api/proveedores/route.ts
import { withRoute } from "@/lib/http/handler";
import { created, ok } from "@/lib/http/responses";
import { crearProveedorSchema } from "@/modules/proveedores/proveedor.schema";
import * as service from "@/modules/proveedores/proveedor.service";

export const GET = withRoute(async ({ req }) => {
  const filtros = parseFiltrosProveedor(new URL(req.url).searchParams);
  return ok(await service.listar(filtros));
});

export const POST = withRoute(async ({ req, session }) => {
  const input = crearProveedorSchema.parse(await req.json());   // 422 si falla
  const proveedor = await service.crear(input, session.usuarioId);
  return created(proveedor);
});
```

El handler tiene 4 líneas por método: parsear, validar, delegar, responder. Sin SQL, sin reglas.

```ts
// src/modules/proveedores/proveedor.service.ts
export async function crear(input: CrearProveedorInput, usuarioId: number) {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const duplicado = await repo.findActivoByCuit(input.cuit);
    if (duplicado) {
      throw new ConflictError(
        "CUIT_DUPLICADO",
        "Ya existe un proveedor activo con ese CUIT.",
        "cuit",
      );
    }

    const row = await repo.insert(input, client);
    await repo.reemplazarFormasPago(row.id, input.formaPagoIds, client);

    const formasPago = await repo.formasPagoDe([row.id]);
    return mapper.toApi(row, formasPago.get(row.id) ?? []);
  });
}
```

Las reglas se leen de corrido y se testean sin levantar un servidor HTTP.

---

## 11. Conexión del front

Un patrón, no seis. Por cada pantalla:

1. Borrar el import de `src/data/<modulo>.ts` (los arrays `*Iniciales`).
2. Reemplazar por un `fetch` al endpoint, respetando los tres estados que el front **ya tiene diseñados**: cargando, error, vacío.
3. Borrar `SIMULAR_VACIO` y `SIMULAR_ERROR` — eran andamio de diseño.
4. Dejar en `src/data/` solo lo que no viene de la base: helpers de formato (`formatMoney`, `formatFecha`, `parseImporte`, `calcularEstadoStock`, `codigoFicha`) y los tipos.
5. Borrar el comentario `// BACKEND:` resuelto.

Los tipos de `src/data/*.ts` se quedan y pasan a ser el contrato compartido: son la única razón por la que el front y el back no se van a desincronizar.

---

## 12. Cambios de estructura en la base

No hay migraciones (ver §4). El flujo es:

1. Aplicás el cambio en el **SQL Editor de Supabase**.
2. `npm run db:dump` → reescribe `db/schema.sql`.
3. `git diff db/schema.sql` → revisás que cambió lo que esperabas y nada más.
4. Commit.

**`db/schema.sql` no se edita a mano.** Es generado; el próximo dump lo pisa.

**Corré el dump después de cada cambio, no una vez por mes.** El valor está en
que el diff de git muestre qué se tocó, y para eso tiene que estar al día.

### Correcciones pendientes

`db/correcciones/` tiene SQL escrito y todavía **sin aplicar**. Se pega en el SQL
Editor, en orden, una sola vez cada uno:

| # | Qué arregla | Urgencia |
|---|---|---|
| 01 | crea `auditoria` + trigger genérico | 🔴 criterio de aceptación de las 5 HU |
| 02 | `fn_actualizar_stock` pierde egresos concurrentes | 🔴 bug |
| 03 | saca `deposito.sucursal_id` (FK huérfana) | 🟠 bloquea HU-STK-02 |
| 04 | UNIQUE parciales, CHECKs, índices de FK | 🟠 la base no tiene ni un CHECK |
| 05 | timestamps de artículo, saca lote/vencimiento, renombres | 🟡 |
| 06 | N:M proveedor ↔ forma de pago (D-A) | 🟡 |
| 07 | cabecera-detalle de movimientos | ⏸️ pendiente de decisión |

Cada archivo arranca con un bloque `POR QUÉ`: qué problema resuelve y qué
criterio del Excel lo exige. Eso es lo que un `ALTER TABLE` suelto no deja
registrado.

Después de aplicar cada uno: `npm run db:dump` y commit.

---

## 13. Testing

Sin acceso a la base, empezar por lo que no la necesita — y que además es donde están los bugs caros:

**Funciones puras** (`node:test` o Vitest, sin infraestructura):
- `calcularTotales` — descuento 0, descuento 100, redondeo de centavos
- `calcularEstado` — sin `stock_critico`, justo en el umbral, por debajo
- `puedeTransicionar` — desde estado final, transición inválida
- `signoDe`, `validarOrigenPorTipo`

**Integración** (contra la Postgres de Docker), los caminos donde una transacción mal hecha corrompe datos:
- Egreso mayor al stock → rechaza y **no escribe nada**
- Movimiento sin ficha para uno de N artículos → rechaza el movimiento **completo**
- Transferencia → mueve las dos puntas o ninguna
- CUIT duplicado entre activos → 409; mismo CUIT con el anterior inactivo → **permitido**
- Dos movimientos concurrentes sobre la misma ficha → sin stock negativo, sin deadlock

No hace falta cobertura alta. Hacen falta estos casos.

---

## 14. Checklist por endpoint

Antes de dar un endpoint por terminado:

- [ ] Input validado con schema (422 con `campo` señalado)
- [ ] Sesión resuelta; `usuario_id` **de la sesión**, no del body
- [ ] Reglas del criterio de aceptación en el **service**, no en la UI
- [ ] Operación multi-tabla en `withTransaction`
- [ ] `withAuditUser` llamado si escribe
- [ ] Auditoría verificable: `SELECT * FROM auditoria ORDER BY id DESC LIMIT 1`
- [ ] Respuesta con el shape exacto del módulo (§7 — ojo con camelCase vs snake_case)
- [ ] Relaciones resueltas por JOIN, no con N+1
- [ ] Probado el camino de error, no solo el feliz
- [ ] Comentario `// BACKEND:` correspondiente eliminado
- [ ] `npm run lint` + `tsc --noEmit` en verde

---

## 15. Recomendaciones

**Hacer:**
1. **Vertical slice primero.** Proveedores completo (migración → repo → service → endpoint → front conectado) antes de empezar el segundo módulo. Da el molde y valida las decisiones con el módulo más simple.
2. **`docker compose up` hoy.** Es lo que desbloquea todo sin esperar el acceso.
3. **Pedir el acceso a la base ya**, y mientras tanto tratar `0001_baseline.sql` como hipótesis.
4. **Los índices `UNIQUE` parciales antes que las validaciones de app.** La validación previa da el mensaje lindo; el índice es lo que garantiza la regla bajo concurrencia.
5. **Registrar en `docs/errores-comunes.md`** con `/error` lo que salga mal. El log existe y está vacío.
6. **Actualizar `AGENTS.md`** con la sección de backend: hoy dice "SQL lo maneja el equipo de back" sin ninguna regla.

**No hacer:**
1. **Lógica de negocio en `route.ts`.** Se duplica en cuanto dos rutas necesitan la misma regla (`movimientos-stock` y `transferencias` ya son el caso).
2. **Confiar en un número del front.** Totales, estados y números de documento se calculan en el server.
3. **`stock_actual` por fuera del service de movimientos.** Es el invariante central de HU-STK-02: *"se actualiza exclusivamente mediante los movimientos registrados"*.
4. **`SELECT *` en repos.** Columnas explícitas: una columna nueva no debería cambiar una respuesta de API sin que nadie lo note.
5. **N+1 en los listados.** Por eso `formasPagoDe(ids: number[])` toma un array.
6. **`DELETE`.** Todas las bajas del Sprint 1 son lógicas.
7. **Filtrar el error de Postgres al cliente.** Un `23505` se traduce a mensaje de dominio; el detalle va al log del server.

---

## 16. Orden de trabajo

| # | Bloque | Depende de | Entregable |
|---|---|---|---|
| 1 | Docker + baseline + `0002`–`0006` + `lib/` completo + stub de sesión | — | migraciones corriendo en local, `withRoute` andando |
| 2 | **Proveedores end-to-end** | 1 | el molde validado + `/proveedores` conectado |
| 3 | Artículos + `0007` | 2 | `/articulos` conectado |
| 4 | Stock (depósitos + fichas) + `0003` | 3 | `/stock` conectado |
| 5 | **Movimientos** + `0008` | 4 | `/movimientos-stock` + transferencias |
| 6 | Compras + `0009` | 5 | `/ordenes-compra` conectado |
| 7 | Cierre: lint, `tsc`, barrido de `// BACKEND:`, `db:reset`, DER final | 6 | demo reproducible |

El bloque 5 es el más riesgoso (transacciones, locks, concurrencia): conviene atacarlo con tiempo por delante, no el último día.

---

## 17. Lo que sigue pendiente

**Bloqueantes suaves** (se puede avanzar asumiendo, pero conviene cerrarlos):
1. **`articulo.imagen`**: ¿archivo en disco del server, base64 en la BD, o un servicio externo? Recomiendo carpeta local + `imagen_url`, que es lo más simple para la demo.
2. **Notificación de stock crítico**: HU-STK-02 dice *"notificación automática"* sin decir canal. Recomiendo aviso in-app (el front ya tiene `AlertaReposicionModal`), y dejar el email para Sprint 2.
3. **¿Se puede editar una OC ya enviada?** Asumo que no (solo en `Pendiente`) hasta que digan lo contrario.
4. **¿Un movimiento se puede anular?** Asumo que no en Sprint 1 — y si se agrega, por contra-movimiento, nunca por `DELETE`.

**Para el acta del sprint** (no técnico, pero hay que decirlo):
- HU-COMP-01 no se implementa (−3 PF).
- El criterio de comparación de cotizaciones de HU-COMP-02 **queda sin cubrir** (D-C).
- HU-PROV-01 entra formalmente al Sprint 1 (+5 PF).
- Depósito = Sucursal es deuda técnica con punto de quiebre conocido en HU-SUC-01 (D-B).

**Cuando haya acceso a la base:** correr las queries de [`AJUSTES-DER.md`](AJUSTES-DER.md) §6 y diffear contra `0001_baseline.sql`.
