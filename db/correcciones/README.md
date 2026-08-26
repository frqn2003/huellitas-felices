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
| 02 | `fix_stock_trigger.sql` | `fn_actualizar_stock` pierde egresos concurrentes | 🔴 **bug**: dos egresos simultáneos descuentan una sola vez |
| 03 | `deposito_sucursal.sql` | saca `deposito.sucursal_id` | 🟠 FK huérfana, bloquea HU-STK-02 |
| 04 | `constraints.sql` | UNIQUE parciales, CHECKs, índices de FK | 🟠 la base no tiene **ni un solo** CHECK |
| 05 | `articulo_ajustes.sql` | timestamps, saca lote/vencimiento, renombres | 🟡 el front espera `createdAt` |
| 06 | `proveedor_formas_pago.sql` | N:M proveedor ↔ forma de pago | 🟡 decisión D-A, el front maneja varias |
| 08 | `articulo_proveedor_preferido.sql` | devuelve `articulo.proveedor_preferido_id` | 🟠 el criterio de HU-STK-01 lo pide y el formulario lo muestra |

Los 01 y 02 conviene aplicarlos ya. Los demás pueden esperar a que el equipo los
revise.

⚠️ **El módulo de Artículos ya está escrito contra la base CON las correcciones
04, 05 y 08 aplicadas.** Sin ellas, `/api/articulos` va a fallar por columnas
que no existen (`created_at`, `proveedor_preferido_id`) o por nombres viejos
(`unidad_medida.unidad` en vez de `nombre`).

## Pendiente de decisión

`07_movimiento_cabecera.PENDIENTE.sql` — pasar el movimiento de stock a
cabecera-detalle, como pide el criterio textual de HU-STK-04. **No aplicar hasta
decidirlo**: cambia dos tablas y hay que mudar el trigger del stock. Lleva
`.PENDIENTE` en el nombre justamente para que nadie lo pegue de casualidad.

## Ojo con esto

Antes de pegar cualquiera, mirá el bloque de comentarios de arriba: varios
avisan de un **impacto en el front** que hay que acompañar (por ejemplo el 03,
que obliga a tocar `src/data/stock.ts`, `DepositoFormModal.tsx` y
`FiltrosStock.tsx`).
