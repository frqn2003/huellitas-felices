# Página: lista-precios

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Contexto

Gestión del precio de venta vigente por artículo (HU-STK-03). Back-office de densidad media-alta: una sola acción clara por viewport (el CTA amarillo es exclusivamente "Nuevo precio"). Ruta propia `/lista-precios` (ítem "Lista de Precios" en el menú lateral, sección Operaciones, junto a Artículos) + sub-ruta `/lista-precios/historial?articuloId=`.

## Desviaciones y decisiones

- **Amarillo (accent)**: SOLO el botón "Nuevo precio" del header. Exportar y Filtros son outline; acciones de fila son ghost. El badge "Sin precio" usa la variante `warning` de `StatusBadge` (escala de estados, no el accent de marca).
- **Badges de estado**: columna Estado con `EstadoBadge` (extendido con prop `estado`: `Activo` = `success`, `Inactivo` = `neutral`). La columna "Precio vigente" muestra `StatusBadge warning` con label "Sin precio" cuando no hay fila en `lista_precio` — punto + texto, nunca color solo.
- **Precio vigente**: en negrita `text-brand-900` + `tabular-nums` (es el dato estrella de la pantalla). **Costo ref. OC** en `text-secondary`, siempre con "—" si no hay fuente: es informativo y **nunca editable** (lo fija la recepción de la OC, HU-COMP-02/03).
- **Tabla**: 7 columnas (Código, Nombre, Categoría, Costo ref. OC, Precio vigente, Estado, Acciones) con `overflow-x-auto` + `min-w-[920px]`. Sin columna "Imagen" — se sacó por ahora porque las semillas traen `imagenUrl` vacío y solo agregaba una columna de placeholders; el dato sigue en `FilaListaPrecio` para cuando haya imágenes reales. Tampoco columna "#" (no aporta y el paginador ya numera).
- **Acciones de fila** (iconos con `aria-label` + `title`, patrón ArticulosTable, targets 44×44): 👁️ Ver · ✏️ Editar precio **solo si tiene precio** · ➕ Cargar precio si **no** tiene (así el alta del primer precio es discoverable y no se ofrece editar algo inexistente) · 🕒 Historial. Los artículos sin precio SÍ aparecen en la tabla (criterio HF047).
- **Filtros**: `FiltrosArticulos` extendido con la prop `grupos={["categoria", "estado"]}` (unidad y proveedor no aplican). Default `estado: "Activo"`; el chip es visible de fábrica y es removible; `hasActiveFilters` trata "Activo" como vista por defecto, no como filtro elegido. Etiqueta del chip = `Estado: Activo` (la del componente compartido, misma que Artículos; el wireframe esquemático del brief dice "Activos").
- **Modales**: un solo componente `PrecioFormModal` con los 3 modos `FormModo` (patrón ArticuloFormModal, `key={modo-articuloId}` para resetear el draft). INSERCIÓN: Combobox de artículos activos sin precio (sin texto libre) + precio decimal + motivo. EDICIÓN: artículo bloqueado (🔒), precio vigente junto al nuevo y **ConfirmarDialog `tone="neutral"`** con el antes/después antes de guardar. LECTURA: ficha completa + "Último cambio por X — fecha"; botones "Cerrar" y "Editar precio".
- **Validación de inputs**: precio `inputMode="decimal"` + sanitize `^\d{0,10}(\.\d{0,2})?$` (coma es-AR → punto, corta a 10 enteros / 2 decimales); motivo `maxLength=255`; costo ref. `readOnly` + `disabled`; `usuario_id` nunca es input (sale de la sesión vía `useAuth`); errores `errors`/`touched` con `role="alert"` on blur y al submit.
- **Historial**: página propia con `<Suspense>` alrededor del componente que usa `useSearchParams` (regla activa). Una sola fila vigente por artículo (`vigencia_hasta = NULL`), orden `fecha_hora` DESC, badges Vigente=`success` / Finalizada=`neutral`, export CSV. Sin `articuloId` o desconocido → estado vacío con retorno a la lista.
- **Datos**: `src/data/lista-precios.ts` expone `listarListaPrecios()`, `historialDe(articuloId)` y `guardarPrecio()` (simulan `fn_abm_lista_precio` + `trg_historial_precios` en memoria de sesión). `LISTA_PRECIOS_ARTICULOS` (HU-VTA-01) se **deriva** de las filas: una sola fuente por precio. El motivo todavía no persiste (PENDIENTE DBA: no hay columna).
- **Toasts**: z-60 (por encima de modales z-50), auto-close 4s, éxito y error.
- **Modales**: scrim `rgba(17,79,60,0.45)` (verde, no negro), radius 16px, z-50, Escape cierra.

## Estados de la pantalla

| Estado | Trigger | UI |
|--------|---------|----|
| Cargando | fetch simulado inicial (~700ms) | Skeleton en tabla + acciones deshabilitadas |
| Vacío | dataset vacío (`SIMULAR_VACIO=true` en `src/data/lista-precios.ts`) | "No hay artículos cargados" + copy de carga |
| Sin resultados | búsqueda/filtros sin match | "Sin resultados" + botón "Limpiar filtros" |
| Error | fetch fallido (`SIMULAR_ERROR=true`) | Mensaje + botón "Reintentar" |
| Con datos | default | Tabla + paginación 10/25/50 + chips |

## Tokens usados (todos del MASTER)

Fondo crema `--color-cream-50` · surface blanco con `--shadow-card` y borde `--color-border` · texto `--color-text-primary` / `--color-text-secondary` · CTA `--color-accent-500` (hover `--color-accent-600`) · secundarios `--color-brand-900` · estados `StatusBadge` (success/warning/neutral) · radius: pill botones/chips, 8px inputs, 12px cards, 16px modales · motion 150/250/500ms.
