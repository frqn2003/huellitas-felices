# Esquema de Base de Datos — Diccionario de Datos (schema2.sql)

> Diccionario de datos generado a partir del dump `schema2.sql` (PostgreSQL 18.6, dump del 2026-09-13).

---

## Enums

| Enum | Valores |
|---|---|
| estado_activo_inactivo | activo, inactivo |
| estado_documento | vigente, anulado, pagado |
| modo_abm | INSERCION, EDICION, LECTURA |
| tipo_evento_sesion | login, logout, login_fallido, bloqueado |
| tipo_movimiento_stock | ingreso, egreso |
| tipo_observacion_recepcion | faltante, danado, error |
| tipo_operacion_auditoria | INSERT, UPDATE, DELETE |
| tipo_pago | pago_proveedor |
| tipo_recepcion | parcial, total |

> `tipo_observacion_recepcion` y `tipo_recepcion` están definidos en el esquema pero, a la fecha del dump, ninguna columna de ninguna tabla los utiliza.

---

## 1. Sucursales, Depósitos, Caja y Agenda

### `sucursal`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(100) NOT NULL | |
| direccion | varchar(255) NOT NULL | |
| telefono | varchar(30) | |
| horario_atencion | varchar(255) | |
| razon_social | varchar(150) NOT NULL | dato fiscal: razón social con la que la sucursal factura |
| cuit | varchar(20) NOT NULL | dato fiscal |
| ingresos_brutos | varchar(30) | |
| condicion_iva | varchar(40) | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now() |

Sucursales de la empresa; cada una opera con caja, agenda y depósito de stock propios e independientes.

### `deposito`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| sucursal_id | int NOT NULL FK → sucursal.id | |
| nombre | varchar(100) NOT NULL | |
| ubicacion | varchar(150) | |

### `caja`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| sucursal_id | int NOT NULL FK → sucursal.id | |
| nombre | varchar(100) NOT NULL | default 'Caja principal' |
| saldo_actual | numeric(12,2) NOT NULL | default 0 |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |

Estructura mínima: se crea automáticamente 1 por sucursal. Se ampliará con movimientos de caja / arqueos cuando se desarrolle ese módulo.

### `agenda`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| sucursal_id | int NOT NULL FK → sucursal.id | |
| nombre | varchar(100) NOT NULL | default 'Agenda principal' |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| created_at | timestamp NOT NULL | default now() |

Estructura mínima: se crea automáticamente 1 por sucursal. Se ampliará con turnos/franjas horarias cuando se desarrolle ese módulo.

---

## 2. Roles, Usuarios y Auditoría

### `rol`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(50) UNIQUE NOT NULL | Administrador, Gerente, Veterinario, Recepcionista, Personal de depósito, Cajero |

### `usuario`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| rol_id | int NOT NULL FK → rol.id | |
| sucursal_id | int (nullable) FK → sucursal.id | |
| nombre | varchar(80) NOT NULL | |
| apellido | varchar(80) NOT NULL | |
| dni | varchar(20) NOT NULL | |
| email | varchar(120) NOT NULL | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| fecha_creacion | timestamp NOT NULL | default now() |
| auth_id | uuid UNIQUE (nullable) | vínculo 1 a 1 con auth.users(id) de Supabase Auth, ON DELETE CASCADE; nullable hasta backfill |
| intentos_fallidos | smallint NOT NULL | default 0, CHECK entre 0 y 3 |
| bloqueado_hasta | timestamp (nullable) | si es futuro, el login se rechaza antes de invocar Supabase Auth |

### `auditoria`
| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| tabla | varchar(50) NOT NULL | nombre de la tabla origen (usuario, articulo, proveedor, orden_compra, movimiento_stock_cab, deposito) |
| operacion | enum tipo_operacion_auditoria NOT NULL | |
| registro_id | int NOT NULL | PK (columna id) del registro afectado en la tabla origen |
| usuario_id | int (nullable) FK → usuario.id, ON DELETE SET NULL | responsable del cambio, tomado de la variable de sesión app.usuario_id; puede ser NULL en procesos batch |
| fecha_hora | timestamp NOT NULL | default now() |
| valores_anteriores | jsonb | snapshot completo de la fila ANTES del cambio (NULL en INSERT) |
| valores_nuevos | jsonb | snapshot completo de la fila DESPUÉS del cambio (NULL en DELETE) |

CHECK `ck_auditoria_valores`: si `operacion = INSERT` → `valores_anteriores` NULL y `valores_nuevos` NOT NULL; si `operacion = UPDATE` → ambos NOT NULL; si `operacion = DELETE` → `valores_anteriores` NOT NULL y `valores_nuevos` NULL. Bitácora general: cada fila es un evento (alta/modificación/baja) de una entidad auditada.

### `auditoria_sesion`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| usuario_id | int (nullable) FK → usuario.id, ON DELETE SET NULL | |
| evento | enum tipo_evento_sesion NOT NULL | login / logout / login_fallido / bloqueado |
| fecha_hora | timestamp NOT NULL | default now() |
| ip_origen | inet | |
| detalle | jsonb | payload crudo de auth.audit_log_entries |

Bitácora de login/logout, alimentada automáticamente desde auth.audit_log_entries de Supabase mediante trigger (no inserción manual). Tabla aparte de `auditoria` porque un login no es un cambio de fila de una tabla de negocio.

---

## 3. Proveedores

### `proveedor`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| razon_social | varchar(150) NOT NULL | |
| cuit | varchar(20) NOT NULL | |
| direccion | varchar(255) | |
| telefono | varchar(30) | |
| email | varchar(120) | |
| contacto | varchar(100) | |
| plazo_entrega_dias | int | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| calificacion | numeric(3,1) | evaluación de desempeño |

### `forma_pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(100) UNIQUE NOT NULL | |

Catálogo único de condiciones de pago. Se expone por GET /api/formas-pago y GET /api/condiciones-pago: mismo catálogo, dos preguntas distintas (qué acepta un proveedor / qué se pactó en una compra). El front no debe tener su propia lista hardcodeada.

### `proveedor_forma_pago` (N a N)
| Campo | Tipo | Notas |
|---|---|---|
| proveedor_id | int NOT NULL FK → proveedor.id, ON DELETE CASCADE | PK compuesta |
| forma_pago_id | int NOT NULL FK → forma_pago.id | PK compuesta |

N:M — un proveedor acepta varias formas de pago. ON DELETE CASCADE solo del lado proveedor: si se borra un proveedor caen sus pares, pero una forma de pago del catálogo nunca se borra si está en uso.

---

## 4. Artículos y Stock

### `categoria`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(100) UNIQUE NOT NULL | |
| prefijo | varchar(5) UNIQUE NOT NULL | default 'ART' |

### `unidad_medida`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(50) UNIQUE NOT NULL | |

### `fabricante`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(100) UNIQUE NOT NULL | |
| pais | varchar(60) | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |

### `presentacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(50) UNIQUE NOT NULL | |

### `articulo`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| categoria_id | int NOT NULL FK → categoria.id | |
| unidad_medida_id | int NOT NULL FK → unidad_medida.id | |
| codigo | varchar(30) UNIQUE NOT NULL | |
| nombre | varchar(150) NOT NULL | |
| descripcion | text | |
| estado | enum estado_activo_inactivo NOT NULL | default activo |
| fabricante_id | int NOT NULL FK → fabricante.id | |
| imagen_url | varchar(255) | URL de la imagen representativa del artículo |
| created_at | timestamp NOT NULL | default now() |
| updated_at | timestamp NOT NULL | default now() |
| contenido_neto | numeric(10,2) NOT NULL | default 1, CHECK > 0 |
| presentacion_id | int NOT NULL FK → presentacion.id | |

El costo de compra y el precio de venta no viven en `articulo` (ver detalle de OC / comprobante). El lote y la fecha de vencimiento se manejan en la tabla `lote_vencimiento`, no en `articulo`.

### `ficha_stock`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| articulo_id | int NOT NULL FK → articulo.id | |
| deposito_id | int NOT NULL FK → deposito.id | |
| stock_actual | numeric(12,2) NOT NULL | default 0 |
| stock_minimo | numeric(10,2) NOT NULL | default 0, CHECK >= 0 |
| stock_critico | numeric(10,2) (nullable) | CHECK: si no es NULL, >= 0 y <= stock_minimo |

UNIQUE (articulo_id, deposito_id).

### `lote_vencimiento`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| ficha_stock_id | int NOT NULL FK → ficha_stock.id | |
| numero_lote | varchar NOT NULL | |
| fecha_vencimiento | date (nullable) | |
| cantidad | numeric NOT NULL | default 0, CHECK >= 0 |
| created_at | timestamp NOT NULL | default now() |

UNIQUE (ficha_stock_id, numero_lote). Detalle de lotes con su vencimiento y cantidad para una ficha de stock (artículo + depósito) puntual.

### `origen_movimiento`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(40) UNIQUE NOT NULL | categoría del origen (venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma) |

### `movimiento_stock_cab`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| numero | varchar(30) UNIQUE NOT NULL | correlativo autogenerado (MOV-000001, vía secuencia) |
| deposito_id | int NOT NULL FK → deposito.id | |
| tipo | enum tipo_movimiento_stock NOT NULL | ingreso / egreso |
| origen_id | int NOT NULL FK → origen_movimiento.id | categoría del origen del movimiento |
| origen_entidad_id | int (nullable) | id de la entidad origen (venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia_detalle, etc.) según `origen_id` |
| fecha_hora | timestamp NOT NULL | default now() |
| usuario_id | int NOT NULL FK → usuario.id | |
| motivo | varchar(255) | |
| movimiento_vinculado_id | int (nullable) FK → movimiento_stock_cab.id | auto-referencia: enlaza el egreso en origen con el ingreso en destino de una transferencia; CHECK no puede autovincularse |

Cabecera de movimiento de stock. Un movimiento puede afectar varios artículos.

### `movimiento_stock_det`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| movimiento_id | int NOT NULL FK → movimiento_stock_cab.id, ON DELETE CASCADE | |
| ficha_stock_id | int NOT NULL FK → ficha_stock.id | |
| cantidad | numeric(12,2) NOT NULL | siempre POSITIVA; el signo lo determina `tipo` de la cabecera (ingreso suma, egreso resta); CHECK > 0 |

UNIQUE (movimiento_id, ficha_stock_id).

---

## 5. Compras: Órdenes de Compra, Solicitudes y Cotizaciones

### `estado_orden_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(30) UNIQUE NOT NULL | |
| es_final | boolean NOT NULL | default false |

### `orden_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| proveedor_id | int NOT NULL FK → proveedor.id | |
| cod_ord | varchar(30) UNIQUE NOT NULL | correlativo autogenerado (OC-000001, vía secuencia) |
| cotizacion_id | int (nullable) FK → cotizacion.id | |
| usuario_id | int NOT NULL FK → usuario.id | |
| estado_id | smallint NOT NULL FK → estado_orden_compra.id | default 1 |
| fecha | timestamp NOT NULL | default now() |
| fecha_entrega | timestamp (nullable) | |
| notas | text | |
| subtotal | numeric(12,2) | |
| descuento | numeric(12,2) | PORCENTAJE 0-100, no un monto; el monto se calcula sobre el subtotal |
| gastos_envio | numeric(12,2) | |
| total | numeric(12,2) NOT NULL | |
| deposito_id | int (nullable) FK → deposito.id | |
| forma_pago_id | int NOT NULL FK → forma_pago.id | |

CHECK `ck_oc_importes`: subtotal, total y gastos_envio >= 0; descuento entre 0 y 100.

### `orden_compra_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| orden_compra_id | int NOT NULL FK → orden_compra.id | |
| articulo_id | int NOT NULL FK → articulo.id | |
| cantidad | numeric(12,2) NOT NULL | CHECK > 0 |
| precio_acordado | numeric(12,2) NOT NULL | CHECK >= 0 |
| subtotal | numeric(12,2) NOT NULL | |

### `solicitud_cotizacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| usuario_id | int NOT NULL FK → usuario.id | |
| fecha | timestamp NOT NULL | default now() |
| estado | varchar(20) NOT NULL | default 'Abierta'; CHECK IN (Abierta, Adjudicada, Cancelada) |
| notas | text | |

Pedido de cotización: define los mismos artículos sobre los que después se comparan las ofertas de varios proveedores.

### `solicitud_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| solicitud_id | int NOT NULL FK → solicitud_cotizacion.id, ON DELETE CASCADE | |
| articulo_id | int NOT NULL FK → articulo.id | |
| cantidad_estimada | numeric(12,2) NOT NULL | CHECK > 0 |
| nota | text | |

UNIQUE (solicitud_id, articulo_id).

### `cotizacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| solicitud_id | int NOT NULL FK → solicitud_cotizacion.id, ON DELETE CASCADE | |
| proveedor_id | int NOT NULL FK → proveedor.id | |
| forma_pago_id | int NOT NULL FK → forma_pago.id | |
| fecha_recepcion | timestamp NOT NULL | default now() |

UNIQUE (solicitud_id, proveedor_id).

### `cotizacion_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| cotizacion_id | int NOT NULL FK → cotizacion.id, ON DELETE CASCADE | |
| articulo_id | int NOT NULL FK → articulo.id | |
| precio | numeric(12,2) NOT NULL | CHECK >= 0 |

UNIQUE (cotizacion_id, articulo_id).

---

## 6. Comprobantes de Proveedor y Notificaciones de Compra

### `tipo_comprobante`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(30) UNIQUE NOT NULL | Factura, Nota de Crédito, Nota de Débito |
| afecta_saldo | smallint NOT NULL | default 1; Factura/ND = +1, NC = -1. CHECK IN (1, -1). Usado por vista_cuenta_corriente_proveedor para el signo del saldo |
| prefijo | varchar(5) UNIQUE NOT NULL | default 'COM' |

### `comprobante_proveedor`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| proveedor_id | int NOT NULL FK → proveedor.id | |
| tipo_comprobante_id | int NOT NULL FK → tipo_comprobante.id | |
| letra | varchar(2) NOT NULL | |
| punto_venta | varchar(4) NOT NULL | |
| numero_comprobante | varchar(8) NOT NULL | |
| fecha_emision | date NOT NULL | |
| fecha_vencimiento | date NOT NULL | CHECK >= fecha_emision |
| orden_compra_id | int NOT NULL FK → orden_compra.id | |
| comprobante_corregido_id | int (nullable) FK → comprobante_proveedor.id | NC/ND legítima que AJUSTA el monto de una factura (ej. devolución parcial); documento nuevo con su propio monto_total/afecta_saldo, entra en el cálculo de saldo como cualquier comprobante vigente; CHECK no puede autorreferenciarse |
| anula_comprobante_id | int (nullable) FK → comprobante_proveedor.id | anula por completo un comprobante cargado por ERROR: solo marca estado='anulado' en el original, no toca montos ni pagos ya imputados; CHECK no puede autorreferenciarse |
| monto_total | numeric(12,2) NOT NULL | CHECK >= 0 |
| estado | enum estado_documento NOT NULL | default vigente |
| usuario_id | int NOT NULL FK → usuario.id | |
| fecha_registro | timestamp NOT NULL | default now() |

UNIQUE (proveedor_id, tipo_comprobante_id, letra, punto_venta, numero_comprobante). No se modifica una vez registrado (trigger de bloqueo de UPDATE), salvo el propio trigger interno que setea estado='anulado'.

### `comprobante_proveedor_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| comprobante_id | int NOT NULL FK → comprobante_proveedor.id, ON DELETE CASCADE | |
| articulo_id | int NOT NULL FK → articulo.id | |
| cantidad | numeric(12,2) NOT NULL | CHECK > 0 |
| precio_facturado | numeric(12,2) NOT NULL | CHECK >= 0 |
| subtotal | numeric(14,2) GENERATED | cantidad * precio_facturado (columna calculada, STORED) |

Líneas del comprobante — puede facturar varios artículos de la misma OC.

### `notificacion_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| orden_compra_detalle_id | int NOT NULL FK → orden_compra_detalle.id, ON DELETE CASCADE, UNIQUE | línea de orden_compra_detalle contra la que se compara lo recibido |
| usuario_responsable_id | int NOT NULL FK → usuario.id | responsable de compras (usuario_id de la OC) |
| cantidad_solicitada | numeric(12,2) NOT NULL | cantidad pactada en orden_compra_detalle |
| cantidad_recibida | numeric(12,2) NOT NULL | cantidad total recibida acumulada a la fecha (suma de todas las entregas parciales) |
| diferencia | numeric(12,2) GENERATED | recibida - solicitada (columna calculada, STORED). Positivo = recibido de más, negativo = faltante |
| mensaje | varchar(255) NOT NULL | |
| fecha_hora | timestamp NOT NULL | default now() |
| leida | boolean NOT NULL | default false |

CHECK `chk_notificacion_compra_diferencia`: cantidad_recibida <> cantidad_solicitada. Notifica al responsable de compras cuando difiere lo recibido de lo solicitado. Una notificación viva por línea de OC; se actualiza con cada entrega parcial y se borra al resolverse la diferencia.

---

## 7. Pagos

### `pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| tipo | enum tipo_pago NOT NULL | actualmente el único valor disponible es pago_proveedor |
| proveedor_id | int NOT NULL FK → proveedor.id | |
| monto | numeric(12,2) NOT NULL | CHECK > 0 |
| fecha | date NOT NULL | default CURRENT_DATE |
| forma_pago_id | int NOT NULL FK → forma_pago.id | |
| numero_comprobante | varchar(30) UNIQUE NOT NULL | a diferencia de comprobante_proveedor, este número NO se autogenera por trigger: es el número de recibo/cheque/comprobante externo que trae el pago |
| anula_pago_id | int (nullable) FK → pago.id | CHECK no puede autorreferenciarse |
| estado | enum estado_documento NOT NULL | default vigente |
| usuario_id | int NOT NULL FK → usuario.id | |
| fecha_registro | timestamp NOT NULL | default now() |

Pagos a proveedores. Inmutable tras el INSERT (trigger de bloqueo de UPDATE), salvo el propio trigger interno de estado. Se anula registrando un pago NUEVO con anula_pago_id → pago original; ese trigger solo marca estado='anulado', no borra pago_imputacion (se conserva el historial completo). Un eventual pago de reemplazo es un INSERT independiente, sin relación estructural con el anulado, con sus propias pago_imputacion.

### `pago_imputacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| pago_id | int NOT NULL FK → pago.id, ON DELETE CASCADE | |
| comprobante_proveedor_id | int NOT NULL FK → comprobante_proveedor.id | |
| monto_imputado | numeric(12,2) NOT NULL | CHECK > 0 |

Relación 1 a muchos entre un pago y los comprobantes que cancela. Validaciones aplicadas mediante triggers BEFORE INSERT, calculadas al vuelo con subquery (no contra una columna cacheada): (1) la suma imputada en este pago no supera pago.monto; (2) la suma imputada HISTÓRICA de este comprobante (entre todos los pagos vigentes que lo tocaron) no supera su monto_total. Un trigger adicional valida que el comprobante imputado pertenezca al mismo proveedor que pago.proveedor_id.

---

## Relaciones (FKs) — resumen

```
usuario.rol_id → rol.id
usuario.sucursal_id → sucursal.id (nullable)

agenda.sucursal_id → sucursal.id
caja.sucursal_id → sucursal.id
deposito.sucursal_id → sucursal.id

auditoria.usuario_id → usuario.id (ON DELETE SET NULL)
auditoria_sesion.usuario_id → usuario.id (ON DELETE SET NULL)

proveedor_forma_pago.proveedor_id → proveedor.id (ON DELETE CASCADE)
proveedor_forma_pago.forma_pago_id → forma_pago.id

articulo.categoria_id → categoria.id
articulo.unidad_medida_id → unidad_medida.id
articulo.fabricante_id → fabricante.id
articulo.presentacion_id → presentacion.id

ficha_stock.articulo_id → articulo.id
ficha_stock.deposito_id → deposito.id
lote_vencimiento.ficha_stock_id → ficha_stock.id

movimiento_stock_cab.deposito_id → deposito.id
movimiento_stock_cab.origen_id → origen_movimiento.id
movimiento_stock_cab.usuario_id → usuario.id
movimiento_stock_cab.movimiento_vinculado_id → movimiento_stock_cab.id
movimiento_stock_det.movimiento_id → movimiento_stock_cab.id (ON DELETE CASCADE)
movimiento_stock_det.ficha_stock_id → ficha_stock.id

orden_compra.proveedor_id → proveedor.id
orden_compra.usuario_id → usuario.id
orden_compra.estado_id → estado_orden_compra.id
orden_compra.cotizacion_id → cotizacion.id (nullable)
orden_compra.deposito_id → deposito.id (nullable)
orden_compra.forma_pago_id → forma_pago.id
orden_compra_detalle.orden_compra_id → orden_compra.id
orden_compra_detalle.articulo_id → articulo.id

solicitud_cotizacion.usuario_id → usuario.id
solicitud_detalle.solicitud_id → solicitud_cotizacion.id (ON DELETE CASCADE)
solicitud_detalle.articulo_id → articulo.id
cotizacion.solicitud_id → solicitud_cotizacion.id (ON DELETE CASCADE)
cotizacion.proveedor_id → proveedor.id
cotizacion.forma_pago_id → forma_pago.id
cotizacion_detalle.cotizacion_id → cotizacion.id (ON DELETE CASCADE)
cotizacion_detalle.articulo_id → articulo.id

comprobante_proveedor.proveedor_id → proveedor.id
comprobante_proveedor.tipo_comprobante_id → tipo_comprobante.id
comprobante_proveedor.orden_compra_id → orden_compra.id
comprobante_proveedor.comprobante_corregido_id → comprobante_proveedor.id (nullable)
comprobante_proveedor.anula_comprobante_id → comprobante_proveedor.id (nullable)
comprobante_proveedor.usuario_id → usuario.id
comprobante_proveedor_detalle.comprobante_id → comprobante_proveedor.id (ON DELETE CASCADE)
comprobante_proveedor_detalle.articulo_id → articulo.id

notificacion_compra.orden_compra_detalle_id → orden_compra_detalle.id (ON DELETE CASCADE)
notificacion_compra.usuario_responsable_id → usuario.id

pago.proveedor_id → proveedor.id
pago.forma_pago_id → forma_pago.id
pago.anula_pago_id → pago.id (nullable)
pago.usuario_id → usuario.id
pago_imputacion.pago_id → pago.id (ON DELETE CASCADE)
pago_imputacion.comprobante_proveedor_id → comprobante_proveedor.id
```
