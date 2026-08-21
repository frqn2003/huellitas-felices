# HU-STK-04: Como personal de depósito, quiero registrar todo movimiento de stock (ingresos, egresos, transferencias y ajustes) sobre una o varias fichas de stock, para mantener el inventario actualizado y trazable

## Contexto

- **Ruta propuesta:** `/movimientos-stock`
- **Relacionada con:** HU-STK-01 (Artículos), HU-STK-02 (Fichas de Stock), HU-STK-03 (Lista de Precios), HU-COMP-XX (Órdenes de Compra), HU-PROV-XX (Proveedores)
- **Prioridad:** alta
- **Menú lateral:** El sistema contará con un menú colapsable en el lado izquierdo, que permite navegar entre los distintos módulos (Dashboard, Artículos, Lista de Precios, Órdenes de Compra, Proveedores, Movimientos, etc.). Este menú se mantiene visible en todas las pantallas del sistema.

## Wireframe (idea)

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  📦 Movimientos de Stock                                               [Perfil] │
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │  🔍 [Buscar por nro. o artículo...]   [Filtros ▼]  [📥 Exportar] [➕ Nuevo]     │
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────┐    │
│      │  │  Tipo: Ingreso ✕  |  Depósito: Central ✕  |  Período: Ago 2026 ✕      │    │
│      │  └──────────────────────────────────────────────────────────────────────────┘    │
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │ # │ Nro.Mov  │ Fecha/Hora   │ Tipo      │ Depósito   │ Artículo       │ Cant││
│      │  ├──────────────────────────────────────────────────────────────────────────────┤│
│      │  │ 1 │ MOV-0001 │ 15/08 09:30  │ Ingreso   │ Central    │ Amoxicilina500 │  20 ││
│      │  │ 2 │ MOV-0002 │ 15/08 11:15  │ Egreso    │ Central    │ Jeringa 5ml    │  50 ││
│      │  │ 3 │ MOV-0003 │ 16/08 10:00  │ Transfer. │ Sucursal A │ Alimento Prem. │  10 ││
│      │  │ 4 │ MOV-0004 │ 16/08 10:00  │ Transfer. │ Central    │ Alimento Prem. │  10 ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │  Mostrando 1-4 de 128 movimientos                                   [< 1 2 3 ... >]│
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Nuevo Movimiento]                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  📦 Nuevo Movimiento de Stock                                                   │   │
│  │                                                                                  │   │
│  │  Fecha y hora *    [ 17/08/2026 14:30 ]                                        │   │
│  │  Depósito *        [ ▼ Depósito Central ]                                       │   │
│  │  Tipo de movimiento* [ ▼ Ingreso       ]                                        │   │
│  │  Origen *          [ ▼ Orden de Compra ]                                        │   │
│  │  Origen entidad    [ 12               ]  (opcional, ej: nro. de OC)             │   │
│  │  Motivo            [ Texto libre...    ]  (opcional)                            │   │
│  │                                                                                  │   │
│  │  ── ARTÍCULOS ────────────────────────────────────────────────────────────────  │   │
│  │  ┌──────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ Artículo *           │ Cantidad *  │ Ficha Stock   │ Stock Actual │ [✕]  │   │   │
│  │  ├──────────────────────┼─────────────┼───────────────┼──────────────┼──────┤   │   │
│  │  │ [▼ Amoxicilina 500]  │ [ 20      ] │ FIC-001       │ 150          │  ✕   │   │   │
│  │  │ [▼ Jeringa 5ml      ] │ [ 50      ] │ FIC-002       │ 300          │  ✕   │   │   │
│  │  └──────────────────────────────────────────────────────────────────────────┘   │   │
│  │  [+ Agregar artículo]                                                           │   │
│  │                                                                                  │   │
│  │  ⚠️ Validaciones:                                                               │   │
│  │  • Si es EGRESO: stock resultante no puede ser negativo                         │   │
│  │  • La ficha de stock debe existir para cada artículo en el depósito             │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Confirmar Movimiento]           │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Alerta de Reposición]                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Alerta de Stock                                                             │   │
│  │                                                                                  │   │
│  │  El artículo "Amoxicilina 500mg" ha alcanzado el stock mínimo (20 u.)          │   │
│  │  Stock actual: 18 u.  |  Stock mínimo: 20 u.  |  Stock crítico: 10 u.          │   │
│  │                                                                                  │   │
│  │                                    [Entendido]                                  │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## User flow

1. **Origen:** El usuario ingresa desde el menú lateral (módulo de Stock → Movimientos) o desde la vista de fichas de stock.
2. **Acción principal:** Quiere registrar uno o más movimientos de stock. Selecciona el tipo, el depósito, fecha/hora y agrega artículos con cantidades. Al confirmar, el sistema genera **un registro en `movimiento_stock` por cada artículo**.
3. **Destino:** El sistema actualiza el `stock_actual` de cada ficha afectada, genera alertas si corresponde, registra en bitácora y muestra notificación de éxito. El usuario permanece en la lista.

## Datos hardcodeados

```ts
// Tabla movimiento_stock: cada registro = 1 artículo
const movimientos = [
  {
    id: 1,
    numero: "MOV-0001",
    fichaStockId: 1,
    fichaStock: { articuloNombre: "Amoxicilina 500mg", depositoNombre: "Depósito Central" },
    origenId: 1,
    origen: { nombre: "Orden de Compra" },
    origenEntidadId: 12,
    tipo: "Ingreso",
    cantidad: 20,
    fechaHora: "2026-08-15T09:30:00Z",
    empleadoId: 3,
    empleado: { nombre: "Carlos López" },
    motivo: "Recepción de orden de compra OC-0012",
    movimientoVinculadoId: null,
    createdAt: "2026-08-15T09:30:00Z"
  },
  {
    id: 2,
    numero: "MOV-0002",
    fichaStockId: 2,
    fichaStock: { articuloNombre: "Jeringa 5ml", depositoNombre: "Depósito Central" },
    origenId: 2,
    origen: { nombre: "Venta" },
    origenEntidadId: 45,
    tipo: "Egreso",
    cantidad: 50,
    fechaHora: "2026-08-15T11:15:00Z",
    empleadoId: 5,
    empleado: { nombre: "María García" },
    motivo: "Venta a cliente #45",
    movimientoVinculadoId: null,
    createdAt: "2026-08-15T11:15:00Z"
  },
  {
    id: 3,
    numero: "MOV-0003",
    fichaStockId: 5,
    fichaStock: { articuloNombre: "Alimento Premium", depositoNombre: "Sucursal A" },
    origenId: 3,
    origen: { nombre: "Transferencia" },
    origenEntidadId: null,
    tipo: "Ingreso",
    cantidad: 10,
    fechaHora: "2026-08-16T10:00:00Z",
    empleadoId: 3,
    empleado: { nombre: "Carlos López" },
    motivo: "Transferencia desde Depósito Central",
    movimientoVinculadoId: 4,
    createdAt: "2026-08-16T10:00:00Z"
  },
  {
    id: 4,
    numero: "MOV-0004",
    fichaStockId: 3,
    fichaStock: { articuloNombre: "Alimento Premium", depositoNombre: "Depósito Central" },
    origenId: 3,
    origen: { nombre: "Transferencia" },
    origenEntidadId: null,
    tipo: "Egreso",
    cantidad: 10,
    fechaHora: "2026-08-16T10:00:00Z",
    empleadoId: 3,
    empleado: { nombre: "Carlos López" },
    motivo: "Transferencia a Sucursal A",
    movimientoVinculadoId: 3,
    createdAt: "2026-08-16T10:00:00Z"
  }
];

const tiposMovimiento = [
  { id: 1, nombre: "Ingreso" },
  { id: 2, nombre: "Egreso" },
  { id: 3, nombre: "Transferencia" },
  { id: 4, nombre: "Ajuste" }
];

const origenesMovimiento = [
  { id: 1, nombre: "Orden de Compra" },
  { id: 2, nombre: "Venta" },
  { id: 3, nombre: "Transferencia" },
  { id: 4, nombre: "Ajuste" }
];

const fichasStock = [
  { id: 1, articuloId: 1, articuloNombre: "Amoxicilina 500mg", depositoId: 1, depositoNombre: "Depósito Central", stockActual: 150, stockMinimo: 20, stockCritico: 10 },
  { id: 2, articuloId: 2, articuloNombre: "Jeringa 5ml", depositoId: 1, depositoNombre: "Depósito Central", stockActual: 300, stockMinimo: 50, stockCritico: 20 },
  { id: 3, articuloId: 3, articuloNombre: "Alimento Premium", depositoId: 1, depositoNombre: "Depósito Central", stockActual: 45, stockMinimo: 10, stockCritico: 5 }
];
```

## Estados

- [x] Vacío: Mostrar mensaje "No hay movimientos registrados" y botón para crear el primero.
- [x] Cargando: Mostrar skeleton/spinner en tabla y deshabilitar acciones.
- [x] Error: Mostrar mensaje de error con opción para reintentar.
- [x] Con datos: Mostrar tabla con los movimientos, paginación y controles de filtro/búsqueda.

## Criterios de aceptación

### General
- [ ] Cada registro en `movimiento_stock` representa **un solo artículo**. Si se mueven varios artículos, se generan múltiples registros vinculados.
- [ ] Todos los campos requeridos están marcados con un asterisco (*).
- [ ] Se registra en bitácora de auditoría cada movimiento, con: usuario responsable, fecha, hora y tipo de operación.
- [ ] El menú lateral es colapsable y recuerda su estado (abierto/cerrado) durante la sesión.

### Campos del formulario (uno por registro en `movimiento_stock`)
- [ ] **Número de movimiento:** Generado automáticamente (formato: `MOV-XXXX`), solo lectura. Se repite en los registros vinculados del mismo movimiento grupal.
- [ ] **Fecha y hora (`fecha_hora`):** Obligatorio. Selector de fecha y hora. Por defecto: fecha/hora actual.
- [ ] **Depósito afectado:** Obligatorio, se obtiene de la `ficha_stock` seleccionada (campo `deposito_id`). El usuario selecciona el depósito y luego el artículo dentro de ese depósito.
- [ ] **Tipo de movimiento (`tipo`):** Obligatorio, selección desde tabla de referencia: Ingreso, Egreso, Transferencia, Ajuste.
- [ ] **Origen (`origen_id`):** Obligatorio, selección desde `origen_movimiento` (Orden de Compra, Venta, Transferencia, Ajuste).
- [ ] **Origen entidad (`origen_entidad_id`):** Opcional. ID de la entidad relacionada (número de orden de compra, número de venta, etc.).
- [ ] **Artículo / Ficha de stock (`ficha_stock_id`):** Obligatorio. El usuario selecciona un depósito y luego un artículo. El sistema busca la ficha de stock correspondiente.
- [ ] **Cantidad (`cantidad`):** Obligatoria, número decimal positivo (decimal(12,2)).
- [ ] **Empleado (`empleado_id`):** Obligatorio. Se asigna automáticamente el usuario logueado.
- [ ] **Motivo (`motivo`):** Texto libre, no obligatorio (varchar(255)).
- [ ] **Movimiento vinculado (`movimiento_vinculado_id`):** Generado automáticamente para transferencias (vincula el egreso de un depósito con el ingreso en otro).

### Formulario múltiple
- [ ] El formulario permite agregar **uno o más artículos** antes de confirmar.
- [ ] Al confirmar, el sistema genera **un registro en `movimiento_stock` por cada artículo** listado.
- [ ] Los registros generados comparten: `fecha_hora`, `tipo`, `origen_id`, `empleado_id`, `motivo` y `numero` (agrupador visual).
- [ ] Para **transferencias**, el sistema genera registros en ambos depósitos (egreso + ingreso) y los vincula con `movimiento_vinculado_id`.

### Validaciones de stock
- [ ] **Existencia de ficha:** Antes de confirmar, valida que exista una `ficha_stock` activa para cada artículo en el depósito seleccionado. Si no existe, rechaza indicando cuál falta.
- [ ] **Stock suficiente para egresos:** Si el tipo es **Egreso** o **Transferencia**, valida que `stock_actual - cantidad ≥ 0`. Si es negativo, rechaza indicando la cantidad disponible.
- [ ] **Validación en tiempo real:** Las validaciones se ejecutan al intentar confirmar, no al agregar artículos.

### Actualización automática de stock
- [ ] Al confirmar, el sistema **actualiza `stock_actual`** de cada `ficha_stock` afectada:
  - **Ingreso:** `stock_actual += cantidad`
  - **Egreso:** `stock_actual -= cantidad`
  - **Transferencia:** Resta del depósito origen, suma al depósito destino.
  - **Ajuste:** Suma o resta según signo de la cantidad.
- [ ] La actualización es **atómica**: si falla alguna ficha, se revierten todos los registros del movimiento.

### Alertas de reposición
- [ ] Después de actualizar, verifica si `stock_actual ≤ stock_minimo` o `stock_actual ≤ stock_critico`.
- [ ] Si se supera el umbral, muestra alerta indicando: artículo, stock actual, stock mínimo y stock crítico.

### Historial y búsqueda
- [ ] La lista muestra: Nro. Movimiento, Fecha/Hora, Tipo (con color/ícono), Depósito, Artículo, Cantidad, Origen, Empleado.
- [ ] **Filtros:** Tipo de movimiento, Depósito, Artículo, Período (fecha desde/hasta).
- [ ] Los filtros seleccionados se muestran como etiquetas (tags) con "✕" para eliminarlas.
- [ ] **Búsqueda** por número de movimiento o nombre de artículo.
- [ ] **Exportar** la lista filtrada en CSV o Excel.
- [ ] **Paginación:** 10, 25 o 50 registros por página.

### Notificaciones
- [ ] Cada acción muestra toast:
  - **Éxito:** "Movimiento registrado correctamente"
  - **Error:** "Error al registrar: [descripción]"
  - **Alerta:** "El artículo [nombre] ha alcanzado el stock mínimo"

### Auditoría
- [ ] Cada movimiento genera registro en bitácora: usuario, fecha, hora, tipo, depósito, artículo, cantidad.
