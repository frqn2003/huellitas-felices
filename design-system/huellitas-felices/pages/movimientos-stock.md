# Página: movimientos-stock

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Contexto

Pantalla de registro y consulta de movimientos de stock (HU-STK-04, ruta `/movimientos-stock`). Módulo interno tipo back-office: densidad media-alta, una sola acción clara por viewport (el CTA amarillo "Nuevo movimiento"). La lista muestra un registro de `movimiento_stock` por fila (cada registro = 1 artículo; las transferencias generan el par egreso+ingreso vinculado).

## Desviaciones y decisiones

- **Amarillo (accent)**: SOLO en el CTA "Nuevo movimiento". Exportar y Filtros son outline; no hay acciones de fila.
- **Tipo de movimiento (badge con color + icono, nunca color solo)** — usa la
  paleta de estado del sistema (`StatusBadge`, ver MASTER.md "Status Colors"):
  - `Ingreso`: variante `success` (verde vibrante) + icono `ArrowDownToLine`.
  - `Egreso`: variante `danger` (rojo) + icono `ArrowUpFromLine`.
  - `Transferencia`: variante `info` (azul) + icono `ArrowLeftRight`.
  - `Ajuste`: variante `warning` (amarillo) + icono `Scale`.
- **Formulario modal (Nuevo movimiento)**:
  - Nº de movimiento auto-generado `MOV-XXXX` (agrupador de los N registros), readonly en el modal.
  - Tipo = **Transferencia** → dos campos: "Depósito origen" y "Depósito destino" (deben ser distintos). Otros tipos → un solo "Depósito".
  - Origen filtrado según tipo (combos inválidos no se ofrecen): Ingreso → OC/Transferencia/Ajuste; Egreso → Venta/Transferencia/Ajuste; Transferencia → Transferencia (fijo, deshabilitado); Ajuste → Ajuste (fijo).
  - Filas de artículo: las opciones se derivan de las fichas activas del depósito elegido (garantiza "ficha existente"). Ficha (`FIC-XXX`, derivada del id, no persiste) y stock actual readonly. Duplicados bloqueados.
  - Validaciones en el confirmar (criterio HU): requeridos, cantidad > 0, duplicados, stock suficiente en Egreso/Transferencia (`stock_actual - cantidad >= 0`), ficha existente en origen Y destino para transferencias.
- **Alertas de reposición**: tras confirmar, si algún stock resultante `<= stock_minimo` o `<= stock_critico`, se abre el modal de alerta con el artículo más crítico primero (crítico > bajo) y luego toast. Un solo botón "Entendido".
- **Empleado**: se asigna automáticamente `EMPLEADO_ACTUAL` (demo: Ana Martínez, id 1). Al confirmar, el registro demo usa ese empleado.
- **Fechas**: se muestran en hora UTC (formato `dd/mm/aaaa hh:mm`) porque los ISO del backend vienen con `Z`; decisión de demo documentada. Período filtra por `aaaa-mm-dd` del ISO.
- **Filtros**: Tipo, Depósito, Artículo (combobox), Período desde/hasta (inputs date). Chips removibles separados ("Desde: ..." / "Hasta: ..."), "Limpiar filtros" resetea todo. Búsqueda por nro. de movimiento o artículo.
- **Nombres de depósito**: los del brief ("Depósito Central", "Sucursal A") se alinean con el catálogo existente (`depositosIniciales` de `src/data/stock.ts`): "Dep. Central", "Dep. Norte", "Dep. Sur".
- **Densidad**: tabla con padding compacto (py-3), toolbar espaciado (gap-4), container `min(1280px, calc(100% - 48px))` como la página Stock. Scroll horizontal en mobile (`overflow-x-auto` + `min-w`).
- **Toasts**: z-60 (sobre modales z-50), auto-close 4s, botón ✕. Éxito y error. Reutiliza `components/ui/Toast.tsx`.
- **Modales**: scrim `rgba(17,79,60,0.45)` (verde), radius 16px, z-50, `Escape` cierra. Reutilizan `components/ui/Modal.tsx`.
- **Paginación**: reutiliza `components/ui/Pagination.tsx` con `itemLabel="movimientos"` (10/25/50).
- **Sidebar**: ítem "Movimientos de Stock" (icono ArrowLeftRight, ruta `/movimientos-stock`). El sidebar de escritorio ahora es fijable (pin) y recuerda su estado en `sessionStorage` (criterio general de la HU: "el menú lateral recuerda su estado durante la sesión").

## Estados de la pantalla

| Estado | Trigger | UI |
|--------|---------|----|
| Cargando | fetch simulado inicial (~900ms) | Skeleton en tabla + acciones deshabilitadas |
| Vacío | dataset vacío (`SIMULAR_VACIO=true` en `src/data/movimientos.ts`) | "No hay movimientos registrados" + botón "Nuevo movimiento" |
| Sin resultados | búsqueda/filtros sin match | "No hay movimientos que coincidan" + botón "Limpiar filtros" |
| Error | fetch fallido (`SIMULAR_ERROR=true`) | Mensaje + botón "Reintentar" |
| Con datos | default | Tabla + paginación 10/25/50 + tags de filtros |

## Tokens usados (todos del MASTER)

Fondo crema `--color-cream-50` · surface blanco con `--shadow-card` y borde `--color-border` · texto `--color-text-primary` / `--color-text-secondary` · CTA `--color-accent-500` (hover `--color-accent-600`) · secundarios `--color-brand-900` · destructivo `--color-destructive` (egresos y alerta) · radius: pill botones/chips, 8px inputs, 12px cards, 16px modales · motion 150/250/500ms con `useReducedMotion`.