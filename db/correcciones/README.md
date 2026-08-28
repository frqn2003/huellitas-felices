# Correcciones pendientes de aplicar

SQL para **pegar en el SQL Editor de Supabase**, en orden, **una sola vez cada uno**.

No es un sistema de migraciones: son arreglos puntuales de cosas que hoy están
mal o faltan en la base. Cada archivo arranca con un bloque `POR QUÉ` que explica
qué problema resuelve y qué criterio de aceptación del Excel lo exige.

Después de aplicar cada uno:

```bash
npm run db:dump
```

y commitear el `db/schema.sql` actualizado.

## Orden

| # | Archivo | Qué arregla | Urgencia |
|---|---|---|---|
| 01 | `auditoria.sql` | crea `auditoria` + trigger genérico | 🔴 criterio de aceptación de **las 5 HU** del sprint |
| 12 | `faltantes.sql` | lo que se salteó el script del 26/8 | 🔴 incluye `uq_articulo_nombre_activo`, criterio de HU-STK-01 |
| 06 | `proveedor_formas_pago.sql` | N:M proveedor ↔ forma de pago | 🔴 sin esto `/api/proveedores` devuelve 500 |
| 09 | `cotizaciones.sql` | las 4 tablas de cotizaciones + FK de `orden_compra.cotizacion_id` | 🔴 sin esto **no funciona ningún endpoint de HU-COMP-02** |
| 10 | `catalogo_condiciones_pago.sql` | deja UNA sola lista de condiciones de pago | 🔴 va **junto con la 09**: sin esto no se puede guardar una orden |
| 13 | `sucursal.sql` | crea `sucursal` y convierte `deposito.sucursal_id` en FK real | 🟠 hoy es una FK huérfana (decisión D3) |

**El 12 depende del 01** (sus triggers de auditoría necesitan `fn_auditar`).
**El 13 también.** Los demás son independientes entre sí.

Las correcciones **02, 04, 05 y 07 ya están aplicadas** (total o parcialmente)
por el script del 26/8. Lo que les faltó está en la 12.

## Descartadas — NO aplicar

Se conservan con sufijo en el nombre para que nadie las pegue por error, y
porque documentan una decisión que se revirtió.

| Archivo | Por qué |
|---|---|
| `03_deposito_sucursal.DESCARTADA.sql` | eliminaba `deposito.sucursal_id` bajo D-B ("depósito = sucursal"). **El equipo decidió lo contrario:** varios depósitos por sucursal. Lo reemplaza la 13 |
| `08_articulo_proveedor_preferido.DESCARTADA.sql` | agregaba `articulo.proveedor_preferido_id`. **El proveedor preferido se calcula**, no se guarda: sale de la última orden de compra vía `LEFT JOIN LATERAL` en `articulo.repo.ts` |
| `11_numero_movimiento.DESCARTADA.sql` | **inaplicable**: hace `ALTER TABLE movimiento_stock`, y esa tabla ya no existe. El problema que resolvía lo resuelve el modelo cabecera-detalle |
| `07_movimiento_cabecera.APLICADA-PARCIAL.sql` | ya corrió el 26/8, pero se cortó antes de los triggers de inmutabilidad y auditoría. Esos están en la 12 |

## Decisiones vigentes

- **D1** Lotes y vencimientos **fuera del Sprint 1** — ningún criterio los
  menciona (es HU-STK-05). La 12 elimina `articulo.numero_lote` y
  `fecha_vencimiento`, que hoy están sin usar.
- **D2** Proveedor preferido **derivado**, no almacenado.
- **D3** **Varios depósitos por sucursal** (revierte D-B).
- **D4** Cotizaciones **dentro del sprint** (revierte D-C): el criterio de
  HU-COMP-02 pide comparar cotizaciones antes de adjudicar.

## Ojo con esto

Antes de pegar cualquiera, mirá el bloque de comentarios de arriba: varios
avisan de un **impacto en el front** que hay que acompañar.

⚠️ **El módulo de Artículos** ya está escrito contra la base con la 12 aplicada
(necesita `uq_articulo_nombre_activo` para la validación bajo concurrencia).

⚠️ **El módulo de Proveedores** necesita la 06, y el de **Compras** la 09 + 10.

⚠️ **El módulo de Movimientos** está escrito contra la tabla plana
`movimiento_stock`, que **ya no existe**. No hay corrección que lo arregle: hay
que reescribir `movimiento.repo.ts` contra `movimiento_stock_cab` / `_det`.
