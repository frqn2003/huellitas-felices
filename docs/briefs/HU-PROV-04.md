# HU-PROV-04: Como personal de depósito, quiero registrar la recepción de comprobantes de un proveedor (factura, nota de crédito, nota de débito) asociados a una Orden de Compra, para formalizar la documentación fiscal de cada compra y habilitar su posterior pago

> Referencia: `docs/COMO-USAR.md`

## Contexto

- **Ruta propuesta:** `/proveedores/comprobantes`
- **Relacionada con:** HU-PROV-XX (Órdenes de Compra), HU-FIN-03 (Pago de comprobantes)
- **Prioridad:** alta

## Wireframe (idea)

### Paso 1 — Subida del comprobante

```
┌─────────────────────────────────────────────────┐
│ Slidebar     Subir comprobantes                  │
├──────────┬────────────────────────────────────────┤
│          │                                        │
│  MENÚ    │   ┌─────────────────────────────┐      │
│  Lateral │   │   Arrastrar documento o      │      │
│          │   │        seleccionar           │      │
│          │   │      (PDF / JPG / PNG)       │      │
│          │   └─────────────────────────────┘      │
│          │                                        │
└──────────┴────────────────────────────────────────┘
```

### Paso 2 — Preview + datos recuperados por OCR + carga manual

```
┌───────────────────────────────────────────────────────────────────┐
│ Slidebar     Subir comprobantes                                    │
├──────────┬──────────────────────┬───────────────────────────────────┤
│          │                      │  Datos recuperados del documento │
│  MENÚ    │                      │  Tipo comp.:  [Factura A ▼]      │
│  Lateral │   Preview            │  Punto vta.:  [0003]             │
│          │   documento          │  Número:      [00001278]         │
│          │   (zoom +/-)         │  Fecha:       [25/08/2026]       │
│          │                      │  CUIT:        [30-71234567-8]    │
│          │                      │  Proveedor:   [Distribuidora Vet]│
│          │                      │  OC vinculada:[OC-2026-0045 ▼]   │
│          │                      │  Monto total: [321.255,00]       │
│          │                      │                                   │
│          │                      │  ⚠ Campo no reconocido:          │
│          │                      │    Alícuota IVA (línea 2)        │
│          │                      │                                   │
│          │                      │  [Detalle de líneas]             │
│          │                      │  Artículo | Cant | Precio | IVA  │
│          │                      │  VAC-001  | 50   | 4200   | 21%  │
│          │                      │  ANT-014  | 30   | 1850   | -- ⚠ │
│          │                      │  [+ Agregar línea]               │
│          │                      │                                   │
│          │                      │  [Cancelar]   [Guardar comprobante]│
└──────────┴──────────────────────┴───────────────────────────────────┘
```

### Historial de comprobantes

```
┌───────────────────────────────────────────────────────────────────┐
│ Slidebar     Historial de comprobantes            [+ Nuevo]        │
├──────────┬────────────────────────────────────────────────────────┤
│  MENÚ    │  Filtros: [Proveedor ▼] [Tipo ▼] [N° OC] [Período] [Estado ▼] │
│  Lateral │                                                        │
│          │  Proveedor | Tipo | N° Comp. | OC | Fecha | Monto | Estado │
│          │  Distrib. Vet | Factura A | 0003-00001278 | OC-2026-0045 | 25/08 | $321.255,00 | Vigente │
│          │  Insumos Norte| Factura B | 0001-00000542 | OC-2026-0031 | 12/08 | $87.400,00 | Vigente  │
│          │  Distrib. Vet | Nota Créd.A|0003-00000034 | OC-2026-0040 | 05/08 | -$15.000,00 | Vigente [ref: 0003-00001250] │
│          │  J. Pérez     | Factura C | 0001-00000112 | OC-2026-0028 | 30/07 | $42.000,00 | Anulado [anulado por: 0001-00000113] │
│          │                                            [Ver] [Anular] │
└──────────┴────────────────────────────────────────────────────────┘
```

### Modal de anulación

```
┌───────────────────────────────────┐
│ Anular comprobante 0003-00001278  │
│                                    │
│ Se generará un nuevo comprobante  │
│ de anulación que referencia a     │
│ este. El original se conserva.    │
│                                    │
│ Motivo: [___________________]     │
│                                    │
│      [Cancelar]   [Confirmar]     │
└───────────────────────────────────┘
```

## User flow

1. El usuario (personal de depósito) viene de recibir físicamente la mercadería de una OC ya marcada como "recibida" (parcial o total) y necesita cargar el comprobante fiscal correspondiente.
2. Ingresa a "Subir comprobantes", arrastra o selecciona el escaneo/foto del comprobante (PDF, JPG o PNG).
3. El sistema corre el OCR y muestra el preview del documento junto con los campos recuperados (tipo, punto de venta, número, fecha, CUIT, proveedor sugerido, OC vinculada sugerida, monto total y detalle de líneas). Los campos que el OCR no pudo reconocer con confianza quedan vacíos o marcados con advertencia, y el usuario los completa/corrige manualmente.
4. El usuario selecciona la OC vinculada (el sistema valida que exista y esté en estado "recibida parcial" o "recibida total"). Si el comprobante es Nota de Crédito o Nota de Débito, el usuario debe además seleccionar obligatoriamente la factura original que corrige.
5. El usuario revisa/ajusta el detalle de líneas (artículo, cantidad, precio) y confirma.
6. Al guardar, el sistema registra el comprobante (cabecera + detalle), lo deja disponible para pago en el módulo Financiero (HU-FIN-03), y registra el alta en la bitácora de auditoría.
7. El usuario puede luego consultar el historial de comprobantes, filtrar por proveedor/tipo/OC/período/estado, y anular un comprobante existente (lo que genera un nuevo comprobante de anulación referenciando al original, preservando ambos en el historial y registrando la acción en la bitácora de auditoría).

## Datos hardcodeados

```ts
const proveedores = [
  { id: 1, razonSocial: "Distribuidora Vet SA", cuit: "30-71234567-8", condicionIVA: "Responsable Inscripto" },
  { id: 2, razonSocial: "Insumos Veterinarios del Norte SRL", cuit: "30-70987654-3", condicionIVA: "Responsable Inscripto" },
  { id: 3, razonSocial: "Juan Pérez Alimentos Balanceados", cuit: "20-25874196-5", condicionIVA: "Monotributista" },
];

const ordenesCompra = [
  { id: 1, numero: "OC-2026-0045", proveedorId: 1, fecha: "2026-08-10", estado: "Recibida total",
    articulos: [
      { codigo: "VAC-001", descripcion: "Vacuna Quíntuple Canina", cantidadOC: 50, cantidadFacturada: 0 },
      { codigo: "ANT-014", descripcion: "Antibiótico Amoxicilina 500mg", cantidadOC: 30, cantidadFacturada: 0 },
    ]},
  { id: 2, numero: "OC-2026-0046", proveedorId: 1, fecha: "2026-08-18", estado: "Recibida parcial",
    articulos: [
      { codigo: "ALI-022", descripcion: "Alimento Balanceado Perro Adulto 15kg", cantidadOC: 20, cantidadFacturada: 8 },
    ]},
];

const tiposComprobante = [
  "Factura A", "Factura B", "Factura C",
  "Nota de Crédito A", "Nota de Crédito B",
  "Nota de Débito A", "Nota de Débito B",
];

const comprobante = {
  id: 101,
  tipo: "Factura A",
  puntoVenta: "0003",
  numero: "00001278",            // formato AFIP: 0003-00001278
  fechaEmision: "2026-08-25",
  proveedorId: 1,
  ocId: 1,
  comprobanteOriginalId: null,   // obligatorio si tipo es NC/ND
  estado: "Vigente",             // Vigente / Anulado
};

const detalleComprobante = [
  { id: 1, comprobanteId: 101, articuloCodigo: "VAC-001", descripcion: "Vacuna Quíntuple Canina", cantidad: 50, precioUnitario: 4200.00, alicuotaIVA: 21, subtotal: 210000.00 },
  { id: 2, comprobanteId: 101, articuloCodigo: "ANT-014", descripcion: "Antibiótico Amoxicilina 500mg", cantidad: 30, precioUnitario: 1850.00, alicuotaIVA: 21, subtotal: 55500.00 },
];
// Total: $265.500,00 + IVA 21% = $321.255,00

const datosOCR = {
  tipoDetectado: "Factura A",
  puntoVentaDetectado: "0003",
  numeroDetectado: "00001278",
  fechaDetectada: "25/08/2026",
  cuitDetectado: "30-71234567-8",
  montoTotalDetectado: "321.255,00",
  confianza: "alta",                          // alta / media / baja / no reconocido
  camposNoReconocidos: ["alicuotaIVA linea 2"],
};

const historialComprobantes = [
  { id: 101, proveedor: "Distribuidora Vet SA", tipo: "Factura A", numero: "0003-00001278", oc: "OC-2026-0045", fecha: "2026-08-25", monto: 321255.00, estado: "Vigente" },
  { id: 98,  proveedor: "Insumos Veterinarios del Norte SRL", tipo: "Factura B", numero: "0001-00000542", oc: "OC-2026-0031", fecha: "2026-08-12", monto: 87400.00, estado: "Vigente" },
  { id: 95,  proveedor: "Distribuidora Vet SA", tipo: "Nota de Crédito A", numero: "0003-00000034", oc: "OC-2026-0040", fecha: "2026-08-05", monto: -15000.00, estado: "Vigente", comprobanteOriginal: "0003-00001250" },
  { id: 90,  proveedor: "Juan Pérez Alimentos Balanceados", tipo: "Factura C", numero: "0001-00000112", oc: "OC-2026-0028", fecha: "2026-07-30", monto: 42000.00, estado: "Anulado", comprobanteAnulador: "0001-00000113" },
];

const filtrosHistorial = {
  proveedor: null,   // combo con lista de proveedores
  tipo: null,        // combo con tiposComprobante
  oc: null,          // buscador por número de OC
  periodo: { desde: "2026-08-01", hasta: "2026-08-31" },
  estado: null,      // Vigente / Anulado
};
```

## Estados

- [ ] Vacío — sin comprobante subido, se muestra la zona de arrastrar/seleccionar (wireframe paso 1).
- [ ] Cargando — mientras el OCR procesa el documento subido (spinner sobre el preview).
- [ ] Error — OCR no pudo procesar el archivo (formato inválido, archivo corrupto) o falla al guardar (OC inexistente/no recibida, NC/ND sin factura original vinculada).
- [ ] Con datos — preview + campos recuperados por OCR (completos o parciales) listos para revisión y guardado.
- [ ] Con datos parciales — algunos campos del OCR no fueron reconocidos y quedan resaltados para carga manual.
- [ ] Historial vacío — sin comprobantes que coincidan con los filtros aplicados.
- [ ] Historial con datos — listado de comprobantes vigentes y anulados.

## Criterios de aceptación

- [ ] El sistema permite subir un archivo PDF, JPG o PNG y ejecuta OCR para pre-completar: tipo de comprobante, punto de venta, número, fecha de emisión, CUIT, proveedor, OC sugerida, monto total y detalle de líneas.
- [ ] Los campos no reconocidos por el OCR (o reconocidos con baja confianza) se marcan visualmente y quedan editables para completar manualmente.
- [ ] No se permite guardar el comprobante si la OC vinculada no existe o no está en estado "recibida parcial" o "recibida total".
- [ ] Si el tipo de comprobante es Nota de Crédito o Nota de Débito, es obligatorio seleccionar la factura original que corrige antes de poder guardar.
- [ ] El detalle del comprobante admite una o más líneas (artículo, cantidad, precio facturado), pudiendo corresponder a varios artículos de la misma OC.
- [ ] Una vez guardado, el comprobante no puede editarse; solo puede anularse mediante un nuevo comprobante de anulación que referencia al original.
- [ ] Al anular un comprobante, ambos (original y anulación) permanecen visibles en el historial, con la referencia cruzada entre ellos.
- [ ] El comprobante guardado queda disponible para su pago en el módulo Financiero (HU-FIN-03).
- [ ] El historial de comprobantes permite filtrar por proveedor, tipo de comprobante, OC y período.
- [ ] Cada alta y cada anulación de comprobante queda registrada en la bitácora de auditoría (usuario, fecha/hora, acción).
