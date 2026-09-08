# HU-FIN-03: Como administrador del sistema, quiero registrar pagos a proveedores y cobranzas a clientes con su comprobante asociado, pudiendo imputar un pago a uno o varios comprobantes, para mantener actualizados los saldos de clientes y proveedores

> Referencia: `docs/COMO-USAR.md` · Datos coherentes con `docs/esquema-bd-front.md` (tablas `pago`, `pago_imputacion`, `cliente`, `comprobante_cliente`, `comprobante_proveedor`).

## Contexto

- **Ruta propuesta:** `/cuentas-corrientes` (nuevo módulo en el menú lateral, sección "Operaciones").
- **Entidad que maneja:** ambos lados de la cuenta corriente — deudas a proveedores (`pago_proveedor`) y cobranzas a clientes (`cobranza_cliente`). Modelado en una sola vista porque en la BD `pago.tipo` es un enum único y `pago_imputacion` apunta a `comprobante_proveedor_id` **o** `comprobante_cliente_id`.
- **Relacionada con:** HU-FIN-02 (Cta. Cte. de proveedor dentro de `/proveedores`), HU-PROV-04 (Comprobantes de proveedor), HU-PROV-01 (Proveedores), nuevo módulo de Clientes (comprobantes de cliente).
- **Prioridad:** alta

## Mapa del módulo

```
/cuentas-corrientes
├── Listado unificado: proveedores (deudores) + clientes (acreedores), con badge de tipo y filtro por entidad
    ├── Detalle: cuenta corriente de un PROVEEDOR  (comprobantes_proveedor + pagos_proveedor)
    └── Detalle: cuenta corriente de un CLIENTE     (comprobantes_cliente + cobranzas_cliente)
        └── Modal de registro unificado: Registrar pago / Registrar cobranza (imputación múltiple)
```

> Nota de arquitectura: el motor de imputación/saldo es **compartido** entre proveedores y clientes. Los componentes del lado proveedor existentes (`CtaCorrienteList`, `CtaCorrienteDetalle`, `RegistrarPagoModal`, tipos de `@/data/cuentas-corrientes`) se **generalizan** para aceptar un discriminante `tipo: "proveedor" | "cliente"` en lugar de duplicarse por entidad.

## Wireframe (idea)

### Pantalla A — Listado unificado de cuentas corrientes

```
┌────────────────────────────────────────────────────────────────────┐
│  ← Menú    Cuentas Corrientes                     [Exportar PDF]   │
│  Buscar por razón social / nombre o CUIT/DNI...  Filtros: [Tipo ▼]  │
│                                                                     │
│  Entidad          | Tipo      | Documento | Saldo Actual  | Estado  │
│  Distribuidora Vet| Proveedor | 30-71..8  | $156.255,00 🔴 | Vencido │
│  Juan Pérez       | Cliente   | 20-25..5  | $34.800,00  🔴 | Vencido │
│  Insumos del Norte| Proveedor | 30-70..3  | $87.400,00  🔴 | Próx.   │
│  M. González      | Cliente   | 27-11..9  | -$12.000,00  🟢 | Crédito │
│  Pet Food SA      | Proveedor | 30-71..7  | $0,00        ⚪ | Saldado │
│                                            [Ver]                     │
└────────────────────────────────────────────────────────────────────┘
```

- **Deuda Total / Saldo actual** = `saldo_actual` (neto). **Rojo si ≠ 0** (deuda), **verde** si es crédito a favor (negativo), neutral si es 0. El signo es POR ENTIDAD:
  - Proveedor: positivo = adeudado a él (le debés). Negativo = crédito a favor.
  - Cliente: positivo = el cliente te debe. Negativo = saldo a favor del cliente.
- **Badge de tipo** distingue Proveedor de Cliente.
- **Estado** = peor estado de sus comprobantes: `Vencido` > `Próximo a vencer` > `Crédito` > `Saldado`.
- **Filtros:** búsqueda por razón social/nombre o CUIT/DNI, y desplegable Tipo (Todos / Proveedor / Cliente).
- **Exportar PDF** en el header (EXE).

### Pantalla B — Detalle de cuenta corriente de una entidad (se entra con **[Ver]**)

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Volver   Cta. Cte. — Distribuidora Vet SA        [Exportar PDF]  │
│ Proveedor · CUIT 30-71234567-8   Saldo actual: $156.255,00 🔴      │
├────────────────────────────────────────────────────────────────────┤
│  Comprobantes pendientes             │  Pagos/Cobranzas registrados│
│  [Filtros]  N° Comp |Vto.|Saldo|Est. │  [Filtros]  N° |Fec.|Importe│
│  [Ver]                                       [Registrar pago]      │
└────────────────────────────────────────────────────────────────────┘
```

Misma estructura que la Cta. Cte. de proveedores (HU-FIN-02), pero operando con la tabla de comprobantes correcta según `tipo`:
- **Proveedor** → `comprobante_proveedor` + `pago` tipo `pago_proveedor`.
- **Cliente** → `comprobante_cliente` + `pago` tipo `cobranza_cliente`.
- El saldo se actualiza **en tiempo real** al imputar.

### Pantalla C — Modal de registro unificado (Registrar pago / Registrar cobranza)

```
┌──────────────────────────────────────────────────┐
│ Registrar pago — Distribuidora Vet SA            │   ← o "Registrar cobranza"
│                                                  │
│ N° comprobante: [0001-00000458]  (obligatorio)   │
│ Forma de pago:  [Transferencia ▼] (obligatorio)  │
│ Fecha:          [02/09/2026]     (default hoy)   │
│ Imputar a comprobantes pendientes:               │
│  ☑ 0003-00001278  Vto.05/09  Saldo $171.255     │
│    [Monto imputar: 120.000,00]                   │
│  ☐ ...                                           │
│  Total ingresado: $120.000,00  (rojo si ≠ monto) │
│                                                  │
│       [Cancelar]   [Registrar]                   │
└──────────────────────────────────────────────────┘
```

- Título y label del CTA cambian según `tipo` (Registrar pago / Registrar cobranza).
- Se imputan comprobantes con saldo pendiente **positivo**. Las Notas de Crédito (crédito a favor) se aplican en un flujo aparte (flujo de aplicación de NC, no imputación de deuda).
- Incluye asociar opcionalmente una **Nota de Débito o Nota de Crédito vinculada** al pagar.

## User flow

1. El usuario (administrador) entra a `/cuentas-corrientes` desde el menú lateral.
2. Ve el **listado unificado** de todas las cuentas corrientes (proveedores y clientes) con saldo neto, badge de tipo, próxima fecha de vencimiento y estado. Puede buscar, filtrar por tipo, y exportar a PDF.
3. Hace clic en **[Ver]** para abrir el **detalle** de una cuenta: comprobantes pendientes (con vencimientos y saldo en tiempo real) y pagos/cobranzas registrados.
4. Detecta un comprobante vencido o próximo a vencer y hace clic en **[Registrar pago]** (o **[Registrar cobranza]** según la entidad).
5. Carga el pago (nro., forma de pago, fecha) y lo imputa a uno o más comprobantes, opcionalmente vinculando una NC/ND. El sistema valida montos y la suma de imputaciones.
6. Confirma: se actualizan los saldos en tiempo real, se muestra un **toast de éxito**, el pago queda en el panel de pagos/cobranzas, y se **registra en la bitácora de auditoría** (usuario, fecha/hora, acción — pago e imputaciones).
7. Si el pago se registró mal, se genera un **comprobante de anulación** (nuevo `pago` que referencia al original vía `anula_pago_id`), preservando el historial; el original no se modifica.

## Datos hardcodeados

```ts
// Coherente con: proveedor.saldo_actual + cliente.saldo_actual + pago (tipo pago_proveedor / cobranza_cliente) + pago_imputacion.
// Convección de signo por entidad: proveedor positivo = adeudado a él; cliente positivo = el cliente adeuda.

type EntidadCtaCte = "proveedor" | "cliente";

interface CuentaCorriente {
  id: number;              // PK (proveedor.id | cliente.id)
  tipo: EntidadCtaCte;     // discrimina la entidad
  nombre: string;          // razón social (prov) | nombre apellido (cli)
  documento: string;       // cuit | dni
  saldoActual: number;     // signo según entidad
  estadoCta: EstadoCtaCte;
  proximoVencimiento: string | null;
}

const cuentasCorrientes: CuentaCorriente[] = [
  { id: 1, tipo: "proveedor", nombre: "Distribuidora Vet SA", documento: "30-71234567-8", saldoActual: 156255.00, estadoCta: "Vencido", proximoVencimiento: "2026-09-05" },
  { id: 5, tipo: "cliente",   nombre: "Juan Pérez",           documento: "20-25874196-0", saldoActual: 34800.00,  estadoCta: "Vencido", proximoVencimiento: "2026-09-03" },
  { id: 2, tipo: "proveedor", nombre: "Insumos Veterinarios del Norte SRL", documento: "30-70987654-3", saldoActual: 87400.00, estadoCta: "ProximoAVencer", proximoVencimiento: "2026-09-16" },
  { id: 6, tipo: "cliente",   nombre: "María González",       documento: "27-31987654-4", saldoActual: -12000.00, estadoCta: "Credito", proximoVencimiento: null },
  { id: 4, tipo: "proveedor", nombre: "Pet Food SA",          documento: "30-71445566-7", saldoActual: 0,         estadoCta: "Saldado", proximoVencimiento: null },
];

// Comprobantes por entidad (misma forma que HU-FIN-02, pero segun que entidad sea):
//   proveedor → comprobante_proveedor
//   cliente   → comprobante_cliente
const COMPROBANTES_POR_ENTIDAD: Record<number, ComprobantePendiente[]> = {
  1: [ /* proveedor: Factura A vigente, NC a favor */ ],
  5: [ /* cliente: Factura B vigente */ ],
  // ...
};

// Pagos/cobranzas por entidad: tipo segun la entidad
const PAGOS_POR_ENTIDAD: Record<number, Pago[]> = {
  1: [ { id: 457, tipo: "pago_proveedor", numero: "0001-00000457", fecha: "2026-09-02",
         formaPago: "Transferencia", monto: 100000, imputaciones: [{ comprobanteId: 101, monto: 100000 }] } ],
  5: [ { id: 460, tipo: "cobranza_cliente", numero: "0001-00000460", fecha: "2026-09-01",
         formaPago: "Efectivo", monto: 20000, imputaciones: [{ comprobanteId: 205, monto: 20000 }] } ],
  // ...
};

const FORMAS_PAGO: FormaPago[] = ["Efectivo", "Transferencia", "Cheque", "Tarjeta"];

const filtrosCtaCte = {
  busqueda: "",          // por nombre/razón social o documento (cuit/dni)
  tipoEntidad: "Todos",  // Todos / Proveedor / Cliente
  estadoSaldo: "Todos",  // Todos / Vencido / Próximo a vencer / Crédito / Saldado
};
```

## Estados

- [x] Vacío — sin cuentas con saldo / sin comprobantes pendientes / sin pagos (card `SearchX` + "Limpiar filtros" cuando hay filtros activos).
- [x] Cargando — skeleton de tabla.
- [x] Error — card con `AlertTriangle` + botón `Reintentar`.
- [x] Con datos — listado unificado y detalle con comprobantes y pagos/cobranzas.
- [x] Formularios — modal de registro de pago/cobranza con validaciones y errores inline.
- [x] Confirmaciones — cancelación de pago, anulación de pago y toasts de éxito.

## Criterios de aceptación

### Listado unificado (Pantalla A)
- [ ] El menú lateral muestra el ítem **"Cuentas Corrientes"** en Operaciones, que abre `/cuentas-corrientes`.
- [ ] El listado muestra proveedores y clientes juntos con su **saldo neto** (por entidad), el **badge de tipo** (Proveedor/Cliente) y el **estado** de alerta.
- [ ] El saldo se muestra **rojo si ≠ 0**, **verde** si es crédito a favor, neutral si es 0 (signo según entidad).
- [ ] El filtro **Tipo** (Todos / Proveedor / Cliente) funciona, y la búsqueda filtra por nombre/razón social o CUIT/DNI.
- [ ] Permite **exportar el resumen a PDF** (EXE).

### Detalle (Pantalla B)
- [ ] Al hacer **[Ver]**, abre el detalle de la cuenta correcta según el tipo (comprobantes_proveedor vs comprobantes_cliente).
- [ ] Muestra los comprobantes pendientes con `fecha_vencimiento` y `saldo_pendiente`, actualizados **en tiempo real** al imputar.
- [ ] Muestra alerta visual sobre comprobantes **vencidos** y **próximos a vencer** (≤ 7 días).
- [ ] Las **Notas de Crédito** pendientes se muestran como **crédito a favor** (saldo negativo en verde).
- [ ] El panel de pagos/cobranzas lista los registros con nro., fecha, forma de pago e importe, y expande las imputaciones de cada uno.
- [ ] Permite **exportar el detalle a PDF** (EXE).

### Registro de pago / cobranza con imputación (Pantalla C)
- [ ] El modal se adapta a la entidad (título y CTA "Registrar pago" / "Registrar cobranza").
- [ ] Valida: número de comprobante de pago **obligatorio y único**; forma de pago **obligatoria**; fecha **obligatoria y no futura**; monto **> 0**.
- [ ] Permite imputar un pago a **varias** facturas, y asociar una **Nota de Débito o Nota de Crédito vinculada** (relación 1 a muchos).
- [ ] Cada imputación requiere monto **> 0** y **≤ saldo pendiente** del comprobante seleccionado.
- [ ] La **suma de las imputaciones** debe ser **> 0** y **≤ monto total** del pago; si no, se resalta en rojo ("Total ingresado").
- [ ] Al confirmar, se actualizan los `saldo_pendiente` de los comprobantes imputados y el `saldo_actual` de la entidad, y se muestra **toast de éxito**.
- [ ] **Cancelar** pregunta antes de descartar ("Se descartarán los datos imputados...") con `[Continuar editando]` / `[Descartar]`.

### Comprobante de pago emitido (para el final)
- [ ] Al registrar, el sistema **genera un comprobante de pago** (≠ del comprobante fiscal del proveedor/cliente). Es un comprobante del sistema.
- [ ] Este comprobante **no se modifica una vez emitido**; solo se anula con un **nuevo comprobante de anulación** que referencia al original (`anula_pago_id`), preservando ambos en el historial.
- [ ] (Nota para el final) El comprobante es **#hardcodeado #fake #mentira** con **descarga de PDF trucho**.

### Auditoría
- [ ] Cada **pago y cada imputación** queda registrada en la bitácora de auditoría (usuario, fecha/hora, acción).

### Técnica
- [ ] Reutilizar componentes existentes: `Pagination`, `StatusBadge`, `ConfirmarDialog`, `Toast`, `Button`, `Select`, `Input`, `Sidebar`.
- [ ] **Generalizar** el motor de cuenta corriente existente (tipos + `RegistrarPagoModal` + listado/detalle) para operar con el discriminante `tipo` en vez de duplicar para clientes.
- [ ] Los datos placeholder llevan `id` numérico (PK del back) y cada punto de integración lleva comentario `// BACKEND:` con el endpoint y qué reemplazar.
- [ ] Cada alta de pago/cobranza y cada anulación queda registrada en la bitácora de auditoría.
