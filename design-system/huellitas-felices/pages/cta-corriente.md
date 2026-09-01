# Cuenta Corriente de Proveedores (Cta. Cte.) - Pet Bliss Style

> El tab "Cta. Cte." que vivía dentro de `/proveedores` se eliminó por redundancia: la cuenta corriente ahora es un **módulo global en `/cuentas-corrientes`** (ver `pages/cuentas-corrientes.md`). Este doc conserva las reglas de negocio/patrón de la cuenta corriente de proveedores que el módulo global reutiliza. Complementa a `pages/proveedores.md`; los tokens globales del MASTER siguen siendo la base.

## Tokens y directivas específicas

La cuenta corriente es un módulo **financiero de lectura + registro de pagos**, no un ABML. Comparte el patrón visual de proveedores/comprobantes (tabs, card, tabla, badges), con estas reglas propias:

### 1. Código de color de saldo (NO depender solo del color)
Regla de la HU + a11y: el saldo usa color de **tipo** (semántico de negocio, no de estado), pero **siempre** con redundancia de texto/signo:
- **Deuda (saldo > 0):** `text-destructive` + signo implícito `+` y etiqueta "Deuda".
- **Crédito a favor (saldo < 0):** `text-status-success-strong` + signo `−` y etiqueta "Crédito a favor".
- **Saldado (saldo = 0):** `text-text-secondary` y etiqueta "Saldado".

Estos son colores de tipo (monto), NO la paleta `status-*` de las etiquetas. La etiqueta textual y el signo son obligatorios para no depender solo del color.

### 2. Estado de cuenta (badge)
El estado cta.cte. de cada proveedor/comprobante va sobre `StatusBadge` vía `EstadoCtaCteBadge` (never colores propios):
- `Vencido` → danger · `Próximo a vencer`/`Pendiente` → warning · `Crédito a favor` → success · `Saldado` → neutral.
- El listado muestra el **peor estado** del proveedor (Vencido > Próximo a vencer > Pendiente > Crédito > Saldado).

### 3. Regla de alerta "próximo a vencer"
Vencimiento dentro de **≤ 7 días** desde hoy = `ProximoAVencer`; pasado = `Vencido`. (Umbral `DIAS_ALERTA_PROXIMO_VENCER` en `src/data/cuentas-corrientes.ts`.)

### 4. Layout del detalle
- **Header del proveedor:** razón social, CUIT y `saldo actual` (neto) con el código de color anterior + acciones exportar PDF / registrar pago.
- **Navegación de retorno:** botón "Volver a cuentas" (ghost con `ArrowLeft`) al **inicio** del detalle, arriba del header del proveedor, para que el retorno sea visible sin scroll (patrón de convención de plataforma).
- **Paneles**: Comprobantes pendientes y Pagos registrados. En desktop dos columnas (`sm:grid-cols-2`), en mobile apilados (1 col). Cada comprobante con columna expandible de "pagos imputados" (`Eye`).

### 5. Formulario de pago (modal)
Reutiliza `Modal` + `Input`/`Select` + `ConfirmarDialog`. Estructura:
- N° comprobante de pago (obligatorio, único), forma de pago (obligatoria), fecha (obligatoria, no futura, default hoy), monto total (obligatorio > 0).
- Imputación múltiple a comprobantes pendientes con saldo > 0: checkbox + monto por cada uno. Validación: monto imputado > 0 y ≤ saldo del comprobante; "Total ingresado" (suma) > 0 y ≤ monto total del pago. Total ingresado en rojo si excede.
- Las Notas de Crédito (saldo < 0) NO se imputan acá (se aplican en un flujo aparte); se aclara con un hint.
- **Cancelar** → `ConfirmarDialog` ("Continuar editando" / "Descartar pago").

### 6. Cross-navegación desde Comprobantes
El historial de comprobantes expone un botón `Landmark` "Ver en Cta. Cte." por fila (`onVerCtaCte`). Al usarlo: navega al módulo global `/cuentas-corrientes` (ya no cambia a un tab local, que se eliminó por redundancia).

## Estados
- Vacío (sin cuentas / sin comprobantes / sin pagos) con `SearchX`→ aquí `Wallet` y "Limpiar filtros".
- Cargando: skeleton de filas (`animate-pulse`, `bg-cream-100`) con cabecera visible.
- Error: card con `AlertTriangle` en `destructive/10` + botón "Reintentar".
- Con datos: listado y detalle.
- Formulario pago: validaciones inline (`role="alert"`) y errores por campo.
- Confirmación: al cancelar el pago y toast de éxito al registrarlo.
