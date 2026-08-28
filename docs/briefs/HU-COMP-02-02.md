# HU-COMP-02 (v2): Como personal de depósito, quiero emitir órdenes de compra comparando cotizaciones en una pantalla dedicada, para formalizar la adquisición al proveedor seleccionado

> Versión 2 de `HU-COMP-02.md`. Cambio principal: la comparación de cotizaciones sale del
> formulario de orden y pasa a una pantalla propia (`/cotizaciones`) con flujo
> solicitud → cotizaciones → comparación → adjudicación. Además se alinean los estados a la
> tabla fija de la HU y se agrega "condiciones de pago" en la cabecera de la orden.
> Referencia: `docs/COMO-USAR.md`.

## Contexto

- **Rutas propuestas:** `/cotizaciones` (nueva) + ajustes en `/ordenes-compra` (existente)
- **Relacionada con:** pantalla Órdenes de Compra ya implementada (`src/app/ordenes-compra`),
  HU-STK-04 (alertas de stock mínimo), HU-STK-01 (Artículos), HU-PROV-XX (Proveedores)
- **Prioridad:** alta
- **Reemplaza a:** `HU-COMP-02.md` (v1), que proponía comparar cotizaciones dentro del
  formulario de nueva orden. Ese enfoque se descarta.

### Alcance sobre la pantalla existente (órdenes)

1. **Estados** alineados a la tabla fija: `Pendiente | Enviada | Recibida Parcial |
   Recibida Total | Cancelada`. "Aprobar" pasa a "Enviar" (Pendiente→Enviada);
   "Anular" pasa a "Cancelar" (permitido en Pendiente y Enviada).
   Recibida Parcial/Total son solo lectura en el front: la transición la hace la
   recepción de stock (backend).
2. **Condiciones de pago**: nuevo campo obligatorio en cabecera con catálogo fijo
   `Contado / Cta. cte. 30 días / Cta. cte. 60 días`. Se agrega a la grilla de cabecera
   vigente (Depósito | Proveedor → Fechas → Notas) sin alterar ese orden.
3. La orden puede nacer **desde una adjudicación**: guarda `cotizacion_id` y muestra
   la referencia "Cotización: SC-XXXX" en el detalle (la comparación queda documentada).

## Wireframe (idea)

Lista principal `/cotizaciones` (mismo shell que órdenes: sidebar verde, header crema,
eyebrow "Compras · Selección de proveedores", H1 uppercase, CTA amarillo único):

```
│ COTIZACIONES                          [+ Nueva solicitud] │
│ [Estado ▾]  [🔍 Buscar por N° o artículo...]              │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ N°      Artículos          Cotizaciones  Estado      │ │
│ │ SC-0001 Amoxi, Jeringa +1  3 proveedores  ● Abierta   │ │
│ │ SC-0002 Vitamina B12       1 proveedor    ● Abierta   │ │
│ │ SC-0003 Guantes            2 proveedores  ● Adjudicada│ │
│ │   acciones: [Comparar] [Registrar cotización] [Cancelar]│
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

Modal "Comparar cotizaciones · SC-0001" (`max-w-4xl`): filas = artículos solicitados
(con cantidad), columnas = proveedores cotizantes. Mejor precio por fila resaltado con
pill amarillo; fila de condición de pago por proveedor; fila TOTAL en display bold.
Pie: `Adjudicar a: [select]` + botón primario "Adjudicar y generar orden".

```
│ ┌────────────┬──────────┬──────────┬──────────┐ │
│ │ Artículo   │ Pharma   │ Vetmed   │ Mascotas │ │
│ │ Amoxi ×50  │ ⭐ $850  │ $890     │ —        │ │
│ │ Jeringa×100│ $45      │ ⭐ $44   │ $47      │ │
│ │ Condición  │ Contado  │ 30 días  │ 60 días  │ │
│ │ TOTAL      │ $47.000  │ $48.900  │ ⭐$47.000│ │
│ └────────────┴──────────┴──────────┴──────────┘ │
│ Adjudicar a: [Laboratorios Pharma ▾] [Adjudicar…]│
```

Modal "Nueva solicitud": box "Número — se asigna automáticamente" + líneas
artículo + cantidad estimada + notas.

Modal "Registrar cotización": proveedor (Combobox) + condición de pago (Select) +
fecha de recepción + un input de precio por cada artículo de la solicitud.

Adjudicación → redirige a `/ordenes-compra` con el modal "Nueva orden" abierto,
banner interno "Generada desde SC-XXXX · comparación adjunta", proveedor, condición
de pago y líneas precargadas con los precios de la cotización elegida.

## User flow

1. **Origen:** Menú lateral → Cotizaciones. (El menú agrega el item debajo de
   Órdenes de Compra.)
2. **Acción:** Crea una solicitud con los artículos a cotizar → registra las
   cotizaciones que llegan de cada proveedor → compara precios y condiciones →
   adjudica a un proveedor.
3. **Destino:** La solicitud queda "Adjudicada"; el sistema abre la nueva orden de
   compra precargada; al guardarla queda vinculada por `cotizacion_id` y con número
   secuencial OC-XXXX.

## Datos hardcodeados

Estructura replica tablas nuevas `solicitud_cotizacion`, `cotizacion` y
`cotizacion_detalle`; `_articulos`, `_proveedor` y `_detalles` vienen por JOIN.

```ts
export const CONDICIONES_PAGO = ["Contado", "Cta. cte. 30 días", "Cta. cte. 60 días"] as const;

// Tabla fija de estados (criterio HU): reemplaza Pendiente/Aprobada/Recibida/Anulada
export type EstadoOrden =
  | "Pendiente"
  | "Enviada"
  | "Recibida Parcial"
  | "Recibida Total"
  | "Cancelada";
export type EstadoSolicitud = "Abierta" | "Adjudicada" | "Cancelada";

export interface SolicitudCotizacion {
  id: number; // PK → SC-0001
  fecha: string;
  estado: EstadoSolicitud;
  usuario_id: number;
  notas: string | null;
  cotizacion_id_adjudicada: number | null;
  _usuario: { id: number; nombre: string };
  _articulos_solicitados: { articulo_id: number; cantidad_estimada: number }[];
  _cotizaciones: {
    id: number;
    solicitud_id: number;
    proveedor_id: number;
    condicion_pago: string;
    fecha_recepcion: string;
    _proveedor: { id: number; nombre: string };
    _detalles: { articulo_id: number; precio: number }[];
  }[];
}

// Seeds: SC-0001 Abierta con 3 cotizaciones comparables (demo del flujo completo),
// SC-0002 Abierta con 1 sola cotización (esperando respuestas),
// SC-0003 Adjudicada vinculada a OC-0002 (que pasa a tener cotizacion_id).
```

Órdenes: seeds actualizadas a los nuevos estados (OC-0002 → Enviada, OC-0003 →
Cancelada) + nueva OC-0004 "Recibida Parcial" para que el filtro tenga contenido.

## Estados

- [x] Vacío: tabla sin solicitudes → empty state con CTA "Crear primera solicitud".
- [x] Cargando: skeleton animado ~900 ms (patrón órdenes).
- [x] Error: flag `SIMULAR_ERROR` → mensaje con botón Reintentar.
- [x] Con datos: lista filtrable + modales de solicitud/cotización/comparación.

## Componentes reutilizables (código implementado — fuente de verdad)

> ⚠️ Esta sección describe el código actual de `src/`, que fue refinado después de los
> `.md` del design-system. Ante cualquier diferencia, manda el código; los docs de página
> se actualizan como parte de esta HU.

### Primitivos `src/components/ui/` (usar tal cual)

| Componente | API actual verificada |
|---|---|
| `Button` | `variant: "primary" \| "secondary" \| "outline" \| "ghost" \| "destructive"`, `size: "sm" \| "md" \| "lg" \| "icon"`; pill, focus ring, `active:scale` |
| `Input` | extiende atributos nativos + `label?`, `requiredMark?`, `error?`, `hint?`, `id`; renderiza el error como `<p role="alert">` DEBAJO del control |
| `Select` | mismo patrón que Input (`label?`, `requiredMark?`, `error?`, `hint?`) |
| `Combobox` | `id`, `value: string`, `options: {value,label}[]`, `onChange(value: string)`, `onBlur?`, `error?`, `hint?`, `placeholder?`, `noResultsText?`, `disabled?`; búsqueda con teclado |
| `Modal` | `open`, `onClose`, `title`, `icon?`, `footer?`, `maxWidth?` |
| `Pagination` | `page`, `totalPages`, `totalItems`, `pageStart`, `pageEnd`, `pageSize`, `onPageChange`, `onPageSizeChange`, `disabled?`, `itemLabel?`; tamaños fijos 10/25/50, colapsa páginas con "…" |
| `Toast` | `ToastProvider` + `useToast().showToast(type, message)` con `type: "success" \| "error"`; auto-dismiss 4 s, `aria-live`, respeta reduced-motion |

### Patrones refinados a clonar (de `/ordenes-compra` y movimientos)

- **Shell de página**: `Sidebar` + header crema con eyebrow uppercase + H1 display + un solo CTA amarillo (`variant="primary"`).
- **Tabla lista**: patrón `OrdenesTable` — skeleton `animate-pulse` ~900 ms, empty state con `SearchX` y CTA contextual, N° como chip mono `bg-brand-900/10`.
- **Badge de estado**: patrón `EstadoOrdenBadge` (pill + punto). En ESTA HU se reemplaza su mapping por la tabla fija de 5 estados.
- **Filtros**: panel desplegable `FiltrosOrdenes` + chips removibles `FiltrosChips` (contador en badge amarillo).
- **Líneas dinámicas de artículos** (`OrdenFormModal`): cards en grilla `[minmax(0,1fr)_100px_130px_130px_44px]`, subtotal dashed read-only, trash de UN click deshabilitado con 1 fila, envuelto en columna con spacer `<span aria-hidden className="block h-5" />` (fix para que los errores no corran la fila — NO usar `items-end` en grillas de formulario).
- **Box "Número se asigna automáticamente"**: `role="note"`, mono, solo alta.
- **Box Validaciones** al pie del formulario (`role="note"`, lista).
- **Totales apilados**: Descuento (%) con hint dinámico "Equivale a −$X" + Gastos de envío full-width; TOTAL en display bold.
- **Orden de campos de cabecera vigente**: Depósito de entrega (Select del catálogo, sin dirección libre) | Proveedor → Fecha emisión | Fecha entrega → Notas. Condiciones de pago entra en esa grilla.

### Helpers y catálogos existentes (importar, no duplicar)

- `data/ordenes-compra.ts`: `formatMoney`, `formatFecha`, `parseImporte` (coma decimal es-AR), `importeAInput`, `numeroOrden()`, `ultimoPrecioCompra()`, `USUARIO_SESION`, `DEPOSITO_ENTREGA_DEFAULT_ID`. Clonar `numeroOrden()` como `codigoSolicitud()` → `SC-XXXX`.
- `data/articulos.ts`: `articulosIniciales` (con `proveedorPreferido`), `PROVEEDORES`.
- `data/stock.ts`: `depositosIniciales`.
- Flags demo por módulo: `SIMULAR_VACIO` / `SIMULAR_ERROR`.

### Infraestructura de estado

- **Estado compartido entre rutas**: Context provider montado en `src/app/layout.tsx` (patrón acordado); `/cotizaciones` y `/ordenes-compra` comparten solicitudes vía `CotizacionesContext`.
- **Handoff adjudicación → orden**: snapshot JSON en `sessionStorage` (clave `huellitas.prefill-orden`), leído y limpiado al montar `/ordenes-compra`.

## Criterios de aceptación

### Pantalla /cotizaciones
- [ ] Lista solicitudes SC-XXXX: artículos resumidos, cantidad de cotizaciones, estado, fecha.
- [ ] Filtro por estado (Abierta/Adjudicada/Cancelada/Todas) + búsqueda por N° o artículo; paginación.
- [ ] "Nueva solicitud": ≥1 línea artículo+cantidad estimada; queda Abierta sin cotizaciones.
- [ ] "Registrar cotización" solo en Abiertas: proveedor, condición de pago, fecha y precio por cada artículo solicitado; valida precios > 0 y proveedor no repetido en la solicitud.
- [ ] "Comparar" habilitado con ≥2 cotizaciones: matriz artículos × proveedores, mejor precio por fila resaltado, total por proveedor calculado, condición de pago visible.
- [ ] "Adjudicar y generar orden": marca la solicitud Adjudicada, guarda el elegido y abre la orden precargada en /ordenes-compra con banner de origen.
- [ ] "Cancelar solicitud" solo en Abiertas (estado Cancelada).
- [ ] Bitácora: comentarios `// BACKEND:` en alta de solicitud, cotización recibida, adjudicación y cancelación.

### Órdenes de compra (ajustes)
- [ ] Estados según tabla fija: badges, filtros ("Activas" = todo menos Cancelada), CSV y seeds coherentes.
- [ ] Acciones: Enviar (Pendiente→Enviada), Cancelar (Pendiente o Enviada), Editar (solo Pendiente); Recibida Parcial/Total sin acciones (transición vía recepción de stock).
- [ ] Condiciones de pago: Select obligatorio con catálogo fijo, visible en lectura y columna nueva en CSV.
- [ ] Orden generada desde adjudicación persiste `cotizacion_id` y muestra "Cotización: SC-XXXX" en el detalle.
- [ ] Bitácora: comentarios `// BACKEND:` en emisión, envío, cancelación y cambio de estado.

## ⚠️ Notas para el equipo de BD

1. Tablas nuevas: `solicitud_cotizacion` (id, fecha, usuario_id, estado, notas,
   cotizacion_id_adjudicada) y `cotizacion` (id, solicitud_id FK, proveedor_id FK,
   condicion_pago, fecha_recepcion) + `cotizacion_detalle` (cotizacion_id, articulo_id, precio).
2. ENUM `orden_compra.estado` → Pendiente, Enviada, Recibida Parcial, Recibida Total, Cancelada.
3. Columna nueva `orden_compra.condicion_pago` (varchar o FK a catálogo).
4. `orden_compra.cotizacion_id` ya existe: ahora apunta a `cotizacion.id`.
5. Números secuenciales OC-XXXX y SC-XXXX: secuencia o trigger en BD.
