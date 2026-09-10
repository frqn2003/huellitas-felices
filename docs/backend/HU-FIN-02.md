# HU-FIN-02 · Cuenta Corriente de Proveedores

> **Estado**: backend implementado y pantalla conectada.
> **Falta para probarlo**: aplicar `db/correcciones/17_ctacte_proveedor.sql`.

---

## Los 4 criterios y dónde se cumple cada uno

| # | Criterio | Dónde | Estado |
|---|---|---|---|
| 1 | Cada comprobante pendiente, con su fecha de vencimiento | `vista_cuenta_corriente_proveedor` | ✅ |
| 2 | Registra los pagos, **actualizando el saldo en tiempo real** | `POST /api/pagos` devuelve el detalle recalculado | ✅ |
| 3 | **Alerta visual** sobre próximos a vencer o vencidos | `estado_cuenta` + `dias_para_vencer` de la vista | ✅ |
| 4 | Exportar el detalle a **PDF** | `window.print()` + `@media print` | ✅ |

---

## Lo que ya hacía la base, y que este módulo no repite

Cuatro triggers `BEFORE INSERT` sobre `pago_imputacion` validan, **con `FOR
UPDATE`**, todo lo que depende del estado de la base:

| Trigger | Qué garantiza |
|---|---|
| `fn_ck_suma_imputada` | lo imputado no supera `pago.monto` |
| `fn_ck_comprobante_no_excede` | no supera `monto_total`, y (corrección 17) el comprobante no está anulado ni es una NC |
| `fn_ck_pi_mismo_tercero` | el comprobante es del mismo proveedor |
| `fn_pi_upsert_monto_imputado` | consolida una imputación repetida |

**La trampa que hay que no caer**: querer validar en el service
`monto <= saldo_pendiente` leyendo la vista. `imputado_histórico + monto <=
monto_total` —lo que ya hace el trigger— es **algebraicamente lo mismo**, pero
con lock. La versión en JS sería el mismo cálculo, sin lock, y con una ventana
de carrera entre la lectura y la escritura.

---

## La corrección 17

### 1. Una factura pagada y vencida figuraba "vencido"

`estado_vencimiento` de la vista solo miraba la fecha, no el saldo. La pantalla
pintaba en rojo facturas ya canceladas y el total de "vencido" salía inflado —
que es exactamente lo contrario del criterio 3.

La vista pasa a emitir los **5 estados** que ya usa el front, en un solo `CASE`,
con este orden:

```
credito → saldado → vencido → por_vencer → pendiente
```

`credito` va **primero** a propósito: una Nota de Crédito vencida es crédito a
favor, no deuda vencida. Si se evaluara la fecha antes, saldría en rojo como si
le debiéramos algo al proveedor.

Con solo 3 valores el backend tendría que derivar `saldado` y `credito` por su
cuenta, y la definición de "en qué estado está este comprobante" quedaría
partida entre la vista y el mapper.

### 2. La columna se renombró a propósito

`estado_vencimiento` → **`estado_cuenta`**.

Hoy no la consumía nadie, así que el rename salió gratis. Y compra algo
concreto: si alguien no pega la corrección, `SELECT estado_cuenta` explota con
`42703`, que `responses.ts` ya loguea con *"revisá si falta aplicar alguna
corrección"*.

Manteniendo el nombre viejo con semántica nueva, una corrección sin aplicar
**falla en silencio**: colores mal, cero errores, nadie se entera. El equipo pega
esto a mano en Supabase, y la corrección 15 sigue pendiente — el fracaso ruidoso
no es paranoia.

### 3. `CURRENT_DATE` corría en UTC

Supabase no está en hora argentina. Entre las 21:00 y las 00:00 de acá,
`CURRENT_DATE` ya devuelve el día siguiente, así que **un comprobante que vence
hoy figuraba vencido tres horas antes**. Para una HU cuyo criterio es alertar
sobre vencidos, es un falso positivo diario — y justo en el horario en que nadie
lo mira.

Ahora: `(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`.

### 4. 🔴 Se podía pagar un comprobante ANULADO

Este no estaba en el pedido: apareció leyendo los triggers.

**Ninguno miraba `comprobante_proveedor.estado`.** `fn_ck_pi_mismo_tercero`
comparaba solo `proveedor_id`; `fn_ck_comprobante_no_excede` leía solo
`monto_total`.

Y la vista deja afuera a los anulados. La combinación es la parte fea: la plata
entraba a `pago_imputacion`, quedaba auditada como legítima, y **desaparecía de
la pantalla**. Un pago fantasma sin traza visible.

No era teórico: `comprobante_proveedor` se anula con un trigger interno, así que
un comprobante puede pasar a `anulado` entre que el usuario abre el modal y
confirma.

### 5. Tampoco se le puede pagar a una Nota de Crédito

Una NC del proveedor **reduce** lo que le debemos. Y el crédito **ya está
aplicado sin imputación alguna**, porque el saldo es la suma de `monto_signado` y
la NC entra negativa.

La base lo permitía: `fn_ck_comprobante_no_excede` compara contra `monto_total`,
que es positivo, mientras `monto_signado` es negativo. Imputar $500 a una NC de
$1.000 dejaba el saldo en **−1.500**: pagar agrandaba la deuda.

> La lectura alternativa —"arreglemos la vista para que ese saldo dé bien"— se
> descartó a propósito: legitimaría una operación que no existe en el negocio. Si
> alguna vez hace falta *aplicar* una NC contra una factura, eso es una
> compensación, con su propia tabla, no un `pago`.

**Las dos reglas van en el trigger, no en el service**, por el mismo argumento
que el proyecto ya usa para el stock: el service solo cubre `/api/pagos`; el
trigger cubre además los seeds, el SQL Editor y el endpoint que alguien escriba
en el sprint 3. Y `fn_ck_comprobante_no_excede` ya tenía el `FOR UPDATE` sobre
`comprobante_proveedor`: un solo lock, tres validaciones.

### 6. SQLSTATE propios

Los cuatro triggers levantaban `P0001` pelado, y `traducirErrorPostgres` los
mandaba al catch-all. O sea que **imputar $10.000 a una factura con $5.000 de
saldo le contestaba al usuario "La operación fue rechazada por una regla de la
base de datos"** — sin el número, sin el comprobante, sin decir cuál de las tres
imputaciones falló.

Siguiendo el precedente `HF001`/`HF002`/`HF003` del stock:

| Código | Regla | Error de dominio |
|---|---|---|
| `HF010` | suma > `pago.monto` | `IMPUTACION_EXCEDE_PAGO` |
| `HF011` | imputado > `monto_total` | `IMPUTACION_EXCEDE_COMPROBANTE` |
| `HF012` | comprobante de otro proveedor | `COMPROBANTE_DE_OTRO_PROVEEDOR` |
| `HF013` | imputación a Nota de Crédito | `IMPUTACION_A_NOTA_CREDITO` |
| `HF014` | comprobante no vigente (anulado o pagado) | `COMPROBANTE_ANULADO` |

### 7. 🔴 El estado `pagado` hacía desaparecer los comprobantes pagados

Apareció mientras se escribía este módulo: el dump del **09/09** agregó un tercer
valor al enum `estado_documento` (`pagado`) y el trigger
`fn_actualiza_estado_comprobante_por_pago`, que marca el comprobante apenas su
saldo llega a cero.

La vista filtraba `WHERE cp.estado = 'vigente'`, así que la consecuencia era
directa:

> **Pagar un comprobante lo borraba de la cuenta corriente.**

El renglón salía de la vista en el mismo instante en que se terminaba de pagar, y
con él su historial de pagos — justo después de la operación que el usuario
acababa de hacer. Y el criterio pide poder ver los pagos imputados a cada
comprobante.

Además dejaba **inalcanzable** el estado `saldado` del `CASE`: ningún comprobante
con saldo 0 llegaba a la vista para que se lo etiquetara así.

Ahora el filtro es `<> 'anulado'`. Un comprobante pagado sigue apareciendo, con
saldo 0 y estado `saldado`. Los anulados siguen afuera: esos sí dejaron de existir
a efectos de la cuenta.

> ⚠️ **Bug abierto, de HU-FIN-03**: anular un pago devuelve el saldo del
> comprobante, pero **nadie lo saca de `pagado`**. Queda marcado como pagado con
> saldo positivo. Con esta vista al menos se sigue viendo, y su `estado_cuenta`
> dirá "vencido" o "pendiente", que es lo correcto — con el filtro viejo habría
> desaparecido con la deuda adentro. La anulación tiene que revertir el estado.

### 8. `proveedor.saldo_actual` está muerta

La columna existe y **ningún trigger la mantiene**: vale 0 para todos. El brief
decía tres veces "Deuda Total = `proveedor.saldo_actual`", así que alguien la iba
a leer y mostrar $0 para todos. Se le puso un `COMMENT` y **se corrigió el brief**.

No se dropea, por la regla del equipo: lo que está y no se usa se documenta.

> ⚠️ La §2 de `16_fix_pagos_cliente.sql` **se movió acá**. Las dos tocaban
> `fn_ck_comprobante_no_excede`, y con `CREATE OR REPLACE` en dos archivos el
> resultado dependía del orden: pegar la 16 después de la 17 habría revertido las
> validaciones nuevas sin ningún error.

---

## Decisiones del módulo

### El listado arranca en `proveedor`, no en la vista

```sql
FROM proveedor p
LEFT JOIN vista_cuenta_corriente_proveedor v ON v.proveedor_id = p.id
```

La vista arranca en `comprobante_proveedor`, así que un proveedor sin
comprobantes no tiene ni una fila. Con un `GROUP BY` sobre ella, esos proveedores
**desaparecen del listado** — justo la fila "Pet Food SA / $0 / Saldado" que
muestra el wireframe del brief.

### El estado del proveedor se calcula en SQL

Es el **peor** entre sus comprobantes (`Vencido > ProximoAVencer > Credito >
Saldado`). Se calcula con `bool_or` en un `HAVING`, no en el mapper, porque el
listado se filtra por estado: si se derivara en JS, el `?estado=Vencido` no
podría entrar en la consulta y `contar()` devolvería un total que no corresponde
a lo que se ve.

### `POST /api/pagos` devuelve el detalle completo, no el pago

Así el front hace `setState(respuesta)` y el "saldo actualizado en tiempo real"
del criterio 2 sale sin un segundo viaje y sin que el navegador recalcule ningún
saldo.

Se lee con el **mismo client** de la transacción: desde otra conexión del pool el
pago todavía no existe (falta el COMMIT) y la respuesta saldría con el saldo
viejo.

### La suma de las imputaciones tiene que ser IGUAL al monto

Decisión tomada con el equipo. Antes el modal permitía imputar de menos y el pago
quedaba "parcialmente imputado" — pero esa diferencia es **plata que entra al
sistema y no queda asociada a ningún comprobante**, y no existe el concepto de
"pago a cuenta": no hay tabla, no hay saldo a favor, no hay pantalla donde verla.

Si alguna vez hacen falta pagos a cuenta, es otra HU con su propia tabla.

La comparación va en **centavos**: `0.1 + 0.2 !== 0.3` en punto flotante, así que
comparar los decimales directamente rechazaría pagos correctos.

### Las imputaciones se insertan de a una

`fn_pi_upsert_monto_imputado` toma un advisory lock y, si ya existe el par
`(pago, comprobante)`, hace `UPDATE` sumando y **devuelve `NULL`, cancelando el
INSERT**. O sea que `INSERT ... RETURNING id` **puede devolver 0 filas, y no es
un error** — `rows[0].id` explotaría con un `TypeError` en el camino más normal
del mundo. Por eso `insertImputacion` no pide id.

Y van en un **loop, no en un `VALUES` multi-fila**: no por corrección (el trigger
corre por fila igual), sino porque un INSERT multi-fila devuelve **un** error
opaco. Con el loop, el service le agrega `campo: "imputaciones.2"` y el modal
puede marcar el input correcto.

El schema además **rechaza comprobantes repetidos en el body**: el trigger los
fusionaría en silencio, y eso es peor que un error — el usuario carga 200 y 300
creyendo que son dos comprobantes distintos, y ve uno solo con 500.

---

## Qué cambió en la pantalla

Era **100% hardcodeada**. Se fueron tres cosas, y ninguna podía quedarse:

| Qué | Por qué no servía |
|---|---|
| `CUENTAS_CORRIENTES_GLOBAL` y compañía | datos inventados en el bundle |
| `derivarEstadoCta(saldo, vencimiento)` | **segunda** definición de "vencido", con el reloj de la máquina del usuario |
| la aritmética de saldos de `handleRegistrar` | **tercera** definición de "saldo pendiente": restaba a mano y recalculaba con un `reduce` |

Además:

- el filtrado y la paginación pasan al **servidor** (antes traía todo y filtraba
  con un `useMemo`)
- aparecen `loading` / `error` / vacío, que el brief marcaba como hechos y no
  existían
- **se cayó el filtro Proveedor/Cliente**: el lado cliente no existe en la base, y
  un filtro que nunca puede devolver nada es peor que no tenerlo. El tipo se
  conserva comentado, no borrado
- el nombre de la forma de pago viene por JOIN, no del array placeholder
  `FORMAS_PAGO` del front

---

## El PDF

Sin librería: `window.print()` + `@media print` en `globals.css`, y un componente
`CtaCteImprimible` **siempre montado** con `hidden print:block`.

Siempre montado y no condicional: si se renderizara al hacer clic,
`window.print()` podría dispararse antes del paint y salir una hoja en blanco.

> ⚠️ **Los navegadores descartan los fondos al imprimir.** Si la alerta de
> vencimiento fuera solo un badge de color, en el papel desaparecería — y con
> ella el criterio 3. Por eso la columna Estado del documento impreso dice
> **"VENCIDO hace 5 días"** / **"Vence en 3 días"** con todas las letras. El
> color es refuerzo, no portador. Es la misma regla que pide accesibilidad.

Se descartó `jsPDF` + `autotable`: ~350 KB de bundle para replicar a mano un
layout que el navegador ya sabe paginar y repaginar.

> Antes, ese botón mostraba **"Exportación completada"** sin generar nada. Es el
> mismo bug que el toast de baja de proveedor que apareció en el Sprint 1: un
> cartel de éxito sobre algo que no pasó.

---

## Cómo probarlo

### Antes

1. **Aplicar `db/correcciones/17_ctacte_proveedor.sql`** + `npm run db:dump`.
   Sin esto, `/api/cuentas-corrientes` devuelve 500 con `42703` (la columna
   `estado_cuenta` no existe todavía) — a propósito.
2. Cargar al menos un comprobante de proveedor (HU-PROV-04) contra una OC recibida.

### Los casos que importan

| Caso | Esperado |
|---|---|
| Proveedor **sin comprobantes** | aparece con $0 y "Saldado" |
| Factura vencida **ya pagada** | **no** figura "Vencido" |
| Proveedor con solo una NC | saldo negativo, "Crédito a favor" en verde |
| Imputar a un comprobante **anulado** | 409 `COMPROBANTE_ANULADO` |
| Imputar a una **Nota de Crédito** | 409 `IMPUTACION_A_NOTA_CREDITO` |
| Imputar más que el saldo del comprobante | 409 `IMPUTACION_EXCEDE_COMPROBANTE`, **no** un 500 |
| Imputar más que el monto del pago | 409 `IMPUTACION_EXCEDE_PAGO` |
| Comprobante de OTRO proveedor | 409 `COMPROBANTE_DE_OTRO_PROVEEDOR` |
| Dos líneas del mismo comprobante | 422, **no** una suma silenciosa |
| Suma ≠ monto del pago | 422 |
| Número de pago repetido **con otro proveedor** | 409 `NUMERO_PAGO_DUPLICADO` (el UNIQUE es global) |
| Fecha futura | 422 |
| **Imprimir** con una factura vencida | el papel dice "VENCIDO hace N días" en texto |
| Registrar un pago | el saldo baja en pantalla **sin recargar** |

### Consultas de verificación

```sql
-- El saldo por proveedor tiene que dar lo mismo que la pantalla.
-- El LEFT JOIN es lo que mantiene a los proveedores sin comprobantes.
SELECT p.razon_social, COALESCE(SUM(v.saldo_pendiente), 0) AS saldo
FROM proveedor p
LEFT JOIN vista_cuenta_corriente_proveedor v ON v.proveedor_id = p.id
WHERE p.estado = 'activo'
GROUP BY p.razon_social
ORDER BY saldo DESC;

-- Los estados, con los días. Una fila 'vencido' con saldo 0 sería el bug viejo.
SELECT numero_completo, fecha_vencimiento, saldo_pendiente,
       dias_para_vencer, estado_cuenta
FROM vista_cuenta_corriente_proveedor
ORDER BY fecha_vencimiento;

-- La auditoría del pago: si usuario_id viene NULL, falta withAuditUser().
SELECT * FROM auditoria WHERE tabla IN ('pago', 'pago_imputacion')
ORDER BY id DESC LIMIT 5;
```

---

## Fuera de alcance

- **Anulación de pagos** → HU-FIN-03. La corrección 16 (que la destrababa) ya la
  aplicó la DBA el 09/09, pero queda el bug del estado: anular un pago devuelve el
  saldo y **no saca al comprobante de `pagado`**.
- **Lado cliente** de la cuenta corriente → sin tablas en la base (D5).
- **Pagos a cuenta** → no existen en el modelo; ver la decisión de la igualdad estricta.

## Archivos

| Archivo | Qué hace |
|---|---|
| `db/correcciones/17_ctacte_proveedor.sql` | 🔴 **aplicar primero** |
| `src/modules/finanzas/ctacte.*` | lectura: resumen y detalle |
| `src/modules/finanzas/pago.*` | alta de pagos con imputación |
| `src/app/api/cuentas-corrientes/**` | `GET` resumen y detalle |
| `src/app/api/pagos/route.ts` | `POST` |
| `src/components/cuentas-corrientes/CtaCteImprimible.tsx` | el documento que sale impreso |
| `src/app/globals.css` | el bloque `@media print` |
