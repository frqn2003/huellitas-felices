# Página: articulos

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Contexto

Pantalla de gestión de artículos (HU-STK-01). Módulo interno tipo back-office: densidad media-alta, una sola acción clara por viewport (el CTA amarillo es exclusivamente "Nuevo artículo").

## Desviaciones y decisiones

- **Amarillo (accent)**: SOLO en el botón "Nuevo artículo" (CTA principal del viewport). Exportar/Filtros son outline; acciones de fila son ghost. El badge "Próximo a vencer" usa amarillo al 20% (highlight derivado, nunca compite con el CTA).
- **Densidad**: tablas con padding compacto (py-3), toolbar espaciado (gap-4). Container `min(1280px, calc(100% - 48px))` (ancho gestionable mayor que landing).
- **Tabla**: scroll horizontal en mobile (`overflow-x-auto` + `min-w`) — regla de la skill (tablas desbordan en mobile). Sin cards apiladas para no romper el patrón de tabla del back-office.
- **Sidebar colapsable**: ancho 264px → 72px, estado persistido en `sessionStorage` (recuerda durante la sesión). En mobile (<1024px) se comporta como drawer overlay (z-30). El ítem activo se marca con fondo `brand-900/10` y texto `brand-900`.
- **Estados de fila (derivados)**: el estado visible combina `activo` (Activo/Inactivo) con el flag `proximoaVencer` (badge derivado, no editable en el form). El estado no es un campo del formulario.
- **Baja lógica = "Desactivar"**: copy corregido del wireframe — el modal explica que es reversible (reactivable desde edición). Botón destructivo solo en el modal de confirmación.
- **Form único paramétrico**: `modo: "INSERCION" | "EDICION" | "LECTURA"`. En LECTURA todos los campos van readonly/disabled. En EDICION el código es readonly y aparece el switch "Activo" (reactivar). Código autogenerado en INSERCIÓN (`ART###` siguiente).
- **Toasts**: z-60 (por encima de modales z-50), auto-close 4s, botón ✕. Estados éxito y error.
- **Modales**: scrim `rgba(17,79,60,0.45)` (verde, no negro), radius 16px, z-50, `Escape` cierra, focus inicial en el primer campo.
- **Validación inline**: mensajes debajo del campo con `role="alert"`, validación on blur y al submit. Unicidad de nombre (excluyendo propio en edición).

## Estados de la pantalla

| Estado | Trigger | UI |
|--------|---------|----|
| Cargando | fetch simulado inicial (~900ms) | Skeleton en tabla + acciones deshabilitadas |
| Vacío | dataset vacío (`SIMULAR_VACIO=true` en `src/data/articulos.ts`) | "No hay artículos cargados" + botón "Nuevo artículo" |
| Sin resultados | búsqueda/filtros sin match | "No hay artículos que coincidan" + botón "Limpiar filtros" |
| Error | fetch fallido (`SIMULAR_ERROR=true`) | Mensaje + botón "Reintentar" |
| Con datos | default | Tabla + paginación 10/25/50 + tags de filtros |

## Tokens usados (todos del MASTER)

Fondo crema `--color-cream-50` · surface blanco con `--shadow-card` y borde `--color-border` · texto `--color-text-primary` / `--color-text-secondary` · CTA `--color-accent-500` (hover `--color-accent-600`) · secundarios `--color-brand-900` · destructivo `--color-destructive` · radius: pill botones/chips, 8px inputs, 12px cards, 16px modales · motion 150/250/500ms con `useReducedMotion`.
