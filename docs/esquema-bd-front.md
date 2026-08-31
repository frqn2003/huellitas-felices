# Esquema de Base de Datos — Huellitas Felices

> Diccionario de datos. Se actualiza cada vez que el DBA entrega un nuevo script/DBML. Usar como referencia junto con `_plantilla.md` al armar cada HU.

---

## Enums

| Enum | Valores |
|---|---|
| estado_activo_inactivo | activo, inactivo |
| tipo_movimiento_stock | ingreso, egreso |
| estado_documento | vigente, anulado |
| tipo_recepcion | parcial, total |
| tipo_observacion_recepcion | faltante, danado, error |
| tipo_pago | pago_proveedor, cobranza_cliente |
| tipo_operacion_auditoria | INSERT, UPDATE, DELETE |
| tipo_evento_sesion | login, logout |

---

## 1. Roles, Usuarios y Auditoría

### `rol`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(50) UNIQUE | Administrador, Gerente, Veterinario, Recepcionista, Personal de depósito, Cajero |

### `usuario`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| rol_id | int FK → rol.id | |
| nombre, apellido | varchar(80) | |
| dni | varchar(20) UNIQUE | |
| email | varchar(120) UNIQUE | |
| estado | enum estado_activo_inactivo | default activo |
| fecha_creacion | timestamp | default now() |
| auth_id | uuid UNIQUE | vínculo 1 a 1 con auth de Supabase |
| intentos_fallidos | smallint | default 0, CHECK 0–3 |
| bloqueado_hasta | timestamp | si es futuro, bloquea login |

### `auth_users`
- id uuid PK (gestionada por Supabase Auth, fuera del esquema de negocio)

### `auditoria`
| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| tabla | varchar(50) | nombre de la tabla origen |
| operacion | enum tipo_operacion_auditoria | |
| registro_id | int | PK del registro afectado |
| usuario_id | int (nullable) | |
| fecha_hora | timestamp | default now() |
| valores_anteriores | jsonb | NULL en INSERT |
| valores_nuevos | jsonb | NULL en DELETE |

### `auditoria_sesion`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK | |
| usuario_id | int (SET NULL) | |
| evento | enum tipo_evento_sesion | login / logout |
| fecha_hora | timestamp | |
| ip_origen | inet | |
| detalle | jsonb | payload crudo |

---

## 2. Proveedores

### `proveedor`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| razon_social | varchar(150) NOT NULL | |
| forma_pago_id | int FK → forma_pago.id | |
| cuit | varchar(20) NOT NULL | |
| direccion | varchar(255) | |
| telefono | varchar(30) | |
| email | varchar(120) | |
| contacto | varchar(100) | |
| plazo_entrega_dias | int | |
| estado | enum estado_activo_inactivo | default activo |
| calificacion | numeric(3,1) | evaluación de desempeño |
| saldo_actual | decimal(12,2) | cta. cte.; positivo = adeudado al proveedor |

### `forma_pago`
- id serial PK
- nombre varchar(100) UNIQUE

### `proveedor_forma_pago` (N a N)
- proveedor_id FK, forma_pago_id FK → PK compuesta

---

## 3. Artículos y Stock

### `categoria`
- id, nombre UNIQUE, prefijo varchar(5) UNIQUE default 'ART'

### `unidad_medida`
- id, nombre UNIQUE

### `fabricante`
- id, nombre UNIQUE, pais, estado

### `articulo`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| categoria_id | int FK NOT NULL | |
| unidad_medida_id | int FK NOT NULL | |
| codigo | varchar(30) NOT NULL | |
| nombre | varchar(150) NOT NULL | |
| descripcion | text | |
| estado | enum | activo/inactivo |
| numero_lote | varchar(60) | |
| fecha_vencimiento | date | |
| fabricante_id | int FK NOT NULL | |
| imagen_url | varchar(255) | |
| created_at, updated_at | timestamp | |

El costo de compra y el precio de venta no viven en `articulo` (ver detalle de OC / recepción / comprobante).

### `deposito`
- id, sucursal_id, nombre, ubicacion

### `ficha_stock`
- id, articulo_id FK, deposito_id FK, stock_actual, stock_minimo, stock_critico. UNIQUE(articulo_id, deposito_id)

### `origen_movimiento`
- catálogo: venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma, transferencia

### `movimiento_stock_cab`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| numero | varchar(30) UNIQUE | |
| deposito_id | int FK NOT NULL | |
| tipo | enum tipo_movimiento_stock | ingreso/egreso |
| origen_id | int FK NOT NULL | categoría del origen |
| origen_entidad_id | int (nullable) | id de la entidad que generó el movimiento |
| fecha_hora | timestamp | default now() |
| usuario_id | int FK NOT NULL | |
| motivo | varchar(255) | |
| movimiento_vinculado_id | int (auto FK, nullable) | enlaza egreso/ingreso en transferencias |

### `movimiento_stock_det`
- id, movimiento_id FK (cascade), ficha_stock_id FK, cantidad (>0). UNIQUE(movimiento_id, ficha_stock_id)

---

## 4. Compras y Abastecimiento

### `estado_orden_compra`
- id, nombre UNIQUE, es_final boolean

### `orden_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| proveedor_id | int FK NOT NULL | |
| cod_ord | varchar(30) NOT NULL | número de OC visible |
| cotizacion_id | int (nullable) | |
| usuario_id | int FK NOT NULL | |
| estado_id | smallint default 1 | FK → estado_orden_compra |
| fecha | timestamp | default now() |
| fecha_entrega | timestamp (nullable) | |
| notas | text | |
| subtotal, descuento, gastos_envio, total | numeric(12,2) | descuento en % |
| deposito_id | int (nullable) | |
| forma_pago_id | int FK NOT NULL | |

### `orden_compra_detalle`
- id, orden_compra_id FK, articulo_id FK, cantidad (>0), precio_acordado (≥0), subtotal

### `solicitud_cotizacion`
- id, usuario_id FK, fecha, estado (Abierta/Adjudicada/Cancelada), notas

### `solicitud_detalle`
- id, solicitud_id FK (cascade), articulo_id FK, cantidad_estimada (>0), nota. UNIQUE(solicitud_id, articulo_id)

### `cotizacion`
- id, solicitud_id FK (cascade), proveedor_id FK, forma_pago_id FK, fecha_recepcion. UNIQUE(solicitud_id, proveedor_id)

### `cotizacion_detalle`
- id, cotizacion_id FK (cascade), articulo_id FK, precio (≥0). UNIQUE(cotizacion_id, articulo_id)

---

## 5. Comprobantes de Proveedor

### `tipo_comprobante` (catálogo compartido con comprobante_cliente)
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(30) UNIQUE NOT NULL | Factura, Nota de Crédito, Nota de Débito |
| afecta_saldo | smallint default 1 | CHECK IN (1,-1). Factura/ND = +1, NC = -1 |

### `comprobante_proveedor`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| proveedor_id | int NOT NULL FK | |
| tipo_comprobante_id | int NOT NULL FK | |
| numero | varchar(30) NOT NULL | |
| fecha_emision | date NOT NULL | |
| fecha_vencimiento | date NOT NULL | CHECK ≥ fecha_emision |
| orden_compra_id | int NOT NULL FK | |
| comprobante_corregido_id | int (nullable) FK → comprobante_proveedor.id | obligatorio en NC/ND |
| anula_comprobante_id | int (nullable) FK → comprobante_proveedor.id | si está seteado, esta fila es la anulación de otra |
| monto_total | decimal(12,2) NOT NULL | CHECK ≥ 0 |
| saldo_pendiente | decimal(12,2) NOT NULL | monto aún no imputado a un pago |
| estado | enum estado_documento | default vigente |
| usuario_id | int NOT NULL FK | |
| fecha_registro | timestamp | default now() |

UNIQUE (proveedor_id, tipo_comprobante_id, numero). No se modifica una vez registrado (salvo saldo_pendiente/estado, mantenidos por trigger).

### `comprobante_proveedor_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| comprobante_id | int NOT NULL FK → comprobante_proveedor | |
| articulo_id | int NOT NULL FK | |
| cantidad | decimal(12,2) NOT NULL | CHECK > 0 |
| precio_facturado | decimal(12,2) NOT NULL | CHECK ≥ 0 |
| subtotal | decimal(14,2) GENERATED | cantidad * precio_facturado |

---

## 6. Recepción de Mercadería

### `recepcion_mercaderia`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| numero | varchar(30) UNIQUE | |
| orden_compra_id | int NOT NULL FK | |
| deposito_id | int NOT NULL FK | |
| tipo_recepcion | enum tipo_recepcion | parcial/total |
| usuario_id | int NOT NULL FK | |
| fecha_hora | timestamp | default now() |
| observacion_general | text | |

### `recepcion_mercaderia_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| recepcion_id | int NOT NULL FK | |
| orden_compra_detalle_id | int NOT NULL FK | |
| cantidad_solicitada | decimal(12,2) NOT NULL | CHECK > 0 |
| cantidad_recibida | decimal(12,2) NOT NULL | CHECK ≥ 0 |
| diferencia | decimal(12,2) GENERATED | solicitada - recibida |
| observacion | enum tipo_observacion_recepcion | faltante/danado/error |
| observacion_detalle | text | |

UNIQUE(recepcion_id, orden_compra_detalle_id)

### `notificacion_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| recepcion_detalle_id | int NOT NULL FK | |
| usuario_responsable_id | int NOT NULL FK | |
| mensaje | varchar(255) NOT NULL | |
| fecha_hora | timestamp | default now() |
| leida | boolean | default false |

---

## 7. Cuenta Corriente y Pagos/Cobranzas

### `cliente`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre, apellido | varchar(80) NOT NULL | |
| dni | varchar(20) UNIQUE | |
| email | varchar(120) | |
| telefono | varchar(30) | |
| estado | enum estado_activo_inactivo | default activo |
| saldo_actual | decimal(12,2) | positivo = adeuda a la veterinaria |

### `comprobante_cliente`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| cliente_id | int NOT NULL FK | |
| tipo_comprobante_id | int NOT NULL FK | mismo catálogo que comprobante_proveedor |
| numero | varchar(30) NOT NULL | |
| fecha_emision | date NOT NULL | |
| fecha_vencimiento | date NOT NULL | CHECK ≥ fecha_emision |
| monto_total | decimal(12,2) NOT NULL | CHECK ≥ 0 |
| saldo_pendiente | decimal(12,2) NOT NULL | |
| estado | enum estado_documento | default vigente |

UNIQUE(cliente_id, tipo_comprobante_id, numero)

### `pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| tipo | enum tipo_pago | pago_proveedor / cobranza_cliente |
| proveedor_id | int (nullable) | exclusivo con cliente_id según tipo |
| cliente_id | int (nullable) | exclusivo con proveedor_id según tipo |
| monto | decimal(12,2) NOT NULL | CHECK > 0 |
| fecha | date | default CURRENT_DATE |
| forma_pago_id | int NOT NULL FK | |
| numero_comprobante | varchar(30) UNIQUE NOT NULL | |
| anula_pago_id | int (nullable) FK → pago.id | |
| estado | enum estado_documento | default vigente |
| usuario_id | int NOT NULL FK | |
| fecha_registro | timestamp | |

### `pago_imputacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| pago_id | int NOT NULL FK (cascade) | |
| comprobante_proveedor_id | int (nullable) FK | exactamente uno de los dos comprobante_*_id |
| comprobante_cliente_id | int (nullable) FK | |
| monto_imputado | decimal(12,2) NOT NULL | CHECK > 0 |

---

## Relaciones (FKs) — resumen

```
usuario.rol_id → rol.id
usuario.auth_id → auth_users.id

comprobante_proveedor.proveedor_id → proveedor.id
comprobante_proveedor.tipo_comprobante_id → tipo_comprobante.id
comprobante_proveedor.orden_compra_id → orden_compra.id
comprobante_proveedor.comprobante_corregido_id → comprobante_proveedor.id
comprobante_proveedor.anula_comprobante_id → comprobante_proveedor.id
comprobante_proveedor.usuario_id → usuario.id
comprobante_proveedor_detalle.comprobante_id → comprobante_proveedor.id
comprobante_proveedor_detalle.articulo_id → articulo.id

recepcion_mercaderia.orden_compra_id → orden_compra.id
recepcion_mercaderia.deposito_id → deposito.id
recepcion_mercaderia.usuario_id → usuario.id
recepcion_mercaderia_detalle.recepcion_id → recepcion_mercaderia.id
recepcion_mercaderia_detalle.orden_compra_detalle_id → orden_compra_detalle.id
notificacion_compra.recepcion_detalle_id → recepcion_mercaderia_detalle.id
notificacion_compra.usuario_responsable_id → usuario.id

comprobante_cliente.cliente_id → cliente.id
comprobante_cliente.tipo_comprobante_id → tipo_comprobante.id

pago.proveedor_id → proveedor.id
pago.cliente_id → cliente.id
pago.forma_pago_id → forma_pago.id
pago.anula_pago_id → pago.id
pago.usuario_id → usuario.id
pago_imputacion.pago_id → pago.id
pago_imputacion.comprobante_proveedor_id → comprobante_proveedor.id
pago_imputacion.comprobante_cliente_id → comprobante_cliente.id

orden_compra.proveedor_id → proveedor.id
orden_compra.usuario_id → usuario.id
orden_compra.estado_id → estado_orden_compra.id
orden_compra_detalle.orden_compra_id → orden_compra.id

ficha_stock.articulo_id → articulo.id
ficha_stock.deposito_id → deposito.id
movimiento_stock_cab.deposito_id → deposito.id
movimiento_stock_cab.origen_id → origen_movimiento.id
movimiento_stock_cab.usuario_id → usuario.id
movimiento_stock_cab.movimiento_vinculado_id → movimiento_stock_cab.id
movimiento_stock_det.movimiento_id → movimiento_stock_cab.id
movimiento_stock_det.ficha_stock_id → ficha_stock.id

proveedor_forma_pago.proveedor_id → proveedor.id
proveedor_forma_pago.forma_pago_id → forma_pago.id
proveedor.forma_pago_id → forma_pago.id

solicitud_cotizacion.usuario_id → usuario.id
solicitud_detalle.solicitud_id → solicitud_cotizacion.id
solicitud_detalle.articulo_id → articulo.id
cotizacion.solicitud_id → solicitud_cotizacion.id
cotizacion.proveedor_id → proveedor.id
cotizacion.forma_pago_id → forma_pago.id
cotizacion_detalle.cotizacion_id → cotizacion.id
cotizacion_detalle.articulo_id → articulo.id

articulo.categoria_id → categoria.id
articulo.unidad_medida_id → unidad_medida.id
articulo.fabricante_id → fabricante.id

auditoria.usuario_id → usuario.id
auditoria_sesion.usuario_id → usuario.id
```
