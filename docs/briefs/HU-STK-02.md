
# HU-STK-02: Como personal de depósito, quiero gestionar los depósitos de cada sucursal y, para cada artículo, su ficha de stock con umbrales mínimo y crítico, para tener control del inventario en cada ubicación física y recibir alertas cuando sea necesario reponer

> Copiar este archivo como `HU-STK-02.md` y completar. Referencia: `docs/COMO-USAR.md`.

## Contexto

- **Ruta propuesta:** `/stock`
- **Relacionada con:** HU-STK-01 (Artículos), HU-STK-03 (Lista de Precios), HU-STK-04 (Movimientos de Stock)
- **Prioridad:** alta
- **Menú lateral:** El sistema contará con un menú colapsable en el lado izquierdo, que permite navegar entre los distintos módulos (Dashboard, Artículos, Lista de Precios, Órdenes de Compra, Proveedores, Movimientos, Stock, etc.). Este menú se mantiene visible en todas las pantallas del sistema.

## Wireframe (idea)

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  🏠 Stock                                                              [Perfil] │  ← header con navegación
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │  [ 📦 Depósitos ]  [ 📋 Fichas de Stock ]  [ 🔄 Transferencias ]              │  ← pestañas
│      │──────────────────────────────────────────────────────────────────────────────────│
│      │                                                                                  │
│      │  🔍 [Buscar por artículo o sucursal...]   [Filtros ▼]  [📥 Exportar] [➕ Nueva] │
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────┐    │
│      │  │  Sucursal: Centro ✕  |  Artículo: Activo ✕                               │    │
│      │  └──────────────────────────────────────────────────────────────────────────┘    │
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │ # │ Sucursal      │ Depósito    │ Artículo           │ Stock   │ Mín   │ Crít   │ Acciones ││
│      │  ├──────────────────────────────────────────────────────────────────────────────┤│
│      │  │ 1 │ Centro        │ Dep. Central│ Amoxicilina 500mg  │ 45.00  │ 20.00 │ 5.00  │ ✏️ 🔄   ││
│      │  │ 2 │ Centro        │ Dep. Central│ Jeringa 5ml        │ 12.00  │ 30.00 │ 10.00 │ ✏️ 🔄 ⚠️││
│      │  │ 3 │ Norte         │ Dep. Norte  │ Alimento Premium   │  8.00  │ 15.00 │ 5.00  │ ✏️ 🔄 🔴││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │  Mostrando 1-3 de 28 fichas                                        [< 1 2 3 ... >]│
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Formulario - Alta/Edición Ficha de Stock]                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  ✏️ [Editar / Nueva] Ficha de Stock                                             │   │
│  │                                                                                  │   │
│  │  Sucursal *        [ ▼ Centro       ]  (solo para filtrar depósito; no se guarda)│   │
│  │  Depósito *        [ ▼ Dep. Central ]  (se filtra según sucursal)               │   │
│  │  Artículo *        [ ▼ Amoxicilina 500mg ] (solo lectura en edición)           │   │
│  │                                                                                  │   │
│  │  Umbral mínimo *   [ 20.00          ]  (decimal, cantidad mínima antes de alerta)│   │
│  │  Umbral crítico    [ 5.00           ]  (decimal, OPCIONAL; notificación auto)   │   │
│  │                                                                                  │   │
│  │  Stock actual      [ 0.00           ]  (solo lectura - se actualiza con mov.)    │   │
│  │  Unidad medida     [ Unidad         ]  (solo lectura - viene de artículo)        │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Guardar]                         │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Transferencia entre Depósitos]                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  🔄 Transferencia de Stock                                                      │   │
│  │                                                                                  │   │
│  │  Origen                                                                      │   │
│  │  Sucursal *        [ ▼ Centro       ]                                           │   │
│  │  Depósito *        [ ▼ Dep. Central ]                                           │   │
│  │                                                                                  │   │
│  │  Destino                                                                     │   │
│  │  Sucursal *        [ ▼ Norte        ]                                           │   │
│  │  Depósito *        [ ▼ Dep. Norte   ]                                           │   │
│  │                                                                                  │   │
│  │  Artículo *        [ ▼ Amoxicilina 500mg ]                                      │   │
│  │  Cantidad *        [ 10.00          ]  (decimal, no puede superar stock origen)  │   │
│  │                                                                                  │   │
│  │  Stock origen: 45.00  |  Stock destino: 8.00                                    │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Confirmar Transferencia]         │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

Notas:
- El menú lateral (columna izquierda) es colapsable mediante el ícono ☰.
- Las pestañas organizan la vista: Depósitos (listado de depósitos por sucursal), 
  Fichas de Stock (tabla principal con artículos y sus stocks), Transferencias (formulario).
- Los indicadores de alerta en la tabla:
  - Sin indicador = Stock normal (por encima del mínimo)
  - ⚠️ (amarillo) = Stock bajo umbral mínimo
  - 🔴 (rojo) = Stock en nivel crítico
```

## User flow

1. **Origen:** El usuario ingresa desde el menú lateral en la sección "Stock" o desde el dashboard.
2. **Acción principal:** Quiere visualizar las fichas de stock de los depósitos. Puede buscar, filtrar, crear nuevas fichas, editar umbrales, o realizar transferencias entre depósitos.
3. **Destino:** Después de realizar una acción (alta, edición o transferencia), el sistema confirma la operación, actualiza la vista y registra en bitácora. El usuario permanece en la pantalla de stock.

## Datos hardcodeados

```ts
// Refleja la tabla `deposito`: id, sucursal_id, nombre, ubicacion
// `sucursal` se muestra a modo de referencia (join con el catálogo de sucursales, externo a este módulo)
// NOTA: La tabla `deposito` NO tiene campo `activo`. Los depósitos no se dan de baja lógica.
const depositos = [
  { id: 1, sucursal_id: 1, sucursal: "Centro", nombre: "Dep. Central", ubicacion: "Av. Principal 123" },
  { id: 2, sucursal_id: 2, sucursal: "Norte", nombre: "Dep. Norte", ubicacion: "Calle Norte 456" },
  { id: 3, sucursal_id: 3, sucursal: "Sur", nombre: "Dep. Sur", ubicacion: "Av. Sur 789" }
];

// Refleja la tabla `ficha_stock`: id, articulo_id, deposito_id, stock_actual (decimal 12,2),
// stock_minimo (decimal 10,2, obligatorio), stock_critico (decimal 10,2, OPCIONAL).
// No existe columna `activo` en ficha_stock: el estado activo/inactivo depende del artículo asociado (articulo.estado).
// `unidadMedida` no se almacena en la ficha: se obtiene por join con articulo.unidad_medida.
// `estado` (normal/bajo/critico) es un valor CALCULADO en el front a partir de stock_actual vs. stock_minimo/stock_critico.
const fichasStock = [
  {
    id: 1,
    articuloId: 1,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 1, codigo: "ART001", nombre: "Amoxicilina 500mg", unidadMedida: "unidad", estado: "activo" },
    stockActual: 45.00,
    stockMinimo: 20.00,
    stockCritico: 5.00,
    estadoCalculado: "normal" // calculado: normal | bajo | critico
  },
  {
    id: 2,
    articuloId: 2,
    depositoId: 1,
    deposito: { id: 1, nombre: "Dep. Central", sucursal: "Centro" },
    articulo: { id: 2, codigo: "ART002", nombre: "Jeringa 5ml", unidadMedida: "unidad", estado: "activo" },
    stockActual: 12.00,
    stockMinimo: 30.00,
    stockCritico: 10.00,
    estadoCalculado: "bajo" // ⚠️ por debajo del mínimo
  },
  {
    id: 3,
    articuloId: 3,
    depositoId: 2,
    deposito: { id: 2, nombre: "Dep. Norte", sucursal: "Norte" },
    articulo: { id: 3, codigo: "ART003", nombre: "Alimento Premium para Perros", unidadMedida: "kg", estado: "activo" },
    stockActual: 8.00,
    stockMinimo: 15.00,
    stockCritico: 5.00,
    estadoCalculado: "critico" // 🔴 stock_actual (8) está por debajo de stock_critico (5)
    // Si stockCritico fuera null, estadoCalculado sería "bajo" (solo compara con stockMinimo)
  }
];

// Ejemplo de par de movimientos generados por una transferencia, reflejando `movimiento_stock`
// (id, ficha_stock_id, origen_id -> catálogo origen_movimiento, origen_entidad_id, tipo, cantidad,
// fecha_hora, empleado_id, motivo, movimiento_vinculado_id)
const movimientosTransferencia = [
  {
    id: 101,
    fichaStockId: 1,        // ficha del depósito ORIGEN
    origenId: 2,             // id en origen_movimiento, ej. "Transferencia"
    origenEntidadId: 55,     // id de la transferencia (entidad polimórfica)
    tipo: "egreso",
    cantidad: 10.00,
    fechaHora: "2025-08-10T09:15:00Z",
    empleadoId: 7,
    motivo: "Transferencia a Dep. Norte",
    movimientoVinculadoId: 102
  },
  {
    id: 102,
    fichaStockId: 3,        // ficha del depósito DESTINO
    origenId: 2,
    origenEntidadId: 55,
    tipo: "ingreso",
    cantidad: 10.00,
    fechaHora: "2025-08-10T09:15:00Z",
    empleadoId: 7,
    motivo: "Transferencia desde Dep. Central",
    movimientoVinculadoId: 101
  }
];
```

## Estados

- [x] Vacío: Mostrar mensaje "No hay fichas de stock cargadas" y botón para crear la primera.
- [x] Cargando: Mostrar skeleton/spinner en tabla y deshabilitar acciones.
- [x] Error: Mostrar mensaje de error con opción para reintentar.
- [x] Con datos: Mostrar tabla con las fichas, paginación, controles de filtro/búsqueda e indicadores de alerta.

## Criterios de aceptación

### General
- [ ] La pantalla opera en tres modos controlados por pestaña: **Depósitos**, **Fichas de Stock** y **Transferencias**.
- [ ] El formulario de alta/edición de ficha es único y se adapta según el modo (INSERCIÓN o EDICIÓN).
- [ ] Todos los campos requeridos están marcados con un asterisco (*).
- [ ] Se registra en bitácora de auditoría cada alta, modificación de ficha y cada transferencia, con: usuario responsable, fecha, hora y valores anterior y nuevo.
- [ ] El menú lateral es colapsable y recuerda su estado (abierto/cerrado) durante la sesión.

### Pestaña: Depósitos
- [ ] Lista de depósitos agrupados por sucursal (`deposito.sucursal_id`, catálogo externo a este módulo).
- [ ] Cada depósito muestra: nombre (`deposito.nombre`), sucursal y ubicación (`deposito.ubicacion`).
- [ ] Permite crear nuevos depósitos y editar existentes (campos: sucursal, nombre, ubicación).
- [ ] La tabla `deposito` no cuenta con un campo de estado activo/inactivo; los depósitos no se dan de baja lógica desde esta pantalla.

### Pestaña: Fichas de Stock (tabla principal)
- [ ] **Tabla** con columnas: Sucursal, Depósito, Artículo, Stock Actual, Umbral Mínimo, Umbral Crítico, Estado (con indicador visual), Acciones.
- [ ] **Indicadores de estado en tabla:**
  - Sin indicador = Stock normal (por encima del mínimo)
  - ⚠️ Amarillo = Stock bajo umbral mínimo
  - 🔴 Rojo = Stock en nivel crítico
- [ ] Barra de búsqueda permite buscar por **código de artículo**, **nombre de artículo** o **sucursal**.
- [ ] Botón de filtros despliega panel para filtrar por **sucursal** y **estado de stock**.
- [ ] Los filtros seleccionados se muestran como etiquetas (tags) sobre la tabla, cada una con "✕" para eliminarla.
- [ ] Por defecto, la lista muestra **solo fichas cuyo artículo asociado está activo** (`articulo.estado = activo`); la tabla `ficha_stock` no tiene columna de estado propia.
- [ ] Botón de **Exportar** descarga la lista filtrada en formato CSV o Excel.
- [ ] Paginación: muestra resultados de a 10, 25 o 50 registros.

### Ficha de Stock - Campos del formulario
- [ ] **Sucursal:** Obligatorio, selección desde catálogo de sucursales (usado solo para filtrar el depósito; no se guarda en `ficha_stock`).
- [ ] **Depósito:** Obligatorio, selección desde catálogo de depósitos (`ficha_stock.deposito_id`, se filtra según sucursal seleccionada).
- [ ] **Artículo:** Obligatorio, selección desde catálogo de artículos (`ficha_stock.articulo_id`, solo lectura en modo EDICIÓN). La combinación artículo + depósito debe ser única.
- [ ] **Umbral mínimo:** Obligatorio (`ficha_stock.stock_minimo`, decimal(10,2), positivo). Si se define umbral crítico, el mínimo debe ser mayor.
- [ ] **Umbral crítico:** Opcional (`ficha_stock.stock_critico`, decimal(10,2), positivo). Si se define, debe ser menor al umbral mínimo.
- [ ] **Stock actual:** Solo lectura (`ficha_stock.stock_actual`, decimal(12,2)), inicializa en 0 al crear. Se actualiza exclusivamente mediante movimientos (HU-STK-04). No es editable manualmente.
- [ ] **Unidad de medida:** Solo lectura, no se almacena en `ficha_stock`; se obtiene por join con `articulo.unidad_medida`.

### Ficha de Stock - Validaciones
- [ ] No puede existir más de una ficha para el mismo artículo en el mismo depósito (unicidad de `articulo_id` + `deposito_id`).
- [ ] Si se define un umbral crítico, el umbral mínimo debe ser estrictamente mayor que el umbral crítico.
- [ ] Al modificar los umbrales, se recalcula el estado visual (normal/bajo/crítico) de la ficha, ya que este valor no se persiste como columna sino que se calcula en base a `stock_actual`, `stock_minimo` y `stock_critico`.

### Pestaña: Transferencias
- [ ] **Formulario de transferencia** entre depósitos de distintas sucursales.
- [ ] **Origen:** Sucursal y Depósito (obligatorio). Debe existir `ficha_stock` para el artículo en ese depósito.
- [ ] **Destino:** Sucursal y Depósito (obligatorio, debe ser distinto al origen). Si no existe `ficha_stock` para el artículo en el depósito destino, se crea una nueva ficha con `stock_actual = 0` antes de aplicar el ingreso.
- [ ] **Artículo:** Obligatorio, solo se muestran artículos con ficha de stock en el depósito de origen.
- [ ] **Cantidad:** Obligatorio, decimal positivo (`movimiento_stock.cantidad`, decimal(12,2)). No puede superar el `stock_actual` de la ficha de origen.
- [ ] Muestra **stock actual** del artículo en origen y destino antes de confirmar.
- [ ] Al confirmar, se generan dos registros en `movimiento_stock`, enlazados entre sí mediante `movimiento_vinculado_id`:
  - Un **egreso** (`tipo = egreso`) sobre la `ficha_stock_id` del depósito de origen.
  - Un **ingreso** (`tipo = ingreso`) sobre la `ficha_stock_id` del depósito de destino.
  - Ambos registros comparten `origen_id` (referencia al catálogo `origen_movimiento`, ej. "Transferencia"), `origen_entidad_id` (identificador de la transferencia), `empleado_id` (usuario responsable) y `fecha_hora`.
  - Se registran ambos movimientos en bitácora de auditoría.
  - Se actualiza `stock_actual` de ambas fichas de stock.

### Notificaciones
- [ ] Cada acción (alta de ficha, edición, transferencia) muestra una notificación toast:
  - **Éxito:** "Ficha de stock creada correctamente" o "Transferencia realizada correctamente".
  - **Error:** "Error al guardar: [descripción]" o "Error en transferencia: [descripción]".
- [ ] La notificación persiste unos segundos y se cierra automáticamente (o con "✕").

### Alertas de Stock
- [ ] Cuando el stock de una ficha cae por debajo del **umbral mínimo**, se muestra un indicador ⚠️ amarillo en la tabla.
- [ ] Cuando el stock llega al **umbral crítico**, se muestra un indicador 🔴 rojo en la tabla.
- [ ] Las alertas se actualizan automáticamente después de cada movimiento (HU-STK-04).
- [ ] Si `stock_critico` es `null` (campo opcional en la BD), la ficha solo puede mostrar los estados **normal** o **bajo** en base al umbral mínimo; el indicador 🔴 solo aplica cuando la ficha tiene un `stock_critico` definido y el stock lo alcanza o supera hacia abajo.
