# Página: Compras · tab Cotizaciones (`/ordenes-compra?tab=cotizaciones`)

> HU-COMP-02 · Extiende `../MASTER.md` (Pet Bliss). Los tokens base NO cambian;
> este archivo documenta las decisiones específicas de esta pantalla.
> Desde la consolidación del módulo, este contenido vive como tab "Cotizaciones"
> dentro del módulo **Compras** (`/ordenes-compra`, componente `ComprasTabs`,
> mismo patrón que Inventario). La antigua ruta `/cotizaciones` redirige acá.

## Tokens aplicados

- **Canvas:** crema `--color-cream-50`; tabla y modales sobre superficie blanca con
  borde `--color-border` y sombra `--shadow-card` (idéntico a Órdenes de Compra).
- **CTA principal:** "Nueva solicitud" en amarillo `--color-accent-500` (único
  amarillo de acción del viewport). El menor precio por fila de la matriz usa
  pill `status-success/10` + texto `status-success-strong` (verde de estado,
  nunca el amarillo de acción) y el total más bajo va en display bold brand.
- **Tipografía:** H1 Baloo 2 extrabold uppercase ("Cotizaciones"); eyebrow small
  uppercase ("Compras · Selección de proveedores"); N° de solicitud en mono chip
  verde (`brand-900/10`), mismo patrón que OC-XXXX.

## Mapeo de estados (brief → tokens Pet Bliss)

Se usa la paleta de estado del sistema (`StatusBadge`, ver MASTER.md
"Status Colors"):

| Estado | Variante | Chip | Punto |
|--------|----------|------|-------|
| Abierta | `warning` | `status-warning/10` + texto `status-warning-strong` | `status-warning` |
| Adjudicada | `success` | `status-success/10` + texto `status-success-strong` | `status-success` |
| Cancelada | `danger` | `status-danger/10` + texto `status-danger-strong` | `status-danger` |

Siempre punto + texto (nunca solo color).

## Composición

- Header con eyebrow + H1, búsqueda pill y botón **Filtros** (SlidersHorizontal)
  al lado — mismo sistema que Órdenes de Compra. El panel desplegable trae un
  `<select>` de estado (Todas / Abierta / Adjudicada / Cancelada),
  orden por fecha y "Limpiar filtros"; el botón muestra badge amarillo con la
  cantidad de filtros activos. Debajo, pills removibles "Estado: X ✕"
  (`FiltrosChips`).
- Tabla sin columna "#": columnas N°, Fecha, Cotizaciones, Estado, Acciones.
  El chip mono SC-XXXX identifica la fila.
- Columna Cotizaciones: contador plano "N cotización(es)" — las cotizaciones
  se cargan manualmente.
- Acciones por fila según estado:
  - **Comparar** (GitCompareArrows): siempre visible; deshabilitado con <2
    cotizaciones y `title` explicativo ("Necesita al menos 2 cotizaciones...").
  - **Registrar cotización** (Plus) y **Cancelar** (Trash2): visibles solo con
    la solicitud Abierta.
- Modal **Nueva solicitud** (`max-w-2xl`): box "Número de solicitud" (mono,
  role=note, se asigna automáticamente); chips "Sugeridos por bajo stock"
  (fichas con estado bajo/crítico; punto warning/danger + nombre + stock
  actual; clic agrega la línea con cantidad sugerida 2×mínimo − actual;
  contenedor con scroll a max-h-28); fieldset "Artículos a cotizar" con card
  por línea (Combobox artículo + Cantidad est. + anotación opcional para el
  proveedor + trash con spacer h-5) y "+ Agregar artículo" ghost; Notas; box
  Validaciones.
- Pie de Nueva solicitud: **Cancelar** (outline) y **Guardar solicitud**
  (primary amarillo; la deja Abierta).
- Modal **Registrar cotización** (`max-w-xl`): box contexto de la solicitud,
  Proveedor (Combobox que excluye proveedores ya cotizados), Condición de pago
  (Select del catálogo compartido con órdenes), Fecha de recepción (date, máx
  hoy), fieldset "Precios cotizados" con un input por artículo solicitado
  (muestra cantidad estimada). Un proveedor no puede repetir cotización.
  Disponible solo para solicitudes Abiertas.
- Modal **Comparar** (`max-w-4xl`, pieza central): matriz artículos ×
  proveedores en tabla semántica con primera columna sticky. Semáforo por
  fila: precio más bajo en `status-success-strong` bold, más alto en
  `status-danger-strong`, intermedios sin color; si todos empatan no se
  colorea nada. Igual criterio en la fila "Total estimado". Leyenda bajo la
  tabla ("Verde = precio más bajo · rojo = más alto") para no depender solo
  del color. Columna "Comprar a":
  `<select>` por fila con los proveedores que cotizaron ese artículo,
  preseleccionado con el de menor precio (adjudicación split). Pie: resumen
  dinámico "Se generarán N órdenes de compra en estado Pendiente: {proveedor}
  ({total} · X artículos)..." (`role="status"`) y CTA "Generar órdenes de
  compra", deshabilitado hasta asignar todos los artículos.
- Modal **Cancelar solicitud**: confirmación destructiva con consecuencias
  (deja de recibir cotizaciones; las registradas quedan como historial), icono
  Trash2 igual que la acción de fila.

## Flujo adjudicación → órdenes (HU-COMP-02)

Al confirmar "Generar órdenes de compra": la solicitud pasa a Adjudicada y se
crean N órdenes de compra directamente (una por proveedor, solo con los
artículos asignados, vinculadas por `cotizacion_id`, estado Pendiente, sin
descuento ni gastos). Toast confirma cuántas órdenes se generaron y el módulo
cambia al tab "Órdenes de compra", donde cada orden se confirma y envía. En
producción el back crea las `orden_compra` en transacción con las asignaciones
línea→cotización.

## Estados de pantalla

Vacío (mensaje + CTA "Crear primera solicitud") · Sin resultados (filtros:
mensaje + limpiar) · Cargando (skeleton rows) · Error (card + Reintentar) ·
Con datos.

## Accesibilidad

- Touch targets ≥44px (acciones de fila h-11 w-11).
- Focus visible ring en todos los controles; `aria-label` + `title` en iconos-acción.
- Comparar deshabilitado comunica el motivo (`aria-disabled` + title).
- Errores por campo con `role="alert"`; validación on blur (patrón touched/showError).
- Importes aceptan coma decimal (teclado es-AR); `inputMode="decimal"`.
- Matriz comparativa como `<table>` semántica con caption sr-only y `scope` en
  encabezados/filas.
- `prefers-reduced-motion` respetado vía Framer Motion (Modal/Toast existentes).

## Notas de integración (para el back)

Puntos marcados con `// BACKEND:` en `src/data/cotizaciones.ts`,
`src/context/CotizacionesContext.tsx`, `src/components/cotizaciones/*` y
`src/app/ordenes-compra/page.tsx`. Buscar con `grep -rn "BACKEND" src/`.

- Tablas nuevas: `solicitud_cotizacion`, `cotizacion`, `solicitud_cotizacion_detalle`,
  `cotizacion_detalle` (los objetos de `src/data/cotizaciones.ts` replican ese shape).
  La solicitud lleva `nota` por línea de detalle.
- Endpoints esperados: GET/POST `/api/solicitudes-cotizacion`,
  POST `/:id/cotizaciones`, PATCH `/:id/adjudicar`, PATCH `/:id/cancelar`.
- La adjudicación recibe las asignaciones línea→cotización y crea N
  `orden_compra` (una por proveedor, con `cotizacion_id`) en transacción.
- Auditoría de alta/cancelación/adjudicación con valores anterior-nuevo:
  la registra el back.
