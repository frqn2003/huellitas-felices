# Esquema de Base de Datos — Sistema de Gestión Veterinaria "Huellitas Felices" (Incremento Sprint 4)

> Diccionario de datos generado a partir de `esquema4.sql` (incremento v2, con correcciones). Se aplica DESPUÉS del esquema de los Sprints 1-3. Cubre las HU: HU-STK-03, HU-CLIN-01, HU-VTA-03, HU-VTA-01 y HU-VTA-02, más la ampliación de HU-TUR-02 (al pasar un turno a `atendido` se abre automáticamente la consulta médica).

---

## Enums

| Enum | Valores |
|---|---|
| tipo_movimiento_caja | ingreso, egreso |

> Enums de Sprints anteriores que este incremento reutiliza sin redefinir: `modo_abm` (usado por `fn_abm_lista_precio`), `estado_activo_inactivo` (estado de `articulo`) y `estado_documento` (estado de `venta`, default `'vigente'`).
>
> `caja_apertura.estado` es un **boolean** (TRUE = abierta, FALSE = cerrada); por eso no existe un enum `estado_caja_apertura`.

---

## Dependencias de Sprints 1-3

Tablas que este incremento referencia pero no define:

`articulo`, `usuario`, `turno`, `estado_turno`, `agenda_profesional`, `cliente`, `mascota`, `sucursal`, `deposito`, `caja`, `forma_pago`, `origen_movimiento`, `movimiento_stock_cab`, `movimiento_stock_det`, `ficha_stock`, `auditoria` (genérica, alimentada por `fn_auditoria()`).

---

## 1. Lista de Precios (HU-STK-03)

### `lista_precio`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| articulo_id | int FK → articulo.id UNIQUE NOT NULL | una única fila por artículo |
| precio | numeric(12,2) NOT NULL | CHECK precio >= 0 |
| vigencia_desde | date NOT NULL | default CURRENT_DATE; se reasigna a CURRENT_DATE por trigger cuando cambia `precio` |
| usuario_id | int FK → usuario.id NOT NULL | último usuario que fijó o modificó el precio |
| fecha_registro | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now(); se actualiza por trigger en cada UPDATE |

Precio de venta vigente de un artículo o servicio, independiente del costo de compra. Cambiar un precio es un `UPDATE` in place (no se acumulan filas históricas en esta tabla). El ABM `fn_abm_lista_precio` permite INSERCION (primer precio), EDICION (actualiza in place) y LECTURA; rechaza artículos inexistentes o inactivos, precios negativos y usuario nulo.

### `historial_precios`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| articulo_id | int FK → articulo.id NOT NULL | |
| precio | numeric(12,2) NOT NULL | CHECK precio >= 0 |
| vigencia_desde | date NOT NULL | |
| vigencia_hasta | date (nullable) | NULL = precio actualmente vigente; CHECK vigencia_hasta IS NULL o >= vigencia_desde |
| usuario_id | int FK → usuario.id NOT NULL | |
| fecha_hora | timestamp NOT NULL | default now() |

Historial de períodos en que rigió cada precio. Es de solo lectura desde la aplicación: lo escribe únicamente el trigger `fn_historial_precios()` (no usa la tabla genérica `auditoria`). Al cambiar el precio cierra la fila abierta con `vigencia_hasta = nueva vigencia_desde - 1 día` y abre una fila nueva con `vigencia_hasta` NULL. Un índice único parcial garantiza a lo sumo una fila abierta por artículo.

---

## 2. Consulta Médica (HU-CLIN-01)

### `consulta_medica`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| turno_id | int FK → turno.id UNIQUE NOT NULL | toda consulta nace de un turno en estado `atendido`; una consulta por turno |
| cliente_id | int FK → cliente.id NOT NULL | |
| mascota_id | int FK → mascota.id NOT NULL | |
| usuario_id | int FK → usuario.id NOT NULL | profesional que atiende (tomado de `agenda_profesional.usuario_id`) |
| fecha_hora | timestamp NOT NULL | default now() |
| motivo_consulta | text NOT NULL | se precarga con `turno.notas`; editable hasta el cierre |
| diagnostico | text | |
| tratamiento | text | |
| medicacion_indicada | text | indicaciones en texto libre (dosis, frecuencia, duración) |
| temperatura | numeric(4,1) | CHECK NULL o > 0 |
| frecuencia_cardiaca | int | CHECK NULL o > 0 |
| peso | numeric(6,2) | CHECK NULL o > 0 |
| estado_fisico_general | text | |
| cerrada | boolean NOT NULL | default false |
| fecha_cierre | timestamp | CHECK: si `cerrada` es true, `fecha_cierre` no puede ser NULL |

Detalle de la atención médica (histórico clínico). Una vez cerrada es inmutable (trigger `fn_bloquea_update_consulta_medica`): las correcciones se agregan como `consulta_medica_nota`. Índices por (mascota, fecha DESC) y por cliente.

### `consulta_medica_nota`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| consulta_id | int FK → consulta_medica.id NOT NULL | ON DELETE CASCADE |
| usuario_id | int FK → usuario.id NOT NULL | |
| nota | text NOT NULL | |
| fecha_hora | timestamp NOT NULL | default now() |

Notas aclaratorias posteriores al cierre; es la única forma de "editar" una consulta cerrada. No se editan ni se borran.

### `consulta_medica_insumo`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| consulta_id | int FK → consulta_medica.id NOT NULL | ON DELETE CASCADE |
| articulo_id | int FK → articulo.id NOT NULL | |
| cantidad | int NOT NULL | unidades enteras (ej. una ampolla); CHECK cantidad > 0 |
| usuario_id | int FK → usuario.id NOT NULL | |
| fecha_hora | timestamp NOT NULL | default now() |

Insumos o medicamentos que el veterinario indica como aplicados durante la consulta. Es una tabla puramente declarativa: **no mueve stock** ni contiene decisiones de cobro. El descuento real ocurre recién al liquidar la línea en una venta. No se pueden agregar insumos a una consulta cerrada (`fn_bloquea_insumo_consulta_cerrada`).

---

## 3. Caja Diaria (HU-VTA-03)

### `caja_apertura`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| caja_id | int FK → caja.id NOT NULL | |
| usuario_id | int FK → usuario.id NOT NULL | cajero que abre la jornada |
| monto_inicial | numeric(12,2) NOT NULL | CHECK monto_inicial >= 0 |
| fecha_apertura | timestamp NOT NULL | default now() |
| estado | boolean NOT NULL | default true (TRUE = abierta, FALSE = cerrada) |
| monto_contado | numeric(12,2) | dinero contado al cierre; obligatorio para cerrar |
| monto_esperado | numeric(12,2) | calculado por trigger al cerrar: inicial + ingresos − egresos |
| diferencia | numeric(12,2) GENERATED STORED | `monto_contado - monto_esperado`; positivo = sobrante, negativo = faltante |
| fecha_cierre | timestamp | asignada por trigger al cerrar |

Ciclo de apertura/cierre de una caja (una fila por jornada). Un CHECK obliga a que una caja abierta tenga `monto_contado`, `monto_esperado` y `fecha_cierre` en NULL, y una cerrada los tenga todos completos. Un índice único parcial impide tener más de una apertura con `estado = true` por caja. Una caja cerrada no puede reabrirse.

### `movimiento_caja`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| caja_apertura_id | int FK → caja_apertura.id NOT NULL | debe estar abierta (validado por trigger) |
| tipo | enum tipo_movimiento_caja NOT NULL | ingreso / egreso |
| monto | numeric(12,2) NOT NULL | CHECK monto > 0 |
| motivo | varchar(255) NOT NULL | concepto en texto libre |
| venta_id | int FK → venta.id (nullable) | NULL = carga manual del cajero; con valor = venta cuyo cobro en efectivo generó el ingreso automático |
| usuario_id | int FK → usuario.id NOT NULL | |
| fecha_hora | timestamp NOT NULL | default now() |

Ingresos y egresos de una caja abierta. No tiene atributo `origen`: `motivo` cubre cualquier concepto y `venta_id` es un FK real y tipado para el único origen automático existente. Cada movimiento actualiza `caja.saldo_actual` en tiempo real por trigger.

---

## 4. Ventas (HU-VTA-01)

### `venta`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| cliente_id | int FK → cliente.id NOT NULL | |
| sucursal_id | int FK → sucursal.id NOT NULL | |
| consulta_id | int FK → consulta_medica.id UNIQUE (nullable) | si tiene valor, la venta nace de una atención finalizada; la consulta debe estar cerrada y solo puede facturarse una vez |
| usuario_id | int FK → usuario.id NOT NULL | |
| fecha | timestamp NOT NULL | default now() |
| total | numeric(12,2) NOT NULL | default 0, CHECK total >= 0; recalculado por trigger como suma de `venta_detalle.subtotal` |
| estado | enum estado_documento NOT NULL | default 'vigente' |

Cabecera de venta (consulta + insumos + medicamentos + alimentos + accesorios). No existen subtotal ni impuestos: por indicación de cátedra no se calculan impuestos.

### `venta_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| venta_id | int FK → venta.id NOT NULL | ON DELETE CASCADE |
| articulo_id | int FK → articulo.id NOT NULL | |
| cantidad | int NOT NULL | unidades enteras (cada artículo se vende por unidad); CHECK cantidad > 0 |
| precio_unitario | numeric(12,2) NOT NULL | CHECK >= 0; siempre se completa por trigger desde `lista_precio` (lo enviado por el front se descarta) |
| subtotal | numeric(14,2) GENERATED STORED | `cantidad * precio_unitario` |
| consulta_medica_insumo_id | int FK → consulta_medica_insumo.id (nullable) | trazabilidad opcional; único entre líneas (un insumo indicado solo se factura una vez) |

Líneas de la venta. Si la línea proviene de un insumo indicado en una consulta, el artículo, la cantidad y la consulta se validan contra esa indicación. Cada línea insertada descuenta stock (reutilizando el mecanismo de movimientos de stock), y nunca antes de la venta.

---

## 5. Medios de Pago (HU-VTA-02)

### `venta_medio_pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| venta_id | int FK → venta.id NOT NULL | ON DELETE CASCADE |
| forma_pago_id | int FK → forma_pago.id NOT NULL | reutiliza el catálogo existente |
| monto | numeric(12,2) NOT NULL | CHECK monto > 0 |

Uno o varios medios de pago por venta (registro manual, sin pasarelas externas). La suma de montos debe igualar `venta.total`, validado por un constraint trigger DEFERRABLE INITIALLY DEFERRED, que permite cargar varias líneas en la misma transacción. Si la forma de pago es "efectivo", se genera automáticamente un ingreso en `movimiento_caja` sobre la caja abierta de la sucursal.

---

## 6. Ajuste sobre tabla existente

### `deposito` (columna agregada)
| Campo | Tipo | Notas |
|---|---|---|
| es_punto_venta | boolean NOT NULL | default false; TRUE = depósito de mostrador/punto de venta de la sucursal |

Un índice único parcial garantiza a lo sumo un depósito con `es_punto_venta = true` por sucursal. Contra ese depósito se descuenta el stock al registrar una venta.

---

## 7. Funciones y triggers

| Trigger | Tabla / evento | Función | Qué hace |
|---|---|---|---|
| trg_lista_precio_actualizar_vigencia | lista_precio, BEFORE UPDATE | fn_lista_precio_actualizar_vigencia | Si cambia el precio, `vigencia_desde` = hoy |
| trg_lista_precio_updated_at | lista_precio, BEFORE UPDATE | fn_touch_updated_at | Actualiza `updated_at` |
| trg_historial_precios | lista_precio, AFTER INSERT/UPDATE | fn_historial_precios | Cierra la vigencia anterior y abre la nueva en `historial_precios` |
| trg_turno_abrir_consulta | turno, AFTER UPDATE (cambio de estado) | fn_turno_abrir_consulta | Si el nuevo estado es `atendido`, crea la `consulta_medica` (ON CONFLICT DO NOTHING) |
| trg_bloquea_update_consulta_medica | consulta_medica, BEFORE UPDATE (si estaba cerrada) | fn_bloquea_update_consulta_medica | Rechaza modificar una consulta cerrada |
| trg_bloquea_insumo_consulta_cerrada | consulta_medica_insumo, BEFORE INSERT | fn_bloquea_insumo_consulta_cerrada | Rechaza insumos sobre consulta cerrada |
| trg_caja_calcular_cierre | caja_apertura, BEFORE UPDATE (cambio de estado) | fn_caja_calcular_cierre | Calcula `monto_esperado` y `fecha_cierre`; impide reabrir |
| trg_caja_actualizar_saldo_apertura | caja_apertura, AFTER INSERT | fn_caja_actualizar_saldo_apertura | `caja.saldo_actual` = monto inicial |
| trg_caja_movimiento_validar_abierta | movimiento_caja, BEFORE INSERT | fn_caja_movimiento_validar_abierta | Exige caja abierta |
| trg_caja_actualizar_saldo_movimiento | movimiento_caja, AFTER INSERT | fn_caja_actualizar_saldo_movimiento | Suma o resta al saldo de la caja |
| trg_venta_validar_consulta_cerrada | venta, BEFORE INSERT | fn_venta_validar_consulta_cerrada | La consulta vinculada debe estar cerrada |
| trg_venta_crear_movimiento_stock | venta, AFTER INSERT | fn_venta_crear_movimiento_stock | Crea la cabecera de egreso de stock en el depósito punto de venta |
| trg_venta_detalle_tomar_precio | venta_detalle, BEFORE INSERT | fn_venta_detalle_tomar_precio | Toma `precio_unitario` de `lista_precio` |
| trg_venta_detalle_validar_movimiento_insumo | venta_detalle, BEFORE INSERT | fn_venta_detalle_validar_movimiento_insumo | Valida artículo, cantidad y consulta del insumo indicado |
| trg_venta_detalle_descontar_stock | venta_detalle, AFTER INSERT | fn_venta_detalle_descontar_stock | Inserta el detalle del movimiento de stock |
| trg_venta_recalcular_totales | venta_detalle, AFTER INSERT/UPDATE/DELETE | fn_venta_recalcular_totales | Recalcula `venta.total` |
| trg_venta_medio_pago_validar_total | venta_medio_pago, AFTER INSERT (diferido) | fn_venta_medio_pago_validar_total | Suma de medios de pago = total de la venta |
| trg_venta_medio_pago_ingreso_caja | venta_medio_pago, AFTER INSERT | fn_venta_medio_pago_ingreso_caja | Si es efectivo, registra ingreso en la caja abierta |
| trg_auditoria_* | consulta_medica, consulta_medica_nota, consulta_medica_insumo, caja_apertura, movimiento_caja, venta, venta_detalle, venta_medio_pago | fn_auditoria | Registra el cambio en la bitácora genérica `auditoria` |

Además existe la función `fn_abm_lista_precio(modo, id, articulo_id, precio, usuario_id)`.

### Códigos de error personalizados (SQLSTATE)

| Código | Situación |
|---|---|
| HF041 | Modificar una consulta médica cerrada |
| HF042 | Cerrar la caja sin informar `monto_contado` |
| HF043 | Reabrir una caja ya cerrada |
| HF044 | Registrar un movimiento en una caja no abierta |
| HF045 | Sucursal sin depósito marcado como punto de venta |
| HF046 | Falta el origen de movimiento `venta` en `origen_movimiento` |
| HF047 | Artículo sin precio de venta cargado |
| HF048 | No se encontró el movimiento de stock asociado a la venta |
| HF049 | Artículo sin ficha de stock en el depósito de la venta |
| HF051 | Suma de medios de pago distinta del total de la venta |
| HF052 | Cobro en efectivo sin caja abierta en la sucursal |
| HF053 | El insumo de consulta indicado no existe |
| HF054 | El artículo de la línea no coincide con el insumo indicado |
| HF055 | El insumo pertenece a otra consulta distinta de la de la venta |
| HF058 | Agregar insumos a una consulta cerrada |
| HF059 | La cantidad de la línea no coincide con la del insumo indicado |
| HF060 | Facturar una consulta que aún no está cerrada |

---

## Relaciones (FKs) — resumen

```
lista_precio.articulo_id → articulo.id
lista_precio.usuario_id → usuario.id

historial_precios.articulo_id → articulo.id
historial_precios.usuario_id → usuario.id

consulta_medica.turno_id → turno.id
consulta_medica.cliente_id → cliente.id
consulta_medica.mascota_id → mascota.id
consulta_medica.usuario_id → usuario.id

consulta_medica_nota.consulta_id → consulta_medica.id (ON DELETE CASCADE)
consulta_medica_nota.usuario_id → usuario.id

consulta_medica_insumo.consulta_id → consulta_medica.id (ON DELETE CASCADE)
consulta_medica_insumo.articulo_id → articulo.id
consulta_medica_insumo.usuario_id → usuario.id

caja_apertura.caja_id → caja.id
caja_apertura.usuario_id → usuario.id

movimiento_caja.caja_apertura_id → caja_apertura.id
movimiento_caja.venta_id → venta.id
movimiento_caja.usuario_id → usuario.id

venta.cliente_id → cliente.id
venta.sucursal_id → sucursal.id
venta.consulta_id → consulta_medica.id
venta.usuario_id → usuario.id

venta_detalle.venta_id → venta.id (ON DELETE CASCADE)
venta_detalle.articulo_id → articulo.id
venta_detalle.consulta_medica_insumo_id → consulta_medica_insumo.id

venta_medio_pago.venta_id → venta.id (ON DELETE CASCADE)
venta_medio_pago.forma_pago_id → forma_pago.id
```

---

## Reglas de negocio

**Forzadas por la base (constraints, índices o triggers):**

- Un solo precio vigente por artículo (`lista_precio.articulo_id` UNIQUE); un solo período abierto por artículo en `historial_precios`.
- Una sola consulta médica por turno; una consulta cerrada es inmutable y solo admite notas.
- Una sola caja abierta por caja física; una caja cerrada no se reabre; solo se registran movimientos en cajas abiertas.
- Una consulta se factura una sola vez (`venta.consulta_id` UNIQUE) y solo si está cerrada.
- Un insumo indicado en una consulta se factura una sola vez.
- El precio de cada línea de venta siempre proviene de `lista_precio`.
- La suma de los medios de pago debe igualar el total de la venta (validado al COMMIT).
- A lo sumo un depósito punto de venta por sucursal.

**No forzadas por constraints (van en backend / funciones ABM):**

- El stock físico se descuenta únicamente al registrar la venta, nunca al indicar un insumo en la consulta; mientras la consulta esté sin facturar, el insumo indicado sigue contando como stock disponible.
- El catálogo `origen_movimiento` debe contener la fila `venta`, y cada sucursal debe tener su depósito con `es_punto_venta = true`.
- Los artículos deben tener `ficha_stock` en el depósito punto de venta de la sucursal.
- Para que el ingreso automático en efectivo funcione, la forma de pago debe llamarse `efectivo` (comparación sin distinguir mayúsculas).
- Los combos deben filtrar artículos con `estado = 'activo'`.
- Pendiente de comunicar: corregir en el Backlog el criterio de aceptación de HU-VTA-01 que menciona el cálculo de impuestos.

---

## Ejemplos de datos registrados

> Los IDs de tablas de Sprints anteriores (artículos, clientes, usuarios, etc.) son ilustrativos. Todos los ejemplos forman un mismo escenario coherente: una consulta con vacunación, su cobro mixto y el cierre de caja de esa jornada (25/09/2026).

### `lista_precio`
| id | articulo_id | precio | vigencia_desde | usuario_id | fecha_registro | updated_at |
|---|---|---|---|---|---|---|
| 1 | 3 | 15000.00 | 2026-03-01 | 2 | 2026-03-01 09:10:00 | 2026-03-01 09:10:00 |
| 2 | 12 | 8500.00 | 2026-09-01 | 2 | 2026-03-01 09:12:00 | 2026-09-01 08:45:00 |

El artículo 12 se cargó con otro precio en marzo y se actualizó in place el 01/09/2026.

### `historial_precios`
| id | articulo_id | precio | vigencia_desde | vigencia_hasta | usuario_id | fecha_hora |
|---|---|---|---|---|---|---|
| 1 | 3 | 15000.00 | 2026-03-01 | NULL | 2 | 2026-03-01 09:10:00 |
| 2 | 12 | 7000.00 | 2026-03-01 | 2026-08-31 | 2 | 2026-03-01 09:12:00 |
| 3 | 12 | 8500.00 | 2026-09-01 | NULL | 2 | 2026-09-01 08:45:00 |

### `consulta_medica`
| id | turno_id | cliente_id | mascota_id | usuario_id | fecha_hora | motivo_consulta | diagnostico | tratamiento | medicacion_indicada | temperatura | frecuencia_cardiaca | peso | estado_fisico_general | cerrada | fecha_cierre |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 31 | 5 | 8 | 7 | 2026-09-25 10:30:00 | Control anual y vacunación | Animal sano, sin hallazgos | Vacunación antirrábica anual | Ninguna | 38.5 | 110 | 24.30 | Buen estado, mucosas rosadas | true | 2026-09-25 11:05:00 |
| 2 | 34 | 9 | 14 | 7 | 2026-09-26 16:00:00 | Consulta generada automáticamente al marcar el turno como atendido | NULL | NULL | NULL | NULL | NULL | NULL | NULL | false | NULL |

La fila 2 muestra una consulta recién abierta por el trigger al marcar el turno como `atendido`, con los campos clínicos aún sin completar.

### `consulta_medica_nota`
| id | consulta_id | usuario_id | nota | fecha_hora |
|---|---|---|---|---|
| 1 | 1 | 7 | Se aclara que la próxima revisión se recomienda en 12 meses. | 2026-09-25 17:20:00 |

### `consulta_medica_insumo`
| id | consulta_id | articulo_id | cantidad | usuario_id | fecha_hora |
|---|---|---|---|---|---|
| 1 | 1 | 12 | 1 | 7 | 2026-09-25 10:50:00 |

### `caja_apertura`
| id | caja_id | usuario_id | monto_inicial | fecha_apertura | estado | monto_contado | monto_esperado | diferencia | fecha_cierre |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 4 | 20000.00 | 2026-09-25 08:00:00 | false | 27300.00 | 27500.00 | -200.00 | 2026-09-25 18:30:00 |
| 2 | 1 | 4 | 18000.00 | 2026-09-26 08:05:00 | true | NULL | NULL | NULL | NULL |

La apertura 1 está cerrada: esperado = 20000 + 10000 (ingresos) − 2500 (egresos) = 27500; el cajero contó 27300, por lo que hay un faltante de 200. La apertura 2 sigue abierta.

### `movimiento_caja`
| id | caja_apertura_id | tipo | monto | motivo | venta_id | usuario_id | fecha_hora |
|---|---|---|---|---|---|---|---|
| 1 | 1 | ingreso | 10000.00 | Cobro venta N° 1 | 1 | 4 | 2026-09-25 12:15:00 |
| 2 | 1 | egreso | 2500.00 | Compra de artículos de limpieza | NULL | 4 | 2026-09-25 15:40:00 |

El movimiento 1 lo generó automáticamente el cobro en efectivo (con `venta_id`); el 2 es una carga manual del cajero.

### `venta`
| id | cliente_id | sucursal_id | consulta_id | usuario_id | fecha | total | estado |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 1 | 1 | 4 | 2026-09-25 12:15:00 | 23500.00 | vigente |
| 2 | 11 | 1 | NULL | 4 | 2026-09-26 09:30:00 | 8500.00 | vigente |

La venta 1 nace de la consulta 1; la venta 2 es una venta directa de mostrador (sin consulta).

### `venta_detalle`
| id | venta_id | articulo_id | cantidad | precio_unitario | subtotal | consulta_medica_insumo_id |
|---|---|---|---|---|---|---|
| 1 | 1 | 3 | 1 | 15000.00 | 15000.00 | NULL |
| 2 | 1 | 12 | 1 | 8500.00 | 8500.00 | 1 |
| 3 | 2 | 12 | 1 | 8500.00 | 8500.00 | NULL |

La línea 2 factura el insumo indicado en la consulta (trazado por `consulta_medica_insumo_id`); el total de la venta 1 es 15000 + 8500 = 23500.

### `venta_medio_pago`
| id | venta_id | forma_pago_id | monto |
|---|---|---|---|
| 1 | 1 | 1 (efectivo) | 10000.00 |
| 2 | 1 | 3 (tarjeta) | 13500.00 |
| 3 | 2 | 2 (transferencia) | 8500.00 |

En la venta 1 el pago fue mixto (10000 + 13500 = 23500 = total). Solo la parte en efectivo generó el ingreso en caja.

### `deposito` (columna `es_punto_venta`)
| id | sucursal_id | nombre | es_punto_venta |
|---|---|---|---|
| 1 | 1 | Mostrador | true |
| 2 | 1 | Depósito central | false |

Solo se muestran las columnas relevantes al incremento (`nombre` es ilustrativo). El stock de las ventas anteriores se descontó del depósito 1.
