# Cuentas Corrientes (global) - Pet Bliss Style

> Módulo global (HU-FIN-03) en su propia ruta `/cuentas-corrientes` (ítem `Landmark` "Cuentas Corrientes" en la sección Operaciones del `Sidebar`). Unifica el lado proveedores (ya existente en `/proveedores` tab "Cta. Cte.") y el lado clientes (cobranzas). Complementa a `pages/cta-corriente.md`; los tokens globales del MASTER siguen siendo la base.

## Decisiones de alcance
- **Sin ABM de clientes**: los clientes se hardcodean directamente en la cuenta corriente (el CRUD de clientes no es parte de esta entrega).
- **Listado unificado** (Pantalla A): proveedores y clientes mezclados, con badge de tipo de entidad + filtro Tipo (Todos/Proveedor/Cliente).
- **Detalle por entidad** (Pantalla B) + **modal de registro unificado** (Pantalla C) que se adapta al tipo (título/CTA "Registrar pago" / "Registrar cobranza").

## Regla de saldo por entidad (nueva, distinta de `cta-corriente.md`)
La `CuentaCorriente` generalizada usa `saldoActual` con signo **según la entidad**:
- **Proveedor:** positivo = le debés a él (Deuda). Negativo = crédito a favor.
- **Cliente:** positivo = el cliente te debe (Deuda). Negativo = saldo a favor del cliente.

La presentación del saldo reutiliza `infoSaldo` (mismo contrato que proveedores): color de tipo + signo + etiqueta, jamás color solo. **Obligatorio** el `sr-only` con la etiqueta textual para a11y.

## Badge de tipo de entidad
Cada fila lleva un chip de tipo (Proveedor / Cliente) para distinguir ambos lados en el mismo listado:
- **Proveedor:** `bg-status-info/10 text-status-info-strong` + ícono `Building2`.
- **Cliente:** `bg-status-success/10 text-status-success-strong` + ícono `UserRound`.

## Tablas
Mismo patrón de tabla que proveedores/comprobantes: wrapper `overflow-hidden` + `border` + `shadow-card`, `caption` sr-only, thead `bg-cream-50` headers `font-extrabold uppercase`, filas `border-border/60` + `hover:bg-cream-50/60`. Columnas: Entidad, Tipo, Saldo (derecha), Estado, Próx. vencimiento, Acciones (Pagar/Cobrar + chevron detalle).

## Detalle (Pantalla B)
- **Header de la entidad:** `ArrowLeft` (volver, visible sin scroll) + nombre + documento (CUIT/DNI) + saldo con código de color + `EstadoCtaCteBadge`.
- **Tabs pill** Comprobantes pendientes / Pagos·Cobranzas registradas + acciones Exportar PDF y Registrar.
- **Comprobantes:** N° comprobante (con tipo), Vencimiento, Saldo pendiente (código de color), Estado.
- **Pagos/Cobranzas:** N° comprobante, Fecha, Forma, Importe, Comprobantes imputados (pills), Estado (Vigente/Anulado).
- Paginación `Pagination` en ambas tablas.

## Formulario de registro unificado (Pantalla C)
Misma validación que el `RegistrarPagoModal` de proveedores pero con verbo/sustantivo según entidad:
- N° comprobante (único), forma de pago, fecha (no futura, default hoy), monto total (>0).
- Imputación múltiple a comprobantes con saldo > 0; monto por comprobante ≤ saldo; total ingresado > 0 y ≤ monto total.
- Notas de Crédito (saldos negativos) no se imputan acá — hint lo aclara.
- Cancelar → `ConfirmarDialog`.

## Estados
- Vacío (sin resultados) con `SearchX` y "Limpiar filtros"; detalle vacío (sin comprobantes/pagos) con ícono `Wallet`/`Landmark`.
- Error: card con `AlertTriangle` en `destructive/10` + botón "Reintentar".
- Formulario: validaciones inline `role="alert"` + errores por campo.
