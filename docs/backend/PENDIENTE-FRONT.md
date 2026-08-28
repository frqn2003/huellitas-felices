# Pendiente del lado del front

> Escrito por el equipo de **backend**. Son los cambios que el front tiene que
> hacer para conectarse contra la API real. Ninguno es opcional: hasta que se
> hagan, esas pantallas siguen mostrando datos que la base no conoce.
>
> Contexto: al construir HU-COMP-02 se cerraron dos decisiones de equipo.
>
> 1. **Los catálogos salen de la base**, no de constantes en el front.
> 2. **Los números de documento los genera la base**, no se derivan del `id`.
>
> Todo lo de abajo es consecuencia de esas dos.

---

## 1. El catálogo de condiciones de pago

**Qué cambió.** `forma_pago` es ahora **una sola lista** para todo el sistema y
es la fuente de verdad. Se sirve por dos endpoints que devuelven exactamente lo
mismo (`[{ id, nombre }]`), con dos nombres porque son dos preguntas distintas:

| Endpoint | Pregunta que responde | Quién lo usa |
|---|---|---|
| `GET /api/formas-pago` | qué formas **acepta** un proveedor (varias) | `ProveedorFormModal` |
| `GET /api/condiciones-pago` | qué condición se **pactó** en esta compra (una) | `OrdenFormModal`, `CotizacionFormModal` |

La lista quedó así (5 valores):

```
Contado · Cta. cte. 30 días · Cta. cte. 60 días · Transferencia · Cheque a 30 días
```

**Qué hay que hacer.**

- Borrar `CONDICIONES_PAGO` de [ordenes-compra.ts:16](../../src/data/ordenes-compra.ts:16). Era andamiaje del prototipo.
- Poblar los `<select>` con el fetch. El `value` de cada opción pasa a ser el **`id`**, no el nombre.
- Al guardar, mandar **`formaPagoId: number`**. La API ya no acepta el nombre: si se manda `condicionPago: "Contado"`, zod lo ignora y el alta falla con `422` pidiendo `formaPagoId`.
- Para **mostrar**, seguir usando `condicion_pago` (el nombre) que viene resuelto en la respuesta. Solo el guardado usa ids.

**⚠️ Un valor desapareció: `"Cuenta Corriente"`.** Sin plazo era ambiguo —cuenta
corriente *es* un plazo— y convivía con `Cta. cte. 30 días`, que significa lo
mismo. La base migra los datos viejos a `Cta. cte. 30 días`. Los mocks de
[proveedores.ts:33](../../src/data/proveedores.ts:33) y `:69` todavía lo usan;
cuando se conecte la pantalla eso se va solo, pero si se sigue usando el mock,
ese valor ya no existe en el catálogo.

---

## 2. Los números de documento vienen de la base

**Por qué.** Un `id` es una clave primaria; un número de documento es otra cosa.
Coinciden hasta el primer borrado, la primera carga hecha desde otro lado o la
primera importación de datos. La base los genera con secuencias propias y los
guarda en su columna, así que hay **un solo número** por documento y es el que
sale impreso.

**Qué hay que borrar y por qué reemplazo:**

| Helper del front | Reemplazo | Nota |
|---|---|---|
| `numeroOrden(id)` — [ordenes-compra.ts:55](../../src/data/ordenes-compra.ts:55) | campo **`cod_ord`** de la respuesta | |
| `codigoSolicitud(id)` — [cotizaciones.ts:49](../../src/data/cotizaciones.ts:49) | campo **`cod_sol`** de la respuesta | |
| `proximoNumeroMovimiento()` — [movimientos.ts:175](../../src/data/movimientos.ts:175) | campo **`numero`**, que ya venía en el shape | lo asigna el POST |
| `ultimoPrecioCompra(articuloId, ordenes)` — [ordenes-compra.ts:103](../../src/data/ordenes-compra.ts:103) | `GET /api/articulos/:id/ultimo-precio-compra` | el cálculo local solo mira las órdenes que están en memoria |

Hay ~20 usos de los tres primeros en `src/app`, `src/components` y
`src/context`.

**El formato cambia a 6 dígitos:** `OC-000001`, `SC-000001`, `MOV-000001`. Es el
que ya usaba la base para las órdenes; ahora es parejo en los tres.

**Un detalle de movimientos que importa.** `numero` **no es único por fila**: las
N líneas de un mismo registro comparten número, y las dos puntas de una
transferencia también (es una sola operación). Eso es lo que
[movimientos.ts:9](../../src/data/movimientos.ts:9) ya describía como "agrupador
visual" — la implementación anterior del back lo derivaba del `id` y le daba un
número distinto a cada línea, así que un movimiento de 3 artículos se veía como
3 movimientos sueltos. Ya está corregido.

---

## 3. Campos nuevos en las interfaces

La API devuelve estos campos que las interfaces del front todavía no declaran.
Hay que agregarlos:

```ts
// src/data/ordenes-compra.ts → interface OrdenCompra
cod_ord: string;            // "OC-000001" — el número real
forma_pago_id: number;      // PK de la condición de pago
deposito_id: number | null; // PK del depósito de entrega

// src/data/cotizaciones.ts → interface SolicitudCotizacion
cod_sol: string;            // "SC-000001"

// src/data/cotizaciones.ts → interface Cotizacion
forma_pago_id: number;
```

**Para qué sirven los `_id`.** Para preseleccionar en los `<select>` al abrir un
formulario en modo edición. Hoy `OrdenFormModal` adivina el depósito comparando
direcciones (`depositoPorDireccion()`, [OrdenFormModal.tsx:73](../../src/components/ordenes-compra/OrdenFormModal.tsx:73)):
con `deposito_id` es directo. Los nombres (`condicion_pago`, `direccion_entrega`)
se siguen mandando resueltos para mostrar en la tabla.

---

## 4. Lo que el front ya NO manda

La API los ignora aunque vengan en el body:

| Campo | Quién lo pone | Por qué |
|---|---|---|
| `fecha` (emisión) | el servidor, `DEFAULT now()` | el front no decide *cuándo* se emitió un documento |
| `subtotal`, `total` | el servidor, recalculados | el número del front se descarta siempre |
| `cod_ord`, `cod_sol`, `numero` | la base, por secuencia | ver §2 |
| `usuario_id` | la sesión | nunca viaja en el body |

Efecto en la UI: el campo **fecha de emisión** del formulario de orden se puede
sacar (el servidor la sella). La **fecha de entrega** sí sigue siendo del
usuario. Y `USUARIO_SESION` de [ordenes-compra.ts](../../src/data/ordenes-compra.ts)
se reemplaza por `GET /api/auth/sesion` cuando exista.

---

## 5. Shape de los request de compras

Para que no haya que leerlo del código:

```jsonc
// POST /api/ordenes-compra   ·   PUT /api/ordenes-compra/:id
{
  "proveedorId": 5,
  "formaPagoId": 2,
  "depositoEntregaId": 1,          // opcional
  "fechaEntrega": "2026-09-10",    // opcional
  "notas": "…",                    // opcional
  "descuento": 10,                 // PORCENTAJE 0-100, no monto
  "gastosEnvio": 1500,
  "lineas": [{ "articuloId": 1, "cantidad": 50, "precioAcordado": 850 }]
}

// POST /api/solicitudes-cotizacion
{
  "lineas": [{ "articuloId": 1, "cantidadEstimada": 50, "nota": "…" }],
  "notas": "…"
}

// POST /api/solicitudes-cotizacion/:id/cotizaciones
{
  "proveedorId": 8,
  "formaPagoId": 2,
  "fechaRecepcion": "2026-08-20",  // opcional
  "detalles": [{ "articuloId": 1, "precio": 850 }]
}

// PATCH /api/solicitudes-cotizacion/:id/adjudicar
{
  "asignaciones": [{ "articuloId": 1, "cotizacionId": 3 }],
  "depositoEntregaId": 1           // opcional
}
```

**`detalles` de la cotización** reemplaza al `precios: Record<id, number>` del
context. La conversión es una línea:

```ts
detalles: Object.entries(precios).map(([articuloId, precio]) => ({
  articuloId: Number(articuloId),
  precio,
}))
```

Se pide array y no objeto para que el error de validación pueda señalar **qué**
línea falló (`detalles.2.precio`) y el input se marque en rojo.

**La respuesta de `adjudicar`** es `{ solicitud, ordenes }`: las órdenes ya
vienen creadas por el back (una por proveedor ganador), así que
[ordenes-compra/page.tsx:452](../../src/app/ordenes-compra/page.tsx:452) deja de
armarlas a mano y solo las agrega a la lista.

---

## 6. Reglas que el back rechaza (para los estados de error)

Todas devuelven `{ error: { codigo, mensaje, campo? } }` con HTTP 409 o 422:

| Situación | `codigo` |
|---|---|
| editar una orden que ya no está Pendiente | `ORDEN_NO_EDITABLE` |
| enviar/cancelar desde un estado que no lo permite | `TRANSICION_INVALIDA` |
| proveedor o artículo inactivo | `PROVEEDOR_INACTIVO` · `ARTICULO_INACTIVO` |
| el mismo proveedor cotiza dos veces la misma solicitud | `COTIZACION_DUPLICADA` |
| la cotización no cubre todos los artículos pedidos | `COTIZACION_INCOMPLETA` |
| se adjudica dejando artículos sin asignar | `ADJUDICACION_INCOMPLETA` |
| cotizar o adjudicar una solicitud ya cerrada | `SOLICITUD_CERRADA` |

El `campo` viene cuando el error es de un input concreto, para marcarlo.
