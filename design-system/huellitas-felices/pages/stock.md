# Página: stock

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Contexto

Pantalla de gestión de stock (HU-STK-02). Módulo interno tipo back-office: densidad media-alta, tres modos controlados por pestañas (Depósitos / Fichas de Stock / Transferencias). Una sola acción clara por viewport: el CTA amarillo es exclusivo de la pestaña activa.

## Desviaciones y decisiones
- **Amarillo (accent)**: SOLO en el CTA de la pestaña activa (Nueva ficha / Nuevo depósito / Confirmar transferencia). Exportar/Filtros son outline; acciones de fila son ghost. El amarillo de acción (`accent-500`) no se usa en badges — para eso está `status-warning` (ver MASTER.md "Status Colors").

- **Estados de stock (derivados, calculados)** — paleta de estado del sistema (`StatusBadge`): `normal` (variante `success`, verde vibrante, icono CheckCircle2), `bajo` (variante `warning`, amarillo, icono AlertTriangle), `critico` (variante `danger`, rojo, icono AlertCircle). Badge SIEMPRE con texto + icono, nunca color solo. El estado se calcula en el front: `critico` si `stockCritico != null && stockActual <= stockCritico`; `bajo` si `stockActual < stockMinimo`; si `stockCritico` es null solo existen normal/bajo. No se persiste.
- **Filtro por defecto**: solo fichas con artículo activo (`articulo.estado = activo`), sin toggle; la tabla `ficha_stock` no tiene estado propio.
- **Transferencias**: UN solo flujo — la pestaña "Transferencias" embebe el formulario; el botón 🔄 de fila cambia a esa pestaña con origen precargado (no hay modal duplicado). Origen y destino deben ser depósitos distintos; la cantidad no puede superar el stock del origen.
- **Densidad**: tablas con padding compacto (py-3), toolbar espaciado (gap-4). Container `min(1280px, calc(100% - 48px))` igual que la página Artículos.
- **Tabla**: scroll horizontal en mobile (`overflow-x-auto` + `min-w`), sin cards apiladas.
- **Form ficha único paramétrico**: `modo: "INSERCION" | "EDICION"`. Sucursal es SOLO filtro del depósito (hint explícito, no se guarda). Artículo readonly en EDICION. Stock actual y unidad de medida readonly. Validaciones: unicidad artículo+depósito, umbral mínimo > umbral crítico (si existe), umbrales positivos.
- **Pestaña Depósitos**: agrupación por sucursal (headers verdes + cards surface). Sin baja lógica (la tabla `deposito` no tiene `activo`).
- **Filtros**: panel con Sucursal y Estado de stock (Todos/Normal/Bajo/Crítico); chips removibles; "Limpiar filtros" resetea todo.
- **Búsqueda**: por código de artículo, nombre de artículo o sucursal.
- **Toasts**: z-60 (sobre modales z-50), auto-close 4s, botón ✕. Éxito y error.
- **Modales**: scrim `rgba(17,79,60,0.45)` (verde), radius 16px, z-50, `Escape` cierra. Reutilizan `components/ui/Modal.tsx`.
- **Validación inline**: mensajes bajo el campo con `role="alert"`, validación on blur y al submit.
- **Paginación**: reutiliza `components/ui/Pagination.tsx` con `itemLabel="fichas"`.
- **Sidebar**: ítem "Stock" en Operaciones (icono Warehouse, ruta `/stock`).

## Estados de la pantalla

| Estado | Trigger | UI |
|--------|---------|----|
| Cargando | fetch simulado inicial (~900ms) | Skeleton en tabla + acciones deshabilitadas |
| Vacío | dataset vacío (`SIMULAR_VACIO=true` en `src/data/stock.ts`) | "No hay fichas de stock cargadas" + botón "Nueva ficha" |
| Sin resultados | búsqueda/filtros sin match | "No hay fichas que coincidan" + botón "Limpiar filtros" |
| Error | fetch fallido (`SIMULAR_ERROR=true`) | Mensaje + botón "Reintentar" |
| Con datos | default | Tabla + paginación 10/25/50 + tags de filtros |

## Tokens usados (todos del MASTER)

Fondo crema `--color-cream-50` · surface blanco con `--shadow-card` y borde `--color-border` · texto `--color-text-primary` / `--color-text-secondary` · CTA `--color-accent-500` (hover `--color-accent-600`) · secundarios `--color-brand-900` · destructivo `--color-destructive` (alerta crítica) · radius: pill botones/chips, 8px inputs, 12px cards, 16px modales · motion 150/250/500ms con `useReducedMotion`.