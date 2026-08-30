# HU-COMP-03: Como personal de depósito, quiero registrar la recepción parcial o total de mercadería contra una orden de compra, para actualizar el stock con los productos efectivamente recibidos

## Contexto

- **Ruta propuesta:** `/recepciones`
- **Relacionada con:** HU-COMP-02-02 (Órdenes de Compra), HU-STK-04 (Movimientos de Stock), HU-PROV-01 (Proveedores)
- **Prioridad:** alta — sin recepción no hay stock actualizado ni trazabilidad de diferencias
- **Menú lateral:** Sección "Compras", debajo de Órdenes de Compra y Cotizaciones

## Wireframe (idea)

Lista principal `/recepciones` (shell estándar: sidebar verde, header crema, eyebrow "Compras", H1 uppercase, CTA amarillo):

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  📦 Recepciones de Mercadería                                              [Perfil] │
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │  RECEPCIONES                                                                    │
│      │  Compras · Recepción de mercadería contra OC                                     │
│      │──────────────────────────────────────────────────────────────────────────────────│
│      │  🔍 [Buscar por N° o proveedor...]   [Estado ▾]  [Proveedor ▾]  [📥 Exportar] [➕ Nueva]│
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────┐    │
│      │  │ # │ N° Recepción │ OC       │ Proveedor        │ Tipo    │ Fecha  │ Estado│    │
│      │  ├──────────────────────────────────────────────────────────────────────────┤    │
│      │  │ 1 │ REC-0001    │ OC-0005  │ Nutrición Animal │ Total   │ 20/08  │ ●Total │    │
│      │  │ 2 │ REC-0002    │ OC-0006  │ VetInsumos Norte │ Parcial │ 22/08  │ ●Parc. │    │
│      │  │ 3 │ REC-0003    │ OC-0007  │ Farmavet         │ Total   │ 25/08  │ ●Total │    │
│      │  └──────────────────────────────────────────────────────────────────────────┘    │
│      │                                                                                  │
│      │  Mostrando 1-3 de 12 recepciones                                    [< 1 2 3 ... >]│
└──────┴──────────────────────────────────────────────────────────────────────────────────┘
```

Modal "Nueva Recepción" (`max-w-3xl`):

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  📦 Nueva Recepción de Mercadería                                              [x] │
│────────────────────────────────────────────────────────────────────────────────────│
│                                                                                    │
│  OC vinculada *       [ ▼ Seleccionar OC pendiente ]                              │
│  Depósito destino *   [ ▼ Depósito Central          ]                             │
│  Tipo de recepción *  [ ▼ Total / Parcial           ]                             │
│  Observaciones        [ Texto libre...               ]  (opcional)                │
│                                                                                    │
│  ── DETALLE POR ARTÍCULO ──────────────────────────────────────────────────────   │
│  ┌────────────────────────────────────────────────────────────────────────────┐   │
│  │ Artículo        │ Solicitado │ Recibido * │ Diferencia │ Observación  [✕] │   │
│  ├──────────────────┼────────────┼────────────┼────────────┼──────────────┤   │
│  │ Amoxicilina 500  │ 50         │ [ 50      ] │ 0          │ [✓ OK      ] │   │
│  │ Jeringa 5ml      │ 100        │ [ 85      ] │ -15        │ [▾ Faltante] │   │
│  │ Alimento Premium │ 20         │ [ 20      ] │ 0          │ [✓ OK      ] │   │
│  └────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                    │
│  ⚠️ Diferencias detectadas: 1 artículo con faltante (Jeringa 5ml: -15 u.)        │
│                                                                                    │
│                              [Cancelar]  [Confirmar Recepción]                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Modal "Detalle de Recepción" (solo lectura, `max-w-3xl`):

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  📦 Detalle Recepción REC-0002                                                [x] │
│────────────────────────────────────────────────────────────────────────────────────│
│  OC: OC-0006  |  Proveedor: VetInsumos Norte SA  |  Tipo: Parcial                │
│  Depósito: Central  |  Fecha: 22/08/2026 14:30  |  Registró: Carlos López       │
│                                                                                    │
│  ── DETALLE ────────────────────────────────────────────────────────────────────  │
│  │ Artículo        │ Solicitado │ Recibido │ Diferencia │ Observación            │   │
│  ├──────────────────┼────────────┼──────────┼────────────┼───────────────────────┤   │
│  │ Amoxicilina 500  │ 50         │ 50       │ 0          │ —                     │   │
│  │ Jeringa 5ml      │ 100        │ 85       │ -15        │ Faltante: faltan 15   │   │
│  │ Alimento Premium │ 20         │ 20       │ 0          │ —                     │   │
│                                                                                    │
│  Observaciones generales: Entrega con demora de 2 horas                           │
│                                                                                    │
│                                    [Cerrar]                                        │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## User flow

1. **Origen:** El usuario (personal de depósito) ingresa desde el menú lateral → Compras → Recepciones, o desde la vista de Órdenes de Compra (botón "Registrar recepción" en una OC con estado Pendiente/Enviada).
2. **Acción principal:** Selecciona una OC pendiente, el depósito destino, tipo de recepción (parcial/total) y completa las cantidades recibidas por artículo. Si hay diferencias, las registra con observación.
3. **Destino:** Al confirmar, el sistema genera la recepción, actualiza el estado de la OC (recibida_parcial o recibida_total), crea automáticamente el movimiento de ingreso de stock (HU-STK-04), notifica al responsable de compras si hay diferencias y registra en bitácora. El usuario permanece en la lista.

## Datos hardcodeados

```ts
// Tabla recepcion_mercaderia: cabecera
const recepciones = [
  {
    id: 1,
    numero: "REC-0001",
    orden_compra_id: 5,
    ordenCompra: { numero: "OC-0005", proveedor: { razonSocial: "Nutrición Animal SRL" } },
    deposito_id: 1,
    deposito: { nombre: "Depósito Central" },
    tipo_recepcion: "total",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    fecha_hora: "2026-08-20T10:15:00Z",
    observacion_general: null,
    _detalles: [
      { id: 1, articuloId: 1, articuloNombre: "Amoxicilina 500mg", cantidadSolicitada: 50, cantidadRecibida: 50, observacion: null, observacionDetalle: null },
      { id: 2, articuloId: 2, articuloNombre: "Jeringa 5ml", cantidadSolicitada: 100, cantidadRecibida: 100, observacion: null, observacionDetalle: null }
    ]
  },
  {
    id: 2,
    numero: "REC-0002",
    orden_compra_id: 6,
    ordenCompra: { numero: "OC-0006", proveedor: { razonSocial: "VetInsumos Norte SA" } },
    deposito_id: 1,
    deposito: { nombre: "Depósito Central" },
    tipo_recepcion: "parcial",
    usuario_id: 3,
    usuario: { nombre: "Carlos López" },
    fecha_hora: "2026-08-22T14:30:00Z",
    observacion_general: "Entrega con demora de 2 horas",
    _detalles: [
      { id: 3, articuloId: 1, articuloNombre: "Amoxicilina 500mg", cantidadSolicitada: 50, cantidadRecibida: 50, observacion: null, observacionDetalle: null },
      { id: 4, articuloId: 2, articuloNombre: "Jeringa 5ml", cantidadSolicitada: 100, cantidadRecibida: 85, observacion: "faltante", observacionDetalle: "Faltan 15 unidades" },
      { id: 5, articuloId: 3, articuloNombre: "Alimento Premium", cantidadSolicitada: 20, cantidadRecibida: 20, observacion: null, observacionDetalle: null }
    ]
  },
  {
    id: 3,
    numero: "REC-0003",
    orden_compra_id: 7,
    ordenCompra: { numero: "OC-0007", proveedor: { razonSocial: "Farmavet Distribuidora" } },
    deposito_id: 2,
    deposito: { nombre: "Sucursal A" },
    tipo_recepcion: "total",
    usuario_id: 5,
    usuario: { nombre: "María García" },
    fecha_hora: "2026-08-25T09:00:00Z",
    observacion_general: null,
    _detalles: [
      { id: 6, articuloId: 4, articuloNombre: "Guantes descartables", cantidadSolicitada: 200, cantidadRecibida: 200, observacion: null, observacionDetalle: null },
      { id: 7, articuloId: 5, articuloNombre: "Alcohol gel 500ml", cantidadSolicitada: 30, cantidadRecibida: 28, observacion: "danado", observacionDetalle: "2 envases rotos" }
    ]
  }
];

// OC disponibles para recepción (estado Pendiente o Enviada, no recibidas)
const ordenesDisponibles = [
  { id: 8, numero: "OC-0008", proveedor: "Nutrición Animal SRL", estado: "Enviada", articulos: [
    { articuloId: 1, articuloNombre: "Amoxicilina 500mg", cantidad: 100 },
    { articuloId: 6, articuloNombre: "Spray antiséptico", cantidad: 25 }
  ]},
  { id: 9, numero: "OC-0009", proveedor: "VetInsumos Norte SA", estado: "Pendiente", articulos: [
    { articuloId: 2, articuloNombre: "Jeringa 5ml", cantidad: 200 },
    { articuloId: 3, articuloNombre: "Alimento Premium", cantidad: 50 }
  ]}
];

// Notificaciones generadas por diferencias
const notificaciones = [
  {
    id: 1,
    recepcionDetalleId: 4,
    usuarioResponsableId: 4,
    usuarioResponsable: { nombre: "Roberto Díaz" },
    mensaje: "Diferencia en Jeringa 5ml (OC-0006): solicitado 100, recibido 85. Faltante de 15 unidades.",
    fecha_hora: "2026-08-22T14:30:00Z",
    leida: false
  },
  {
    id: 2,
    recepcionDetalleId: 7,
    usuarioResponsableId: 4,
    usuarioResponsable: { nombre: "Roberto Díaz" },
    mensaje: "Diferencia en Alcohol gel 500ml (OC-0007): solicitado 30, recibido 28. 2 envases dañados.",
    fecha_hora: "2026-08-25T09:00:00Z",
    leida: true
  }
];

// Catálogos
const tiposRecepcion = ["parcial", "total"];
const observacionesRecepcion = ["faltante", "danado", "error"];
const depositos = [
  { id: 1, nombre: "Depósito Central" },
  { id: 2, nombre: "Sucursal A" }
];
```

## Estados

- [x] Vacío: tabla sin recepciones → empty state con CTA "Registrar primera recepción".
- [x] Cargando: skeleton animado ~900 ms (patrón órdenes).
- [x] Error: flag `SIMULAR_ERROR` → mensaje con botón Reintentar.
- [x] Con datos: lista filtrable + modal de nueva recepción + modal de detalle (solo lectura).

## Componentes reutilizables (código implementado — fuente de verdad)

> Siguiendo el patrón de HU-COMP-02-02. Ante cualquier diferencia, manda el código.

### Primitivos `src/components/ui/` (usar tal cual)

| Componente | API actual verificada |
|---|---|
| `Button` | `variant: "primary" \| "secondary" \| "outline" \| "ghost" \| "destructive"`, `size: "sm" \| "md" \| "lg" \| "icon"`; pill, focus ring, `active:scale` |
| `Input` | extiende atributos nativos + `label?`, `requiredMark?`, `error?`, `hint?`, `id`; renderiza el error como `<p role="alert">` DEBAJO del control |
| `Select` | mismo patrón que Input (`label?`, `requiredMark?`, `error?`, `hint?`) |
| `Combobox` | `id`, `value: string`, `options: {value,label}[]`, `onChange(value: string)`, `onBlur?`, `error?`, `hint?`, `placeholder?`, `noResultsText?`, `disabled?`; búsqueda con teclado |
| `Modal` | `open`, `onClose`, `title`, `icon?`, `footer?`, `maxWidth?` |
| `Pagination` | `page`, `totalPages`, `totalItems`, `pageStart`, `pageEnd`, `pageSize`, `onPageChange`, `onPageSizeChange`, `disabled?`, `itemLabel?`; tamaños fijos 10/25/50 |
| `Toast` | `ToastProvider` + `useToast().showToast(type, message)` con `type: "success" \| "error"`; auto-dismiss 4 s, `aria-live`, respeta reduced-motion |

### Patrones a clonar (de `/ordenes-compra` y `/cotizaciones`)

- **Shell de página**: `Sidebar` + header crema con eyebrow uppercase + H1 display + un solo CTA amarillo (`variant="primary"`).
- **Tabla lista**: patrón `OrdenesTable` — skeleton `animate-pulse` ~900 ms, empty state con `SearchX` y CTA contextual, N° como chip mono `bg-brand-900/10`.
- **Badge de estado**: patrón `EstadoOrdenBadge` (pill + punto). Mapeo: "Total" → verde, "Parcial" → amarillo.
- **Filtros**: panel desplegable + chips removibles (contador en badge amarillo).
- **Líneas dinámicas de artículos**: cards en grilla, cantidades con input numérico, select de observación, columna de diferencia calculada (generada en frontend: `solicitada - recibida`).
- **Box "Número se asigna automáticamente"**: `role="note"`, mono, solo alta.
- **Box Validaciones** al pie del formulario (`role="note"`, lista de diferencias detectadas).

### Helpers y catálogos existentes (importar, no duplicar)

- `data/ordenes-compra.ts`: `formatMoney`, `formatFecha`, `parseImporte`, `USUARIO_SESION`.
- `data/articulos.ts`: `articulosIniciales`.
- `data/stock.ts`: `depositosIniciales`.
- Flags demo por módulo: `SIMULAR_VACIO` / `SIMULAR_ERROR`.

## Criterios de aceptación

### General
- [ ] La pantalla opera en modo **INSERCIÓN** para registrar nuevas recepciones y **LECTURA** para consultar detalle.
- [ ] Todos los campos requeridos están marcados con un asterisco (*).
- [ ] Se registra en bitácora de auditoría cada recepción, con: usuario responsable, fecha y hora.

### Pantalla /recepciones — Lista
- [ ] Lista recepciones REC-XXXX: OC vinculada, proveedor, tipo (parcial/total), fecha, estado.
- [ ] **Filtros:** tipo de recepción, proveedor, período (fecha desde/hasta).
- [ ] Los filtros seleccionados se muestran como etiquetas (tags) con "✕" para eliminarlas.
- [ ] **Búsqueda** por número de recepción o nombre de proveedor.
- [ ] **Exportar** la lista filtrada en CSV.
- [ ] **Paginación:** 10, 25 o 50 registros por página.
- [ ] Click en fila abre modal de detalle (solo lectura).

### Formulario Nueva Recepción
- [ ] **OC vinculada (*):** Obligatorio. Select con OC en estado Pendiente o Enviada (no recibidas totales). Al seleccionar, carga automáticamente proveedor, depósito y artículos con cantidades solicitadas.
- [ ] **Depósito destino (*):** Obligatorio. Select desde catálogo de depósitos.
- [ ] **Tipo de recepción (*):** Obligatorio. Select: Parcial / Total.
- [ ] **Observaciones:** Texto libre, no obligatorio.
- [ ] **Detalle por artículo:** Tabla dinámica con: nombre del artículo, cantidad solicitada (de la OC, solo lectura), cantidad recibida (input editable), diferencia (calculada: solicitada - recibida), observación (select: OK / Faltante / Dañado / Error).
- [ ] **Cantidad recibida:** Obligatoria, numérica, ≥ 0. Si es mayor a la solicitada, rechazar con error.
- [ ] **Observación:** Solo se habilita si la diferencia no es 0. Select con opciones: Faltante, Dañado, Error.
- [ ] **Observación detalle:** Texto libre, se habilita si se selecciona una observación que no sea "OK".

### Validaciones
- [ ] No se puede confirmar si hay artículos con cantidad recibida = 0 (al menos uno debe recibir algo).
- [ ] Si tipo = "Total", todos los artículos deben tener cantidad recibida = cantidad solicitada (diferencia = 0).
- [ ] Si tipo = "Parcial", al menos un artículo debe tener diferencia ≠ 0.
- [ ] Mostrar resumen de diferencias detectadas antes de confirmar.

### Efectos al confirmar
- [ ] Se genera el registro en `recepcion_mercaderia` con su `numero` secuencial (REC-XXXX).
- [ ] Se generan los registros en `recepcion_mercaderia_detalle` por cada artículo.
- [ ] Se actualiza `orden_compra.estado_id`:
  - Si tipo = "total" → `recibida_total`.
  - Si tipo = "parcial" → `recibida_parcial` (si ya era parcial, se mantiene).
- [ ] Se genera automáticamente un movimiento de ingreso de stock (HU-STK-04) por las cantidades recibidas, referenciando la recepción via `origen_entidad_id`.
- [ ] Si hay diferencias (observación ≠ OK), se genera una notificación en `notificacion_compra` para el responsable de compras.

### Notificaciones
- [ ] Cada acción muestra toast:
  - **Éxito:** "Recepción REC-XXXX registrada correctamente"
  - **Error:** "Error al registrar recepción: [descripción]"
  - **Alerta:** "Se detectaron diferencias en [artículo]: [detalle]"

### Historial y auditoría
- [ ] Cada recepción genera registro en bitácora: usuario, fecha, hora, OC, proveedor, tipo, depósito.
- [ ] Las notificaciones de diferencias quedan registradas en `notificacion_compra` con estado leída/no leída.

## ⚠️ Notas para el equipo de BD

1. **Trigger trg_recepcion_mercaderia:** AFTER INSERT → actualiza `orden_compra.estado_id` a 'recibida_parcial' o 'recibida_total' según `tipo_recepcion`.
2. **Trigger trg_recepcion_stock:** AFTER INSERT → genera `movimiento_stock_cab/det` de ingreso (Sprint 1, HU-STK-04) referenciando `recepcion_mercaderia.id` en `origen_entidad_id`.
3. **Tabla `notificacion_compra`:** ya existe en BD, se usa para notificar diferencias al responsable de compras.
4. **Número secuencial REC-XXXX:** secuencia o trigger en BD (mismo patrón que OC-XXXX).
5. **Auditoría:** trigger `trg_auditoria_recepcion_mercaderia` AFTER INSERT ON recepcion_mercaderia (ya documentado en el schema).
