
# HU-STK-01: Como personal de depósito, quiero dar de alta, editar y consultar artículos con su clasificación y datos de proveedor mediante un formulario paramétrico único, para tener el catálogo de productos disponible para la venta y el uso interno

## Contexto

- **Ruta propuesta:** `/articulos`
- **Relacionada con:** HU-STK-03 (Lista de Precios), HU-COMP-XX (Órdenes de Compra), HU-PROV-XX (Proveedores), HU-STK-02 (Movimientos de Stock)
- **Prioridad:** alta
- **Menú lateral:** El sistema contará con un menú colapsable en el lado izquierdo, que permite navegar entre los distintos módulos (Dashboard, Artículos, Lista de Precios, Órdenes de Compra, Proveedores, Movimientos, etc.). Este menú se mantiene visible en todas las pantallas del sistema.

## Wireframe (idea)

```
┌──────┬──────────────────────────────────────────────────────────────────────────────────┐
│ ☰    │  🏠 Artículos                                                          [Perfil] │  ← header con navegación
│ Menú │──────────────────────────────────────────────────────────────────────────────────│
│      │  🔍 [Buscar por código o nombre...]          [Filtros ▼]  [📥 Exportar] [➕ Nuevo]│
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────┐    │
│      │  │  Categoría: Medicamentos ✕  |  Estado: Activos ✕  |  Proveedor: XYZ ✕ │    │
│      │  └──────────────────────────────────────────────────────────────────────────┘    │
│      │                                                                                  │
│      │  ┌──────────────────────────────────────────────────────────────────────────────┐│
│      │  │ # │ Imagen │ Código │ Nombre           │ Categoría   │ U.Medida │ Estado │ Acciones ││
│      │  ├──────────────────────────────────────────────────────────────────────────────┤│
│      │  │ 1 │ 🖼️    │ ART001 │ Amoxicilina 500mg│ Medicamentos│ Unidad   │ 🟢 Activo │ ✏️ 🗑️ ││
│      │  │ 2 │ 🖼️    │ ART002 │ Jeringa 5ml      │ Insumos     │ Unidad   │ 🔴 Inactivo│ ✏️ 🗑️ ││
│      │  │ 3 │ 🖼️    │ ART003 │ Alimento Premium │ Alimentos   │ Kg       │ 🟡 Próximo│ ✏️ 🗑️ ││
│      │  └──────────────────────────────────────────────────────────────────────────────┘│
│      │                                                                                  │
│      │  Mostrando 1-3 de 45 artículos                                      [< 1 2 3 ... >]│
└──────┴──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Confirmar eliminación]                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ ¿Está seguro que desea eliminar el artículo "Amoxicilina 500mg"?           │   │
│  │                                                                                  │   │
│  │  Esta acción es irreversible. El artículo quedará inactivo y no podrá usarse    │   │
│  │  en nuevos movimientos. Los registros históricos se conservarán.                │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Confirmar eliminación]           │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [MODAL: Formulario - Alta/Edición]                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │  ✏️ [Editar / Nuevo] Artículo                                                 │   │
│  │                                                                                  │   │
│  │  Código único *   [ ART001          ]  (solo lectura en edición)                 │   │
│  │  Nombre *         [ Amoxicilina 500mg ]  (Ej: "Amoxicilina 500mg")              │   │
│  │  Descripción      [ Antibiótico de amplio espectro ]  (Ej: "Para infecciones")  │   │
│  │  Unidad medida *  [ ▼ Unidad  ]     (Ej: Unidad, Kg, L, etc.)                   │   │
│  │  Categoría *      [ ▼ Medicamentos ]  (Ej: Medicamentos, Insumos, Alimentos)    │   │
│  │  Proveedor pref.  [ ▼ [Seleccionar] ]  (opcional)                               │   │
│  │                                                                                  │   │
│  │                                    [Cancelar]  [Guardar]                         │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

Nota: El menú lateral (columna izquierda) es colapsable mediante el ícono ☰. Al colapsarse, solo se muestra el ícono, liberando espacio para el contenido principal. Las opciones del menú incluyen:
- Dashboard
- Artículos (activo)
- Lista de Precios
- Órdenes de Compra
- Proveedores
- Movimientos de Stock
- Configuración
- Auditoría
```

## User flow

1. **Origen:** El usuario ingresa desde el menú principal (módulo de Stock/Artículos) o desde el menú lateral.
2. **Acción principal:** Quiere visualizar el catálogo de artículos. Puede buscar, filtrar, agregar, editar o eliminar (baja lógica) artículos.
3. **Destino:** Después de realizar una acción (alta, edición o baja), el sistema confirma la operación y actualiza la vista, mostrando una notificación del resultado. El usuario permanece en la lista de artículos, pudiendo navegar a otras pantallas mediante el menú lateral.

## Datos hardcodeados

```ts
const articulos = [
  {
    id: 1,
    codigo: "ART001",
    nombre: "Amoxicilina 500mg",
    descripcion: "Antibiótico de amplio espectro para infecciones bacterianas",
    unidadMedida: "Unidad",
    categoria: "Medicamentos",
    proveedorPreferido: { id: 5, nombre: "Laboratorios Pharma S.A." },
    estado: "Activo", // Activo, Inactivo, Próximo a vencer
    imagen: "https://via.placeholder.com/40",
    createdAt: "2025-01-15T10:30:00Z",
    updatedAt: "2025-06-20T14:15:00Z",
    activo: true
  },
  {
    id: 2,
    codigo: "ART002",
    nombre: "Jeringa 5ml",
    descripcion: "Jeringa descartable con aguja 21G",
    unidadMedida: "Unidad",
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Inactivo",
    imagen: "https://via.placeholder.com/40",
    createdAt: "2025-02-10T09:00:00Z",
    updatedAt: "2025-07-01T16:20:00Z",
    activo: false
  },
  {
    id: 3,
    codigo: "ART003",
    nombre: "Alimento Premium para Perros",
    descripcion: "Alimento balanceado de alta calidad, bolsa 15kg",
    unidadMedida: "Kg",
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "Activo",
    imagen: "https://via.placeholder.com/40",
    createdAt: "2025-03-05T11:45:00Z",
    updatedAt: "2025-08-12T08:30:00Z",
    activo: true
  }
];
```

## Estados

- [x] Vacío: Mostrar mensaje "No hay artículos cargados" y botón para crear el primero.
- [x] Cargando: Mostrar skeleton/spinner en tabla y deshabilitar acciones.
- [x] Error: Mostrar mensaje de error con opción para reintentar.
- [x] Con datos: Mostrar tabla con los artículos, paginación y controles de filtro/búsqueda.

## Criterios de aceptación

### General
- [ ] La pantalla opera en tres modos controlados por parámetro: **INSERCIÓN**, **EDICIÓN** y **LECTURA**.
- [ ] El formulario de alta/edición es único y se adapta según el modo.
- [ ] Todos los campos requeridos están marcados con un asterisco (*).
- [ ] Se registra en bitácora de auditoría cada alta, modificación y baja, con: usuario responsable, fecha, hora y valores anterior y nuevo.
- [ ] El menú lateral es colapsable y recuerda su estado (abierto/cerrado) durante la sesión.

### Campos del formulario
- [ ] **Código único:** Obligatorio, generado automáticamente en alta o editable en creación (no en edición).
- [ ] **Nombre:** Obligatorio. Validación: no debe existir otro artículo activo con el mismo nombre.
- [ ] **Descripción:** Texto libre, no obligatorio.
- [ ] **Unidad de medida:** Obligatorio, selección desde catálogo predefinido.
- [ ] **Categoría:** Obligatorio, selección desde catálogo predefinido.
- [ ] **Proveedor preferido:** Opcional, selección desde catálogo de proveedores.
- [ ] **IMPORTANTE:** El artículo NO incluye campo de precio. El precio de venta se gestiona en HU-STK-03 y el costo de compra se fija al confirmar recepción de orden de compra.

### Búsqueda y filtros
- [ ] Barra de búsqueda permite buscar por **código** o **nombre**.
- [ ] Botón de filtros despliega un panel de opciones para filtrar por **categoría** y **estado**.
- [ ] Los filtros seleccionados se muestran como etiquetas (tags) sobre la tabla, cada una con una "✕" para eliminarla.
- [ ] Por defecto, la lista muestra **solo artículos activos**. El filtro de estado permite ver inactivos o todos.

### Tabla de artículos
- [ ] Columnas visibles: Imagen (miniatura), Código, Nombre, Categoría, Unidad de Medida, Estado (con color indicador), Acciones.
- [ ] El estado se muestra con una etiqueta de color: 🟢 Activo, 🔴 Inactivo, 🟡 Próximo a vencer u otros.
- [ ] Botón de **Exportar** descarga la lista filtrada en formato CSV o Excel.
- [ ] Paginación: muestra resultados de a 10, 25 o 50 registros.

### Acciones y confirmaciones
- [ ] **Alta:** Botón "➕ Nuevo" abre el formulario en modo INSERCIÓN con campos vacíos. Al guardar, se valida la unicidad del nombre.
- [ ] **Edición:** Botón "✏️" abre el formulario en modo EDICIÓN con los datos actuales precargados. Al guardar, se valida la unicidad del nombre (excluyendo el propio artículo).
- [ ] **Baja lógica:** Botón "🗑️" abre un **modal de confirmación** preguntando "¿Está seguro que desea eliminar el artículo X?". Al confirmar:
  - El artículo pasa a estado **inactivo** (`activo: false`).
  - No puede seleccionarse en nuevos movimientos, listas de precios ni órdenes de compra.
  - Los registros históricos se conservan.
- [ ] **Desactivación/Reactivación:** Un artículo inactivo debe poder reactivarse desde la edición.

### Notificaciones
- [ ] Cada acción (alta, edición, baja) muestra una notificación toast:
  - **Éxito:** "Artículo guardado correctamente" o "Artículo eliminado correctamente".
  - **Error:** "Error al guardar: [descripción]" o "Error al eliminar: [descripción]".
- [ ] La notificación persiste unos segundos y se cierra automáticamente (o con "✕").
