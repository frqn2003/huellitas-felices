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

### auth
`LoginForm` · `TwoFactorModal` · `BlockedOverlay`

### compras
`ComprasTabs` (tabs compartidos Proveedores / Cotizaciones / Órdenes de compra)

### comprobantes
`ComprobantesContent` · `DropzoneComprobante` · `OcrFieldGroup` · `DetalleLineasTable` · `EstadoComprobanteBadge` · `FiltrosComprobantes` · `FiltrosComprobantesChips` · `ComprobantesTable` · `AnularComprobanteModal` · `PreviewComprobantePdf` · `VerComprobanteModal` (detalle en lectura con visor placeholder BACKEND + botón "Modificar datos") · `ui/ConfirmarDialog`
> `ComprobantesContent` y `ComprobantesTable` se extendieron con la prop `onVerCtaCte` (cross-navegación al detalle de cuenta corriente de un proveedor).
> `ComprobantesContent` habilita el ojo `onVer` con `VerComprobanteModal` y expone `irAEditar` (ref) para modificar un comprobante del historial reutilizando el flujo de datos de "nuevo" (modo edición en `handleGuardar`). `ComprobanteRow` se enriqueció con `cuit`, `lineas`, `ocId` y `facturaOriginalId`.

### configuracion
`ConfiguracionForm` — perfil del usuario logueado: información de cuenta (solo lectura) + tu cuenta (editable). Guarda con modal de confirmación de contraseña y modal "Cambiar contraseña". Usa `Input`/`Button`/`Modal`/`StatusBadge`/`Toast` y `useAuth().actualizarUsuario`.

### cotizaciones
`CancelarSolicitudModal` · `CompararCotizacionesModal` · `CotizacionFormModal` · `EstadoSolicitudBadge` · `FiltrosCotizaciones` · `SolicitudFormModal` · `SolicitudesTable`

### cuentas-corrientes
Módulo global de Cuentas Corrientes (HU-FIN-03): maneja AMBOS lados, proveedores (pago_proveedor) y clientes (cobranza_cliente), en un mismo listado. Reutiliza piezas de `proveedores/` (`EstadoCtaCteBadge`) y `ui/`.
`CtaCteListaGlobal` (listado unificado con badge de tipo de entidad Proveedor/Cliente + saldo con signo y etiqueta) · `CtaCorrienteDetalleGlobal` (detalle por entidad con tabs pill Comprobantes/Pagos + acciones Exportar PDF y Registrar) · `RegistrarPagoCtaCteModal` (modal de registro de pago/cobranza con imputación múltiple sobre `Modal`, reutiliza la validación del patrón `RegistrarPagoModal` de proveedores)
> Datos y tipos generalizados (retrocompatibles) en `src/data/cuentas-corrientes.ts`: `CuentaCorriente`, `Pago`, `EntidadCtaCte`, `TipoPago`, `CUENTAS_CORRIENTES_GLOBAL`, `COMPROBANTES_GLOBAL`, `PAGOS_GLOBAL`. No se tocan los tipos de proveedores existentes.
> Ruta nueva `/cuentas-corrientes` con ítem "Cuentas Corrientes" (`Landmark`) en la sección Operaciones de `Sidebar`.

### layout
`Sidebar` (nav principal)

### movimientos
`AlertaReposicionModal` · `FiltrosMovimientos` · `MovimientoFormModal` · `MovimientosTable` · `TipoMovimientoBadge`

### ordenes-compra
`CancelarOrdenModal` · `EstadoOrdenBadge` · `FiltrosOrdenes` · `OrdenFormModal` · `OrdenesTable`

### proveedores
`BajaProveedorModal` · `CtaCorrienteCardHeader` (tarjeta compacta resumen de cuenta corriente para la cabecera superior) · `CtaCorrienteDetalle` (detalle de cuenta corriente con pestañas de navegación pill entre comprobantes pendientes y pagos registrados, con filtros avanzados emergentes `FiltrosCtaCorriente` y paginación `Pagination`) · `CtaCorrienteList` (listado resumen de cuentas corrientes con saldo neto) · `EstadoCtaCteBadge` (mapea sobre `StatusBadge`: Vencido=danger, Próximo a vencer/Pendiente=warning, Crédito=success, Saldado=neutral) · `EstadoProveedorBadge` (mapea sobre `StatusBadge`: success/neutral) · `FiltrosCtaCorriente` (`FiltrosCtaComprobantes` y `FiltrosCtaPagos`: panel flotante emergente con contador e indicadores chip) · `FiltrosProveedores` · `ProveedorFormModal` · `ProveedoresTable` · `ProveedoresTabs` · `RegistrarPagoModal` (modal de pago con imputación múltiple sobre `Modal` + validaciones)
> `ProveedoresTabs` extendido con el tercer tab `"cta-corriente"` (`Landmark`).

### recepciones
`RecepcionesTable` · `FiltrosRecepciones` · `FiltrosChipsRecepciones` · `RecepcionFormModal` · `RecepcionDetalleModal` · `EstadoRecepcionBadge`

### stock
`DepositoFormModal` · `DepositosList` · `EstadoStockBadge` · `FichaFormModal` · `FichasTable` · `FiltrosStock` · `StockTabs`

## Reglas de reuso

1. **Reusar antes de crear:** si existe algo equivalente en `ui/`, se usa. Los equivalentes de módulo (ej: `EstadoBadge` de articulos) se evalúan caso por caso; si sirven, se generalizan hacia `ui/` en lugar de duplicarse.
2. **Extender, no duplicar:** si un componente existente casi cumple, se le agregan props/variantes manteniendo retrocompatibilidad con quienes ya lo usan.
3. **Nuevo solo si no hay equivalente**, justificándolo en el plan (qué falta y por qué no conviene extender).
4. **Los badges de estado van sobre `StatusBadge`:** los `Estado*Badge` de módulo solo mapean su estado de negocio a una variante + label + icono; nunca definen sus propios colores.
5. **Verificar contra el código:** este inventario puede quedarse atrás; ante duda, confirmar con una búsqueda real en `src/components/**`.