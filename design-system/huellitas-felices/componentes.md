# Inventario de componentes — Huellitas Felices

Índice de los componentes que existen en `src/components/`. Lo consulta el comando `/disenar` antes de codear para **reusar antes de crear**.

> **Mantenimiento:** todo componente nuevo creado con `/disenar` (o a mano) debe agregarse acá. Si un componente cambia de propósito o props clave, actualizar su fila. Este archivo es índice: la fuente de verdad es el código.

## Compartidos (`src/components/ui/`)

Usar SIEMPRE estos antes de crear un equivalente propio del módulo.

| Componente | Para qué | Props clave / notas |
|---|---|---|
| `Button` | Botón pill del sistema | `variant`: primary (amarillo, solo CTAs) / secondary (verde) / outline / ghost / destructive · `size`: sm/md/lg/icon |
| `Input` | Input de texto estándar | extiende `InputHTMLAttributes`, estilos de foco/token ya resueltos |
| `Select` | Select nativo estándar | extiende `SelectHTMLAttributes` |
| `Combobox` | Select con búsqueda (catálogos largos) | `options: {value,label,tone?}[]`, integra `label`/`error`/`hint` |
| `Modal` | Modal base con overlay + cierre | `open`, `onClose`, `title`, `icon?`, `footer?`, `maxWidth?`; anima con Framer Motion y respeta `prefers-reduced-motion` |
| `StatusBadge` | Chip de estado (pill + indicador + texto) | `variant`: success/warning/danger/info/neutral + `label`, `icon?`. Único punto de verdad de colores de estado (tokens `status-*`) |
| `Pagination` | Paginación de tablas | `page`, `totalPages`, `totalItems`, `pageStart/End`, `pageSize`, `onPageChange`, `onPageSizeChange` (tamaños 10/25/50) |
| `OrdenamientoSelect` | Orden por fecha | `value`: "recientes"/"antiguas", `onChange` |
| `RangoNumerico` | Filtro numérico min–max | `label`, `valor: {min,max}`, `onChange` |
| `Toast` | Notificaciones de éxito/error | `ToastProvider` + `useToast()` → `showToast("success"\|"error", msg)` |

## Por módulo (`src/components/<módulo>/`)

Patrones recurrentes por pantalla: `<Entidad>Table`, `<Entidad>Filtros*`, `<Entidad>FormModal`, `Estado*Badge`, `Cancelar*Modal`, `<Entidad>Tabs`.

### articulos
`ArticuloFormModal` · `ArticulosTable` · `ArticuloThumb` · `DesactivarModal` · `EstadoBadge` · `FiltrosArticulos`

### compras
`ComprasTabs` (tabs compartidos Proveedores / Cotizaciones / Órdenes de compra)

### cotizaciones
`CancelarSolicitudModal` · `CompararCotizacionesModal` · `CotizacionFormModal` · `EstadoSolicitudBadge` · `FiltrosCotizaciones` · `SolicitudFormModal` · `SolicitudesTable`

### layout
`Sidebar` (nav principal)

### movimientos
`AlertaReposicionModal` · `FiltrosMovimientos` · `MovimientoFormModal` · `MovimientosTable` · `TipoMovimientoBadge`

### ordenes-compra
`CancelarOrdenModal` · `EstadoOrdenBadge` · `FiltrosOrdenes` · `OrdenFormModal` · `OrdenesTable`

### proveedores
`BajaProveedorModal` · `EstadoProveedorBadge` (mapea sobre `StatusBadge`: success/neutral) · `FiltrosProveedores` · `ProveedorFormModal` · `ProveedoresTable`

### stock
`DepositoFormModal` · `DepositosList` · `EstadoStockBadge` · `FichaFormModal` · `FichasTable` · `FiltrosStock` · `StockTabs`

## Reglas de reuso

1. **Reusar antes de crear:** si existe algo equivalente en `ui/`, se usa. Los equivalentes de módulo (ej: `EstadoBadge` de articulos) se evalúan caso por caso; si sirven, se generalizan hacia `ui/` en lugar de duplicarse.
2. **Extender, no duplicar:** si un componente existente casi cumple, se le agregan props/variantes manteniendo retrocompatibilidad con quienes ya lo usan.
3. **Nuevo solo si no hay equivalente**, justificándolo en el plan (qué falta y por qué no conviene extender).
4. **Los badges de estado van sobre `StatusBadge`:** los `Estado*Badge` de módulo solo mapean su estado de negocio a una variante + label + icono; nunca definen sus propios colores.
5. **Verificar contra el código:** este inventario puede quedarse atrás; ante duda, confirmar con una búsqueda real en `src/components/**`.
