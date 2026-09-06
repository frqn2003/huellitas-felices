# Esquema de Base de Datos — Huellitas Felices

> Diccionario de datos. Se actualiza cada vez que el DBA entrega un nuevo script/DBML. Usar como referencia junto con `_plantilla.md` al armar cada HU.

---

## Enums

| Enum | Valores |
|---|---|
| estado_activo_inactivo | activo, inactivo |
| tipo_movimiento_stock | ingreso, egreso |
| estado_documento | vigente, anulado |
| tipo_pago | pago_proveedor, cobranza_cliente |
| tipo_operacion_auditoria | INSERT, UPDATE, DELETE |
| tipo_evento_sesion | login, logout |

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
| estado | enum estado_activo_inactivo | default activo |
| created_at, updated_at | timestamp | |

Cada sucursal opera con caja, agenda y depósito de stock propios e independientes.

### `deposito`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| sucursal_id | int FK → sucursal.id | |
| nombre | varchar(100) NOT NULL | |
| ubicacion | varchar(150) | |

### `caja`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| sucursal_id | int FK → sucursal.id | |
| nombre | varchar(100) NOT NULL | default 'Caja principal' |
| saldo_actual | numeric(12,2) | default 0 |
| estado | enum estado_activo_inactivo | default activo |
| created_at | timestamp | default now() |

Estructura mínima: se crea automáticamente 1 por sucursal. Ampliar con movimientos de caja / arqueos cuando se desarrolle ese módulo.

### `agenda`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| sucursal_id | int FK → sucursal.id | |
| nombre | varchar(100) NOT NULL | default 'Agenda principal' |
| estado | enum estado_activo_inactivo | default activo |
| created_at | timestamp | default now() |

Estructura mínima: se crea automáticamente 1 por sucursal. Ampliar con turnos/franjas horarias cuando se desarrolle ese módulo.

---

## 2. Roles, Usuarios y Auditoría

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
| sucursal_id | int FK → sucursal.id (nullable) | |
| nombre, apellido | varchar(80) NOT NULL | |
| dni | varchar(20) | |
| email | varchar(120) NOT NULL | |
| estado | enum estado_activo_inactivo | default activo |
| fecha_creacion | timestamp | default now() |
| auth_id | uuid UNIQUE (nullable) | vínculo 1 a 1 con auth.users de Supabase (ON DELETE CASCADE); nullable hasta backfill |
| intentos_fallidos | smallint | default 0, CHECK 0–3 |
| bloqueado_hasta | timestamp | si es futuro, el login se rechaza antes de invocar Supabase Auth |

### `auditoria`
| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| tabla | varchar(50) NOT NULL | nombre de la tabla origen (usuario, articulo, proveedor, orden_compra, movimiento_stock_cab, deposito) |
| operacion | enum tipo_operacion_auditoria | |
| registro_id | int NOT NULL | PK (columna id) del registro afectado en la tabla origen |
| usuario_id | int FK → usuario.id (nullable, SET NULL) | responsable del cambio, tomado de la variable de sesión app.usuario_id; puede ser NULL en procesos batch |
| fecha_hora | timestamp | default now() |
| valores_anteriores | jsonb | snapshot completo de la fila ANTES del cambio (NULL en INSERT) |
| valores_nuevos | jsonb | snapshot completo de la fila DESPUÉS del cambio (NULL en DELETE) |

Bitácora general: cada fila es un evento (alta/modificación/baja) de una entidad auditada.

### `auditoria_sesion`
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK (identity) | |
| usuario_id | int FK → usuario.id (nullable, SET NULL) | |
| evento | enum tipo_evento_sesion | login / logout |
| fecha_hora | timestamp | default now() |
| ip_origen | inet | |
| detalle | jsonb | payload crudo de auth.audit_log_entries |

Bitácora de login/logout, alimentada automáticamente desde auth.audit_log_entries de Supabase mediante trigger (no inserción manual). Tabla aparte de auditoria porque un login no es un cambio de fila de una tabla de negocio.

---

## 3. Proveedores

### `proveedor`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| razon_social | varchar(150) NOT NULL | |
| forma_pago_id | int FK → forma_pago.id NOT NULL | |
| cuit | varchar(20) NOT NULL | |
| direccion | varchar(255) | |
| telefono | varchar(30) | |
| email | varchar(120) | |
| contacto | varchar(100) | |
| plazo_entrega_dias | int | |
| estado | enum estado_activo_inactivo | default activo |
| calificacion | numeric(3,1) | evaluación de desempeño |

### `forma_pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(100) UNIQUE NOT NULL | |

Catálogo único de condiciones de pago. Se expone por GET /api/formas-pago y GET /api/condiciones-pago: mismo catálogo, dos preguntas distintas (qué acepta un proveedor / qué se pactó en una compra). El front NO debe tener su propia lista hardcodeada.

### `proveedor_forma_pago` (N a N)
- proveedor_id FK (cascade), forma_pago_id FK → PK compuesta

N:M — un proveedor acepta varias formas de pago. ON DELETE CASCADE solo del lado proveedor: si se borrara un proveedor caen sus pares, pero una forma de pago del catálogo nunca se borra si está en uso.

---

## 4. Artículos y Stock

### `categoria`
- id, nombre UNIQUE, prefijo varchar(5) UNIQUE default 'ART'

### `unidad_medida`
- id, nombre UNIQUE

### `fabricante`
- id, nombre UNIQUE, pais, estado (enum estado_activo_inactivo, default activo)

### `presentacion`
- id, nombre varchar(50) UNIQUE

### `articulo`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| categoria_id | int FK NOT NULL | |
| unidad_medida_id | int FK NOT NULL | |
| presentacion_id | int FK NOT NULL | |
| codigo | varchar(30) UNIQUE NOT NULL | |
| nombre | varchar(150) NOT NULL | |
| descripcion | text | |
| estado | enum estado_activo_inactivo | default activo |
| numero_lote | varchar(60) | |
| fecha_vencimiento | date | |
| fabricante_id | int FK NOT NULL | |
| imagen_url | varchar(255) | URL de la imagen representativa del artículo |
| contenido_neto | numeric(10,2) | default 1 |
| created_at, updated_at | timestamp | |

El costo de compra y el precio de venta no viven en `articulo` (ver detalle de OC / comprobante).

### `ficha_stock`
- id, articulo_id FK, deposito_id FK, stock_actual (default 0), stock_minimo (default 0), stock_critico. UNIQUE(articulo_id, deposito_id)

### `origen_movimiento`
- catálogo: venta, receta, internacion, urgencia, cirugia, practica, recepcion_compra, transferencia_sucursal, ajuste_manual, vacunacion, desparasitacion, merma

### `movimiento_stock_cab`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| numero | varchar(30) UNIQUE NOT NULL | |
| deposito_id | int FK NOT NULL | |
| tipo | enum tipo_movimiento_stock | ingreso/egreso |
| origen_id | int FK NOT NULL | categoría del origen |
| origen_entidad_id | int (nullable) | id de la entidad origen (venta, receta_detalle, internacion, cirugia, solicitud_practica, recepcion_mercaderia_detalle, etc.) según origen_id |
| fecha_hora | timestamp | default now() |
| usuario_id | int FK NOT NULL | |
| motivo | varchar(255) | |
| movimiento_vinculado_id | int (auto FK, nullable) | enlaza el egreso en origen con el ingreso en destino de una transferencia |

Cabecera de movimiento: un movimiento puede afectar varios artículos.

### `movimiento_stock_det`
- id, movimiento_id FK (cascade), ficha_stock_id FK, cantidad (siempre POSITIVA; el signo lo determina `tipo` del movimiento). UNIQUE(movimiento_id, ficha_stock_id)

---

## 5. Compras y Abastecimiento

### `estado_orden_compra`
- id, nombre UNIQUE, es_final boolean default false

### `orden_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| proveedor_id | int FK NOT NULL | |
| cod_ord | varchar(30) UNIQUE NOT NULL | número de OC visible |
| cotizacion_id | int (nullable) FK | |
| usuario_id | int FK NOT NULL | |
| estado_id | smallint default 1 | FK → estado_orden_compra |
| fecha | timestamp | default now() |
| fecha_entrega | timestamp (nullable) | |
| notas | text | |
| subtotal, descuento, gastos_envio | numeric(12,2) | descuento en PORCENTAJE 0-100, no un monto; el monto se calcula sobre el subtotal |
| total | numeric(12,2) NOT NULL | el back recalcula siempre: el total que manda el front se descarta |
| deposito_id | int (nullable) FK | |
| forma_pago_id | int FK NOT NULL | |

### `orden_compra_detalle`
- id, orden_compra_id FK, articulo_id FK, cantidad, precio_acordado, subtotal

### `solicitud_cotizacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| usuario_id | int FK NOT NULL | |
| fecha | timestamp | default now() |
| estado | varchar(20) | default 'Abierta' (Abierta/Adjudicada/Cancelada) |
| notas | text | |

Pedido de cotización: define los mismos artículos sobre los que después se comparan las ofertas de varios proveedores.

### `solicitud_detalle`
- id, solicitud_id FK (cascade), articulo_id FK, cantidad_estimada, nota. UNIQUE(solicitud_id, articulo_id)

### `cotizacion`
- id, solicitud_id FK (cascade), proveedor_id FK, forma_pago_id FK, fecha_recepcion (default now()). UNIQUE(solicitud_id, proveedor_id)

### `cotizacion_detalle`
- id, cotizacion_id FK (cascade), articulo_id FK, precio. UNIQUE(cotizacion_id, articulo_id)

---

## 6. Comprobantes de Proveedor y Notificaciones de Compra

### `tipo_comprobante`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nombre | varchar(30) UNIQUE NOT NULL | Factura, Nota de Crédito, Nota de Débito |
| afecta_saldo | smallint default 1 | Factura/ND = +1, NC = -1. Usado por vista_cuenta_corriente_proveedor para el signo del saldo |
| prefijo | varchar(5) UNIQUE | default 'COM' |

### `comprobante_proveedor`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| proveedor_id | int NOT NULL FK | |
| tipo_comprobante_id | int NOT NULL FK | |
| letra | varchar(2) NOT NULL | |
| punto_venta | varchar(4) NOT NULL | |
| numero_comprobante | varchar(8) NOT NULL | |
| fecha_emision | date NOT NULL | |
| fecha_vencimiento | date NOT NULL | |
| orden_compra_id | int NOT NULL FK | |
| comprobante_corregido_id | int (nullable) FK → comprobante_proveedor.id | NC/ND legítima que AJUSTA el monto de una factura (ej. devolución parcial); documento nuevo con su propio monto_total/afecta_saldo, entra en el cálculo de saldo como cualquier comprobante vigente |
| anula_comprobante_id | int (nullable) FK → comprobante_proveedor.id | anula por completo un comprobante cargado por ERROR: solo marca estado='anulado' en el original, no toca montos ni pagos ya imputados |
| monto_total | numeric(12,2) NOT NULL | |
| estado | enum estado_documento | default vigente |
| usuario_id | int NOT NULL FK | |
| fecha_registro | timestamp | default now() |

UNIQUE (proveedor_id, tipo_comprobante_id, letra, punto_venta, numero_comprobante). No se modifica una vez registrado (trigger de bloqueo de UPDATE), salvo el propio trigger interno que setea estado='anulado'.

### `comprobante_proveedor_detalle`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| comprobante_id | int NOT NULL FK → comprobante_proveedor (cascade) | |
| articulo_id | int NOT NULL FK | |
| cantidad | numeric(12,2) NOT NULL | |
| precio_facturado | numeric(12,2) NOT NULL | |
| subtotal | numeric(14,2) GENERATED | cantidad * precio_facturado |

Líneas del comprobante — puede facturar varios artículos de la misma OC.

### `notificacion_compra`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| orden_compra_detalle_id | int NOT NULL FK (cascade) UNIQUE | línea de orden_compra_detalle contra la que se compara lo recibido |
| usuario_responsable_id | int NOT NULL FK → usuario.id | responsable de compras (usuario_id de la OC) |
| cantidad_solicitada | numeric(12,2) NOT NULL | cantidad pactada en orden_compra_detalle |
| cantidad_recibida | numeric(12,2) NOT NULL | cantidad total recibida acumulada a la fecha (suma de todas las entregas parciales) |
| diferencia | numeric(12,2) GENERATED | recibida - solicitada. Positivo = recibido de más, negativo = faltante |
| mensaje | varchar(255) NOT NULL | |
| fecha_hora | timestamp | default now() |
| leida | boolean | default false |

Notifica al responsable de compras cuando difiere lo recibido de lo solicitado. Una notificación viva por línea de OC; se actualiza con cada entrega parcial y se borra al resolverse la diferencia.

---

## 7. Pagos

### `pago`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| tipo | enum tipo_pago | pago_proveedor / cobranza_cliente |
| proveedor_id | int (nullable) FK | |
| monto | numeric(12,2) NOT NULL | |
| fecha | date | default CURRENT_DATE |
| forma_pago_id | int NOT NULL FK | |
| numero_comprobante | varchar(30) UNIQUE NOT NULL | a diferencia de comprobante_proveedor/recepción, este número NO se autogenera por trigger: es el número de recibo/cheque/comprobante externo que trae el pago |
| anula_pago_id | int (nullable) FK → pago.id | |
| estado | enum estado_documento | default vigente |
| usuario_id | int NOT NULL FK | |
| fecha_registro | timestamp | default now() |

Pagos a proveedores y cobranzas a clientes. Inmutable tras el INSERT (trigger de bloqueo de UPDATE), salvo el propio trigger interno de estado. Se anula registrando un pago NUEVO con anula_pago_id → pago original; ese trigger solo marca estado='anulado', no borra pago_imputacion (se conserva el historial completo). Un eventual pago de reemplazo es un INSERT independiente, sin relación estructural con el anulado, con sus propias pago_imputacion.

### `pago_imputacion`
| Campo | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| pago_id | int NOT NULL FK (cascade) | |
| comprobante_proveedor_id | int (nullable) FK | |
| monto_imputado | numeric(12,2) NOT NULL | |

Relación 1 a muchos entre un pago y los comprobantes que cancela. Dos validaciones BEFORE INSERT, calculadas al vuelo con subquery (no contra una columna cacheada): (1) la suma imputada en este pago no supera pago.monto; (2) la suma imputada HISTÓRICA de este comprobante (entre todos los pagos vigentes que lo tocaron) no supera su monto_total. Un trigger adicional valida que el comprobante imputado pertenezca al mismo proveedor que pago.proveedor_id.

---

## Relaciones (FKs) — resumen

```
usuario.rol_id → rol.id
usuario.sucursal_id → sucursal.id
usuario.auth_id → auth.users.id (Supabase, ON DELETE CASCADE)

agenda.sucursal_id → sucursal.id
caja.sucursal_id → sucursal.id
deposito.sucursal_id → sucursal.id

auditoria.usuario_id → usuario.id (ON DELETE SET NULL)
auditoria_sesion.usuario_id → usuario.id (ON DELETE SET NULL)

proveedor.forma_pago_id → forma_pago.id
proveedor_forma_pago.proveedor_id → proveedor.id (ON DELETE CASCADE)
proveedor_forma_pago.forma_pago_id → forma_pago.id

articulo.categoria_id → categoria.id
articulo.unidad_medida_id → unidad_medida.id
articulo.fabricante_id → fabricante.id
articulo.presentacion_id → presentacion.id

ficha_stock.articulo_id → articulo.id
ficha_stock.deposito_id → deposito.id
movimiento_stock_cab.deposito_id → deposito.id
movimiento_stock_cab.origen_id → origen_movimiento.id
movimiento_stock_cab.usuario_id → usuario.id
movimiento_stock_cab.movimiento_vinculado_id → movimiento_stock_cab.id
movimiento_stock_det.movimiento_id → movimiento_stock_cab.id (ON DELETE CASCADE)
movimiento_stock_det.ficha_stock_id → ficha_stock.id

orden_compra.proveedor_id → proveedor.id
orden_compra.usuario_id → usuario.id
orden_compra.estado_id → estado_orden_compra.id
orden_compra.cotizacion_id → cotizacion.id
orden_compra.deposito_id → deposito.id
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
comprobante_proveedor.comprobante_corregido_id → comprobante_proveedor.id
comprobante_proveedor.anula_comprobante_id → comprobante_proveedor.id
comprobante_proveedor.usuario_id → usuario.id
comprobante_proveedor_detalle.comprobante_id → comprobante_proveedor.id (ON DELETE CASCADE)
comprobante_proveedor_detalle.articulo_id → articulo.id

notificacion_compra.orden_compra_detalle_id → orden_compra_detalle.id (ON DELETE CASCADE)
notificacion_compra.usuario_responsable_id → usuario.id

pago.proveedor_id → proveedor.id
pago.forma_pago_id → forma_pago.id
pago.anula_pago_id → pago.id
pago.usuario_id → usuario.id
pago_imputacion.pago_id → pago.id (ON DELETE CASCADE)
pago_imputacion.comprobante_proveedor_id → comprobante_proveedor.id
```
