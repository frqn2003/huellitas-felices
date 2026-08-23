# Entender el backend — guía de arranque

> **Para quién:** las dos personas que van a hacer el backend, viniendo de haber
> hecho el front. Asume que sabés TypeScript y React, y **no** asume que sabés
> qué es una transacción, un repositorio o un índice parcial.
>
> **Leelo antes que los otros tres docs.** `GUIA-IMPLEMENTACION.md` es una
> referencia: te dice *qué* escribir. Este te explica *por qué*, para que la
> referencia se entienda.
>
> Todos los ejemplos son código real del repo. Abrilos al lado mientras leés.

---

## 1. Qué estamos haciendo, en una frase

El front ya funciona: las 6 pantallas andan, con los datos escritos a mano en
`src/data/*.ts`. **El backend reemplaza esos archivos por datos reales de una
base Postgres**, y agrega las reglas que un archivo hardcodeado no puede tener:
que no haya dos proveedores con el mismo CUIT, que un egreso no deje el stock en
negativo, que cada cambio quede registrado con quién lo hizo.

Eso es todo. Cada endpoint que escribas está reemplazando un array de
`src/data/`, y cada regla que programes sale de un criterio de aceptación del
Excel.

**Cómo saber qué falta:**

```bash
grep -rn "BACKEND:" src/
```

Son ~85 comentarios que el equipo de diseño dejó marcando cada punto de
integración, con el endpoint y qué reemplazar. Cada uno que resuelvas, borralo.
Cuando no quede ninguno, el backend está terminado.

---

## 2. Cómo arrancar (10 minutos)

```bash
docker compose up -d      # levanta Postgres en el puerto 5432
cp .env.example .env.local
npm install
npm run db:reset          # crea las tablas y carga los datos
npm run dev
```

Y probá que responda:

```bash
curl http://localhost:3000/api/proveedores
```

Si te devuelve un JSON con 4 proveedores, funciona todo: la base, las
migraciones, el pool de conexiones y las cuatro capas.

> Si `docker` no existe en tu máquina, instalá Docker Desktop. Es la única
> dependencia externa del proyecto.
>
> ⚠️ **Ojo:** las migraciones nunca se ejecutaron todavía (se escribieron en una
> máquina sin Docker). Es muy posible que la primera corrida tire algún error.
> Eso es normal y es información: leé el mensaje, arreglá el `.sql`, `db:reset`
> de nuevo.

---

## 3. Seguir un request de punta a punta

Esta es la parte importante del documento. Vamos a seguir **un solo request**
por los cinco archivos que toca. Si entendés este recorrido, entendés el
proyecto entero, porque los otros 24 endpoints son el mismo molde.

**El request:** el usuario llena el formulario de proveedor nuevo y aprieta
Guardar. El front manda:

```
POST /api/proveedores
{ "razonSocial": "Distribuidora Sur", "cuit": "30-12345678-9", "formaPagoIds": [1, 3] }
```

### Paso 1 · El route handler recibe — `src/app/api/proveedores/route.ts`

```ts
export const POST = withRoute(async ({ req, session }) => {
  const input = await parseBody(req, crearProveedorSchema);
  return created(await service.crear(input, session.usuarioId));
});
```

Dos líneas. Eso es todo lo que hace un handler: **traducir de HTTP a llamada de
función**. No hay SQL, no hay reglas, no hay `try/catch`.

Tres cosas que pasan acá y conviene mirar de cerca:

- **`withRoute`** envuelve todo (`src/lib/http/handler.ts`). Resuelve la sesión y
  captura cualquier error. Por eso el handler no tiene `try/catch`: si algo
  explota tres capas más abajo, `withRoute` lo agarra.
- **`parseBody`** valida contra el schema. Si `cuit` viene con formato inválido,
  corta acá con un 422 y nunca se llama al service.
- **`session.usuarioId`** — mirá que el `usuarioId` **no sale del body**. Sale de
  la sesión. Si saliera del body, cualquiera podría mandar el id de otro y
  falsear la auditoría.

### Paso 2 · La validación de forma — `proveedor.schema.ts`

```ts
cuit: z.string().trim().regex(/^\d{2}-?\d{8}-?\d$/, "El CUIT debe tener el formato XX-XXXXXXXX-X."),
```

Un schema (usamos **zod**) valida **forma**: que el campo exista, que sea string,
que tenga el formato correcto, que no pase de 150 caracteres.

**Lo que un schema NO puede validar:** que el CUIT no esté repetido. Para eso hay
que ir a preguntarle a la base, y un schema no habla con la base. Esa regla vive
en el service.

Es la distinción clave: **forma → schema. Reglas que necesitan datos → service.**

### Paso 3 · Las reglas — `proveedor.service.ts`

Acá está el cerebro:

```ts
export async function crear(input, usuarioId) {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const duplicado = await repo.findActivoByCuit(input.cuit);
    if (duplicado) {
      throw new ConflictError("CUIT_DUPLICADO", `Ya existe un proveedor activo...`, "cuit");
    }

    const row = await repo.insert(input, client);
    await repo.reemplazarFormasPago(row.id, input.formaPagoIds, client);

    return mapper.toApi(row, await nombresFormasPago(row.id, client));
  });
}
```

Leelo de arriba a abajo: se lee como la descripción del criterio de aceptación.
Eso es señal de que está en la capa correcta.

Fijate que en este archivo **no aparece la palabra `Request`, ni `Response`, ni
un número 404**. El service no sabe que existe HTTP. Por eso se puede testear
llamando `crear({...}, 1)` directo, sin levantar un servidor.

### Paso 4 · El SQL — `proveedor.repo.ts`

```ts
export async function insert(data, client) {
  const { rows } = await client.query(
    `INSERT INTO proveedor (razon_social, cuit, ...) VALUES ($1, $2, ...) RETURNING ...`,
    [data.razonSocial, data.cuit, ...],
  );
  return rows[0];
}
```

El repo hace **una sola cosa: hablar SQL**. No valida, no decide, no abre
transacciones. Recibe datos, ejecuta, devuelve filas crudas.

### Paso 5 · La traducción de vuelta — `proveedor.mapper.ts`

La base devuelve esto:

```js
{ id: 5, razon_social: "Distribuidora Sur", estado: "activo", plazo_entrega_dias: "7" }
```

El front espera esto:

```js
{ id: 5, razonSocial: "Distribuidora Sur", estado: "Activo", plazoEntregaDias: 7 }
```

Tres diferencias, y ninguna es cosmética:

1. **`razon_social` → `razonSocial`.** Postgres usa `snake_case` por convención,
   TypeScript usa `camelCase`.
2. **`"activo"` → `"Activo"`.** El enum de la base es minúscula; el front declara
   `EstadoProveedor = "Activo" | "Inactivo"` y lo muestra tal cual. Sin traducir,
   el badge de estado sale vacío.
3. **`"7"` → `7`.** El driver `pg` devuelve los `decimal` como **string**, para no
   perder precisión (los float binarios no representan bien los decimales — por
   eso la plata nunca se guarda en `float`). Si ese string llega al front,
   `plazoEntregaDias` es `"7"` y cualquier comparación numérica falla en silencio.

Por eso existe el mapper: es la aduana entre los dos mundos.

> **Detalle que te va a morder:** el front **no es consistente**. Proveedores,
> Stock, Artículos y Movimientos usan `camelCase`, pero Órdenes de Compra usa
> `snake_case` con relaciones prefijadas (`proveedor_id`, `_proveedor`,
> `_detalles`). Cada mapper copia el estilo de **su** módulo. Es feo, pero
> cambiarlo es trabajo del front.

### El recorrido completo

```
POST /api/proveedores
  │
  ├─ withRoute ──────────── resuelve sesión, captura errores
  ├─ parseBody + schema ─── ¿la forma está bien?      → 422 si no
  ├─ service ────────────── ¿las reglas se cumplen?   → 409 si no
  │    ├─ withTransaction ─ abre transacción
  │    ├─ withAuditUser ─── "el responsable es el usuario 3"
  │    ├─ repo.findActivoByCuit
  │    ├─ repo.insert
  │    └─ repo.reemplazarFormasPago
  ├─ mapper ─────────────── fila de BD → shape del front
  └─ created(...) ───────── 201 + JSON
```

---

## 4. ¿Por qué no todo en un archivo?

Pregunta legítima. La respuesta no es "porque queda más ordenado" — es concreta.

**Caso real del Sprint 1.** Registrar un movimiento de stock necesita:

1. validar que exista ficha de stock activa para cada artículo,
2. validar que ningún egreso deje el stock negativo,
3. insertar cabecera y detalle,
4. actualizar el stock de cada ficha,
5. calcular las alertas de reposición.

Ahora: **la transferencia entre depósitos necesita exactamente lo mismo, dos
veces** (un egreso en origen, un ingreso en destino). Y en el Sprint 2, la
recepción de mercadería (HU-COMP-03) va a generar movimientos de ingreso, así que
lo va a necesitar por tercera vez.

Si esa lógica vive en `app/api/movimientos-stock/route.ts`, la copiás a
`app/api/transferencias/route.ts` y después a `app/api/recepciones/route.ts`.
Tres copias. Encontrás un bug en la validación de stock negativo y tenés que
arreglarlo en tres lugares — y te vas a olvidar de uno.

Con un service, las tres rutas llaman a `movimientoService.registrar()`. Una
sola copia de la regla.

**La otra razón es testear.** Un service se prueba llamando a la función. Si la
lógica está en un route handler, para probarla hay que levantar el servidor,
armar un `Request`, parsear la respuesta. Diez veces más trabajo para el mismo
test.

---

## 5. Los conceptos que hay que entender

Cada uno con el caso concreto del proyecto donde importa.

### Transacción

Un grupo de operaciones que pasan **todas o ninguna**.

**Por qué acá:** registrar un movimiento inserta la cabecera, inserta N líneas de
detalle y actualiza N fichas de stock. Si el proceso muere después de insertar el
movimiento pero antes de actualizar el stock, la base queda mintiendo: hay un
movimiento registrado que nunca movió nada. Y el stock es justamente lo que este
sistema tiene que decir bien.

```ts
await withTransaction(async (client) => {
  // todo lo de acá adentro se confirma junto (COMMIT)
  // si algo lanza, se deshace todo (ROLLBACK)
});
```

Regla del proyecto: **si escribe en más de una tabla, va en una transacción.**

Detalle importante: adentro de la transacción hay que usar el `client` que te
pasa, no el pool. Si usás el pool, esa query va por **otra conexión** y no ve lo
que la transacción todavía no confirmó. Es exactamente por eso que existe el
helper `nombresFormasPago(id, client)` en el service de proveedores: si leyera
por el pool, devolvería el array vacío.

### Pool de conexiones

Abrir una conexión a Postgres es caro (~30ms). Un *pool* mantiene 10 abiertas y
las reparte entre requests.

**Por qué acá:** mirá `src/lib/db/client.ts` — el pool se guarda en `globalThis`.
Sin eso, el hot reload de `next dev` crearía un pool nuevo en cada cambio de
archivo, y en media hora de trabajo te quedás sin conexiones disponibles.

### SQL parametrizado (y por qué nunca se concatena)

```ts
// ✅ SIEMPRE
client.query("SELECT * FROM proveedor WHERE cuit = $1", [cuit]);

// ❌ NUNCA
client.query(`SELECT * FROM proveedor WHERE cuit = '${cuit}'`);
```

Con la segunda forma, si alguien manda como CUIT el texto
`' OR '1'='1'; DROP TABLE proveedor; --`, Postgres lo ejecuta como SQL. Eso es
**inyección SQL**.

Con `$1`, el valor viaja aparte de la consulta y Postgres nunca lo interpreta
como código. Da lo mismo qué manden.

En `findAll()` del repo de proveedores vas a ver que el `WHERE` se arma
dinámicamente según los filtros — pero los **valores** siempre van por el array
de params. Eso es correcto; lo que nunca se interpola es el dato.

### Índice único parcial

Un `UNIQUE` que solo aplica a algunas filas.

**Por qué acá:** el criterio de HU-PROV-01 dice que el CUIT no se repita **entre
proveedores activos**. Con un `UNIQUE` común, si das de baja un proveedor por
error nunca más podés volver a usar ese CUIT. Con el índice parcial:

```sql
CREATE UNIQUE INDEX uq_proveedor_cuit_activo ON proveedor (cuit) WHERE estado = 'activo';
```

Ahora podés tener el CUIT repetido siempre que solo uno esté activo. Ese `WHERE`
es la traducción literal de "entre activos".

**Y por qué existe además del chequeo en el service:** el service chequea antes
para dar el mensaje lindo con el campo señalado. Pero si dos personas guardan al
mismo tiempo, los dos chequeos pasan (todavía no hay duplicado) y los dos
insertan. El índice es lo que garantiza la regla de verdad; el service es lo que
la explica bien. Van los dos.

### Race condition y `FOR UPDATE`

Dos requests simultáneos leyendo y escribiendo lo mismo.

**Por qué acá:** hay 10 unidades en stock. Dos personas registran un egreso de 8
al mismo tiempo. Los dos leen "hay 10", los dos validan "8 ≤ 10, OK", los dos
descuentan. Stock final: −6. Con un `CHECK` de no-negativo, una de las dos
operaciones explota; sin el `CHECK`, el inventario queda roto.

`SELECT ... FOR UPDATE` bloquea la fila: el segundo request espera a que el
primero termine, y cuando lee ya ve 2 y rechaza correctamente.

**La trampa:** si un movimiento bloquea las fichas 5 y 9, y otro bloquea 9 y 5,
cada uno espera al otro para siempre — **deadlock**. Se evita bloqueando siempre
en el mismo orden (por `id` ascendente). Está anotado en la spec del service de
movimientos.

### Trigger

Código que Postgres ejecuta solo, cuando pasa algo en una tabla.

**Por qué acá:** la auditoría. Las 5 HU del sprint piden "registra en bitácora
cada alta, modificación y baja". Se podría escribir a mano en cada endpoint,
pero: (a) el día que agregues un endpoint nuevo te lo vas a olvidar, y (b)
HU-SIS-06 exige que nadie pueda editar ni borrar entradas — eso se garantiza en
el motor, no confiando en el código.

El trigger está en `db/migrations/0005_auditoria.sql` y sirve para cualquier
tabla. Lo único que la app tiene que hacer es decirle **quién** está operando:

```ts
await withAuditUser(client, usuarioId);   // primera línea de toda transacción que escriba
```

Eso guarda el usuario en una variable de sesión de Postgres que el trigger lee.
Si te lo olvidás, la operación funciona igual pero la fila de auditoría queda con
`usuario_id` NULL — o sea, un registro que no sirve para auditar. Es el error
más fácil de cometer en este proyecto.

### El problema N+1

Traés 50 proveedores y después, por cada uno, consultás sus formas de pago: 51
consultas.

**Cómo se evita acá** — mirá la firma en el repo:

```ts
formasPagoDe(proveedorIds: number[]): Promise<Map<number, string[]>>
```

Recibe un **array**, no un id. Una sola consulta con `WHERE id = ANY($1)`, y el
resultado se agrupa en un `Map`. Total: 2 consultas en vez de 51.

Cada vez que escribas un `.map()` con un `await` adentro, pará y preguntate si no
estás haciendo N+1.

### Secuencia vs `MAX(id) + 1`

Para generar `MOV-0001`, `OC-0001`.

**Por qué no `MAX+1`:** dos requests simultáneos leen el mismo máximo y generan
el mismo número. Una secuencia de Postgres (`nextval`) garantiza que cada
llamada devuelva un valor distinto, incluso en paralelo.

### Migración

Un archivo `.sql` con un cambio de estructura, que se aplica una sola vez y queda
registrado.

**Por qué no tocar la base a mano:** si creás una tabla desde una consola, tu
compañero no la tiene. Con migraciones, `npm run db:migrate` pone cualquier
máquina al día, y `db:reset` reconstruye todo desde cero — que es lo que querés
antes de una demo.

Reglas: **una migración ya corrida no se edita nunca** (si algo salió mal, se
agrega otra), y siempre probá con `db:reset` antes de commitear.

---

## 6. Cómo agregar un módulo nuevo

La receta. Copiá `proveedores` y adaptá.

**1. La migración**, si hace falta cambiar la base. `db/migrations/00XX_lo_que_sea.sql`.
Arrancá con un comentario `POR QUÉ` explicando qué problema resuelve y qué
criterio de aceptación lo pide.

**2. `<modulo>.types.ts`** — el tipo `*Row` (lo que devuelve Postgres,
`snake_case`) y el tipo de filtros. El shape público **no** se define acá: se
importa de `src/data/` del front.

**3. `<modulo>.schema.ts`** — zod. Solo validación de forma.

**4. `<modulo>.repo.ts`** — SQL. Columnas explícitas, nunca `SELECT *`. Las
funciones de escritura reciben `client`.

**5. `<modulo>.service.ts`** — las reglas. Andá al Excel, leé los criterios de
aceptación de la HU y traducí uno por uno. Cada criterio que diga "valida que..."
es un `if` con su error.

**6. `<modulo>.mapper.ts`** — fila → shape del front. Importá el tipo del front
para que si cambia, deje de compilar.

**7. `src/app/api/<recurso>/route.ts`** — el handler flaco.

**8. Conectá la pantalla** — borrá el import de `src/data/<modulo>.ts`, poné el
`fetch`, borrá `SIMULAR_VACIO` y `SIMULAR_ERROR`, borrá el comentario
`// BACKEND:` resuelto.

**9. Verificá** — `npm run lint && npm run typecheck`, y probá el camino de error,
no solo el feliz.

### Cuándo NO hace falta todo esto

Un catálogo de solo lectura sin ninguna regla (ver `/api/formas-pago`): la query
puede vivir en el handler. Repo + service + mapper para devolver 4 filas son 3
archivos que solo reenvían la llamada.

El límite: si necesita validar algo, decidir un error de dominio, tocar más de
una tabla o abrir una transacción, ya no es un catálogo y va con capas completas.

---

## 7. Probar sin tocar el front

No esperes a tener la pantalla conectada.

```bash
# Listar
curl http://localhost:3000/api/proveedores

# Crear
curl -X POST http://localhost:3000/api/proveedores \
  -H "Content-Type: application/json" \
  -d '{"razonSocial":"Prueba SA","cuit":"30-11111111-1","formaPagoIds":[1]}'

# Probar el error: mandá el MISMO cuit otra vez → tiene que dar 409 CUIT_DUPLICADO
```

Y verificá que la auditoría se escribió:

```sql
SELECT usuario_id, accion, entidad, entidad_id, fecha_hora
FROM auditoria ORDER BY id DESC LIMIT 5;
```

Si `usuario_id` viene NULL, te olvidaste el `withAuditUser`.

---

## 8. Los errores que van a cometer

Están ordenados por probabilidad. Todos los cometí escribiendo el módulo de
proveedores y las migraciones.

| Síntoma | Causa |
|---|---|
| La auditoría guarda `usuario_id` NULL | falta `withAuditUser(client, usuarioId)` al abrir la transacción |
| Insertás y la respuesta vuelve con el array de relaciones vacío | leíste por el pool en vez del `client` de la transacción: desde otra conexión, lo no-confirmado no se ve |
| El badge de estado sale vacío en la UI | el mapper no tradujo `'activo'` → `"Activo"` |
| Una comparación numérica falla sin error | `decimal` llegó como string; el mapper no lo convirtió |
| El listado tarda muchísimo | N+1: un `await` dentro de un `.map()` |
| `missing FROM-clause entry for table "v"` | en un JOIN, el `ON` referencia una tabla que se une después. La lista de `VALUES` va primero en el `FROM` |
| Un `CHECK` rechaza algo que el front manda | los strings no coinciden **exacto**, casi siempre por un acento (`"Cheque a 30 días"` ≠ `"Cheque a 30 dias"`) |
| El primer registro sale numerado `0002` | `setval` sin el tercer parámetro en `false` |
| `ALTER COLUMN ... SET NOT NULL` falla | hay filas con NULL; hay que hacer un `UPDATE` defensivo antes |

---

## 9. Vocabulario del proyecto

- **HU-XXX-NN** — Historia de Usuario del Excel. `HU-PROV-01` = Proveedores,
  `HU-STK-04` = Movimientos de Stock. Los **criterios de aceptación** de cada HU
  son la especificación: cada "valida que..." es código que tenés que escribir.
- **Baja lógica** — no se borra la fila, se cambia el estado a inactivo. **No hay
  `DELETE` en ningún módulo del Sprint 1.** El historial se conserva.
- **Formulario paramétrico** — el mismo formulario en 3 modos: INSERCIÓN,
  EDICIÓN, LECTURA. Del lado del back son POST, PUT y GET.
- **Cabecera-detalle** — una tabla "padre" con los datos del documento y una
  "hija" con las líneas. Un movimiento (cabecera) con N artículos (detalle).
- **D-A / D-B / D-C / D-D** — las 4 decisiones de diseño que el equipo cerró.
  Están en `README.md`. La que más te va a afectar es **D-B** (depósito =
  sucursal): el front todavía modela 1 sucursal : N depósitos.

---

## 10. Qué leer después

En este orden:

1. **`src/modules/proveedores/`** — los 5 archivos, de arriba a abajo. Es el
   módulo de referencia y los comentarios explican cada decisión.
2. **`GUIA-IMPLEMENTACION.md` §9** — los métodos que tiene que tener cada
   módulo. Ojo: §9.2 (proveedores) es el único que existe como código; el resto
   es especificación.
3. **`AJUSTES-DER.md`** — qué le falta a la base y por qué.
4. **El Excel, hoja "Sprint 1"** — los criterios de aceptación. Es la fuente de
   verdad de todo lo demás.

Y cuando algo salga mal, registralo con `/error` en
`docs/errores-comunes.md`. El log existe y está vacío: es para no tropezar dos
veces con la misma piedra.
