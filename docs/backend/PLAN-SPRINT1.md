# Plan de Backend — Sprint 1 (Huellitas Felices)

> **Estado:** propuesta para aprobar antes de escribir código.
> **Fuente:** `Backlog_y_Sprint1_Huellitas_Felices.xlsx` (hojas "Backlog Completo" y "Sprint 1") + front ya construido en `src/`.
> **Sprint 1:** 14/08/2026 → 27/08/2026 · 5 HU · 37 Puntos de Función.

> ⚠️ **Este doc se escribió antes de conocer el DER.** La base ya existe.
> **§4 (modelo de datos) y §7 (divergencias) quedan reemplazados por [`AJUSTES-DER.md`](AJUSTES-DER.md)**, que compara el DER real contra el contrato del front y lista qué corregir.
> Sigue vigente todo lo demás: alcance (§1), contrato de API (§5), reglas de negocio (§6), fases (§8), requisitos (§9) y DoD (§10).

---

## 1. Alcance del Sprint 1

Lo que dice la hoja "Sprint 1" del Excel, tal cual:

| ID | Título | PF | Estado del front | Ruta |
|---|---|---|---|---|
| HU-STK-01 | Alta, Edición y Baja de Artículos | 5 | ✅ hecho | `/articulos` |
| HU-STK-02 | Gestión de Depósitos y Fichas de Stock por Sucursal | 8 | ✅ hecho | `/stock` |
| HU-STK-04 | Registro de Movimientos de Stock | 8 | ✅ hecho | `/movimientos-stock` |
| HU-COMP-01 | Registro de Necesidad de Compra | 3 | ❌ **descartada** | — |
| HU-COMP-02 | Emisión de Orden de Compra | 13 | ✅ hecho | `/ordenes-compra`, `/cotizaciones` |

**HU-COMP-01 no se implementa.** El propio título en el Excel dice *"(no va, pasamos directo a la emisión de la orden de compra)"* y el front no tiene pantalla de necesidades. Consecuencia: el criterio de HU-COMP-02 *"permite generar la orden a partir de una o más necesidades pendientes"* queda **sin efecto** para este sprint. Hay que dejarlo asentado en el acta del sprint (los 3 PF de HU-COMP-01 salen del total → 34 PF reales).

### HU que el Sprint 1 no lista pero el backend igual necesita

| ID | Por qué entra | Alcance mínimo en Sprint 1 |
|---|---|---|
| **HU-PROV-01** (Proveedores) | HU-COMP-02 no existe sin proveedor, y el front **ya tiene `/proveedores` funcionando** (commits `bc584ad`, `10de349`) | Completa. Es dependencia dura, no opcional. |
| **HU-SUC-01** (Sucursales) | HU-STK-02 exige "un depósito por sucursal" | Solo tabla + seed de las 3 sucursales (Centro/Norte/Sur). Sin pantalla de ABM. |
| **HU-SIS-01** (Usuarios) | Toda HU pide "usuario responsable" en auditoría | Solo tabla + seed. Sin pantalla de ABM. |
| **HU-SIS-04** (Login) | El front llama `GET /api/auth/sesion` y `POST /api/auth/logout` | **Stub de sesión**: cookie firmada con un usuario semilla. El login real es Sprint 2. |
| **HU-SIS-06** (Bitácora) | Los 5 HU del sprint piden "registra en bitácora de auditoría" | Solo el **lado escritura** (la tabla y el trigger/servicio). La pantalla de consulta es Sprint 2. |

> Sin estas 5, ninguna HU del Sprint 1 se puede cerrar: son el piso técnico.

---

## 2. Lo que el front ya dejó definido

El equipo de diseño dejó el contrato prácticamente escrito. Antes de tocar nada:

```bash
grep -rn "BACKEND:" src/
```

Son ~85 puntos de integración con el endpoint y el reemplazo indicado. Además:

- **`src/data/*.ts`** — las interfaces TS ya reflejan las tablas esperadas (`ficha_stock`, `movimiento_stock`, `orden_compra`, `solicitud_cotizacion`, `cotizacion`, `deposito`, `proveedor`). **Son la fuente de verdad del contrato**, no una sugerencia.
- **`src/context/*.tsx`** — `ProveedoresContext` y `CotizacionesContext` simulan las mutaciones; ahí está la lógica que el back tiene que implementar de verdad.
- **`docs/briefs/HU-*.md`** — criterios de aceptación por pantalla, con wireframe y estados (vacío / cargando / error / con datos).
- **Convención de PK:** todo `id` placeholder es numérico porque "es la PK que mandará la base" (regla del `AGENTS.md`).

---

## 3. Decisiones a tomar ANTES de codear

Estas cinco bloquean el arranque. Van con recomendación; hay que confirmarlas con el equipo (y con la cátedra donde aplique).

| # | Decisión | Recomendación | Por qué |
|---|---|---|---|
| D1 | ¿Backend dentro del repo Next.js o servidor aparte? | **Route Handlers de Next.js** (`src/app/api/**/route.ts`) | Mismo repo, mismos tipos TS que el front, sin CORS ni segundo deploy. El front ya asume rutas `/api/...` relativas. |
| D2 | Motor SQL | **PostgreSQL 16** | El backlog pide `decimal(12,2)`, transacciones, triggers de auditoría y `CHECK`. Postgres los tiene todos y es gratis en local + Neon/Supabase. |
| D3 | Acceso a datos | **`pg` (node-postgres) + migraciones en `.sql` puro** | Sistemas III evalúa el SQL. Con un ORM el SQL queda escondido; así el DER y las queries son entregables visibles. *Alternativa: Drizzle si prefieren tipado end-to-end.* |
| D4 | Autenticación en Sprint 1 | **Stub**: cookie `httpOnly` firmada con `usuario_id` semilla + `GET /api/auth/sesion` | HU-SIS-04 no está en el sprint, pero sin `usuario_id` no se puede auditar nada. El stub se reemplaza en Sprint 2 sin tocar los demás endpoints. |
| D5 | ¿Auditoría por trigger de BD o por servicio en la app? | **Trigger de Postgres** sobre las tablas auditadas | Cumple "ningún usuario puede editar o eliminar entradas" (HU-SIS-06) a nivel motor, y no se puede olvidar en un endpoint. El `usuario_id` viaja por `SET LOCAL app.usuario_id`. |

---

## 4. Modelo de datos (orden de creación)

> 🔴 **REEMPLAZADO por [`AJUSTES-DER.md`](AJUSTES-DER.md).** La base ya está creada, así que esta sección ya no describe algo a construir: quedó como el modelo *esperado* contra el cual se comparó el DER real. Se conserva solo como referencia del contrato del front.
> Diferencias principales con lo que finalmente hay: `empleado` se fusiona en `usuario` (§1 de `AJUSTES-DER.md`), `ficha_stock` **no** lleva `activo`, `categoria`/`unidad_medida` quedaron como `varchar` en vez de tablas catálogo, y el movimiento de stock necesita cabecera-detalle.

Las tablas del Sprint 1, en orden de dependencia. Los tipos salen de los comentarios del front.

**Bloque 0 — Piso técnico**
1. `sucursal` — id, nombre, direccion, telefono, activo · *seed: Centro, Norte, Sur*
2. `rol` — id, nombre · *seed mínimo: Administrador, Personal de depósito*
3. `usuario` — id, nombre, apellido, dni, email, rol_id, sucursal_id, activo · *UNIQUE (email), (dni) entre activos*
4. `auditoria` — id, usuario_id, accion, modulo, entidad, entidad_id, valor_anterior `jsonb`, valor_nuevo `jsonb`, fecha_hora · *append-only*

**Bloque 1 — HU-PROV-01**
5. `forma_pago` — id, nombre · *catálogo: Contado, Cuenta Corriente, Transferencia, Cheque a 30 días*
6. `proveedor` — id, razon_social, cuit, direccion, telefono, email, contacto, plazo_entrega_dias, activo · *UNIQUE parcial de `cuit` entre activos*
7. `proveedor_forma_pago` — proveedor_id, forma_pago_id (PK compuesta) · **N:M, ver divergencia V1**

**Bloque 2 — HU-STK-01**
8. `categoria` — id, nombre · *catálogo: Medicamentos, Insumos, Alimentos, Accesorios*
9. `unidad_medida` — id, nombre · *catálogo: Unidad, Kg, L, mL, Caja*
10. `articulo` — id, codigo, nombre, descripcion, fabricante, unidad_medida_id, categoria_id, proveedor_preferido_id `NULL`, imagen_url, activo, created_at, updated_at · *UNIQUE parcial de `nombre` entre activos + UNIQUE de `codigo`*

**Bloque 3 — HU-STK-02**
11. `deposito` — id, sucursal_id, nombre, ubicacion · **sin campo `activo`** (nota explícita en `src/data/stock.ts`)
12. `ficha_stock` — id, articulo_id, deposito_id, stock_actual `decimal(12,2) DEFAULT 0`, stock_minimo `decimal(10,2) NOT NULL`, stock_critico `decimal(10,2) NULL`, activo · *UNIQUE (articulo_id, deposito_id)*

**Bloque 4 — HU-STK-04**
13. `tipo_movimiento` — id, nombre · *catálogo fijo: Ingreso, Egreso, Transferencia, Ajuste*
14. `origen_movimiento` — id, nombre · *catálogo fijo: Orden de Compra, Venta*
15. `movimiento_stock` — id, numero, ficha_stock_id, origen_id `NULL`, origen_entidad_id `NULL`, tipo_movimiento_id, cantidad `decimal(12,2)`, fecha_hora, usuario_id, motivo, movimiento_vinculado_id `NULL` · **ver divergencia V2**

**Bloque 5 — HU-COMP-02**
16. `solicitud_cotizacion` — id, usuario_id, fecha, estado, notas, cotizacion_id_adjudicada `NULL`
17. `solicitud_detalle` — id, solicitud_id, articulo_id, cantidad_estimada, nota `NULL`
18. `cotizacion` — id, solicitud_id, proveedor_id, condicion_pago, fecha_recepcion
19. `cotizacion_detalle` — id, cotizacion_id, articulo_id, precio `decimal(12,2)`
20. `orden_compra` — id, proveedor_id, cotizacion_id `NULL`, usuario_id, fecha, fecha_entrega `NULL`, direccion_entrega, condicion_pago, notas, subtotal, descuento, gastos_envio, total, estado
21. `orden_compra_detalle` — id, orden_compra_id, articulo_id, cantidad, precio_acordado `decimal(12,2)`

**Secuencias de numeración** (el front las espera generadas por el back): `MOV-XXXX`, `SC-XXXX`, `OC-XXXX`.

---

## 5. Contrato de API

Lo que el front ya invoca. Ningún endpoint se inventa: todos salen de un `// BACKEND:`.

### Catálogos (GET, solo lectura)
`/api/sucursales` · `/api/depositos` · `/api/empleados` · `/api/condiciones-pago` · `/api/tipos-movimiento` · `/api/origenes-movimiento`

### Sesión
| Método | Ruta | HU |
|---|---|---|
| GET | `/api/auth/sesion` | HU-SIS-04 (stub) — devuelve `{ id, nombre, rol, sucursal_id }` |
| POST | `/api/auth/logout` | HU-SIS-04 (stub) |

### HU-PROV-01
| Método | Ruta |
|---|---|
| GET | `/api/proveedores` · `?activo=true` |
| POST | `/api/proveedores` |
| PUT | `/api/proveedores/:id` |
| PATCH | `/api/proveedores/:id/inactivar` |

### HU-STK-01
| Método | Ruta |
|---|---|
| GET | `/api/articulos` · `?activo=true` |
| POST / PUT | `/api/articulos` · `/api/articulos/:id` |
| PATCH | `/api/articulos/:id` → `{ activo: false }` |
| GET | `/api/articulos/:id/ultimo-precio-compra` |

### HU-STK-02
| Método | Ruta |
|---|---|
| GET | `/api/fichas-stock` · `?estado=activo` |
| POST / PUT | `/api/fichas-stock` · `/api/fichas-stock/:id` |
| POST / PUT | `/api/depositos` · `/api/depositos/:id` |
| POST | `/api/transferencias` |

### HU-STK-04
| Método | Ruta |
|---|---|
| GET | `/api/movimientos-stock` (+ filtros tipo / depósito / artículo / período) |
| POST | `/api/movimientos-stock` → genera `numero` y devuelve alertas de reposición |

### HU-COMP-02
| Método | Ruta |
|---|---|
| GET / POST | `/api/solicitudes-cotizacion` |
| POST | `/api/solicitudes-cotizacion/:id/cotizaciones` |
| PATCH | `/api/solicitudes-cotizacion/:id/adjudicar` → **crea la OC** |
| PATCH | `/api/solicitudes-cotizacion/:id/cancelar` |
| GET / POST | `/api/ordenes-compra` |
| PUT | `/api/ordenes-compra/:id` |
| PATCH | `/api/ordenes-compra/:id/enviar` · `/api/ordenes-compra/:id/cancelar` |
| GET | `/api/ordenes-compra/:id/remito` |
| POST | `/api/ordenes-compra/:id/notas-reclamo` |

**Convenciones a fijar de una vez** (y documentar): los GET devuelven las relaciones resueltas por JOIN (el front espera `_proveedor`, `_usuario`, `_detalles` anidados); las respuestas de error usan un shape único `{ error: { codigo, mensaje, campo? } }` porque el front ya tiene estados de error por CUIT/nombre duplicado.

---

## 6. Reglas de negocio que van en el back (no en el front)

Estas son las que el front simula y el back tiene que hacer de verdad:

**HU-PROV-01**
- CUIT único **entre proveedores activos** (índice `UNIQUE` parcial, no validación en app).
- Baja lógica. Un proveedor inactivo no puede elegirse en OC nuevas → validar en `POST /api/ordenes-compra`.
- `ProveedoresContext.tsx:67` avisa que **el back debe rechazar la baja si hay órdenes pendientes** (el front no lo hace).

**HU-STK-01**
- `nombre` único entre activos; `codigo` único global.
- **El artículo NO tiene precio.** Criterio explícito del Excel: el precio de venta va en Lista de Precios (HU-STK-03, Sprint 2) y el costo se fija al recibir la OC.
- Artículo inactivo: no seleccionable en movimientos, listas ni OC.

**HU-STK-02**
- `ficha_stock` es requisito previo para mover ese artículo en ese depósito.
- `stock_actual` arranca en 0 y **solo** cambia por movimientos: nunca editable por API.
- Alerta visual bajo el mínimo; **notificación automática** al llegar al crítico.
- Transferencia entre depósitos = par egreso + ingreso vinculados por `movimiento_vinculado_id`, en **una sola transacción**.

**HU-STK-04**
- `numero` por secuencia del sistema (`MOV-XXXX`).
- Validar que exista ficha activa para cada artículo/depósito → si no, **rechazar** el movimiento completo.
- Validar que un egreso **no deje stock negativo**.
- Actualizar `stock_actual` de cada ficha al confirmar, en la misma transacción (con `SELECT ... FOR UPDATE` para evitar carrera).
- Devolver las alertas de reposición en la respuesta del POST (`src/app/stock/page.tsx:617`).
- Combos válidos: Ingreso→Orden de Compra, Egreso→Venta, Transferencia y Ajuste→`origen_id NULL` (regla en `src/data/movimientos.ts`).

**HU-COMP-02**
- Estados fijos: `Pendiente`, `Enviada`, `Recibida Parcial`, `Recibida Total`, `Cancelada`. **Recibida Parcial/Total son inalcanzables en Sprint 1** (llegan desde HU-COMP-03, Sprint 2) — dejar la máquina de estados preparada pero sin transición.
- Numeración `OC-XXXX` secuencial al adjudicar.
- Al adjudicar una cotización: crear la OC en la misma transacción y guardar `cotizacion_id` para que la comparación quede documentada.
- Totales: `total = subtotal - (subtotal × descuento/100) + gastos_envio`, redondeado a 2 decimales. **Recalcular en el back**, nunca confiar en el número del front.

**Transversal — auditoría**
Cada alta, modificación y baja de las 5 HU escribe en `auditoria` con usuario responsable, fecha, hora, valor anterior y valor nuevo. Es criterio de aceptación de **todas** las HU del sprint, no un extra.

---

## 7. Divergencias front ↔ backlog a resolver

> 🔴 **REEMPLAZADO por [`AJUSTES-DER.md`](AJUSTES-DER.md)**, que las evalúa contra el DER real. Estado actualizado:
>
> | # | Divergencia | Estado |
> |---|---|---|
> | **V1** | Formas de pago múltiples | 🟡 **abierta** — el DER tiene `proveedor.forma_pago varchar(60)` singular. Decisión pendiente (A3) |
> | **V2** | Cabecera-detalle del movimiento | 🟡 **abierta** — el DER quedó plano y además sin `numero`. Recomendación en B6 |
> | **V3** | `empleado_id` vs `usuario_id` | ✅ **resuelta** — una sola tabla `usuario` (§1 de `AJUSTES-DER.md`) |
> | **V4** | `fabricante` en artículo | ✅ **resuelta** — el DER ya lo tiene |
> | **V5** | `stock_critico` nullable | ✅ **resuelta** — el DER ya lo tiene nullable |
> | **V6** | HU-PROV-01 fuera del sprint | 🟡 **abierta** — decisión de acta, no técnica |

Encontradas comparando el Excel con `src/`. **Hay que resolverlas antes de escribir el DDL**, porque cambian tablas:

| # | Divergencia | Backlog dice | Front hace | Propuesta |
|---|---|---|---|---|
| **V1** | Formas de pago del proveedor | "forma de pago" (singular) | `formasPago: string[]` (commit `10de349`) | Aceptar el front → tabla N:M `proveedor_forma_pago`. Actualizar el criterio de la HU. |
| **V2** | Estructura del movimiento | "**cabecera-detalle**: una o más líneas por movimiento" | Tabla plana: 1 fila = 1 artículo, agrupadas por `numero` | ⚠️ **La más importante.** El front no cumple el criterio literal. Recomiendo `movimiento_stock` (cabecera) + `movimiento_detalle` (líneas) y exponer el listado plano por JOIN — así se cumple el criterio sin tocar el front. **Decisión del equipo.** |
| **V3** | Identidad del responsable | "usuario responsable" | `empleado_id` en movimientos, `usuario_id` en OC/cotizaciones | Unificar en `usuario_id`. `GET /api/empleados` queda como alias de usuarios activos. |
| **V4** | Campos del artículo | codigo, nombre, descripcion, unidad, categoria, proveedor preferido | más `fabricante` y `imagen` | Aceptar los dos campos extra y ampliar el criterio de HU-STK-01. |
| **V5** | Umbral crítico | "define su umbral mínimo **y** su crítico" | `stockCritico: number \| null` | Aceptar nullable (el front ya calcula el estado sin crítico) y ajustar el criterio. |
| **V6** | HU-PROV-01 fuera del Sprint 1 | prioridad 70, no está en la hoja | ya implementada y HU-COMP-02 la necesita | Incorporarla formalmente al Sprint 1 en el acta (+5 PF). |

---

## 8. Paso a paso

Siete fases. Cada una cierra con algo verificable; no se pasa a la siguiente sin eso.

### Fase 0 — Acuerdos y entorno (½ día)
1. Resolver **D1–D5** (§3) y **V1–V6** (§7) con el equipo. Sin esto no arranca nada.
2. Postgres local corriendo + base `huellitas_felices` creada.
3. `.env.local` con `DATABASE_URL` y `.env.example` commiteado (sin secretos).
4. Estructura de carpetas:
   ```
   db/migrations/     0001_piso.sql, 0002_proveedores.sql, ...
   db/seeds/          catálogos + datos del front como seed
   src/lib/db.ts      pool de conexión
   src/lib/api/       validación, errores, auditoría, sesión
   src/app/api/       route handlers
   ```
5. Actualizar `AGENTS.md` con la sección de backend (hoy dice "lo maneja el equipo de back", sin reglas).

**Entregable:** `docs/backend/DECISIONES.md` con D1–D5 y V1–V6 cerradas.

### Fase 1 — Piso técnico (1 día)
> Con la base ya creada, esta fase **ajusta** en vez de crear. Migraciones `0007`–`0010` de [`AJUSTES-DER.md`](AJUSTES-DER.md) §7.

1. Baseline con `pg_dump --schema-only` si la base se armó a mano (sin esto no es reproducible).
2. `0007` fusión `empleado` → `usuario`; `0008` `sucursal` + FK; `0009` `auditoria`; `0010` los `UNIQUE` parciales.
3. Trigger genérico de auditoría + helper `SET LOCAL app.usuario_id`.
4. Seed de 3 sucursales, roles y usuarios (los mismos nombres del front: Ana Martínez, Carlos López, María García — así los datos de demo siguen calzando).
5. `src/lib/db.ts` (pool) + wrapper `withTransaction()`.
6. Stub de sesión: `GET /api/auth/sesion`, `POST /api/auth/logout` (devuelve un solo `usuario_id`, ya que no hay más `empleado_id`).

**Verificación:** el sidebar (`Sidebar.tsx:54`) muestra nombre y rol reales, no hardcodeados.

### Fase 2 — HU-PROV-01 · Proveedores (1 día)
1. Migración `0002`: `forma_pago`, `proveedor`, `proveedor_forma_pago` + UNIQUE parcial de CUIT.
2. Los cuatro endpoints (§5).
3. Reglas: CUIT duplicado, baja lógica, bloqueo de baja con OC pendientes.
4. Conectar `/proveedores` — sacar `proveedoresIniciales` de `ProveedoresContext`.

**Verificación:** alta, edición, lectura y baja desde la UI; CUIT duplicado devuelve error visible; la baja queda en `auditoria`.

### Fase 3 — HU-STK-01 · Artículos (1 día)
1. Migración `0003`: `categoria`, `unidad_medida`, `articulo`.
2. Endpoints + filtros (categoría, estado, búsqueda por código o nombre).
3. Definir el manejo de `imagen` (multipart o base64 → decidir en Fase 0, ver `ArticuloFormModal.tsx:141`).
4. Conectar `/articulos`.

**Verificación:** listado con filtros, nombre duplicado rechazado, baja lógica auditada.

### Fase 4 — HU-STK-02 · Depósitos y fichas (1½ días)
1. Migración `0004`: `deposito`, `ficha_stock` + UNIQUE (articulo, deposito).
2. Endpoints de depósitos y fichas + `GET /api/sucursales`.
3. `stock_actual` de solo lectura vía API (rechazar cualquier intento de escritura directa).
4. Conectar `/stock` (ambas tabs).

**Verificación:** ficha nueva arranca en 0; el estado normal/bajo/crítico que calcula el front coincide con los datos de la BD.

### Fase 5 — HU-STK-04 · Movimientos (2 días) ⬅ *la fase crítica*
1. Migración `0005`: `tipo_movimiento`, `origen_movimiento`, `movimiento_stock` (+ `movimiento_detalle` según V2).
2. Secuencia `MOV-XXXX`.
3. `POST /api/movimientos-stock` **transaccional**: validar fichas activas → validar no-negativo → insertar → actualizar `stock_actual` con lock → calcular alertas → auditar. Todo o nada.
4. `POST /api/transferencias`: par egreso/ingreso vinculado, una transacción.
5. Notificación al cruzar el umbral crítico.
6. `GET` con los cuatro filtros.
7. Conectar `/movimientos-stock` y el flujo de transferencia de `/stock`.

**Verificación:** egreso mayor al stock se rechaza; un movimiento fallido no deja nada escrito; la transferencia mueve las dos puntas o ninguna; la alerta de reposición aparece en la UI.

### Fase 6 — HU-COMP-02 · Cotizaciones y órdenes (2½ días)
1. Migración `0006`: las seis tablas del bloque 5.
2. Secuencias `SC-XXXX` y `OC-XXXX`.
3. Solicitudes de cotización: crear, agregar cotizaciones, cancelar.
4. **Adjudicar**: elegir cotización + crear OC + guardar la comparación, en una transacción.
5. OC: alta, edición, enviar, cancelar. Recálculo de totales en el server.
6. Validar proveedor y artículos activos.
7. Máquina de estados (con Recibida Parcial/Total preparadas pero inalcanzables).
8. Remito y notas de reclamo.
9. Conectar `/ordenes-compra` y `/cotizaciones`.

**Verificación:** solicitud → dos cotizaciones → comparar → adjudicar → OC creada con número correcto y trazable a la cotización ganadora.

### Fase 7 — Cierre (1 día)
1. `npm run lint` + `tsc --noEmit` en verde (regla del `AGENTS.md`).
2. Barrido de `grep -rn "BACKEND:" src/`: cada punto resuelto o justificado.
3. Ningún `SIMULAR_VACIO` / `SIMULAR_ERROR` activo; estados vacío/cargando/error probados contra la API real.
4. `docs/backend/DER.md` + script de reseteo (`db:reset`) para la demo.
5. Registrar en `docs/errores-comunes.md` lo que salió mal (con `/error`).
6. Subir con `/subir` referenciando la HU.

**Total estimado: ~11 días de trabajo efectivo.** El sprint son 14 días corridos — ajustado pero alcanzable si Fase 0 se resuelve rápido.

---

## 9. Qué necesito para hacer el backend correctamente

### Decisiones (bloqueantes)
- [ ] **D1–D5** de §3 confirmadas.
- [ ] **V1–V6** de §7 resueltas, en especial **V2** (cabecera-detalle de movimientos): cambia el DDL.
- [ ] ¿HU-PROV-01 entra formalmente al Sprint 1? (afecta los PF del acta)
- [ ] `imagen` del artículo: ¿archivo en disco, base64 en la BD, o servicio externo?

### Accesos y entorno
- [ ] Postgres 16 instalado en local (o cadena de conexión a Neon/Supabase si van a compartir base).
- [ ] `git` no está en el PATH de PowerShell → hay que usar `C:\Program Files\Git\cmd\git.exe` (ya anotado en `AGENTS.md`).
- [ ] Confirmar si el backend se despliega en algún lado o solo corre local para la demo.

### Información del equipo / cátedra
- [ ] **Reglas de negocio faltantes:** ¿se puede editar una OC ya enviada? ¿un movimiento de stock se puede anular, y cómo (contra-movimiento)?
- [ ] **Notificación de stock crítico:** ¿email, o basta con un aviso in-app? El Excel dice "notificación automática" sin especificar canal.
- [ ] **Retención de auditoría:** HU-SIS-06 pide 12 meses mínimo — confirmar si hay que implementar la purga ya.
- [ ] ¿La cátedra pide entregable de DER / diccionario de datos / normalización? Cambia cuánta documentación formal generamos.
- [ ] Datos reales o de prueba para el seed (hoy usamos los del front, que están bien armados).

### Del front (ya disponible, sin bloqueo)
- ✅ Interfaces TS en `src/data/*.ts`
- ✅ 85 puntos `// BACKEND:` marcados
- ✅ Briefs con criterios en `docs/briefs/`
- ✅ Estados vacío / cargando / error ya diseñados en cada pantalla

---

## 10. Definición de Terminado (backend, Sprint 1)

Una HU está terminada cuando:

1. Tablas creadas por migración versionada (no a mano en la consola).
2. Endpoints responden el shape exacto que el front espera (relaciones resueltas por JOIN).
3. Todas las validaciones del criterio de aceptación están en el **server**, no solo en la UI.
4. Cada alta, modificación y baja deja registro en `auditoria` con usuario, fecha, hora y valores anterior/nuevo.
5. Las operaciones multi-tabla son transaccionales (no hay estado a medias posible).
6. La pantalla del front funciona contra la API real, con sus datos hardcodeados eliminados.
7. `npm run lint` y `tsc --noEmit` en verde.
8. Probado el camino feliz **y** el de error (duplicado, stock insuficiente, inactivo).
