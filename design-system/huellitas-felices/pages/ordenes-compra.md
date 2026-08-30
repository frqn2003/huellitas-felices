# Página: Compras · tab Órdenes de compra (`/ordenes-compra`)

> HU-COMP-02 (v2, brief `docs/briefs/HU-COMP-02-02.md`) · Extiende `../MASTER.md` (Pet Bliss). Los tokens base
> NO cambian; este archivo documenta las decisiones específicas de esta pantalla.
> Desde la consolidación del módulo, `/ordenes-compra` es el host del módulo
> **Compras** con 2 tabs ("Órdenes de compra" y "Cotizaciones", componente
> `ComprasTabs`), mismo patrón que Inventario (`/stock`). El item de sidebar es
> uno solo: "Compras". La antigua ruta `/cotizaciones` redirige a
> `/ordenes-compra?tab=cotizaciones`.

## Tokens aplicados

- **Canvas:** crema `--color-cream-50`; tabla y modales sobre superficie blanca con
  borde `--color-border` y sombra `--shadow-card`.
- **CTA principal:** "Nueva" en amarillo `--color-accent-500` (único amarillo de acción
  del viewport). "Exportar", "Filtros" y acciones secundarias en outline/ghost verde.
- **Tipografía:** H1 Baloo 2 extrabold uppercase ("Órdenes de compra"); eyebrow small
  uppercase ("Compras · Reposición"); N° de orden en mono chip verde.

## Mapeo de estados (brief → tokens Pet Bliss)

El brief sugiere 🟡🟢🔵🔴. Se usa la paleta de estado del sistema
(`StatusBadge`, ver MASTER.md "Status Colors").
**HU-COMP-02 v2: 5 estados** (Pendiente → Enviada → Recibida Parcial/Total, o Cancelada):

| Estado | Variante | Chip | Punto |
|--------|----------|------|-------|
| Pendiente | `warning` | `status-warning/10` + texto `status-warning-strong` | `status-warning` |
| Enviada | `info` | `status-info/10` + texto `status-info-strong` | `status-info` |
| Recibida Parcial | `warning` | `status-warning/10` + texto `status-warning-strong` | `status-warning` |
| Recibida Total | `success` | `status-success/10` + texto `status-success-strong` | `status-success` |
| Cancelada | `danger` | `status-danger/10` + texto `status-danger-strong` | `status-danger` |

Siempre punto + texto (nunca solo color).

## Composición

- Header con eyebrow + H1, búsqueda pill, Filtros (panel) y chips con ✕ debajo.
- Tabla sin columna "#" (el N° Orden identifica la fila). Columnas: N° Orden,
  Proveedor, Fecha, Entrega, Total, Estado, Acciones.
- Acciones por fila según estado: Ver siempre; Editar y Cancelar solo si
  corresponde (editar = Pendiente; cancelar = Pendiente o Enviada).
- Formulario único en modal (`max-w-3xl`) con modos INSERCION / EDICION / LECTURA,
  con la misma organización que Nuevo movimiento de stock:
  - Box "Número de orden" arriba (mono, role=note): se asigna automáticamente.
  - Campos superiores en grilla 2 columnas: Depósito de entrega, Proveedor,
    Fecha emisión, Fecha entrega, **Condición de pago** (HU-COMP-02 v2).
    Debajo, Notas a ancho completo.
  - **Banner de origen (prefill desde adjudicación):** cuando la orden nace de
    una cotización adjudicada (HU-COMP-02), el modo INSERCION muestra un banner
    `role="note"` en `accent-500/10` con borde `accent-500/40` e ícono Scale:
    "Generada desde SC-XXXX · comparación adjunta". La lectura muestra
    "· Cotización: SC-XXXX" junto al proveedor.
  - Notas en textarea a ancho completo.
  - `fieldset` + `legend` "Artículos": card por línea (Combobox artículo +
    Cantidad + Precio unit. + Subtotal en celda dashed + trash), botón ghost
    "+ Agregar artículo", siempre hay una fila (trash deshabilitado con 1 sola).
  - Box "Validaciones" al pie con las reglas del formulario.
- **Footer del modal en LECTURA (v2):** sin botón "Cerrar" (la equis del modal
  ya cierra; no se duplican acciones de solo-cerrar). Cancelar orden
  (destructive, solo Pendiente/Enviada) · Editar (secondary, solo Pendiente) ·
  **"Enviar al proveedor"** (primary amarillo con ícono Send, solo Pendiente;
  reemplaza al anterior "Aprobar").
- **Depósito de entrega:** solo se puede elegir entre los depósitos del catálogo
  (`depositosIniciales`, tabla `deposito`). No hay dirección libre: la
  `direccion_entrega` (varchar, sin FK) se resuelve con la `ubicacion` del
  depósito elegido. En EDICION el depósito se infiere por match exacto de la
  dirección guardada; fallback al default.
- Totales: subtotal calculado, **descuento en porcentaje (0-100)** con el monto
  equivalente mostrado como hint, gastos de envío debajo, ambos a ancho completo;
  TOTAL destacado en display bold. La columna `orden_compra.descuento` guarda el
  porcentaje; el monto se calcula sobre el subtotal.
- Errores de validación: las cards de ítem NO usan `items-end`; el contenido
  fluye desde arriba y el error crece hacia abajo sin desplazar los campos
  vecinos. El trash lleva un spacer con la altura del label para quedar
  alineado a la línea de inputs (mismo fix aplicado en Movimientos).

## Estados de pantalla

Vacío (sin órdenes: mensaje + CTA "Crear primera orden") · Sin resultados (filtros:
mensaje + limpiar) · Cargando (skeleton rows) · Error (card + Reintentar) · Con datos.

## Accesibilidad

- Touch targets ≥44px (acciones de fila h-11 w-11).
- Focus visible ring en todos los controles; `aria-label` en iconos-acción.
- Errores por campo con `role="alert"`; validación on blur (patrón touched/showError).
- Importes aceptan coma decimal (teclado es-AR); `inputMode="decimal"`.
- `prefers-reduced-motion` respetado vía Framer Motion (Modal/Toast existentes).

## Notas de integración (para el back)

Los puntos de conexión están marcados con `// BACKEND:` en
`src/data/ordenes-compra.ts`, `src/components/ordenes-compra/*` y
`src/app/ordenes-compra/page.tsx`. Buscar con `grep -rn "BACKEND" src/`.

- Auditoría (alta/edición/cancelación/envío con valores anterior-nuevo): la registra el back.
- Al pasar a **Recibida**, el back genera el movimiento de stock tipo Entrada.
- Sugerencia desde alerta de stock mínimo (HU-STK-04): abrir esta pantalla con el
  artículo preseleccionado (ej. query param `?articulo=<id>`).
- **Handoff desde el tab Cotizaciones (HU-COMP-02):** al adjudicar, ambos tabs
  viven en el mismo módulo, así que el handoff es directo por estado: se cambia
  al tab "Órdenes de compra" y se abre la orden precargada con banner de origen
  (sin sessionStorage ni navegación). En producción el back crea la
  `orden_compra` con `cotizacion_id` al confirmar la adjudicación.
