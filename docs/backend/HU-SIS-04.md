# HU-SIS-04 · Inicio y Cierre de Sesión

> **Estado**: backend implementado y front conectado.
> **Falta para probarlo**: aplicar `db/correcciones/15_login.sql` y configurar
> `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SESSION_SECRET` (ver `.env.example`).

---

## Los 5 criterios y dónde se cumple cada uno

| # | Criterio | Dónde | Estado |
|---|---|---|---|
| 1 | Login con email y contraseña; error **genérico** si son inválidas | `CredencialesInvalidasError` | ✅ |
| 2 | 3 fallos → bloqueo 15 min, informando tiempo restante | `auth.service.ts` + `usuario.intentos_fallidos` / `bloqueado_hasta` | ✅ |
| 3 | Cierre explícito, **invalidando el token activo** | `destroySession()` → `invalidarToken()` | ✅ |
| 4 | 2FA para Administrador y Gerente | — | ⏸️ **fuera de esta entrega** (ver abajo) |
| 5 | Bitácora de cada intento con usuario, fecha, hora e IP | `auditoria_sesion` | ✅ |

---

## Por qué Supabase Auth y no una columna `password_hash`

No fue una elección de diseño mía: **la base ya estaba comprometida con esa
decisión** antes de empezar, y en tres lugares distintos.

```sql
usuario.auth_id uuid UNIQUE  →  FK a auth.users(id) ON DELETE CASCADE
fn handle_new_user()         →  crea la fila de `usuario` cuando alguien
                                se registra en auth.users
COMMENT ON usuario.bloqueado_hasta:
  'HU-SIS-04: si es futuro, el login se rechaza antes de invocar Supabase Auth'
```

Ese último comentario lo escribió la DBA y dice literalmente cuál es el flujo.
Agregarle un `password_hash` a `usuario` habría dejado **dos lugares donde vive
la misma credencial**, y la pregunta "¿cuál es la contraseña de verdad?" sin
respuesta.

**Y no se instaló `@supabase/supabase-js`.** De todo el SDK hacían falta dos
llamadas HTTP, y la API de GoTrue (el servicio de auth de Supabase) es HTTP
plano. Con `fetch` alcanza, el proyecto no suma dos dependencias, y sobre todo
no entra un cliente que trae su propio manejo de sesión y competiría con nuestra
cookie por ser la fuente de verdad.

Todo eso vive en un solo archivo, `src/lib/auth/gotrue.ts`, que responde una
única pregunta: *¿esta contraseña es la de este email?* No cuenta intentos, no
bloquea, no escribe bitácora. El día que se cambie de proveedor de auth, se
reescribe ese archivo y nada más.

---

## El flujo, y por qué está partido en dos transacciones

```
1. leer usuario · ¿bloqueado?        ← transacción corta
2. preguntar la contraseña a Supabase ← HTTP, SIN transacción abierta
3. contar el resultado + bitácora    ← transacción corta
```

Meter todo en una sola transacción sería más simple de leer, pero mantendría
abierta la transacción —y el lock de la fila del usuario— durante los hasta 8
segundos que puede tardar Supabase. Con dos personas entrando a la vez ya se
nota; con el servicio degradado, se cae la aplicación.

El riesgo de partirlo es que dos intentos simultáneos se pisen al contar. Se
resuelve en el paso 3 sumando **en la base**:

```sql
UPDATE usuario SET intentos_fallidos = LEAST(intentos_fallidos + 1, 3) ...
```

No es `leer → sumar en JS → escribir`. Si lo fuera, dos intentos leerían el mismo
número y el segundo pisaría al primero: tres contraseñas mal tecleadas en
paralelo contarían como una. Es el mismo *lost update* que tenía el trigger de
stock viejo.

**El `LEAST(..., 3)` tampoco es cosmético.** La base tiene
`ck_usuario_intentos_fallidos CHECK (intentos_fallidos BETWEEN 0 AND 3)`. Sin el
techo, dos fallos concurrentes partiendo de 2 dejarían uno en 3 y el otro en 4 →
violación del CHECK → **500 en el login**.

---

## Cuatro decisiones que no se ven en el código

### 1. Siempre se llama a Supabase, incluso si el email no existe

Cuando el email no está en `usuario`, ya sabemos que el login falla. Igual se
hace la llamada.

No es un descuido: si para un email inexistente contestáramos al instante y para
uno existente tardáramos los ~300 ms de la llamada, **la diferencia de tiempo
diría cuáles son los emails reales**. El mensaje genérico del criterio se
cuidaría en el texto y se filtraría por el reloj.

### 2. El error no dice cuántos intentos quedan

La pantalla mostraba "Intentos restantes: 2". Se quitó.

"Te queda 1 intento" **confirma que el email existe** — nadie recibe ese mensaje
por una dirección inventada. Es la misma fuga que el criterio quiere evitar, por
la puerta de atrás. El número queda en `auditoria_sesion.detalle`, que es donde
sirve: para auditar, no para orientar a quien está probando.

Por lo mismo, `CredencialesInvalidasError` **no lleva `campo`**: marcar en rojo
el input de la contraseña diría, de hecho, que el email estaba bien.

### 3. Un intento durante el bloqueo se registra pero no suma

Si sumara, insistir estiraría el castigo para siempre y la cuenta no se
desbloquearía nunca.

Y al revés: cuando el bloqueo vence, el contador se limpia **antes** de validar.
Sin eso el usuario sale del bloqueo con 3 intentos ya gastados y el primer error
de tipeo lo vuelve a bloquear 15 minutos.

### 4. Si Supabase está caído, no cuenta como intento fallido

`ServicioAuthNoDisponibleError` (503) está separado de las credenciales
inválidas por una razón concreta: si una caída del servicio de auth contara como
fallo, **bloquearía por 15 minutos a todo el que intente entrar mientras dura**.

Tampoco va a `auditoria_sesion`: esa es la bitácora de intentos de personas, no
de fallas de infraestructura. Eso va al log del server.

---

## La cookie

`src/lib/auth/cookie.ts` — `<payload base64url>.<HMAC-SHA256 base64url>`,
httpOnly, `sameSite=lax`, `secure` en producción, 8 horas.

**Por qué firmada y no solo httpOnly**: httpOnly evita que el JavaScript de la
página la lea; **no** evita que el usuario la edite. El navegador es suyo y la
cookie es texto que él controla. El stub del Sprint 1 guardaba el id en texto
plano: cambiar `4` por `1` era hacerse administrador. Servía para desarrollo y no
para esto.

**Por qué HMAC y no un JWT propio**: un JWT tiene sentido cuando el token cruza
sistemas que no comparten el secreto. Acá la firma la pone y la valida el mismo
proceso. `node:crypto` hace lo mismo sin dependencias y sin la lista de errores
clásicos de JWT (`alg=none`, confusión HS/RS).

La comparación de firmas usa `timingSafeEqual`, no `===`: con `===` el tiempo que
tarda en cortar filtra en qué carácter difiere la firma.

Guarda además el access token de Supabase, que es lo que permite cumplir el
criterio 3: **borrar la cookie no invalida nada**, el token seguiría sirviendo
contra la API de Supabase hasta expirar. `POST /auth/v1/logout` lo revoca del
lado del servidor.

---

## Qué cambió en el front, y por qué tenía que cambiar

`src/context/AuthContext.tsx` era la autoridad del login: buscaba el usuario en
el array de `src/data/usuarios.ts`, comparaba la contraseña en texto plano,
contaba los intentos en un `useRef` y programaba el desbloqueo con un
`setTimeout`.

Nada de eso podía sobrevivir a un login real, y no por prolijidad:

| Lo que hacía | Por qué no servía |
|---|---|
| contraseñas en `src/data/usuarios.ts` | estaban **en el bundle que baja el navegador**: cualquiera con F12 leía las 4 contraseñas del sistema |
| contador en un `useRef` | vivía en memoria de la pestaña: **recargar la página lo reseteaba**, así que los "3 intentos" eran 3 por recarga, o sea infinitos |
| desbloqueo con `setTimeout` | **moría al cerrar la pestaña**: el bloqueo duraba lo que durara la pestaña abierta |
| `if (rol.nombre === "Administrador")` para el 2FA | una regla de seguridad decidida en el navegador: se salteaba editando una variable |

Ahora las cuatro las decide el backend contra la base. El contexto pasó de ser la
regla a mostrar lo que contesta la API.

**La forma del estado no cambió**: `AuthState` mantiene los mismos `status`, así
que `LoginForm`, `Sidebar`, `BlockedOverlay` y `ConfiguracionForm` siguen
funcionando. Dos diferencias:

- `error` lleva `{ mensaje }` en vez de `{ intentosRestantes }` (decisión 2).
- se agregó `status: "verificando"` para el arranque: la cookie es httpOnly, así
  que al cargar la página hay que **preguntarle a la API** si ya hay sesión. Sin
  eso, recargar cualquier pantalla te dejaría "sin sesión" en la interfaz aunque
  la sesión esté viva en el servidor.

`BlockedOverlay` ya recibía `bloqueadoHasta` como epoch ms y hace su cuenta
regresiva sola: no se tocó. El valor ahora **viene del servidor** en vez de
calcularse como `Date.now() + 15min`, así que si el usuario recarga a los 10
minutos el contador arranca en 5 y no en 15 de nuevo.

---

## Lo que queda afuera

### 2FA (criterio 4)

El criterio lo marca **"(para el final)"**, y necesita cosas que son su propia
historia: tabla de secretos TOTP, códigos de recuperación, y una pantalla de
enrolamiento (mostrar el QR una vez, y qué pasa si el empleado pierde el
teléfono).

`SesionApi.requiere2FA` **ya viaja en la respuesta**, hoy siempre en `false`.
Cuando se implemente, el front no cambia de forma: cambia de valor. Y
`verificar2FA()` devuelve `false` en vez de aceptar cualquier código: sin backend
no hay nada que validar, y aceptar todo sería peor que rechazar todo.

### Cambiar la contraseña desde Configuración

`ConfiguracionForm` confirmaba los cambios comparando lo tecleado contra
`usuario.password`. Ese campo ahora llega vacío — es el punto de esta HU.

**Consecuencia concreta: guardar el perfil y cambiar la contraseña quedan
bloqueados**, con un mensaje que lo dice (`VERIFICACION_PENDIENTE`) en vez de
mentir con "la contraseña es incorrecta", que mandaría al usuario a probar
contraseñas para siempre.

Es alcance de **HU-SIS-05** (que ya tiene su brief en `docs/briefs/`). No se
borró nada de la pantalla: cuando exista el endpoint, se reemplaza esa
comparación por la llamada y el resto del flujo ya está escrito.

### Recuperar contraseña

`LoginForm` tiene la vista "olvidaste tu contraseña" con un `setTimeout`
simulado. No está en los criterios de HU-SIS-04. Supabase Auth lo resuelve con
`POST /auth/v1/recover`, así que el día que entre al alcance es un endpoint corto.

---

## Cómo probarlo

### Antes de empezar

1. **Aplicar `db/correcciones/15_login.sql`.** Sin esto, `auditoria_sesion.id` no
   tiene `DEFAULT nextval()` y **todo intento de login falla** al escribir la
   bitácora.
2. En `.env.local`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_SECRET`.
3. **Comentar `SESSION_USUARIO_DNI`.** Mientras esté, `requireSession()` nunca
   devuelve 401, el front nunca redirige a `/login` y el login parece no hacer
   nada. No es un bug, es esa variable.
4. Crear el usuario en **Supabase → Authentication → Users** (ahí se le pone la
   contraseña) y verificar que `usuario.auth_id` sea ese uuid.

### Los casos que hay que ver

| Caso | Esperado |
|---|---|
| Email y contraseña correctos | 200, cookie puesta, redirige a `/articulos` |
| Contraseña incorrecta | 401 `CREDENCIALES_INVALIDAS`, mensaje genérico, **sin** "intentos restantes" |
| Email inexistente | **el mismo** 401 y el mismo mensaje que el caso anterior |
| 3 contraseñas incorrectas seguidas | 423 `CUENTA_BLOQUEADA` + `BlockedOverlay` con la cuenta regresiva |
| 4.º intento durante el bloqueo | sigue 423, y el contador **no se reinicia** |
| Recargar la página durante el bloqueo | el contador sigue donde iba (no vuelve a 15:00) |
| Cerrar sesión | 204, cookie borrada, y el access token deja de servir contra Supabase |
| Recargar una pantalla con sesión abierta | sigue logueado (lo resuelve `GET /api/auth/sesion`) |
| Inactivar al usuario con la sesión abierta | la próxima request da 401 |

### La bitácora

```sql
SELECT a.id, a.evento, a.fecha_hora, a.ip_origen, a.detalle,
       u.email
FROM auditoria_sesion a
LEFT JOIN usuario u ON u.id = a.usuario_id
ORDER BY a.id DESC
LIMIT 20;
```

Qué mirar:

- los tres intentos fallidos + **una fila `bloqueado` aparte** (son dos hechos
  distintos, y el criterio los nombra separados)
- `usuario_id` en **NULL** en el intento con email inexistente, con el email en
  `detalle`
- `ip_origen` en **NULL** con `next dev`: no hay proxy que la informe, y la
  columna es nullable justo por eso. No es un bug

Y que la bitácora de negocio **no** se llenó de intentos de login:

```sql
SELECT count(*) FROM auditoria WHERE tabla = 'usuario';
```

Antes de la corrección 15, cada contraseña mal tecleada escribía acá una fila con
el snapshot completo del usuario, porque `trg_auditoria_usuario` era
`AFTER INSERT OR DELETE OR UPDATE` y contar un intento es un UPDATE. La
corrección parte el trigger en dos y saltea los UPDATE que solo tocan
`intentos_fallidos` / `bloqueado_hasta`.

---

## Archivos

| Archivo | Qué hace |
|---|---|
| `db/correcciones/15_login.sql` | 🔴 **aplicar primero** · secuencia de `auditoria_sesion`, trigger partido, COMMENT corregidos |
| `src/lib/auth/gotrue.ts` | ¿es esta la contraseña de este email? + revocar el token |
| `src/lib/auth/cookie.ts` | firmar / verificar / escribir / borrar la cookie |
| `src/lib/auth/session.ts` | `getSession()` / `requireSession()` / `destroySession()` — reescrito |
| `src/lib/http/ip.ts` | IP de origen desde los headers del proxy |
| `src/modules/auth/auth.repo.ts` | contador, bloqueo, bitácora |
| `src/modules/auth/auth.service.ts` | las reglas de los 5 criterios |
| `src/app/api/auth/login/route.ts` | `POST` — público |
| `src/app/api/auth/logout/route.ts` | `POST` — requiere sesión |
| `src/app/api/auth/sesion/route.ts` | `GET` — devuelve `{ sesion: null }` sin error |
| `src/context/AuthContext.tsx` | conectado a la API; ya no decide nada |
