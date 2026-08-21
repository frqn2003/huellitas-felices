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
  amarillo de acción del viewport). El pill "★ Mejor" de la matriz usa
  `accent-500/20` (badge, uso escaso permitido) y el total más bajo va en
  display bold brand.
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
  `<select>` de estado (Todas / Abierta / Adjudicada / Cancelada) y "Limpiar
  filtros"; el botón muestra badge amarillo con la cantidad de filtros activos.
  Debajo, pills removibles "Estado: X ✕" (`FiltrosChips`).
- Tabla sin columna "#": columnas N°, Artículos (+ creada por), Cotizaciones,
  Fecha, Estado, Acciones. El chip mono SC-XXXX identifica la fila.
- Acciones por fila según estado:
  - **Comparar** (GitCompareArrows): siempre visible; deshabilitado con <2
    cotizaciones y `title` explicativo ("Necesita al menos 2 cotizaciones...").
  - **Registrar cotización** (Plus) y **Cancelar** (Ban): solo si está Abierta.
- Modal **Nueva solicitud** (`max-w-2xl`): box "Número de solicitud" (mono,
  role=note, se asigna automáticamente), fieldset "Artículos a cotizar" con card
  por línea (Combobox artículo + Cantidad est. + trash con spacer h-5, mismo fix
  de alineación que órdenes/movimientos) y "+ Agregar artículo" ghost; Notas;
  box Validaciones.
- Modal **Registrar cotización** (`max-w-xl`): box contexto de la solicitud,
  Proveedor (Combobox que excluye proveedores ya cotizados), Condición de pago
  (Select del catálogo compartido con órdenes), Fecha de recepción (date, máx
  hoy), fieldset "Precios cotizados" con un input por artículo solicitado
  (muestra cantidad estimada). Un proveedor no puede repetir cotización.
- Modal **Comparar** (`max-w-4xl`, pieza central): matriz artículos × proveedores
  en tabla semántica con primera columna sticky. Cada celda muestra el precio;
  el menor por fila lleva pill amarillo "★ Mejor · $precio" (nunca solo color).
  Fila final "Total estimado" con el mínimo en display bold brand. Pie: Select
  "Adjudicar a" preseleccionado con la cotización de menor total, resumen
  dinámico "Se generará una orden para {proveedor} por {total}" (`role="status"`)
  y CTA "Adjudicar y generar orden".
- Modal **Cancelar solicitud**: confirmación destructiva con consecuencias
  (deja de recibir cotizaciones; las registradas quedan como historial).

## Flujo adjudicación → orden (HU-COMP-02)

Al confirmar "Adjudicar y generar orden": se marca la solicitud Adjudicada, se
construye el snapshot `OrdenPrefill` (proveedor, condición, líneas con precios,
cotizacionId) y —como ambos tabs viven en el mismo módulo— se cambia al tab
"Órdenes de compra" y se abre el formulario INSERCION precargado con banner de
origen (handoff directo por estado, sin sessionStorage ni navegación). En
producción el back crea la `orden_compra` vinculada por `cotizacion_id`.

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
- Endpoints esperados: GET/POST `/api/solicitudes-cotizacion`,
  POST `/:id/cotizaciones`, PATCH `/:id/adjudicar`, PATCH `/:id/cancelar`.
- La adjudicación debe crear la `orden_compra` con `cotizacion_id` (transacción).
- Auditoría de alta/cancelación/adjudicación con valores anterior-nuevo: la registra el back.
