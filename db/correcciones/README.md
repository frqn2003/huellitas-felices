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
| 17 | `ctacte_proveedor.sql` | la vista de cta. cte. con los 5 estados, en hora argentina y con dias_para_vencer, + tapa el agujero de imputar a un comprobante anulado | 🔴 sin esto **`/api/cuentas-corrientes` devuelve 500** (HU-FIN-02) |
| 16 | `fix_pagos_cliente.sql` | 2 funciones que nombran `cliente_id` / `comprobante_cliente`, columnas y tablas ya borradas | 🔴 **anular un pago devuelve 500 hoy** |
| 15 | `login.sql` | conecta la secuencia de `auditoria_sesion`, parte el trigger de auditoría de `usuario`, corrige COMMENT | 🔴 sin esto **ningún login funciona** (HU-SIS-04) |

Son independientes entre sí y de todo lo demás. Los tres son idempotentes.

⚠️ **La 17 reemplaza a la §2 de la 16.** Las dos tocaban `fn_ck_comprobante_no_excede`,
y con `CREATE OR REPLACE` en dos archivos el resultado dependía del orden de
aplicación: pegar la 16 DESPUÉS de la 17 habría revertido sus validaciones nuevas
—volviendo a permitir pagos a comprobantes anulados— sin ningún error. Esa
sección se quitó de la 16.

## Ya aplicadas — no están más en esta carpeta

Las correcciones **01 a 13** se aplicaron y se borraron: el estado que dejaron
está en `db/schema.sql`, que es la fuente de verdad. Si buscás qué hizo alguna,
está en el historial de git.

## Descartadas — NO aplicar

| Archivo | Por qué |
|---|---|
| `14_recepcion_mercaderia.DESCARTADA.sql` | crea `recepcion_mercaderia` + `_detalle`, y el **PO decidió lo contrario**: la recepción es un movimiento de stock más, en un único lugar. La base ya está así (origen `recepcion_compra` + 4 triggers). Aplicarlo implantaría dos verdades sobre lo mismo. Ver `docs/backend/REVISION-PO-SPRINT2.md` §A.2.1 |

⚠️ **El módulo de Recepciones del backend sigue escrito contra esas tablas**, así
que `/api/recepciones` devuelve 500. **No se arregla aplicando el 14**: se
arregla reescribiendo `recepcion.repo.ts` contra `movimiento_stock_cab` / `_det`.

## Decisiones vigentes

- **D1** Lotes y vencimientos **fuera del Sprint 1** — ningún criterio los
  menciona (es HU-STK-05). Las columnas `articulo.numero_lote` y
  `fecha_vencimiento` ya se eliminaron (corrección 12, aplicada).
- **D2** Proveedor preferido **derivado**, no almacenado.
- **D3** **Varios depósitos por sucursal** (revierte D-B).
- **D4** Cotizaciones **dentro del sprint** (revierte D-C): el criterio de
  HU-COMP-02 pide comparar cotizaciones antes de adjudicar.

## Ojo con esto

Antes de pegar cualquiera, mirá el bloque de comentarios de arriba: varios
avisan de un **impacto en el front** que hay que acompañar.

⚠️ **La 15 hay que aplicarla antes de probar el login.** Sin ella,
`auditoria_sesion.id` no tiene `DEFAULT nextval()` y todo intento de inicio de
sesión falla al escribir la bitácora.

⚠️ **La 16 arregla algo que está roto ahora**, no algo que falta: `fn_bloquea_update_pago`
evalúa `NEW.cliente_id`, y `pago` no tiene esa columna. Anular un pago revienta
la transacción completa.
