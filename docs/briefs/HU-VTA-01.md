# HU-VTA-01: Registro de Venta de Servicios y Productos (Liquidación en Mostrador)

> **Historia de Usuario 78:**
> Como recepcionista / cajero,
> quiero registrar el cobro de una consulta médica junto con los insumos, medicamentos, alimentos y accesorios asociados,
> para liquidar en mostrador la atención recibida por el cliente y facturar lo que consume.

## Contexto

- **Ruta implementada:** `/turnos/[turnoId]/pago` (y vista integrada en Recepción `TurnosTable` y Consulta `/consulta/[turnoId]`)
- **Relacionada con:** 
  - `HU-CLIN-01` (Atención médica: consulta cerrada y sus insumos aplicados)
  - `HU-TUR-01` y `HU-TUR-02` (Turno atendido `estadoId: 4`)
  - `HU-STK-03` (Lista de Precios vigente: aranceles y precios de venta no editables en mostrador)
  - `HU-STK-04` (Movimientos de stock: egreso automático de artículos facturados)
  - `HU-CLI-01` (Historial de compras y atenciones del cliente)
- **Prioridad:** Alta (Cierre de circuito de atención y facturación)

## Wireframe (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ← Volver a Turnos  /  Caja y Facturación                              │
│ Liquidación en Mostrador                                               │
│ COBRO DE TURNO #0003                                                  │
├───────────────────────────────────┬────────────────────────────────────┤
│ [Columna Izquierda: Atención]     │ [Columna Derecha: Liquidación]     │
│ ┌───────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ Datos del Turno y Profesional │ │ │ Conceptos a Facturar:          │ │
│ │ Fecha, hora, veterinario      │ │ │ · Arancel Base: $65.000        │ │
│ ├───────────────────────────────┤ │ │ · Insumos/Productos: $10.600   │ │
│ │ Cliente y Paciente (Mascota)  │ │ │ ────────────────────────────── │ │
│ │ Nombre, DNI, especie, raza    │ │ │ Subtotal (Neto):   $62.479     │ │
│ ├───────────────────────────────┤ │ │ IVA (21%):         $13.121     │ │
│ │ Detalle Clínico e Insumos:    │ │ │ Total de la Venta: $75.600     │ │
│ │ · Amoxicilina x1   $4.500 (-) │ │ ├────────────────────────────────┤ │
│ │ · Jeringa 5ml x2   $1.900 (-) │ │ │ Medio de pago: [Efectivo] [QR] │ │
│ │ · Collar Isab. x1  $4.200 (-) │ │ │ Nro Comprobante / Ref: [...]   │ │
│ │ [+] Buscador Medicamentos,    │ │ │ Observaciones de caja: [...]   │ │
│ │     Insumos, Alimentos y      │ │ ├────────────────────────────────┤ │
│ │     Accesorios (Combobox)     │ │ │ [ Confirmar Cobro ]            │ │
│ └───────────────────────────────┘ │ └────────────────────────────────┘ │
└───────────────────────────────────┴────────────────────────────────────┘
```

## User flow

1. **Origen:**
   - Desde `/clientes?tab=turnos`: El recepcionista ve el turno en estado `Atendido` y presiona el ícono `$`.
   - Desde `/consulta/[turnoId]`: Al cerrarse la atención médica, se muestra el botón "Cobrar en mostrador / Liquidar turno".
2. **Precarga:**
   - La pantalla precarga automáticamente el arancel del servicio y los medicamentos/insumos indicados por el profesional médico sin reingreso manual.
   - Los precios se toman de la Lista de Precios vigente (HU-STK-03) y no son modificables manualmente.
   - El recepcionista puede agregar alimentos balanceados o accesorios que el cliente compre en mostrador.
3. **Cálculo:**
   - Se calcula en tiempo real: Subtotal (Neto gravado), IVA (21%) y Total.
4. **Confirmación:**
   - Al confirmar, se emite el comprobante oficial (modal con visor y descarga en PDF nativo vectorizado).
   - Se registra la venta en el historial del cliente (`src/data/ventas.ts`).
   - Se descuenta el stock en el depósito de mostrador (vía backend triggers HU-STK-04).
   - Queda asentado en la bitácora de auditoría.

## Fuente de datos (BD)

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `venta` | id, cliente_id, sucursal_id, consulta_id, usuario_id, fecha, total, estado | FK → cliente.id, consulta_medica.id, sucursal.id |
| `venta_detalle` | id, venta_id, articulo_id, cantidad, precio_unitario, subtotal | FK → venta.id, articulo.id |
| `venta_medio_pago` | id, venta_id, forma_pago_id, monto | FK → venta.id, forma_pago.id |
| `lista_precio` | articulo_id, precio, vigencia_desde | HU-STK-03 (precios vigentes no editables) |
| `movimiento_stock_cab` / `det` | Egreso por origen `venta` en depósito mostrador | HU-STK-04 (descuento automático de stock) |
| `auditoria` | tabla, operacion, usuario_id, valores_nuevos | Bitácora de transacciones |

## Criterios de Aceptación Verificados

- [x] **Cabecera y detalle:** Cliente y fecha. Detalle con una o más líneas (artículo o servicio, cantidad y precio). Relación cabecera-detalle, incluyendo medicamentos, insumos, alimentos y accesorios asociados.
- [x] **Lista de Precios vigente (HU-STK-03):** El precio de cada ítem se toma de la lista de precios vigente y no es editable manualmente en mostrador.
- [x] **Inicio directo desde atención finalizada (HU-CLIN-01):** Precarga automática del costo de la consulta y de los insumos/medicamentos aplicados sin reingreso de datos.
- [x] **Cálculo de importes:** Calcula automáticamente el subtotal neto, los impuestos (IVA 21%) y el total de la venta.
- [x] **Descuento de stock e historial del cliente:** Descuenta stock mediante egreso de artículos vendidos (HU-STK-04) y registra la venta en el historial de compras del cliente en Recepción.
- [x] **Bitácora de auditoría:** Deja constancia del evento de venta para la auditoría del sistema.
