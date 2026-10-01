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
| `Combobox` | Select con búsqueda (catálogos largos) | `options: {value,label,tone?}[]`, `sanitize?` (filtro de caracteres al tipear), integra `label`/`error`/`hint` |
| `Modal` | Modal base con overlay + cierre | `open`, `onClose`, `title`, `icon?`, `footer?`, `maxWidth?`; anima con Framer Motion y respeta `prefers-reduced-motion` |
| `StatusBadge` | Chip de estado (pill + indicador + texto) | `variant`: success/warning/danger/info/neutral/pink + `label`, `icon?`. Único punto de verdad de colores de estado (tokens `status-*`) |
| `Pagination` | Paginación de tablas | `page`, `totalPages`, `totalItems`, `pageStart/End`, `pageSize`, `onPageChange`, `onPageSizeChange` (tamaños 10/25/50) |
| `OrdenamientoSelect` | Orden por fecha | `value`: "recientes"/"antiguas", `onChange` |
| `RangoNumerico` | Filtro numérico min–max | `label`, `valor: {min,max}`, `onChange` |
| `Switch` | Toggle de estado Activo/Inactivo | `role="switch"` + `aria-checked`, `checked`, `onChange`, `ariaLabel`; touch target ≥ 44px. Creado para HU-CLI-01 (no existía switch en ui/) | 
| `Toast` | Notificaciones de éxito/error | `ToastProvider` + `useToast()` → `showToast("success"\|"error", msg)` |
| `ConfirmarDialog` | Diálogo de confirmación sobre `Modal maxWidth="max-w-md"` | `open`, `title`, `description: ReactNode` (renderizado en un `div`, no en `p`, para admitir JSX de bloque sin HTML inválido), `confirmLabel`, `cancelLabel="Volver"`, `loading?`, `onClose`, `onConfirm`; `tone?: "danger" (default) \| "success" \| "neutral"` (mapea a Button variant destructive/primary/secondary + icono). Extendido en HU-TUR-02 para acciones no destructivas, en HU-VTA-03 con `description: ReactNode` + `loading` |

## Por módulo (`src/components/<módulo>/`)

Patrones recurrentes por pantalla: `<Entidad>Table`, `<Entidad>Filtros*`, `<Entidad>FormModal`, `Estado*Badge`, `Cancelar*Modal`, `<Entidad>Tabs`.

### articulos
`ArticuloFormModal` · `ArticulosTable` · `ArticuloThumb` · `DesactivarModal` · `EstadoBadge` · `FiltrosArticulos`
> Extendidos en HU-STK-03 (retrocompatibles): `EstadoBadge` acepta props opcionales `articulo?` / `estado?: EstadoArticulo` (ahora también recibe el estado crudo, no solo el objeto); `FiltrosArticulos` acepta `grupos?: GrupoFiltro[]` (`"categoria" | "estado" | "unidadMedida" | "proveedor"`, default = los 4) para mostrar solo el panel que pida la pantalla — `/lista-precios` usa `["categoria","estado"]`.

### auth
`LoginForm` · `TwoFactorModal` · `BlockedOverlay`

### clientes
Módulo HU-CLI-01 (ABM de clientes, `/clientes`): `ClientesTable` (extendido HU-MAS-01 con prop opcional `onVerMascotas?: (cliente) => void` — la patita navega a `/clientes?tab=mascotas&dueno=id`) · `ClienteFormModal` (paramétrico 3 modos crear/editar/ver sobre `Modal` + toggle `Switch` de baja lógica + advertencia de duplicados inactivos + validación front por campo con `errors`/`touched`; **en alta (crear)** los obligatorios se desbloquean en secuencia nombre → apellido → documento → teléfono → email vía `@/hooks/useCamposSecuenciales`, con `disabled` + hint "Completá primero: X"; opcionales siempre habilitados) · `EstadoClienteBadge` (mapea `StatusBadge`: success/neutral) · `FiltrosClientes` (búsqueda nombre/documento/teléfono + filtro estado, default Activos) · `BajaClienteModal` (confirmación de baja lógica)
> El listado muestra por defecto solo activos (criterio HU-CLI-01); el inactivo solo ofrece Ver en Acciones (la baja se hace desde el formulario con el toggle).
> La página `/clientes` es la del módulo **Recepción**: header "Recepción" + `recepcion/RecepcionTabs`. El tab y el dueno se **derivan de la URL** (`?tab=`/`?dueno=`): cambiar de tab o quitar el chip "Dueño" navega con `router.replace` (patrón ?tab= de Compras, sin setState-en-effect). `useSearchParams` vive bajo `<Suspense>` en el export default (bailout del prerender de Next).

### clinica
Módulo HU-CLIN-01 (Atención clínica y turnos del día, `/consulta`): `FiltrosConsulta` (panel con buscador, filtro por estado, profesional, práctica y ordenación por prioridad/hora/paciente/cliente + `FiltrosConsultaChips`) · `InsumoRow` (fila para selección/carga de insumos médicos aplicados) · `NotaConsultaModal` (modal para anexar nota aclaratoria posterior a consultas cerradas)

### mascotas
Módulo HU-MAS-01 (ABM de mascotas, tab "Mascotas" dentro de `/clientes`): `MascotasTable` (columnas: Id, Nombre, Especie, Raza, Sexo badge, Edad, DNI dueño, Estado badge, Acciones 👁️ Ver / 👤 Ver dueño — navega a la tab Clientes con `?busqueda=<nombre completo>` pre-cargada; el icono del dueño ya NO abre un modal) · `MascotaFormModal` (espejo de `ClienteFormModal`: 3 modos crear/editar/ver, `Combobox` de dueño con label `documento · nombre apellido` filtrando solo clientes activos, `datalist` de razas, `Switch` de baja lógica con confirmación vía `ui/ConfirmarDialog`, peso con hint "kg · opcional"; **en alta (crear)** los obligatorios se desbloquean en secuencia dueño → nombre → especie → sexo vía `@/hooks/useCamposSecuenciales`, con `disabled` + hint "Completá primero: X"; opcionales siempre habilitados) · `EstadoMascotaBadge` (wrapper que delega en `EstadoClienteBadge` — mismo enum de estados, sin duplicar StatusBadge) · `SexoBadge` (mapea sobre `StatusBadge`: Macho=info azul, Hembra=pink rosa) · `FiltrosMascotas` (búsqueda por mascota/raza/DNI dueño + filtro especie/sexo + filtro estado + chip removible "Dueño: …")
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
`RecepcionTabs` — tabs del módulo Recepción (Clientes `/clientes` + Mascotas/Turnos/Agenda/Cajas en tabs), espejo de `compras/ComprasTabs` (role=tablist, navegación con ←/→). HU-TUR-02 agregó el tab `"agenda"` (icono `CalendarRange`); HU-VTA-03 agregó el tab `"cajas"` (icono `Wallet`, última posición); la unión de tabs `TabRecepcion` y el mapa `tabRefs` por id en vez de índice.
`CajasContent` — panel de la tab Cajas: estado + filtros + paginación + JOIN de display (exporta el patrón de `TurnosContent`; la apertura del modal está **controlada por la página** vía prop `abrirCajaOpen`, que mueve el CTA "Abrir caja" del header).

### movimientos
`AlertaReposicionModal` · `FiltrosMovimientos` · `MovimientoFormModal` · `MovimientosTable` · `TipoMovimientoBadge`

### ordenes-compra
`CancelarOrdenModal` · `EstadoOrdenBadge` · `FiltrosOrdenes` · `OrdenFormModal` · `OrdenesTable`

### precios
Módulo HU-STK-03 (Gestión de Lista de Precios, `/lista-precios`): `PreciosTable` (columnas Código/Nombre/Categoría/Costo ref. OC/Precio vigente/Estado/Acciones — sin columna "Imagen" por ahora, `min-w-[920px]`, skeleton grid-7, estados vacío/sin resultados, acciones condicionales 👁 Ver · ✏ Editar o ➕ Cargar precio según `fila.precio === null` · 🕒 Historial, todas con `aria-label`+`title` y target 44px; precio en bold `tabular-nums` o `StatusBadge warning "Sin precio"`) · `PrecioFormModal` (paramétrico 3 modos sobre `Modal`, patrón ArticuloFormModal con `key={modo-articuloId}`: INSERCION con `Combobox` solo de artículos activos sin precio + precio `inputMode="decimal"` sanitizado `^\d{0,10}(\.\d{0,2})?$`, **sin campo motivo** porque `lista_precio` no tiene esa columna; EDICIÓN con artículo bloqueado 🔒 y `ConfirmarDialog tone="neutral"` antes/después; LECTURA con ficha + "Edita y guarda desde el botón…") · `HistorialPreciosContent` (header con código+nombre y tabla Vigencia desde/Precio/Vigencia hasta/Usuario/Estado; estados loading/error/vacío/no encontrado)
> Datos y store de sesión en `src/data/lista-precios.ts`: tipos `FilaListaPrecio` (`precioId` null = sin precio) / `HistorialPrecio`, flags `SIMULAR_VACIO`/`SIMULAR_ERROR`, helpers `listarListaPrecios()` / `historialDe(articuloId)` / `guardarPrecio()` (simulan `fn_abm_lista_precio` + trigger de historial), y `LISTA_PRECIOS_ARTICULOS` ahora **derivada** de las filas (una sola fuente por precio, HU-VTA-01 intacta).
> Rutas: `/lista-precios` (ítem "Lista de Precios", `BadgeDollarSign`, en Operaciones del `Sidebar`) y `/lista-precios/historial?articuloId=` (página propia envuelta en `<Suspense>` por `useSearchParams`). Override visual en `design-system/huellitas-felices/pages/lista-precios.md`.

### proveedores
`BajaProveedorModal` · `EstadoCtaCteBadge` (mapea sobre `StatusBadge`: Vencido=danger, Próximo a vencer/Pendiente=warning, Crédito=success, Saldado=neutral) · `EstadoProveedorBadge` (mapea sobre `StatusBadge`: success/neutral) · `FiltrosProveedores` · `ProveedorFormModal` · `ProveedoresTable` · `ProveedoresTabs`

### recepciones
`RecepcionesTable` · `FiltrosRecepciones` · `FiltrosChipsRecepciones` · `RecepcionFormModal` · `RecepcionDetalleModal` · `EstadoRecepcionBadge`

### cajas
Módulo HU-VTA-03 (Gestión de Cajas): **vive como tab "Cajas" de Recepción** (`/clientes?tab=cajas`), no como página propia.
`CajasContent` (panel del tab: estado + filtros + paginación + JOIN de display; alta controlada por la página) ·
`CajasTable` (listado de aperturas: Id·Fecha·Hora·Sucursal·Cajero·Monto inicial·Saldo actual·Estado·Acciones; exporta el tipo `CajaRow = CajaApertura & { saldoActual }` —el saldo es `caja.saldo_actual`, **no** un campo de la apertura—; markup canónico de `TurnosTable`: wrapper `rounded-md border border-border bg-surface shadow-card`, `min-w-[1180px]`, thead `bg-cream-50`, skeleton grid-9 y estados vacío/sin resultados; acción única **`ArrowRight` "Entrar a la caja"** —el ojo `Eye` es de detalle, no de navegación—; `renderActions?` para extender) ·
`MovimientosCajaTable` (movimientos: Id·Fecha·Hora·Tipo·Motivo/Monto·Origen con `TipoMovimientoOrigenBadge`; mismo markup canónico, skeleton grid-7 y estados vacío/sin resultados) ·
`FiltrosCajas` + `FiltrosCajasChips` (botón "Filtros" con popover —mismo patrón que `FiltrosStock`/`FiltrosArticulos`: `SlidersHorizontal`, badge con contador, cierre por click fuera, `Limpiar filtros`—; dentro: sucursal/estado/cajero/rango fechas y **`ui/OrdenamientoSelect` reutilizado** para el orden; aplica al instante, sin botón "Aplicar". El buscador por cajero vive en el panel, no en el popover. `FILTROS_CAJAS_VACIOS` exportado. `hideChips` para renderizar los chips aparte) ·
`AbrirCajaModal` (3 campos: sucursal, cajero, monto; fecha/hora automática; validación `monto >= 0` —admite 0, alineado al CHECK del esquema y al brief—; abre desde el CTA del header) ·
`MovimientoCajaFormModal` (tipo ingreso/egreso + monto + motivo; cajero solo lectura vía `cajeroNombre`) ·
`CerrarCajaModal` (recibe `montoInicial`/`ingresos`/`egresos`/`responsable` y calcula el esperado; resumen de 4 renglones + responsable + conteo + diferencia en vivo; nota de que **solo cuenta efectivo**; `ConfirmarDialog tone="success"` si diferencia ≠ 0) ·
`ResumenCaja` (4 tarjetas —inicial, ingresos, egresos, **efectivo esperado**— con acento `border-l-4` sobre tokens; bloque **"Cobrado fuera de caja"** entre las tarjetas y la diferencia: suma vía `cobradoFueraDeCaja()` sobre la ventana de la apertura, acento `border-status-info` / `text-status-info-strong` —ni bueno ni malo—, con nota de que es transferencia y no toca el efectivo esperado; diferencia condicional solo si cerrada; nota final acotada al alcance en efectivo del resumen, sin repetir lo del bloque) ·

> ⚠️ **`Modal icon=`** recibe `ReactNode`: hay que pasar `icon={<Wallet className="h-5 w-5 text-brand-900" aria-hidden="true" />}`, **nunca** `icon="Wallet"` (imprime la palabra "Wallet" en pantalla). Los tres modales de cajas usan `Input`/`Select`/`Textarea` con sus props `label`/`requiredMark`/`error`/`hint` — no `<label>` suelto con clases `neutral-*` fuera de paleta.
`EstadoCajaBadge` (mapea boolean → `StatusBadge` con `Record`: true=success/Abierta/`CheckCircle2`, false=neutral/Cerrada/`Lock`) ·
`TipoMovimientoCajaBadge` (mapea con `Record`: Ingreso=success/+ Ingreso/`ArrowUpRight`, Egreso=danger/− Egreso/`ArrowDownLeft`) ·
`TipoMovimientoOrigenBadge` (mapea con `Record`: ventaId not-null=info/Venta #N/`ShoppingCart`, null=neutral/Manual/`User`)
> Datos y store de sesión en `src/data/cajas.ts`: tipos `Caja`, `CajaApertura`, `MovimientoCaja`, arrays `cajas`, `cajeros` (derivado de `usuarios` filtrando `rol_id === 6`), `aperturasIniciales`, `movimientosCajaIniciales`, helpers `esperadoPreview`, flags `SIMULAR_VACIO`/`SIMULAR_ERROR`.
> Medios de pago de venta en `src/data/venta-medios-pago.ts`: tipo `VentaMedioPago` (refleja `venta_medio_pago`), array `ventaMediosPago` y helper `cobradoFueraDeCaja(sucursalId, desde, hasta)` —suma lo cobrado por fuera del efectivo en la ventana de la apertura—, consumido por `ResumenCaja`. El catálogo `forma_pago` sigue siendo único en `src/data/formas-pago.ts` (fila "Efectivo" obligatoria: el trigger de caja la detecta por nombre).
> Rutas: `/clientes?tab=cajas` (tab del módulo) · `/cajas` **redirige** a ese tab (sin ítem en el `Sidebar`) · `/cajas/[aperturaId]` (detalle, página propia).
> Todas las integraciones preparadas con comentarios `// BACKEND:` con tabla+endpoint (`grep -rn "BACKEND" src/`).

### stock
`DepositoFormModal` · `DepositosList` · `EstadoStockBadge` · `FichaFormModal` · `FichasTable` · `FiltrosStock` · `StockTabs`

### clinica
Módulo HU-CLIN-01 (Registro de Consulta Médica, `/consulta/:turnoId`): `InsumoRow` (fila de insumo ya agregado con nombre, código, cantidad, unidad y botón quitar — solo presentación) · `NotaConsultaModal` (modal para agregar nota aclaratoria post-cierre; usa `Modal` + `Textarea` + profesional/fecha en solo lectura)
> La página `/consulta/[turnoId]` maneja el formulario completo de la consulta en sus dos modos (edición/lectura según `consulta.estado`). Usa `Combobox` inline de artículos activos para insumos, `ConfirmarDialog` (tone success) para finalizar y (tone neutral) para cancelar con datos, y `ui/Toast` para feedback. Los datos viven en `src/data/consultas.ts` (`Consulta`, `ConsultaInsumo`, `NotaConsulta`, `articulosActivos`).


### turnos
Módulo HU-TUR-01 (registro de turnos presenciales, tab "Turnos" dentro de `/clientes` — ver `recepcion/RecepcionTabs`): `TurnosContent` (estado + filtros + paginación + JOINs de display; la apertura del wizard está **controlada por la página** vía props `nuevoTurnoOpen` + `nuevoTurnoSession` — remount-key por apertura, sin ref ni effect) · `TurnosTable` (exporta `TurnoRow`: id, fecha, horaInicio/Fin, clienteNombre, dni, mascotaNombre, especie, profesionalNombre, practicaNombre, estadoId, notas, fechaCreacionHora; 10 columnas, `min-w-[1180px]`; soporta `renderActions?: (turno) => React.ReactNode` para clínica y acción `onPagar?: (turno) => void` con navegación directa a `/turnos/[turnoId]/pago`; si el turno ya fue pagado, el botón de dólar abre `ComprobanteTurnoModal`) · `ComprobanteTurnoModal` (modal con comprobante de pago emitido, detalle de arancel e insumos, medio de pago y botón para descargar PDF nativo A4) · `FiltrosTurnos` (+ `FiltrosTurnosChips`/`buildTagsTurnos`/`FiltrosTurnosValues`/`FILTROS_TURNOS_VACIOS`: búsqueda por cliente/profesional/**práctica**, filtro estado, rango fecha `type="date"` con min/max cruzados) · `NuevoTurnoModal` (wizard 3 pasos con `StepperTurnos` grande: Cliente y Mascota → Profesional y horario → Resumen; el paso 1 combina Combobox de clientes activos + lista de mascotas del cliente (cambiar cliente resetea la mascota; los Combobox de Cliente y Profesional bloquean caracteres al tipear: Cliente solo letras+números —DNI/nombre—, Profesional solo letras), Select de profesional, Select de práctica con **todas las prácticas disponibles** (catálogo universal `practicas` consulta/cirugía/control, sin filtro por profesional), fecha como **lista vertical de días** (con las franjas del día como subtítulo), chips de franja y de horario de inicio cada 15 min con "Ocupado" deshabilitados, listo con ConfirmarDialog + toast) · `TurnoDetalleModal` (lectura con dato de auditoría "Creado por" + sección **"Cambiar estado del turno"** (HU-TUR-02): `Select` con las transiciones del estado actual vía `transicionesEstado` o "Sin cambios permitidos" si es final, confirmación con `ConfirmarDialog` de tone según destino (3 cancelado → danger con nota "el horario queda disponible"; 4/5 → success/neutral) y prop nueva `onCambiarEstado?: (turnoId, estadoId) => boolean`; `key={turno.id}` desde AgendaSemanal para remount por turno) · `EstadoTurnoBadge` (mapea `StatusBadge`: 1 pendiente=warning/Clock, 2 confirmado=success/CheckCircle2, 3 cancelado=danger/CalendarX2, 4 atendido=info/Stethoscope, 5 no_asistio=neutral/UserX — regla 4 de reuso) · **`turnoRow.ts`** (estructura compartida de fila: `construirFilaTurno(t, clientePorId, mascotaPorId)` — usada por Tabla de Turnos y Agenda; HU-TUR-02) · **`AgendaSemanal`** (HU-TUR-02, grilla semanal `<table>`: 7 columnas-día con badge "Hoy" en accent, filas = bandas horarias de 1h derivadas de las franjas visibles; celdas "—" sin cobertura / "Libre" / tarjeta-turno con #id · hora–fin · práctica + cliente · mascota + profesional si filtro "todos" + `EstadoTurnoBadge`; navegación ◀ [Hoy] ▶ con `formatearSemana`, filtros con `FiltrosAgenda` (botón único a la derecha) y `FiltrosAgendaChips` a la izquierda; estados vacío/error con Reintentar) · **`FiltrosAgenda`** (HU-TUR-02, botón único ⚙️ Filtros alineado a la derecha con panel ⚙️ desplegable que concentra profesional/estado/práctica/desde/hasta y "Limpiar filtros"; exporta `FiltrosAgendaValues`/`FILTROS_AGENDA_VACIOS`/`buildTagsAgenda`/`FiltrosAgendaChips`)
> Pantalla `/turnos/[turnoId]/pago`: módulo HU-VTA-01 (liquidación y facturación en mostrador de consultas, medicamentos, insumos, alimentos y accesorios; desglose automático de Subtotal, IVA 21% y Total; precios tomados de `src/data/lista-precios.ts` (HU-STK-03); persistencia de venta en `src/data/ventas.ts` con reflejo en el historial del cliente en `ClienteFormModal`; comprobante emergente con `ComprobanteTurnoModal` y descarga de PDF nativo). Todas las integraciones preparadas con comentarios `// BACKEND:`.
> Datos y catálogos placeholder en `src/data/turnos.ts` (camelCase: `estadoId`, `practicaId`, `franjaId`; además de tipos `Turno`/`TurnoDraft`, `estadosTurno` 1-5, `practicas` consulta/cirugía/control, `profesionales` con franjas semanales, y helpers de agenda `generarSlots`/`haySuperposicion`/`horasOcupadas`/`proximosDiasLaborables`). El front trae `id` numérico (PK del backend); cada integración lleva comentario `// BACKEND:` con tabla+endpoint (`grep -rn "BACKEND" src/`).
> HU-TUR-02 agregó: `transicionesEstado` (1:[2] · 2:[3,4,5] · 3/4/5:[]), `nombreEstado` (1-5), `profesionalPorFranja`/`profesionalIdPorFranja` (mapeo franja→profesional para cruzar en agenda), `practicaPorId` exportado, helpers de semana `sumarDias`/`lunesDeFecha`/`fechasDeSemana`/`formatearSemana` y turnos demo id 10-17 en la semana del 21/09/2026.
> El anti-solapamiento **excluye los cancelados** (estado 3): un horario queda ocupado solo por turnos pendientes/confirmados/concretados (espejo del EXCLUDE del gist de agenda). El turno se crea en estado pendiente; la confirmación es HU futura.

## Reglas de reuso

1. **Reusar antes de crear:** si existe algo equivalente en `ui/`, se usa. Los equivalentes de módulo (ej: `EstadoBadge` de articulos) se evalúan caso por caso; si sirven, se generalizan hacia `ui/` en lugar de duplicarse.
2. **Extender, no duplicar:** si un componente existente casi cumple, se le agregan props/variantes manteniendo retrocompatibilidad con quienes ya lo usan.
3. **Nuevo solo si no hay equivalente**, justificándolo en el plan (qué falta y por qué no conviene extender).
4. **Los badges de estado van sobre `StatusBadge`:** los `Estado*Badge` de módulo solo mapean su estado de negocio a una variante + label + icono; nunca definen sus propios colores.
5. **Verificar contra el código:** este inventario puede quedarse atrás; ante duda, confirmar con una búsqueda real en `src/components/**`.