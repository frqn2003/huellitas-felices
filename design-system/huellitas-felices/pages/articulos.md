# Página: articulos

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Contexto

Pantalla de gestión de artículos (HU-STK-01). Módulo interno tipo back-office: densidad media-alta, una sola acción clara por viewport (el CTA amarillo es exclusivamente "Nuevo artículo").

## Desviaciones y decisiones

- **Amarillo (accent)**: SOLO en el botón "Nuevo artículo" (CTA principal del viewport). Exportar/Filtros son outline; acciones de fila son ghost. El badge de estado nunca usa amarillo (los estados son solo Activo/Inactivo).
- **Densidad**: tablas con padding compacto (py-3), toolbar espaciado (gap-4). Container `min(1280px, calc(100% - 48px))` (ancho gestionable mayor que landing).
- **Tabla**: scroll horizontal en mobile (`overflow-x-auto` + `min-w`) — regla de la skill (tablas desbordan en mobile). Sin cards apiladas para no romper el patrón de tabla del back-office.
- **Sidebar colapsable**: por defecto colapsado (72px), se expande temporalmente a 264px al pasar el mouse sobre él y se contrae al salir (hover-only, sin persistencia ni toggle). En mobile (<1024px) se comporta como drawer overlay (z-30). El header muestra la marca "Huellitas Felices"; el nombre de la persona logueada está en el footer de sesión (placeholder, `// BACKEND:`). Ítems agrupados en secciones (Operaciones / Administración); el activo se deriva de la ruta (`usePathname`) y se marca con fondo `cream-50/15` y texto `cream-50`. Los módulos sin pantalla aún apuntan a `#` con aspecto normal (se habilitan a medida que se construyen las HUs). Drawer móvil: foco inicial en el botón de cierre, cierre con Escape, scroll-lock del body y `aria-expanded`/`aria-controls` en el hamburguesa.
- **Estados de fila (derivados)**: solo `Activo` / `Inactivo`, derivados del booleano `activo`. El estado no es un campo del formulario.
- **Baja lógica = "Desactivar"**: copy corregido del wireframe — el modal explica que es reversible (reactivable desde edición). Botón destructivo solo en el modal de confirmación.
- **Form único paramétrico**: `modo: "INSERCION" | "EDICION" | "LECTURA"`. En LECTURA todos los campos van readonly/disabled. En EDICION el código es readonly. Campo "Fabricante" opcional (tras Descripción). Check "Artículo activo" presente en INSERCION y EDICION, texto a la izquierda y checkbox pegado a la derecha. Código autogenerado en INSERCIÓN (`ART###` siguiente).
- **Imagen**: título "Imagen" sobre la zona de subir — arrastrar y soltar o clic (PNG/JPG/WEBP, máx. 2 MB), preview con opción de quitar; en LECTURA solo preview.
- **Filtros**: panel con Categoría, Estado (Activo/Inactivo/Todos), Unidad de medida y Proveedor; chips removibles; "Limpiar filtros" resetea todo.
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
