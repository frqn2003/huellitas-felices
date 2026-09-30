# HU-STK-03: Como administrador del sistema, quiero gestionar el precio de venta vigente de cada artículo en una tabla única, con el historial de cambios archivado automáticamente en una tabla de auditoría independiente, para poder actualizar precios sin afectar el costo real de adquisición

> Generado con /brief. Revisar y ajustar antes de /disenar.

## Contexto

- **Ruta propuesta:** `/lista-precios` (ítem nuevo "Lista de Precios" en el menú lateral, junto a Artículos / Órdenes de Compra / Movimientos — mismo patrón de ruta propia que `/articulos`, `/stock`, `/movimientos-stock`)
- **Relacionada con:** HU-STK-01 (Artículos — catálogo que provee los filas), HU-STK-02 (Fichas de Stock), HU-STK-04 (Movimientos), HU-COMP-02-02 / HU-COMP-03 (costo de compra — se fija en la recepción de la OC, **nunca** desde esta pantalla), HU-VTA-01 (facturación — toma el precio vigente de `lista_precio`)
- **Prioridad:** alta — sin precio cargado la venta se rechaza (error **HF047**: "Artículo sin precio de venta cargado")

## Propuesta inicial (del equipo)

- ABM de precios de venta sobre una tabla única (`precios` → en el esquema se llama **`lista_precio`**), una fila activa por artículo.
- Un trigger archiva el precio anterior en una tabla de auditoría independiente (`historial_precios`), con usuario responsable y fecha/hora.
- Tres modos controlados por parámetro: **INSERCIÓN** (primer precio), **EDICIÓN** (actualiza in place) y **LECTURA** → en el esquema es la función `fn_abm_lista_precio(modo, id, articulo_id, precio, usuario_id)`.
- Precio de venta **totalmente independiente** del costo de compra (HU-COMP-02). El módulo VTA siempre lee el precio vigente, sin evaluar rangos de fechas.
- Consulta del historial completo de un artículo, ordenado por fecha de registro.
- Wireframes provistos por el equipo: lista + modal "Nuevo precio" + modal "Modificar precio" + modal "Ver" + pantalla de historial. **El equipo avisó que los wireframes tienen datos que no coinciden con el esquema: manda el esquema.**

### Discrepancias wireframe ↔ esquema (resueltas a favor del esquema)

| Wireframe dice | Esquema real | Decisión |
|---|---|---|
| Tabla `precios` sin campos de fecha de vigencia | `lista_precio` **sí** tiene `vigencia_desde` (date, default hoy, lo reasigna un trigger al cambiar el precio) | Se usa `vigencia_desde`; la HU queda ajustada al esquema |
| Historial con columnas "Precio registrado / Precio anterior / Estado" | `historial_precios` guarda **períodos**: `precio`, `vigencia_desde`, `vigencia_hasta` (NULL = vigente), `usuario_id`, `fecha_hora` | El historial se muestra como vigencias, no como par registrado/anterior |
| Columna "Tipo" (Artículo/Medicamento) y modal con "Artículo/Servicio" | `lista_precio.articulo_id → articulo.id`; **no existe tabla de servicios/prácticas** (solo `origen_movimiento = 'practica'`) | La pantalla es **solo de artículos**. Tarifar la consulta médica queda PENDIENTE DBA (ver más abajo) |
| Modal "Nuevo precio" con campo "Costo de referencia OC" **editable** | El costo de compra se fija en la recepción de la OC (HU-COMP-03) y es de solo lectura acá | Costo ref. solo visible, **jamás editable** |
| Campo "Motivo o justificación" | `lista_precio` **no** tiene columna de motivo | PENDIENTE DBA (o registrar en bitácora `auditoria`) — ver criterios |
| "Registra en bitácora de auditoría cada modificación" | No hay trigger `fn_auditoria` sobre `lista_precio`; `historial_precios` "no usa la tabla genérica `auditoria`" | La bitácora del precio **es** `historial_precios`; el trigger de `auditoria` sería PENDIENTE DBA |

## Wireframe (idea)

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  💲 Lista de Precios                                                     [Perfil] │
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │  Lista de precios de venta              [📥 Exportar]  [➕ Nuevo precio]         │
│      │──────────────────────────────────────────────────────────────────────────────────│
│      │  🔍 [Buscar por código o nombre...]     [Filtros ▼]                             │
│      │  [Estado: Activos ✕]                                                              │
│      │                                                                                   │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │ # │ Imagen │ Código  │ Nombre / Desc.  │ Categoría │ Costo ref │ Precio vigente││
│      │  │   │        │         │                 │           │ (solo L)  │             ││
│      │  │ 1 │ 🖼️    │ ALI-001 │ Alimento Premium│ Alimentos │ $ 14.500  │ $ 24.900    ││
│      │  │ 2 │ 🖼️    │ MED-001 │ Amoxicilina 500  │Medicamentos│ $ 4.200   │ — Sin precio ││
│      │  │   │        │         │                 │           │           │             ││
│      │  │   │        │         │                 │ Estado    │ Acciones  │             ││
│      │  │   │        │         │                 │ 🟢 Activo │ 👁️ ✏️ 🕒  │             ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                               Mostrando 1-2 de 45  [< 1 2 3 >]  │
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

[MODAL: Nuevo precio — modo INSERCIÓN]
  Artículo *        [ 🔍 Combobox: solo artículos ACTIVOS sin precio cargado ]
  Precio de venta * [ $                 ]   (numeric(12,2), ≥ 0)
  Costo ref. OC     [ $ 14.500          ]   ← SOLO LECTURA, dato informativo
  Motivo *          [ Textarea........  ]   ← ver criterio (PENDIENTE DBA)
              [Cancelar]  [Guardar]

[MODAL: Modificar precio — modo EDICIÓN]
  Artículo          [ ALI-001 • Alimento Premium ] 🔒 bloqueado
  Precio vigente    [ $ 24.900 ] (archivable)   Nuevo precio * [ $ 26.500 ]
  Costo ref. OC     [ $ 14.500 ] ← SOLO LECTURA
  Motivo del reajuste * [ Textarea... ]
              [Cancelar]  [Guardar]

[MODAL: Ver — modo LECTURA]
  Artículo / Categoría / U. medida / Fabricante / Vencimiento  (solo lectura)
  Precio vigente $ 24.900 · Vigente desde 01/03/2026 · Último cambio por: Dr. Valeriana Gómez
  Costo ref. OC $ 14.500 (solo lectura)
                                              [Volver]

[INTEGRAL: /lista-precios/historial?articuloId=1]
  🕒 Historial de precios — ALI-001 • Alimento Premium
  ┌──────────────────┬────────────┬───────────────┬────────────────┬───────────────────────┐
  │ Vigencia desde   │ Precio     │ Vigencia hasta│ Usuario        │ Estado                │
  ├──────────────────┼────────────┼───────────────┼────────────────┼───────────────────────┤
  │ 01/09/2026 08:45 │ $ 24.900   │ —             │ Valeriana Gómez│ 🟢 Vigente            │
  │ 01/03/2026 09:10 │ $ 15.000   │ 28/02/2026    │ Valeriana Gómez│ ⚪ Finalizada         │
  └──────────────────┴────────────┴───────────────┴────────────────┴───────────────────────┘
  Ordenado por fecha_hora DESC (fecha de registro del cambio). Una sola fila con "—" por artículo.
```

> El menú lateral es colapsable y recuerda su estado (criterio común de las HU-STK).

## User flow

1. **Origen:** menú lateral → sección de Stock/Artículos → "Lista de Precios". También puede llegar desde `/articulos` (futuro atajo).
2. **Acción principal:** busca un artículo, ve su precio vigente y:
   - si **no tiene precio** (badge "Sin precio"), lo da de alta con "➕ Nuevo precio";
   - si tiene precio, lo **edita** (✏️) con motivo, **consulta** su historial (🕒) o solo **visualiza** la ficha (👁️).
3. **Destino:** al guardar, `fn_abm_lista_precio` hace el INSERT/UPDATE, el trigger `trg_historial_precios` cierra la vigencia anterior y abre la nueva, la bitácora registra el cambio, se muestra toast de éxito y el usuario sigue en la lista (o en el historial desde donde abrió).

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `lista_precio` | id, articulo_id, precio, vigencia_desde, usuario_id, fecha_registro, updated_at | FK → articulo.id **UNIQUE** (una fila por artículo), FK → usuario.id |
| `historial_precios` | id, articulo_id, precio, vigencia_desde, vigencia_hasta, usuario_id, fecha_hora | FK → articulo.id, FK → usuario.id. **Solo lectura desde la app**: la escribe el trigger `fn_historial_precios` |
| `articulo` | id, codigo, nombre, descripcion, categoria_id, unidad_medida_id, fabricante_id, fecha_vencimiento, imagen_url, estado (`activo`/`inactivo`) | Catálogo base de la tabla (LEFT JOIN con `lista_precio`) |
| `categoria`, `unidad_medida`, `fabricante` | nombre (para mostrar Categoría / U. medida / Fabricante) | FK desde `articulo` |
| `auditoria` | tabla, operacion, registro_id, usuario_id, fecha_hora, valores_anteriores, valores_nuevos | Bitácora genérica. **Hoy no la alimenta ningún trigger sobre `lista_precio`** (ver nota) |
| costo ref. (solo lectura) | último costo de compra del artículo | HU-COMP-03 — ver PENDIENTE DBA |

**Funciones/triggers relevantes:** `fn_abm_lista_precio(modo, id, articulo_id, precio, usuario_id)` · `trg_lista_precio_actualizar_vigencia` · `trg_historial_precios` · `trg_lista_precio_updated_at`.

> **PENDIENTE DBA:** no existe columna de **motivo/justificación** del cambio en `lista_precio` ni en `historial_precios`. Definir si se agrega una columna o si se persiste únicamente en `auditoria.valores_nuevos`.
> **PENDIENTE DBA:** no existe entidad `servicio`/`practica` con precio propio; la prosa del esquema dice "artículo o servicio" pero la única FK es `lista_precio.articulo_id → articulo.id`. Si el valor de la consulta médica debe tabularse acá, hay que crear la tabla o extender `lista_precio`. Por ahora la pantalla es solo de artículos.
> **PENDIENTE DBA — bitácora:** el esquema **no** declara trigger `fn_auditoria` sobre `lista_precio` (la lista `trg_auditoria_*` solo cubre consulta_medica, caja, venta, etc.) y aclara que `historial_precios` "no usa la tabla genérica `auditoria`". Por lo tanto la trazabilidad del cambio hoy es **`historial_precios`**. Si además se quiere volcar a `auditoria`, hay que crear el trigger.
> **PENDIENTE DBA — costo ref.:** `db/schema.sql` (estado actual) **no** contiene las tablas `recepcion_mercaderia` / `recepcion_mercaderia_detalle`: el script que las crea está en `db/correcciones/14_recepcion_mercaderia.DESCARTADA.sql`. Hasta que se reaplique, la columna "Costo ref. OC" queda como dato informativo sin fuente confirmada.

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `ui/Modal`, `ui/Button`, `ui/Input`, `ui/Textarea` | Reusar | Base de los 3 modales (3 modos: crear/editar/ver, patrón `ClienteFormModal`) |
| `ui/Combobox` | Reusar | Selección de artículo (sin texto libre). Prop `sanitize` para filtrar lo que el tipo del campo no admite + auto-commit en blur; patrón ya probado en `NuevoTurnoModal` (`soloLetras`, `soloLetrasYNumeros`) |
| `ui/StatusBadge` | Reusar | Base de `EstadoPrecioBadge` (Activo / Inactivo / Sin precio) |
| `ui/Pagination` | Reusar | 10/25/50, igual que el resto |
| `ui/Toast` (`useToast`) | Reusar | Éxito/error de guardado |
| `ui/ConfirmarDialog` | Reusar | Confirmación de edición de precio (tone neutral) |
| `articulos/ArticulosTable` + `ArticuloThumb` + `EstadoBadge` | Extender / clonar a `precios/PreciosTable` | Columnas extra: Categoría, Costo ref., Precio vigente, acciones 👁️ ✏️ 🕒 |
| `articulos/FiltrosArticulos` | Extender | Búsqueda por código/nombre + filtro Estado (default Activos) |
| **Nuevo** `precios/PrecioFormModal` | Crear | 3 modos INSERCIÓN/EDICIÓN/LECTURA sobre `Modal` |
| **Nuevo** `precios/VerPrecioModal` | Crear | Lectura con dato de auditoría "Último cambio por" |
| **Nuevo** `precios/HistorialPreciosContent` | Crear | Tabla de vigencias en `/lista-precios/historial?articuloId=` |
| `src/data/lista-precios.ts` | Extender | **Ya existe** y lo consume HU-VTA-01 (`LISTA_PRECIOS_ARTICULOS`); no romper esa interface, agregar el modelo nuevo aparte con `// BACKEND:` |

## Datos hardcodeados

```ts
// BACKEND: GET /api/lista-precios (JOIN articulo) · POST/PATCH vía fn_abm_lista_precio
const precios = [
  { id: 1, articuloId: 1, codigo: "ALI-001", nombre: "Alimento Premium para Perros",
    descripcion: "Alimento balanceado, bolsa 15kg", categoria: "Alimentos", unidadMedida: "Kg",
    fabricante: "Distribuidora Mascotas Felices", fechaVencimiento: null,
    imagen: "https://via.placeholder.com/40", estadoArticulo: "activo",
    precio: 24900, vigenciaDesde: "2026-03-01", costoRefOc: 14500,
    usuarioId: 2, usuarioNombre: "Valeriana Gómez",
    fechaRegistro: "2026-03-01T09:10:00Z", updatedAt: "2026-03-01T09:10:00Z" },
  { id: 2, articuloId: 2, codigo: "MED-001", nombre: "Amoxicilina 500mg suspensión",
    descripcion: "Antibiótico de amplio espectro", categoria: "Medicamentos", unidadMedida: "Frasco",
    fabricante: "Laboratorios Pharma S.A.", fechaVencimiento: "2026-11-13",
    imagen: "https://via.placeholder.com/40", estadoArticulo: "activo",
    precio: null, vigenciaDesde: null, costoRefOc: 4200,   // ← sin fila en lista_precio
    usuarioId: null, usuarioNombre: null,
    fechaRegistro: null, updatedAt: null },
];

// BACKEND: GET /api/lista-precios/historial?articuloId=1  (solo lectura, lo escribe el trigger)
const historial = [
  { id: 3, articuloId: 1, precio: 24900, vigenciaDesde: "2026-03-01", vigenciaHasta: null,
    usuarioId: 2, usuarioNombre: "Valeriana Gómez", fechaHora: "2026-03-01T09:10:00Z" },
  { id: 2, articuloId: 1, precio: 15000, vigenciaDesde: "2025-11-01", vigenciaHasta: "2026-02-28",
    usuarioId: 2, usuarioNombre: "Valeriana Gómez", fechaHora: "2025-11-01T10:00:00Z" },
];
```

## Estados

- [x] Vacío: "No hay artículos cargados" (o "Ningún artículo coincide con la búsqueda") + botón "➕ Nuevo precio".
- [x] Cargando: skeleton en la tabla, acciones deshabilitadas.
- [x] Error: mensaje + botón "Reintentar".
- [x] Con datos: tabla con badges, filtros como chips y paginación.

## Criterios de aceptación

### General
- [ ] La pantalla opera en tres modos controlados por parámetro: **INSERCIÓN** (primer precio), **EDICIÓN** (actualiza in place) y **LECTURA**, delegados en `fn_abm_lista_precio`.
- [ ] `lista_precio` mantiene **una única fila por artículo** (`articulo_id` UNIQUE); cambiar el precio es un UPDATE in place, nunca un INSERT nuevo.
- [ ] Se deja registro de cada modificación con usuario responsable, fecha y hora — hoy lo aporta `historial_precios` (ver sección Auditoría y PENDIENTE DBA).
- [ ] El menú lateral es colapsable y recuerda su estado.
- [ ] UI íntegramente en español.

### Independencia del costo
- [ ] El precio de venta **no depende** del costo de compra: éste se define solo en la recepción de la Orden de Compra (HU-COMP-02/03) y **nunca es editable desde esta pantalla** (los campos de costo son SOLO LECTURA).
- [ ] El módulo VTA (HU-VTA-01) toma siempre el precio vigente de `lista_precio`, sin evaluar rangos de fechas.

### Trigger e historial
- [ ] Al hacer UPDATE de `precio`, el trigger `trg_historial_precios` cierra la vigencia anterior (`vigencia_hasta`) y abre la nueva (`vigencia_hasta = NULL`); a lo sumo una fila abierta por artículo.
- [ ] `historial_precios` es de **solo lectura** desde la aplicación: no se crea ni se edita desde los formularios.
- [ ] Pantalla de historial: lista las vigencias de un artículo filtrando por `articulo_id`, ordenadas por `fecha_hora`/registro, mostrando precio, vigencia desde/hasta, usuario y estado (Vigente / Finalizada), con exportación.

### Tabla de la lista
- [ ] Columnas: Imagen, Código, Nombre/Descripción, Categoría, Costo ref. (solo lectura), Precio vigente, Estado, Acciones (👁️ Ver / ✏️ Editar / 🕒 Historial).
- [ ] **Los artículos sin precio SÍ aparecen**, con badge "Sin precio" y acción ➕ para cargar el primer precio (si no, la venta fallaría con HF047 y sería invisible para el administrador).
- [ ] Por defecto solo artículos `estado = 'activo'`; filtro de estado permite ver inactivos o todos.
- [ ] Búsqueda por código o nombre; filtros como chips removibles; paginación 10/25/50; **Exportar** a CSV/Excel.

### Formularios
- [ ] **Alta:** combobox de artículos **activos sin precio cargado**; precio obligatorio ≥ 0; costo ref. solo lectura; motivo obligatorio (ver PENDIENTE DBA).
- [ ] **Edición:** artículo bloqueado; muestra precio vigente anterior junto al nuevo; motivo obligatorio; rechaza precios negativos y usuarios nulos.
- [ ] **Lectura:** ficha completa en solo lectura, incluyendo "último cambio registrado por X el día Y" tomado de `usuario_id`/`updated_at`.
- [ ] El ABM rechaza artículos inexistentes o inactivos.

### Validación de inputs (campo por campo ← tipo real del esquema)

Cada input se valida **al tipear** (sanitize) y **al enviar** (`errors`/`touched`, patrón `ClienteFormModal`). La validación front **no reemplaza** la de `fn_abm_lista_precio`: son la primera y la última línea.

| Campo del modal | Columna / regla en BD | Regla de input en el front |
|---|---|---|
| **Artículo/Servicio** | `lista_precio.articulo_id` FK NOT NULL · `fn_abm` rechaza inexistentes/inactivos · regla esquema l.308: "los combos deben filtrar artículos con `estado = 'activo'`" | **No admite texto libre**: `Combobox` con `sanitize`, solo selección de la lista. Alta → artículos `activo` **sin** fila en `lista_precio`; edición → `disabled` (campo bloqueado). Si tipea sin elegir, el blur auto-selecciona solo si hay **una** única coincidencia; si hay 0 o varias, error "Seleccioná un artículo de la lista" (regla del log de errores 2026-09-15) |
| **Precio de venta** | `numeric(12,2) NOT NULL` + `CHECK precio >= 0` | `inputMode="decimal"`; sanitize `^\d{0,10}(\.\d{0,2})?$`: **solo dígitos, máximo 2 decimales, sin signo negativo, sin comas milesimas** (normalizar `,` → `.`), no vacío. Rechaza letras (el bug del input "nombre" que aceptaba números). Excede 10 enteros → cortar. Mensaje: "Ingresá un importe válido, ej: 24900 o 24900.50" |
| **Costo de referencia OC** | no es columna de `lista_precio` | **`readOnly` + `disabled`**, sin `inputMode`: no se tipea nunca (HU-COMP-02/03). Si no hay fuente cargada, mostrar "—" |
| **Motivo / justificación** | PENDIENTE DBA (no existe columna) | `Textarea` (ya limita a 192px). Obligatorio, sin formato, longitud **máx. 255** (tomar `varchar(255)` como el resto de motivos del esquema, ej. `movimiento_caja.motivo`) hasta que el DBA defina la columna |
| **usuario responsable** | `lista_precio.usuario_id` FK NOT NULL · `fn_abm` rechaza usuario nulo | **Nunca es input**: se toma de la sesión logueada y se envía oculto |
| **Campos bloqueados en edición** (artículo, categoría, U. medida, fabricante, vencimiento) | vienen de `articulo` (catálogo Sprint 1-3) | `disabled` + ícono 🔒, `name` ausente del payload; no participan del submit |
| **Búsqueda de la tabla** | `articulo.codigo varchar(30)` · `articulo.nombre varchar(150)` | Texto libre con `trim`, **sin** sanitize de caracteres (el código admite números: `ALI-001`); límite 30/150 según campo buscado |
| **Filtros** | enums reutilizados: `estado_activo_inactivo` (`activo`/`inactivo`) | Solo valores del enum; default "Activos"; cualquier otro valor se descarta (no se inventan estados) |

- [ ] Ningún input admite caracteres fuera de su tipo: letras en precio → bloqueadas al tipear; números en campos de texto libre → permitidos solo donde el tipo los admite.
- [ ] Todo campo obligatorio marcado con `*` y validado **antes** de habilitar "Guardar" (no recién al recibir el error del servidor).
- [ ] El error del servidor (`fn_abm_lista_precio` / HF047) se muestra como toast, nunca como stack ni como éxito.

### Notificaciones
- [ ] Toast de éxito ("Precio guardado correctamente" / "Precio actualizado correctamente") y de error ("Error al guardar: …"), con cierre automático o manual.

### Auditoría
- [ ] La trazabilidad de cada modificación la aporta **`historial_precios`** (trigger `trg_historial_precios`): artículo, precio anterior y nuevo, usuario responsable y fecha/hora.
- [ ] **No existe** trigger `fn_auditoria` sobre `lista_precio` en el esquema: si el equipo exige además la bitácora genérica `auditoria`, es un PENDIENTE DBA (crear el trigger), no un requisito implementable hoy.
