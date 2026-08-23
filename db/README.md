# Base de datos

## Puesta en marcha (primera vez)

```bash
docker compose up -d
cp .env.example .env.local
npm install
npm run db:reset
```

`db:reset` recrea el schema desde cero y carga los seeds. Es lo que hay que
correr antes de una demo para que arranque siempre igual.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run db:migrate` | aplica las migraciones pendientes |
| `npm run db:status` | lista qué está aplicado y qué falta |
| `npm run db:seed` | carga catálogos + datos de demo |
| `npm run db:reset` | borra todo, migra de cero y carga seeds |

## Estructura

```
db/
├── migrations/   se aplican UNA vez, en orden, registradas en la tabla _migracion
├── seeds/        se pueden correr muchas veces (ON CONFLICT DO NOTHING)
└── dev/          utilidades manuales — el runner NO las toca
```

### Migraciones

| Archivo | Qué hace |
|---|---|
| `0001_baseline.sql` | el DDL tal como lo pasó el equipo, sin cambios de diseño |
| `0002_fusion_usuario.sql` | `empleado` se absorbe en `usuario` |
| `0003_deposito_sucursal.sql` | depósito = sucursal (D-B) |
| `0004_formas_pago.sql` | formas de pago pasa a catálogo + N:M (D-A) |
| `0005_auditoria.sql` | bitácora + trigger genérico |
| `0006_constraints.sql` | UNIQUE parciales, tipos de FK, CHECKs de importes |
| `0007_articulo_ajustes.sql` | imagen, timestamps, quita lote/vencimiento |
| `0008_movimiento_cabecera.sql` | movimiento en cabecera-detalle + vista plana |
| `0009_orden_compra_ajustes.sql` | `condicion_pago`, secuencia de `cod_ord` |

Cada migración de corrección arranca con un bloque `POR QUÉ` que explica qué
problema resuelve y qué criterio de aceptación lo pide.

### Reglas

1. **Una migración ya corrida no se edita.** Si algo salió mal, se agrega otra.
2. **Una migración = un cambio con sentido propio.** No mezclar cosas que no
   tienen que ver entre sí.
3. **Probar con `db:reset` antes de commitear.** Que corra desde cero es la
   única garantía de que otro la va a poder aplicar.
4. Cada migración corre en su propia transacción: si falla, no deja nada a medias.

## ⚠️ El baseline es una hipótesis

`0001_baseline.sql` se reconstruyó del código que pasó el equipo, **sin acceso
a la base del servidor**. Un DDL no muestra si alguien agregó un índice o un
constraint a mano después.

Cuando haya acceso, correr las queries de verificación de
[`../docs/backend/AJUSTES-DER.md`](../docs/backend/AJUSTES-DER.md) §6 y comparar
contra este archivo. Si algo difiere, se corrige el baseline (todavía no está
aplicado en ningún lado que importe) o se agrega una migración.
