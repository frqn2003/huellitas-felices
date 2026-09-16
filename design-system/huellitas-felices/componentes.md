# Inventario de componentes — Huellitas Felices

Índice de los componentes que existen en `src/components/`. Lo consulta el comando `/disenar` antes de codear para **reusar antes de crear**.

> **Mantenimiento:** todo componente nuevo creado con `/disenar` (o a mano) debe agregarse acá. Si un componente cambia de propósito o props clave, actualizar su fila. Este archivo es índice: la fuente de verdad es el código.

## Compartidos (`src/components/ui/`)

Usar SIEMPRE estos antes de crear un equivalente propio del módulo.

| Componente | Para qué | Props clave / notas |
|---|---|---|
| `Button` | Botón pill del sistema | `variant`: primary (amarillo, solo CTAs) / secondary (verde) / outline / ghost / destructive · `size`: sm/md/lg/icon |
| `Input` | Input de texto estándar | extiende `InputHTMLAttributes`, estilos de foco/token ya resueltos |
| `Textarea` | Área de texto que crece hacia abajo con el contenido (hasta 192px, luego scroll) | extiende `TextareaHTMLAttributes` + `label`/`error`/`hint`. Creado para HU-CLI-01 (campo Dirección) |
| `Select` | Select nativo estándar | extiende `SelectHTMLAttributes` |
| `Combobox` | Select con búsqueda (catálogos largos) | `options: {value,label,tone?}[]`, integra `label`/`error`/`hint` |
| `Modal` | Modal base con overlay + cierre | `open`, `onClose`, `title`, `icon?`, `footer?`, `maxWidth?`; anima con Framer Motion y respeta `prefers-reduced-motion` |
| `StatusBadge` | Chip de estado (pill + indicador + texto) | `variant`: success/warning/danger/info/neutral + `label`, `icon?`. Único punto de verdad de colores de estado (tokens `status-*`) |
| `Pagination` | Paginación de tablas | `page`, `totalPages`, `totalItems`, `pageStart/End`, `pageSize`, `onPageChange`, `onPageSizeChange` (tamaños 10/25/50) |
| `OrdenamientoSelect` | Orden por fecha | `value`: "recientes"/"antiguas", `onChange` |
| `RangoNumerico` | Filtro numérico min–max | `label`, `valor: {min,max}`, `onChange` |
| `Switch` | Toggle de estado Activo/Inactivo | `role="switch"` + `aria-checked`, `checked`, `onChange`, `ariaLabel`; touch target ≥ 44px. Creado para HU-CLI-01 (no existía switch en ui/) | 
| `Toast` | Notificaciones de éxito/error | `ToastProvider` + `useToast()` → `showToast("success"\|"error", msg)` |

## Por módulo (`src/components/<módulo>/`)

Patrones recurrentes por pantalla: `<Entidad>Table`, `<Entidad>Filtros*`, `<Entidad>FormModal`, `Estado*Badge`, `Cancelar*Modal`, `<Entidad>Tabs`.

### articulos
`ArticuloFormModal` · `ArticulosTable` · `ArticuloThumb` · `DesactivarModal` · `EstadoBadge` · `FiltrosArticulos`

### auth
`LoginForm` · `TwoFactorModal` · `BlockedOverlay`

### clientes
Módulo HU-CLI-01 (ABM de clientes, `/clientes`): `ClientesTable` (extendido HU-MAS-01 con prop opcional `onVerMascotas?: (cliente) => void` — la patita navega a `/clientes?tab=mascotas&dueno=id`) · `ClienteFormModal` (paramétrico 3 modos crear/editar/ver sobre `Modal` + toggle `Switch` de baja lógica + advertencia de duplicados inactivos + validación front por campo con `errors`/`touched`) · `EstadoClienteBadge` (mapea `StatusBadge`: success/neutral) · `FiltrosClientes` (búsqueda nombre/documento/teléfono + filtro estado, default Activos) · `BajaClienteModal` (confirmación de baja lógica)
> El listado muestra por defecto solo activos (criterio HU-CLI-01); el inactivo solo ofrece Ver en Acciones (la baja se hace desde el formulario con el toggle).
> La página `/clientes` es la del módulo **Recepción**: header "Recepción" + `recepcion/RecepcionTabs`. El tab y el dueno se **derivan de la URL** (`?tab=`/`?dueno=`): cambiar de tab o quitar el chip "Dueño" navega con `router.replace` (patrón ?tab= de Compras, sin setState-en-effect). `useSearchParams` vive bajo `<Suspense>` en el export default (bailout del prerender de Next).

### mascotas
Módulo HU-MAS-01 (ABM de mascotas, tab "Mascotas" dentro de `/clientes`): `MascotasTable` (columnas: Id, Nombre, Especie, Raza, Sexo badge, Edad, DNI dueño, Estado badge, Acciones 👁️ Ver / 👤 Ver dueño — navega a la tab Clientes con `?busqueda=<nombre completo>` pre-cargada; el icono del dueño ya NO abre un modal) · `MascotaFormModal` (espejo de `ClienteFormModal`: 3 modos crear/editar/ver, `Combobox` de dueño con label `documento · nombre apellido` filtrando solo clientes activos, `datalist` de razas, `Switch` de baja lógica con confirmación vía `ui/ConfirmarDialog`, peso con hint "kg · opcional") · `EstadoMascotaBadge` (wrapper que delega en `EstadoClienteBadge` — mismo enum de estados, sin duplicar StatusBadge) · `SexoBadge` (mapea sobre `StatusBadge`: Macho=info azul, Hembra=danger rojo) · `FiltrosMascotas` (búsqueda por mascota/raza/DNI dueño + filtro especie/sexo + filtro estado + chip removible "Dueño: …")
> Datos hardcodeados con tipos propios en `src/data/mascotas.ts` (`Mascota`/`MascotaDraft`, claves camelCase `clienteId`/`fechaNacimiento`/`senasParticulares` por ser placeholder front; el BACKEND las pasa a snake_case del esquema: cliente_id, fecha_nacimiento, senas_particulares).

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
`CtaCteListaGlobal` (listado unificado con badge de tipo de entidad Proveedor/Cliente + saldo con signo y etiqueta) · `CtaCorrienteDetalleGlobal` (detalle por entidad con tabs pill Comprobantes/Pagos + acciones Exportar PDF y Registrar) · `RegistrarPagoCtaCteModal` (modal de registro de pago/cobranza con imputación múltiple sobre `Modal` + validaciones)
> Datos y tipos generalizados (retrocompatibles) en `src/data/cuentas-corrientes.ts`: `CuentaCorriente`, `Pago`, `EntidadCtaCte`, `TipoPago`, `CUENTAS_CORRIENTES_GLOBAL`, `COMPROBANTES_GLOBAL`, `PAGOS_GLOBAL`. No se tocan los tipos de proveedores existentes.
> Ruta nueva `/cuentas-corrientes` con ítem "Cuentas Corrientes" (`Landmark`) en la sección Operaciones de `Sidebar`.

### layout
`Sidebar` (nav principal) — sección **Recepción** con UN solo ítem "Recepción" (`/clientes`, icono `Users`): las sub-pantallas del módulo viven como pestañas dentro de la página (patrón Compras; ver `recepcion/RecepcionTabs`).

### recepcion
`RecepcionTabs` — tabs del módulo Recepción (Clientes `/clientes` + Mascotas/Turnos como HUs futuras), espejo de `compras/ComprasTabs` (role=tablist, navegación con ←/→).

### movimientos
`AlertaReposicionModal` · `FiltrosMovimientos` · `MovimientoFormModal` · `MovimientosTable` · `TipoMovimientoBadge`

### ordenes-compra
`CancelarOrdenModal` · `EstadoOrdenBadge` · `FiltrosOrdenes` · `OrdenFormModal` · `OrdenesTable`

### proveedores
`BajaProveedorModal` · `EstadoCtaCteBadge` (mapea sobre `StatusBadge`: Vencido=danger, Próximo a vencer/Pendiente=warning, Crédito=success, Saldado=neutral) · `EstadoProveedorBadge` (mapea sobre `StatusBadge`: success/neutral) · `FiltrosProveedores` · `ProveedorFormModal` · `ProveedoresTable` · `ProveedoresTabs`

### recepciones
`RecepcionesTable` · `FiltrosRecepciones` · `FiltrosChipsRecepciones` · `RecepcionFormModal` · `RecepcionDetalleModal` · `EstadoRecepcionBadge`

### stock
`DepositoFormModal` · `DepositosList` · `EstadoStockBadge` · `FichaFormModal` · `FichasTable` · `FiltrosStock` · `StockTabs`

### turnos
Módulo HU-TUR-01 (registro de turnos presenciales, tab "Turnos" dentro de `/clientes` — ver `recepcion/RecepcionTabs`): `TurnosContent` (estado + filtros + paginación + JOINs de display; la apertura del wizard está **controlada por la página** vía props `nuevoTurnoOpen` + `nuevoTurnoSession` — remount-key por apertura, sin ref ni effect) · `TurnosTable` (exporta `TurnoRow`: id, fecha, horaInicio/Fin, clienteNombre, dni, mascotaNombre, especie, profesionalNombre, especialidad, practicaNombre, estadoId, notas, fechaCreacionHora; 11 columnas, `min-w-[1180px]`) · `FiltrosTurnos` (+ `FiltrosTurnosChips`/`buildTagsTurnos`/`FiltrosTurnosValues`/`FILTROS_TURNOS_VACIOS`: búsqueda por cliente/profesional/**especialidad**/**práctica**, filtro estado, rango fecha `type="date"` con min/max cruzados) · `NuevoTurnoModal` (wizard 4 pasos con `StepperTurnos`: Cliente → Mascota → Profesional y horario → Resumen; Combobox de clientes activos, Select de profesional, Select de práctica **filtrada por profesional** (`practicasPermitidas`: médico → Consulta/Control, cirujana → Cirugía), fecha como **lista vertical de días** (con las franjas del día como subtítulo), chips de franja y de horario de inicio cada 15 min con "Ocupado" deshabilitados, listo con ConfirmarDialog + toast) · `TurnoDetalleModal` (lectura con dato de auditoría "Creado por") · `EstadoTurnoBadge` (mapea `StatusBadge`: 1 pendiente=warning/Clock, 2 confirmado=success/CheckCircle2, 3 cancelado=danger/CalendarX2, 4 atendido=info/Stethoscope, 5 no_asistio=neutral/UserX — regla 4 de reuso)
> Datos y catálogos placeholder en `src/data/turnos.ts` (camelCase: `estadoId`, `practicaId`, `franjaId`; además de tipos `Turno`/`TurnoDraft`, `estadosTurno` 1-5, `practicas` consulta/cirugía/control, `profesionales` con franjas semanales y `practicasPermitidas` (qué prácticas puede hacer cada uno), y helpers de agenda `generarSlots`/`haySuperposicion`/`horasOcupadas`/`proximosDiasLaborables`). El front trae `id` numérico (PK del backend); cada integración lleva comentario `// BACKEND:` con tabla+endpoint (`grep -rn "BACKEND" src/`).
> El anti-solapamiento **excluye los cancelados** (estado 3): un horario queda ocupado solo por turnos pendientes/confirmados/concretados (espejo del EXCLUDE del gist de agenda). El turno se crea en estado pendiente; la confirmación es HU futura.

## Reglas de reuso

1. **Reusar antes de crear:** si existe algo equivalente en `ui/`, se usa. Los equivalentes de módulo (ej: `EstadoBadge` de articulos) se evalúan caso por caso; si sirven, se generalizan hacia `ui/` en lugar de duplicarse.
2. **Extender, no duplicar:** si un componente existente casi cumple, se le agregan props/variantes manteniendo retrocompatibilidad con quienes ya lo usan.
3. **Nuevo solo si no hay equivalente**, justificándolo en el plan (qué falta y por qué no conviene extender).
4. **Los badges de estado van sobre `StatusBadge`:** los `Estado*Badge` de módulo solo mapean su estado de negocio a una variante + label + icono; nunca definen sus propios colores.
5. **Verificar contra el código:** este inventario puede quedarse atrás; ante duda, confirmar con una búsqueda real en `src/components/**`.