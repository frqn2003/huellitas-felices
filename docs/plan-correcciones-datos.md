# Plan de correcciones — Datos del front vs. esquema de BD

> **Propósito**: alinear los datos hardcodeados del front (`src/data/*.ts`) y sus componentes con el diccionario de datos actualizado por la DBA (`docs/esquema-bd-front.md`).
> **Alcance**: sprint 1 y sprint 2. Estructurado por sprint para poder recortarlo a sprint 2 si se decide.
> **Estado**: PLAN — nada de esto está ejecutado todavía. Es el insumo para coordinar decisiones con la DBA y después implementar.
> **Fuente de verdad**: `docs/esquema-bd-front.md` (actualizado por la DBA, 2026-09-06).

---

## Resumen ejecutivo

Se relevaron 10 módulos. Resultado:

- **Alineados (sin cambios)**: stock, cotizaciones (excepto `cod_sol`), OC (excepto `direccion_entrega` y `subtotal`), comprobantes (excepto `fecha_vencimiento`).
- **Inconsistencia estructural crítica**: Recepciones modela `recepcion_mercaderia*`, tablas que el diccionario ya no define (hoy es `notificacion_compra`).
- **2 contradicciones con el diccionario a resolver con la DBA**: `origen_id NOT NULL` vs. front con null; `direccion_entrega` sin columna en `orden_compra`.
- **2 catálogos front para la misma tabla** `forma_pago` (proveedores vs. cta. cte.) — el dict prohíbe hardcodear catálogos.
- El resto son: nombres camelCase vs snake_case, enums en minúscula vs labels capitalizados, campos faltantes del esquema (FKs NOT NULL, columnas nuevas), y derivados de cálculo (saldo, total) que no son columnas.

---

## Decisiones pendientes con la DBA (bloquean correcciones)

| # | Decisión | Por qué bloquea |
|---|---|---|
| D1 | **Recepciones**: ¿las tablas `recepcion_mercaderia*` se eliminaron (rediseñar el módulo) o faltan en el diccionario (agregarlas)? | Decisión más grande del sprint 2. Hoy el front modela tablas inexistentes. |
| D2 | **`origen_id`**: ¿columna nullable o el front debe mandar siempre `transferencia_sucursal`/`ajuste_manual`? | El dict dice `int FK NOT NULL`, pero el front lo manda `null` en transferencias/ajustes. |
| D3 | **`direccion_entrega`**: ¿columna real en `orden_compra` o se resuelve por `deposito.ubicacion`? | El modal de OC cree que la BD guarda el varchar; el dict no la tiene. |
| D4 | **Catálogo `forma_pago`**: fijar valores canónicos. | Hoy el front tiene dos sets incompatibles: `["Contado","Cuenta Corriente","Cheque a 30 días"]` (proveedores) y `["Efectivo","Transferencia","Cheque","Tarjeta"]` (cta. cte.). El dict dice que el catálogo lo expone la API, no el front. |
| D5 | **`cliente` / `venta`**: fuera del diccionario, pero `pago.tipo = cobranza_cliente` y la cta. cte. global los necesitan. | Bloquea el lado cliente de cuentas corrientes. |
| D6 | **`telefono`** en `usuario`: ¿se agrega columna? | El front ya la usa en el perfil; el dict no la tiene. |
| D7 | **`cod_sol`** en `solicitud_cotizacion`: ¿se agrega columna o se deriva? | La OC tiene `cod_ord`; la solicitud no tiene número visible en el dict. |

---

## Sprint 1 — Correcciones

### Artículos (`src/data/articulos.ts`, `src/components/articulos/ArticuloFormModal.tsx`) — Impacto: alto

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 1 | `activo: boolean` y `estado: "Activo"\|"Inactivo"` | El esquema define UN solo campo `estado` enum `activo/inactivo` | Quitar `activo`; `estado` guarda el valor; el label ("Activo"/"Inactivo") se resuelve solo en display | Evita dos fuentes de verdad que pueden desincronizarse (activo=true con estado="Inactivo") |
| 2 | `imagen` | → `imagen_url` | Renombrar | El dict usa `imagen_url varchar(255)` |
| 3 | (no existen) | Faltan `presentacion_id` (FK NOT NULL, tabla nueva `presentacion`), `numero_lote`, `fecha_vencimiento`, `contenido_neto` | Agregar presentación al modelo/catálogo y lote/vto/contenido al alta | El alta fallaría sin presentación (FK NOT NULL); el dict agregó estas columnas |
| 4 | `createdAt`/`updatedAt` | camelCase vs snake_case del resto del contrato | Unificar a `created_at`/`updated_at` | Coherencia de contrato; el backend mapea snake_case |
| 5 | `proveedorPreferido` | No existe en `articulo` (costo/precio viven en OC/comprobante) | Dejarlo fuera del draft; solo como dato derivado del back | Conceptualmente no pertenece a la tabla |

### Proveedores (`src/data/proveedores.ts`, `src/context/ProveedoresContext.tsx`, `ProveedorFormModal.tsx`) — Impacto: medio-alto

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 6 | `razonSocial`, `plazoEntregaDias`, `estado` | → `razon_social`, `plazo_entrega_dias`, enum `activo/inactivo` | Renombrar + usar valores del enum | Naming del dict |
| 7 | `["Contado","Cuenta Corriente","Cheque a 30 días"]` | Catálogo front ≠ catálogo de `forma_pago` de cta. cte. | Unificar catálogo; poblar desde `GET /api/formas-pago`; DBA fija el canónico (D4) | El dict prohíbe listas hardcodeadas en el front |
| 8 | (no existen) | Faltan `forma_pago_id` (FK NOT NULL) y `calificacion` | Agregar al modelo | Sin `forma_pago_id` el alta falla; `calificacion numeric(3,1)` es del dict |

### Stock (`src/data/stock.ts`) — ✅ Alineado

Sin cambios.

### Movimientos (`src/data/movimientos.ts`, `MovimientoFormModal.tsx`, `TipoMovimientoBadge.tsx`) — Impacto: alto

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 10 | `empleadoId`/`empleado` | Esquema: `usuario_id` | Renombrar (join con usuario) | `movimiento_stock_cab.usuario_id int FK NOT NULL` |
| 11 | `tipo` con 4 valores + catálogo `tiposMovimiento` | Enum BD = `ingreso/egreso` (2 valores) | `tipo` enum de 2; Transferencia/Ajuste son derivados de display (`movimiento_vinculado_id`, `origen_id=ajuste_manual`) | El dict define `tipo_movimiento_stock` con 2 valores; el front inventó 4 |
| 12 | `origenId: null` en Transferencia/Ajuste | Contradice el dict: `origen_id int FK NOT NULL` | Resolver con DBA (D2): nullable o llenar siempre | El front y el dict dicen cosas distintas |
| 13 | `origenesMovimiento` (2 valores) | Catálogo BD = 12 valores; nombres no mapean 1:1 | Poblar desde `GET /api/origenes-movimiento` | Catálogo real del dict (`venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma`) |

### Órdenes de compra (`src/data/ordenes-compra.ts`, `OrdenFormModal.tsx`) — Impacto: medio

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 14 | `estado` string (5 valores) | → `estado_id → estado_orden_compra` | Mandar `estado_id`; display por join; verificar los 5 en la tabla | El dict usa FK a tabla de estados |
| 15 | `direccion_entrega` | No está en el dict | Resolver con DBA (D3): columna real o `deposito.ubicacion` | El modal afirma "la BD guarda el varchar" pero el dict no la tiene |
| 16 | `OrdenCompraDetalle` sin `subtotal` | El esquema lo persiste | Agregar al contrato | `orden_compra_detalle.subtotal` |
| 17 | `descuento` %, `total` recalculado | ✅ Alineado | Sin cambios | El dict: descuento en porcentaje, total lo recalcula el back |

### Cotizaciones (`src/data/cotizaciones.ts`, `src/context/CotizacionesContext.tsx`) — Impacto: medio

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 18 | `cod_sol` | `solicitud_cotizacion` NO tiene columna de número (OC sí `cod_ord`) | Agregar columna al dict (D7) o derivar | Sin número visible no hay referencia para el usuario |
| 19 | resto | ✅ Alineado | Sin cambios | FKs y conceptos correctos |

---

## Sprint 2 — Correcciones

### Recepciones (`src/data/recepciones.ts`, `RecepcionFormModal.tsx`, `src/app/recepciones/**`) — Impacto: CRÍTICO

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 20 | `recepcion_mercaderia` + `_detalle` | El dict NO define esas tablas; en su lugar `notificacion_compra` (FK `orden_compra_detalle_id` UNIQUE, cantidades, diferencia GENERATED, leida) | Rediseñar el módulo sobre OC + notificación, o pedir las tablas a la DBA (D1) | El front modela tablas que ya no existen |
| 21 | `NotificacionCompra.recepcionDetalleId` | → `orden_compra_detalle_id`; las cantidades viven en la notificación (hoy en `RecepcionDetalle`) | Cambiar FK y reubicar cantidades | El dict define `notificacion_compra.orden_compra_detalle_id UNIQUE` |
| 22 | `tipo_recepcion`, `observacion*` | No existen en el dict: parcialidad emerge de `cantidad_recibida` acumulada; solo hay `mensaje` | Parcial/total = derivado; observaciones → `mensaje` o sistema aparte | El dict no tiene esos campos |

### Comprobantes (`ComprobantesContent.tsx`, `ComprobantesTable.tsx`, modales) — Impacto: bajo

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 23 | `tipo "Factura A"`, `numero "0003-00001278"`, `facturaOriginalId`, `comprobanteAnulador` | ✅ Alineado (`tipo_comprobante_id`+letra, `punto_venta`+`numero_comprobante`, `comprobante_corregido_id`, `anula_comprobante_id`, enum `vigente/anulado`) | Agregar `fecha_vencimiento` y `usuario_id` al POST | El dict los exige (`fecha_vencimiento date NOT NULL`, `usuario_id int NOT NULL`) |

### Cuentas corrientes (`src/data/cuentas-corrientes.ts`, `RegistrarPagoCtaCteModal.tsx`, `CtaCteListaGlobal.tsx`, `CtaCorrienteDetalleGlobal.tsx`) — Impacto: medio-alto

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 24 | `Pago.numero` | → `numero_comprobante` (UNIQUE, externo, no autogenerado) | Renombrar | El dict: número de recibo/cheque/comprobante externo que trae el pago |
| 25 | `formaPago` + `FORMAS_PAGO` | → `pago.forma_pago_id` (mismo catálogo que #7) | GET /api/formas-pago | Catálogo único; duplica la corrección de proveedores |
| 26 | `saldoPendiente` ("comprobante_proveedor.saldo_pendiente") | No es columna: se deriva de `monto_total` − imputaciones vigentes | Usar vista (`vista_cuenta_corriente_proveedor`) | El dict no tiene la columna |
| 27 | `saldoActual` ("proveedor.saldo_actual") | `proveedor` NO tiene esa columna | Derivar de vista | No es campo del dict |
| 28 | clientes / `cobranza_cliente` | `pago.proveedor_id` nullable es la única FK; no hay tabla `cliente` | Abrir con DBA (D5): ¿`cliente_id` en `pago`? ¿módulo comercial? | Bloquea el lado cliente de la cta. cte. global |

### Usuarios / Auth (`src/data/usuarios.ts`, `AuthContext.tsx`, `LoginForm.tsx`, `ConfiguracionForm.tsx`) — Impacto: alto

| # | Campo front (actual) | Inconsistencia | Corrección | Por qué |
|---|---|---|---|---|
| 29 | `telefono` | No está en `usuario` del dict | Solicitar columna a la DBA (D6) | El front ya la usa en el perfil |
| 30 | (no existen) | Faltan `sucursal_id`, `intentos_fallidos` (CHECK 0–3), `bloqueado_hasta`; el front simula el bloqueo client-side (`MAX_INTENTOS=3`, `BLOQUEO_MS`) | Exponer estado desde la API; el bloqueo lo persiste el back | Lógica de bloqueo duplicada; el dict define esos campos |
| 31 | `RolNombre` sin "Cajero"; "Personal de Depósito" | Dict: 6 roles incluye **Cajero**; el dict usa "Personal de depósito" | Agregar rol + alinear casing | Coherencia con el catálogo de roles |
| 32 | `AuditoriaLogin.operacion` (login_exitoso/fallido/bloqueado/logout) | `auditoria.operacion` = INSERT/UPDATE/DELETE; los eventos de sesión van en `auditoria_sesion` (evento login/logout, `ip_origen inet`, `detalle jsonb`) | Rediseñar sobre `auditoria_sesion`; "bloqueado"/intento → `detalle jsonb` | El dict separa auditoría de negocio y auditoría de sesión |

---

## Archivos afectados (referencia para implementar)

| Módulo | Archivos |
|---|---|
| Artículos | `src/data/articulos.ts`, `src/components/articulos/ArticuloFormModal.tsx` |
| Proveedores | `src/data/proveedores.ts`, `src/context/ProveedoresContext.tsx`, `src/components/proveedores/ProveedorFormModal.tsx` |
| Movimientos | `src/data/movimientos.ts`, `src/components/movimientos/MovimientoFormModal.tsx`, `TipoMovimientoBadge.tsx` |
| OC | `src/data/ordenes-compra.ts`, `src/components/ordenes-compra/OrdenFormModal.tsx` |
| Cotizaciones | `src/data/cotizaciones.ts`, `src/context/CotizacionesContext.tsx` |
| Recepciones | `src/data/recepciones.ts`, `src/components/recepciones/RecepcionFormModal.tsx`, `src/app/recepciones/**` (rediseño) |
| Comprobantes | `src/components/comprobantes/ComprobantesContent.tsx`, `ComprobantesTable.tsx` |
| Cta. Cte. | `src/data/cuentas-corrientes.ts`, `RegistrarPagoCtaCteModal.tsx`, `CtaCteListaGlobal.tsx`, `CtaCorrienteDetalleGlobal.tsx` |
| Usuarios/Auth | `src/data/usuarios.ts`, `src/context/AuthContext.tsx`, `LoginForm.tsx`, `ConfiguracionForm.tsx` |

---

## Cómo se decidió el alcance

- `master` solo contiene `src/data/articulos.ts` → artículos es sprint 1 (junto con proveedores, stock, movimientos, OC, cotizaciones por historial de ramas).
- `sprint2` (rama actual) agrega recepciones, comprobantes, cta. cte., usuarios/auth.
- Si se recorta a sprint 2: aplicar solo la sección *Sprint 2* (items 20–32 + decisiones D1, D4, D5, D6).