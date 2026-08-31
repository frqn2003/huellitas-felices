# HU-FIN-02: Como administrador del sistema, quiero visualizar la cuenta corriente de cada proveedor con saldos y vencimientos, para gestionar las obligaciones de pago a proveedores

> Referencia: `docs/COMO-USAR.md` · Datos coherentes con `docs/esquema-bd-front.md`

## Contexto

- **Ruta propuesta:** `/proveedores` (nueva pestaña "Cta. Cte." dentro de la pantalla de proveedores, junto a "Proveedores" y "Comprobantes").
- **Relacionada con:** HU-PROV-04 (Comprobantes de proveedor), HU-FIN-03 (Pago de comprobantes).
- **Prioridad:** alta

## Mapa del módulo

```
/proveedores
├── Tab "Proveedores"
├── Tab "Comprobantes"   ──[botón "Ver en Cta. Cte." por comprobante]──┐
└── Tab "Cta. Cte."  ◄──────────────────────────────────────────────────┘
    ├── Pantalla A: listado de proveedores con saldo (resumen)
    ├── Pantalla B: detalle de cuenta corriente de un proveedor
    └── Pantalla C: modal de registro de pago (imputación)
```

## Wireframe (idea)

### Pantalla A — Tab "Cta. Cte." (listado de proveedores con saldo)

```
┌────────────────────────────────────────────────────────────────────┐
│  Proveedores    Comprobantes    Cta. Cte.          [Exportar PDF]   │
├────────────────────────────────────────────────────────────────────┤
│  Buscar por proveedor o CUIT...      Filtros: [Estado saldo ▼]      │
│                                                                     │
│  Proveedor            | Deuda Total    | Próx. vto. | Estado   |    │
│  Distribuidora Vet SA | $321.255,00 🔴  | 05/09 ⚠   | Vencido  |[Ver]│
│  Insumos del Norte    | $87.400,00 🔴   | 16/09 ●    | Próx.vto |[Ver]│
│  Juan Pérez           | -$15.000,00 🟢  | —          | Crédito  |[Ver]│
│  Pet Food SA          | $0,00           | —          | Saldado  |[Ver]│
│                                            [Exportar PDF]  (EXE)     │
└────────────────────────────────────────────────────────────────────┘
```

- **Deuda Total** = `proveedor.saldo_actual` (neto). Positivo = adeudado al proveedor. **Rojo si ≠ 0**; **verde** si es crédito a favor (negativo); neutral si es 0.
- **Próx. vto.** = fecha de vencimiento más cercana entre los comprobantes pendientes del proveedor. Icono `⚠` si vencido, `●` si próximo a vencer (≤ 7 días).
- **Estado** via badge que muestra el peor estado del proveedor: `Vencido` > `Próximo a vencer` > `Crédito` > `Saldado`.
- **Exportar PDF** en el header (EXE): exporta el resumen filtrado.

### Pantalla B — Detalle de cuenta corriente de un proveedor

Se entra con **[Ver]** (o por el redirect desde Comprobantes). Vista interna del tab con botón **← Volver**.

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Volver   Cta. Cte. — Distribuidora Vet SA        [Exportar PDF] │
│  CUIT 30-71234567-8   Saldo actual: $321.255,00 🔴                 │
├────────────────────────────────────────────────────────────────────┤
│  Comprobantes pendientes             │  Pagos registrados          │
│  ─────────────────────────           │  ─────────────────────────  │
│  [Filtros: Estado ▼]                 │  [Filtros: Período ▼]       │
│  N° Comp. | Vto.    | Saldo | Est.   │  N° Pago | Fecha | Forma|Importe│
│  0003-…278| 05/09 ⚠ |321.255|Vencido │  0001-…457|02/09 |Transf| 100.000│
│  0001-…542| 16/09 ● |87.400 |Pendiente│  0001-…441|28/08 |Efectivo|50.000│
│  0003-…034| 05/09   |-15.000|Crédito │                             │
│                                 [Registrar pago]                   │
└────────────────────────────────────────────────────────────────────┘
```

- **Panel Comprobantes:** cada comprobante pendiente (`comprobante_proveedor`) con `fecha_vencimiento` y `saldo_pendiente`. El saldo se actualiza **en tiempo real** al imputar pagos (via `pago_imputacion`).
  - Estado cta.cte. del comprobante: `Vencido` / `Próximo a vencer` / `Pendiente` / `Saldado` / `Crédito` (NC pendiente).
  - Alerta visual en fila: vencido = `⚠`, próximo a vencer (≤ 7 días) = `●`.
  - Botón de ojo en cada comprobante → muestra los **pagos imputados** a ese comprobante (de `pago_imputacion`).
- **Panel Pagos:** tabla de `pago` (tipo `pago_proveedor`): nro. comprobante del pago, fecha, forma_pago, importe. Cada pago expande qué comprobantes imputó.
- **Encabezado del detalle:** `saldo_actual` del proveedor (neto), rojo si ≠ 0, verde si crédito.
- **Exportar PDF** exporta el detalle completo (comprobantes + pagos) de este proveedor.

### Pantalla C — Modal de Registro de Pago (imputación)

```
┌──────────────────────────────────────────────────┐
│ Registrar pago — Distribuidora Vet SA            │
│                                                  │
│ N° comprobante: [0001-00000457]  (obligatorio)   │
│ Forma de pago:  [Transferencia ▼] (obligatorio)  │
│ Fecha:          [02/09/2026]     (default hoy)   │
│                                                  │
│ Imputar a comprobantes pendientes:               │
│  ☑ 0003-…278  Vto.05/09  Saldo $321.255         │
│    [Monto imputar: 200.000,00]                   │
│  ☐ 0001-…542  Vto.16/09  Saldo $87.400          │
│                                                  │
│  Total ingresado: $200.000,00  (rojo si ≠ monto) │
│                                                  │
│       [Cancelar]   [Registrar pago]              │
└──────────────────────────────────────────────────┘
```

- El monto del pago se distribuye entre los comprobantes seleccionados (imputación múltiple). Al confirmar: baja el `saldo_pendiente` de cada comprobante y el `saldo_actual` del proveedor.

## User flow

1. El usuario (administrador) entra a `/proveedores` y abre la pestaña **"Cta. Cte."**.
2. Ve el **listado resumen** de proveedores con su Deuda Total neta, próxima fecha de vencimiento y estado de alerta. Puede buscar por proveedor/CUIT y filtrar por estado de saldo, y exportar a PDF (EXE).
3. Hace clic en **[Ver]** para abrir el **detalle de la cuenta** de un proveedor: ve sus comprobantes pendientes (con vencimientos y saldo en tiempo real) y los pagos registrados.
4. Detecta un comprobante vencido o próximo a vencer y hace clic en **[Registrar pago]**.
5. Carga el pago (nro., forma de pago, fecha) y lo imputa a uno o más comprobantes. El sistema valida montos y la suma de imputaciones.
6. Confirma: se actualizan los saldos en tiempo real, se muestra un **toast de éxito** y el pago queda registrado en el panel de pagos.
7. Caso complementario: desde el historial de **Comprobantes** (HU-PROV-04), un botón "Ver en Cta. Cte." lleva directo al detalle del proveedor con el comprobante resaltado, para revisar su estado de cobro/pago.

## Datos hardcodeados

```ts
// Coherente con proveedor.saldo_actual + comprobante_proveedor + pago + pago_imputacion

const proveedoresSaldo = [
  { id: 1, razonSocial: "Distribuidora Vet SA", cuit: "30-71234567-8", saldoActual: 321255.00, estadoCta: "Vencido" },
  { id: 2, razonSocial: "Insumos Veterinarios del Norte SRL", cuit: "30-70987654-3", saldoActual: 87400.00, estadoCta: "ProximoAVencer" },
  { id: 3, razonSocial: "Juan Pérez Alimentos Balanceados", cuit: "20-25874196-5", saldoActual: -15000.00, estadoCta: "Credito" },
  { id: 4, razonSocial: "Pet Food SA", cuit: "30-71445566-7", saldoActual: 0, estadoCta: "Saldado" },
];

const comprobantesPendientes: Array<{
  id: number; numero: string; fechaVencimiento: string; saldoPendiente: number;
  estadoCta: "Vencido" | "ProximoAVencer" | "Pendiente" | "Saldado" | "Credito"; tipo: string;
}> = [
  { id: 101, numero: "0003-00001278", fechaVencimiento: "2026-09-05", saldoPendiente: 321255.00, estadoCta: "Vencido", tipo: "Factura A" },
  { id: 98,  numero: "0001-00000542", fechaVencimiento: "2026-09-16", saldoPendiente: 87400.00,  estadoCta: "ProximoAVencer", tipo: "Factura B" },
  { id: 95,  numero: "0003-00000034", fechaVencimiento: "2026-09-05", saldoPendiente: -15000.00, estadoCta: "Credito", tipo: "Nota de Crédito A" },
];

const pagosRegistrados = [
  { id: 457, numero: "0001-00000457", fecha: "2026-09-02", formaPago: "Transferencia", monto: 100000.00,
    imputaciones: [{ comprobanteId: 101, monto: 100000.00 }] },
  { id: 441, numero: "0001-00000441", fecha: "2026-08-28", formaPago: "Efectivo", monto: 50000.00,
    imputaciones: [{ comprobanteId: 101, monto: 50000.00 }] },
];

const filtrosCtaCte = {
  busqueda: "",              // por proveedor o CUIT
  estadoSaldo: "Todos",      // Todos / Vencido / Próximo a vencer / Crédito / Saldado
};
```

Regla de alerta: **próximo a vencer = vencimiento dentro de ≤ 7 días** respecto de la fecha actual; pasado = vencido. Fechas de ejemplo arriba según fecha de referencia 2026-09-12 (hoy).

## Estados

- [x] Vacío — sin proveedores con saldo / sin comprobantes pendientes / sin pagos (card `SearchX` + "Limpiar filtros" cuando hay filtros activos).
- [x] Cargando — skeleton de tabla.
- [x] Error — card con `AlertTriangle` + botón `Reintentar`.
- [x] Con datos — listado resumen y detalle con comprobantes y pagos.
- [x] Formularios — modal de registro de pago con validaciones y errores inline.
- [x] Confirmaciones — cancelación de pago y toasts de éxito.

## Criterios de aceptación

### Listado (Pantalla A)
- [ ] La pestaña "Cta. Cte." muestra un resumen por proveedor con su **Deuda Total** (neto de `saldo_actual`, integra facturas, NC/ND y pagos).
- [ ] La Deuda Total se muestra en **rojo si es distinta de cero**; en **verde** si es crédito a favor (negativo); neutral si es 0.
- [ ] Se muestra la **próxima fecha de vencimiento** de cada proveedor y la **alerta visual** correspondiente (vencido `⚠` / próximo a vencer ≤ 7 días `●`).
- [ ] El buscador filtra por razón social o CUIT, y el filtro por estado de saldo funciona (Vencido / Próximo a vencer / Crédito / Saldado).
- [ ] Permite **exportar el resumen a PDF** (EXE).

### Detalle (Pantalla B)
- [ ] Muestra el `saldo_actual` del proveedor (neto) con el mismo código de color que el listado.
- [ ] El panel **Comprobantes** lista cada comprobante pendiente con `fecha_vencimiento` y `saldo_pendiente`, actualizado **en tiempo real** al imputar pagos.
- [ ] Alerta visual sobre comprobantes **vencidos** y **próximos a vencer** (≤ 7 días).
- [ ] Las **Notas de Crédito** pendientes se muestran como **crédito a favor** (saldo negativo en verde), diferenciadas del rojo de deuda.
- [ ] Cada comprobante permite ver los **pagos imputados** (de `pago_imputacion`).
- [ ] El panel **Pagos** lista los pagos registrados (tipo `pago_proveedor`) con nro., fecha, forma_pago e importe, y expande las imputaciones de cada uno.
- [ ] Permite **exportar el detalle a PDF** (EXE).

### Registro de pago con imputación (Pantalla C)
- [ ] El modal valida: número de comprobante de pago **obligatorio y único**; forma de pago **obligatoria**; fecha **obligatoria y no futura**.
- [ ] Cada imputación requiere monto **> 0** y **≤ saldo pendiente** del comprobante seleccionado.
- [ ] La **suma de las imputaciones** debe ser **> 0** y **≤ monto total** del pago; si no, se resalta en rojo ("Total ingresado").
- [ ] Al confirmar, se actualizan los `saldo_pendiente` de los comprobantes imputados y el `saldo_actual` del proveedor, y se muestra **toast de éxito**.
- [ ] **Cancelar** pregunta antes de descartar ("Se descartarán los datos imputados...") con `[Continuar editando]` / `[Descartar pago]`.

### Redirect y cross-navegación
- [ ] Desde el historial de **Comprobantes** (HU-PROV-04), un botón "Ver en Cta. Cte." abre el detalle del proveedor con ese comprobante resaltado.
- [ ] En el detalle, el botón **← Volver** regresa al listado sin perder estado de filtros.

### Técnica
- [ ] Reutilizar los componentes existentes: `Pagination`, `StatusBadge`, `ConfirmarDialog`, `Toast`, `Button`, `Select`, `Input`, `Sidebar`.
- [ ] Los datos placeholder llevan `id` numérico (PK del back) y cada punto de integración lleva comentario `// BACKEND:` con el endpoint y qué reemplazar.
- [ ] Cada alta de pago queda registrada en la bitácora de auditoría (usuario, fecha/hora, acción).
