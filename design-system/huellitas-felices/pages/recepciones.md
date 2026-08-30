# Página: Compras · Recepciones de Mercadería (`/recepciones`)

> HU-COMP-03 (brief `docs/briefs/HU-COMP-03.md`) · Extiende `../MASTER.md` (Pet Bliss). Los tokens base NO cambian;
> este archivo documenta las decisiones específicas de esta pantalla.

## Tokens aplicados

- **Canvas:** crema `--color-cream-50`; tabla y modales sobre superficie blanca con
  borde `--color-border` y sombra `--shadow-card` (idéntico a Órdenes de Compra).
- **CTA principal:** "Nueva" en amarillo `--color-accent-500` (único
  amarillo de acción del viewport). "Exportar" y "Filtros" en outline verde.
- **Tipografía:** H1 Baloo 2 extrabold uppercase ("Recepciones"); eyebrow small
  uppercase ("Compras · Recepción de mercadería contra OC"); N° de recepción en mono chip
  verde (`brand-900/10`), mismo patrón que OC-XXXX.

## Mapeo de estados (brief → tokens Pet Bliss)

Se usa la paleta de estado del sistema (`StatusBadge`, ver MASTER.md
"Status Colors") mapeada sobre el tipo de recepción:

| Tipo | Variante | Chip | Punto |
|------|----------|------|-------|
| Completa (total) | `success` | `status-success/10` + texto `status-success-strong` | `status-success` |
| Parcial | `warning` | `status-warning/10` + texto `status-warning-strong` | `status-warning` |

Siempre punto + texto (nunca solo color).

## Composición

- Shell estándar: Sidebar + header crema con eyebrow uppercase + H1 display + un solo CTA amarillo.
- Header con eyebrow + H1, búsqueda pill y botón **Filtros** (SlidersHorizontal)
  al lado — mismo sistema que Órdenes de Compra. El panel desplegable trae un
  `<select>` de tipo (Todas / Completa / Parcial),
  orden por fecha y "Limpiar filtros"; el botón muestra badge amarillo con la
  cantidad de filtros activos. Debajo, pills removibles "Tipo: X ✕"
  (`FiltrosChipsRecepciones`).
- Tabla sin columna "#": columnas N° Recepción, OC, Proveedor, Tipo, Fecha, Estado, Acciones.
  El chip mono REC-XXXX identifica la fila. OC también en chip mono.
- Acciones por fila: solo **Ver** (Eye) — abre modal de detalle solo lectura.
- Modal **Nueva Recepción** (`max-w-3xl`): box "Número de recepción" (mono,
  role=note, se asigna automáticamente); campos superiores en grilla 2 columnas:
  OC vinculada (Select), Depósito destino (Select), Tipo de recepción (Select
  con hint dinámico: "Todos los artículos deben recibirse en su totalidad" /
  "Se reciben solo los artículos que llegaron"), Observaciones (Input).
  fieldset "Detalle por artículo" con tabla dinámica: nombre, solicitado (solo
  lectura), recibida (input numérico), diferencia (calculada), observación
  (select habilitado solo cuando hay diferencia + input de detalle opcional).
  Box "Diferencias detectadas" (AlertTriangle, accent-500/10) cuando hay
  artículos con diferencia. Box "Errores de validación" (role=alert) al pie.
  Footer: Cancelar (outline) + Confirmar Recepción (primary amarillo).
- Modal **Detalle Recepción** (`max-w-3xl`): solo lectura. Info general en
  grilla 2 columnas (OC, Proveedor, Tipo, Depósito, Fecha, Registró) +
  fieldset "Detalle" con tabla de artículos (solicitado, recibido, diferencia,
  observación). Observaciones generales si existen. Footer: solo Cerrar (outline).

## Estados de pantalla

Vacío (mensaje + CTA "Registrar primera recepción") · Sin resultados (filtros:
mensaje + limpiar) · Cargando (skeleton rows) · Error (card + Reintentar) ·
Con datos.

## Accesibilidad

- Touch targets ≥44px (acciones de fila h-11 w-11).
- Focus visible ring en todos los controles; `aria-label` en iconos-acción.
- Errores por campo con `role="alert"`; validación on submit (patrón submitAttempted).
- Input de cantidad con `type="number"`, `min=0`, `max` = cantidad solicitada.
- Select de observación con `aria-label` dinámico por artículo.
- `prefers-reduced-motion` respetado vía Framer Motion (Modal/Toast existentes).

## Notas de integración (para el back)

Puntos marcados con `// BACKEND:` en `src/data/recepciones.ts`,
`src/components/recepciones/*` y `src/app/recepciones/page.tsx`. Buscar con
`grep -rn "BACKEND" src/data/recepciones.ts src/components/recepciones/ src/app/recepciones/`.

- Tablas: `recepcion_mercaderia`, `recepcion_mercaderia_detalle` (ya existen en BD).
- Endpoints esperados: GET/POST `/api/recepciones`.
- Al confirmar recepción: trigger `trg_recepcion_mercaderia` actualiza
  `orden_compra.estado_id` y trigger `trg_recepcion_stock` genera movimiento
  de stock (HU-STK-04).
- Diferencias: insertar en `notificacion_compra` para el responsable de compras.
- Auditoría: trigger `trg_auditoria_recepcion_mercaderia` (ya documentado en schema).
- Número secuencial REC-XXXX: secuencia o trigger en BD.
