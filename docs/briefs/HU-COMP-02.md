
# HU-COMP-02: Como personal de depósito, quiero emitir órdenes de compra con comparación de cotizaciones, para formalizar la adquisición de productos al proveedor seleccionado tras evaluar opciones

> **⚠️ [OBSOLETA] (v1).** Reemplazada por **`HU-COMP-02-02.md`** (v2): la comparación de
> cotizaciones sale de este flujo a una pantalla dedicada (tab "Cotizaciones" del módulo
> Compras) y los estados de orden pasan a: Pendiente → Enviada → Recibida Parcial/Total,
> o Cancelada (5 estados). Este archivo queda como historial de la v1; no usar para
> diseñar. Referencia: `docs/COMO-USAR.md`.

## Contexto

- **Ruta propuesta:** `/ordenes-compra/nueva`
- **Relacionada con:** HU-STK-01 (Artículos), HU-STK-04 (Stock Mínimo), HU-PROV-XX (Proveedores), HU-COMP-01 (Necesidades de Compra - si se implementa)
- **Prioridad:** alta
- **Menú lateral:** El sistema contará con un menú colapsable en el lado izquierdo, que permite navegar entre los distintos módulos (Dashboard, Artículos, Lista de Precios, Órdenes de Compra, Proveedores, Movimientos, etc.). Este menú se mantiene visible en todas las pantallas del sistema.

## ⚠️ Nota sobre estructura de BD

**Campos existentes en `orden_compra`:**
- id, proveedor_id, cotizacion_id, usuario_id, fecha, fecha_entrega, direccion_entrega, notas, subtotal, descuento, gastos_envio, total, estado

**Campos NO existentes en BD (requerirían migración o tabla nueva):**
- `numero` (número secuencial) - Puede generarse por secuencia o trigger
- Tabla de cotizaciones - El campo `cotizacion_id` existe pero no se ve la tabla en el diagrama
- Tabla de necesidades de compra - No existe en el diagrama actual

**Estados en BD vs HU:**
- BD actual: Pendiente, Aprobada, Recibida, Anulada
- HU propuesta: Pendiente, Enviada, Recibida Parcial, Recibida Total, Cancelada

## Wireframe (idea)

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  🏠 Nueva Orden de Compra                                                [Perfil] │
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │  📋 CABECERA DE LA ORDEN                                                    ││
│      │  │                                                                              ││
│      │  │  Proveedor *      [ ▼ Seleccionar proveedor ]                               ││
│      │  │  Fecha emisión *  [ 18/06/2025      ]                                       ││
│      │  │  Fecha entrega    [ 25/06/2025      ]  (opcional)                            ││
│      │  │  Dirección entrega[ Av. Principal 1234 ] (opcional)                          ││
│      │  │  Condiciones pago [ ▼ Contado      ]  (opcional)                            ││
│      │  │  Notas            [ Texto libre...  ]  (opcional)                            ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │  📊 COMPARACIÓN DE COTIZACIONES (opcional)                                  ││
│      │  │  ┌────────────────────────────────────────────────────────────────────────┐ ││
│      │  │  │ Proveedor        │ Articulo 1    │ Articulo 2    │ Total    │ Seleccionar│ ││
│      │  │  ├──────────────────┼───────────────┼───────────────┼──────────┼───────────┤ ││
│      │  │  │ Farmacia XYZ     │ $850 x 50     │ $45 x 100    │ $47.000  │ [○]       │ ││
│      │  │  │ Pharma S.A.      │ $820 x 50     │ $48 x 100    │ $45.800  │ [●]       │ ││
│      │  │  │ Distribuidora    │ $900 x 50     │ $40 x 100    │ $49.000  │ [○]       │ ││
│      │  │  └────────────────────────────────────────────────────────────────────────┘ ││
│      │  │  [➕ Agregar cotización]                                                     ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │  📦 DETALLE DE ARTÍCULOS                                                    ││
│      │  │  [➕ Agregar artículo]                                                       ││
│      │  │                                                                              ││
│      │  │  │ Artículo              │ Cantidad * │ Precio Unit. * │ Subtotal   │ Acción ││
│      │  │  ├───────────────────────┼────────────┼────────────────┼────────────┼────────┤│
│      │  │  │ [▼ Amoxicilina 500mg] │ [  50    ] │ [ $820.00    ] │ $41.000   │ [🗑️]  ││
│      │  │  │ [▼ Jeringa 5ml       ] │ [ 100    ] │ [ $48.00     ] │ $4.800    │ [🗑️]  ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │  💰 TOTALES                                                                  ││
│      │  │  Subtotal: $45.800   Descuento: [    ]   Gastos envío: [    ]               ││
│      │  │  TOTAL: $45.800                                                              ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │                                    [Cancelar]  [Guardar como Borrador]  [Emitir]│
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Confirmar emisión]                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ ¿Confirmar emisión de la orden de compra?                                   │   │
│  │                                                                                  │   │
│  │  Proveedor: Pharma S.A.                                                         │   │
│  │  Total: $45.800                                                                  │   │
│  │  Artículos: 2                                                                    │   │
│  │                                                                                  │   │
│  │  La orden recibirá el número secuencial y quedará en estado "Pendiente".        │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Confirmar emisión]               │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## User flow

1. **Origen:** El usuario ingresa desde:
   - Menú lateral → Órdenes de Compra → Nueva
   - Alerta de stock mínimo (HU-STK-04) → Crear orden
   - Lista de necesidades pendientes (HU-COMP-01) → Generar orden (si se implementa)

2. **Acción principal:**
   - Seleccionar proveedor (obligatorio)
   - Comparar cotizaciones de múltiples proveedores (opcional pero recomendado)
   - Agregar artículos con cantidades y precios
   - Revisar totales
   - Emitir la orden

3. **Destino:**
   - La orden se guarda con estado "Pendiente"
   - Se muestra notificación de éxito
   - Se redirige a la lista de órdenes o al detalle de la orden creada

## Datos hardcodeados

**NOTA IMPORTANTE:** Los datos están estructurados según las tablas `orden_compra` y `orden_compra_detalle` de la BD.

```ts
// Cotizaciones de ejemplo (estas serían de una tabla futura o se calculan)
const cotizaciones = [
  {
    proveedor_id: 5,
    _proveedor: { razon_social: "Farmacia XYZ S.A." },
    articulos: [
      { articulo_id: 1, precio: 850 },
      { articulo_id: 2, precio: 45 }
    ]
  },
  {
    proveedor_id: 8,
    _proveedor: { razon_social: "Laboratorios Pharma S.A." },
    articulos: [
      { articulo_id: 1, precio: 820 },
      { articulo_id: 2, precio: 48 }
    ]
  },
  {
    proveedor_id: 12,
    _proveedor: { razon_social: "Distribuidora Mascotas Felices" },
    articulos: [
      { articulo_id: 1, precio: 900 },
      { articulo_id: 2, precio: 40 }
    ]
  }
];

// Orden de compra a crear (estructura BD)
const nuevaOrden = {
  // CAMPOS DE LA TABLA orden_compra
  id: null,                          // Se genera automáticamente
  proveedor_id: 8,                   // FK a tabla proveedor (seleccionado tras comparación)
  cotizacion_id: null,               // FK a tabla cotizacion (opcional)
  usuario_id: 1,                     // FK a tabla usuario (quien creó la orden)
  fecha: "2025-06-18T10:30:00Z",     // Fecha de emisión
  fecha_entrega: "2025-06-25T10:00:00Z", // Fecha estimada de entrega
  direccion_entrega: "Av. Principal 1234, Localidad",
  notas: "Entregar en horario de mañana",
  subtotal: 45800,
  descuento: 0,
  gastos_envio: 0,
  total: 45800,
  estado: "Pendiente",               // ENUM: Pendiente, Aprobada, Recibida, Anulada
  
  // DETALLES (se guardan en orden_compra_detalle)
  _detalles: [
    { articulo_id: 1, cantidad: 50, precio_acordado: 820 },   // Amoxicilina
    { articulo_id: 2, cantidad: 100, precio_acordado: 48 }    // Jeringa
  ]
};

// Para referencia: artículos disponibles
const articulos = [
  { id: 1, codigo: "ART001", nombre: "Amoxicilina 500mg", unidad_medida: "Unidad" },
  { id: 2, codigo: "ART002", nombre: "Jeringa 5ml", unidad_medida: "Unidad" },
  { id: 3, codigo: "ART003", nombre: "Alimento Premium para Perros", unidad_medida: "Kg" }
];
```

## Estados

- [x] Vacío: Mostrar mensaje "Complete los datos para crear una orden de compra" con formulario vacío.
- [x] Cargando: Mostrar skeleton/spinner al enviar el formulario.
- [x] Error: Mostrar mensaje de error con opción para reintentar.
- [x] Con datos: Mostrar formulario con proveedor, artículos y cotizaciones.

## Criterios de aceptación

### General
- [ ] La pantalla opera en modo **INSERCIÓN** para crear nuevas órdenes.
- [ ] Todos los campos requeridos están marcados con un asterisco (*).
- [ ] Se registra en bitácora de auditoría cada emisión, con: usuario responsable, fecha y hora.

### Campos del formulario
- [ ] **Proveedor:** Obligatorio, selección desde catálogo de proveedores activos.
- [ ] **Fecha emisión:** Obligatorio, fecha de emisión de la orden (por defecto fecha actual, editable).
- [ ] **Fecha entrega:** Opcional, fecha estimada de entrega.
- [ ] **Dirección entrega:** Opcional, dirección de entrega (por defecto dirección del depósito).
- [ ] **Condiciones de pago:** Opcional, selección desde catálogo predefinido (Contado, 30 días, 60 días, etc.).
- [ ] **Notas:** Opcional, texto libre para observaciones.

### Comparación de cotizaciones
- [ ] Sección opcional para registrar y comparar cotizaciones de múltiples proveedores.
- [ ] Cada cotización incluye: proveedor, artículos con precios unitarios.
- [ ] El sistema calcula el total por proveedor automáticamente.
- [ ] El usuario puede seleccionar un proveedor como "ganador" y se autocompleta el formulario.
- [ ] La comparación queda documentada en la orden emitida (referencia en notas o campo dedicado).

### Detalle de artículos
- [ ] **Agregar artículo:** Botón que agrega una nueva línea al detalle.
- [ ] **Artículo:** Obligatorio, selección desde catálogo de artículos activos.
- [ ] **Cantidad:** Obligatorio, numérico mayor a 0.
- [ ] **Precio unitario:** Obligatorio, numérico mayor a 0 (se puede cargar manualmente o desde cotización seleccionada).
- [ ] **Subtotal:** Calculado automáticamente (cantidad × precio unitario).
- [ ] **Eliminar línea:** Botón que elimina la línea del detalle (con confirmación si tiene datos).

### Totales
- [ ] **Subtotal:** Suma de todos los subtotales del detalle.
- [ ] **Descuento:** Opcional, numérico mayor o igual a 0.
- [ ] **Gastos envío:** Opcional, numérico mayor o igual a 0.
- [ ] **Total:** Calculado automáticamente (subtotal - descuento + gastos envío).

### Generación desde necesidades (opcional - si HU-COMP-01 existe)
- [ ] Si hay necesidades de compra pendientes (HU-COMP-01), el sistema puede sugerir artículos automáticamente.
- [ ] Las necesidades seleccionadas se agrupan por proveedor para generar la orden.
- [ ] Las necesidades asociadas quedan vinculadas a la orden generada.

### Acciones y confirmaciones
- [ ] **Guardar borrador:** Botón que guarda la orden en estado "Pendiente" sin emitir.
- [ ] **Emitir:** Botón que emite la orden con número único secuencial y estado "Pendiente". Muestra modal de confirmación.
- [ ] **Cancelar:** Botón que descarta los cambios y vuelve a la lista de órdenes.

### Notificaciones
- [ ] Cada acción (emisión, guardado) muestra una notificación toast:
  - **Éxito:** "Orden de compra emitida correctamente - Número: OC-XXXX"
  - **Error:** "Error al emitir orden: [descripción]"
- [ ] La notificación persiste unos segundos y se cierra automáticamente (o con "✕").

### Número de orden
- [ ] Al emitir, se genera un número secuencial único (OC-0001, OC-0002, etc.).
- [ ] El número puede generarse por:
  - Secuencia en base de datos
  - Trigger de base de datos
  - Lógica en frontend basada en el último número + 1
- [ ] El número se muestra en la notificación y en el detalle de la orden.

## ⚠️ Notas para el equipo de BD

1. **Tabla de cotizaciones:** Si se desea persistir las cotizaciones comparadas, se necesita crear una tabla `cotizacion` con campos como: id, proveedor_id, fecha, estado, etc.

2. **Tabla de necesidades:** Si se desea implementar HU-COMP-01, se necesita crear una tabla `necesidad_compra` con campos como: id, articulo_id, cantidad_estimada, motivo, estado, etc.

3. **Número secuencial:** Se recomienda implementar como secuencia en BD o trigger para evitar duplicados.

4. **Estados adicionales:** Si se requieren los estados "Enviada", "Recibida Parcial", "Recibida Total", se debe actualizar el ENUM en la tabla `orden_compra`.
