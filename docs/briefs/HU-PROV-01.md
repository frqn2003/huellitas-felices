# HU-PROV-01: [Como personal de depósito, quiero registrar, editar y consultar proveedores con sus datos fiscales y de contacto mediante un formulario paramétrico único, para tener el listado de proveedores disponibles para realizar compras]

> Copiar este archivo como `HU-XXX.md` (ej: `HU-001.md`) y completar. Referencia: `docs/COMO-USAR.md`.

## Contexto

- **Ruta propuesta:** `/proveedores`
- **Relacionada con:** Independiente por ahora (a futuro se vincula con Órdenes de Compra y con las HUs de Stock: HU-STK-01, HU-STK-02, HU-STK-04)
- **Prioridad:** alta — un proveedor inactivo no puede seleccionarse en nuevas órdenes de compra, por lo que bloquea el flujo de compras si no está resuelto

## Wireframe (idea)

Listado principal (sidebar verde fijo + área de contenido crema, igual que Compras):

```
┌──────────────┬────────────────────────────────────────────────────────────┐
│ 🐾 HUELLITAS │  GESTIÓN DE PROVEEDORES                [Nuevo] [Exportar]  │
│   FELICES    │  PROVEEDORES                                                │
│              ├────────────────────────────────────────────────────────────┤
│ OPERACIONES  │  🔍 Buscar por razón social o CUIT...        [≡ Filtros]   │
│  Inicio      ├────────────────────────────────────────────────────────────┤
│  Artículos   │  RAZÓN SOCIAL   CUIT       TELÉFONO   FORMA PAGO  ESTADO  ACCIONES │
│  Inventario  │  ──────────────────────────────────────────────────────── │
│  Compras     │  Nutrición      30-71234   387-4551   Cta Cte    ●Activo  👁 ✏ 🗑 │
│  Lista Prec. │  Animal SRL     567-8       122                            │
│  Proveedores │  Creado por [usuario]                                     │
│  (activo)    │                                                             │
│              │  VetInsumos     30-70987   387-4223   Contado    ●Activo  👁 ✏ 🗑 │
│ ADMINISTR.   │  Norte SA       654-2       344                            │
│  Config.     │                                                             │
│  Auditoría   │  Farmavet       27-65432   387-4998   Cheque     ●Activo  👁 ✏ 🗑 │
│              │  Distribuidora  198-3       877        30 días              │
│              │                                                             │
│              │  Balanceados    30-69876   387-4667   Cta Cte    ●Inactivo 👁    │
│              │  del Norte      543-1       788                            │
│              ├────────────────────────────────────────────────────────────┤
│ [Ana Martínez│  Mostrando 1-4 de 4 proveedores      Filas 10 ▾  ‹ 1 ›     │
│  Administr.] │                                                             │
└──────────────┴────────────────────────────────────────────────────────────┘
```

Notas de este wireframe:
- Botón principal **[Nuevo]** en naranja (mismo estilo que "Nueva" orden de compra) abre el formulario en modo INSERCIÓN.
- Ícono **👁** (ver) abre en modo LECTURA (solo consulta, sin edición).
- Ícono **✏** (editar) abre en modo EDICIÓN; no aparece para proveedores inactivos.
- Ícono **🗑** (baja lógica) solo visible para proveedores activos; pide confirmación y no borra el registro, solo cambia estado a Inactivo.
- Estado con bullet de color: ●Activo (verde) / ●Inactivo (gris), mismo patrón que "Pendiente/Enviada/Cancelada" en Compras.

Formulario paramétrico (modal centrado sobre la pantalla, mismo criterio que "Nueva" orden de compra), título y botones cambian según el modo (INSERCIÓN / EDICIÓN / LECTURA):

```
┌──────────────────────────────────────────┐
│  Nuevo Proveedor                     [x] │
├────────────────────────────────────────────┤
│ Razón social *        [______________]   │
│ CUIT *                [______________]   │
│ Dirección              [______________]   │
│ Teléfono               [______________]   │
│ Email                  [______________]   │
│ Contacto               [______________]   │
│ Forma de pago          [▾ Contado / Cta Cte / Cheque] │
│ Plazo de entrega (días)[___]              │
│                                            │
│              [Cancelar]   [Guardar]       │
└──────────────────────────────────────────┘
```
En modo LECTURA los campos se muestran deshabilitados (solo texto) y el botón inferior es único: **[Cerrar]**.

## User flow

1. El usuario (personal de depósito) viene del menú lateral, sección "Proveedores", o desde una Orden de Compra que necesita seleccionar/crear un proveedor.
2. Quiere dar de alta un proveedor nuevo, editar uno existente, consultar sus datos, o darlo de baja (lógica) si dejó de operar con la veterinaria.
3. Quiere llegar a tener el listado de proveedores actualizado y disponible para usarlo en futuras órdenes de compra.

## Datos hardcodeados

```ts
const proveedores = [
  {
    id: 1,
    razonSocial: "Nutrición Animal SRL",
    cuit: "30-71234567-8",
    direccion: "Av. Bolivia 1450, Salta Capital",
    telefono: "387-4551122",
    email: "ventas@nutricionanimal.com.ar",
    contacto: "Marcela Funes",
    formaPago: "Cuenta Corriente",
    plazoEntregaDias: 5,
    estado: "Activo",
  },
  {
    id: 2,
    razonSocial: "VetInsumos Norte SA",
    cuit: "30-70987654-2",
    direccion: "Alvarado 890, Salta Capital",
    telefono: "387-4223344",
    email: "pedidos@vetinsumosnorte.com",
    contacto: "Diego Herrera",
    formaPago: "Contado",
    plazoEntregaDias: 2,
    estado: "Activo",
  },
  {
    id: 3,
    razonSocial: "Farmavet Distribuidora",
    cuit: "27-65432198-3",
    direccion: "Ruta 9 Km 4.5, Cerrillos",
    telefono: "387-4998877",
    email: "administracion@farmavet.com.ar",
    contacto: "Lucía Paz",
    formaPago: "Cheque a 30 días",
    plazoEntregaDias: 7,
    estado: "Activo",
  },
  {
    id: 4,
    razonSocial: "Balanceados del Norte",
    cuit: "30-69876543-1",
    direccion: "Belgrano 220, Salta Capital",
    telefono: "387-4667788",
    email: "contacto@balanceadosnorte.com",
    contacto: "Rubén Salinas",
    formaPago: "Cuenta Corriente",
    plazoEntregaDias: 10,
    estado: "Inactivo",
  },
];
```

## Estados

- [ ] Vacío — sin proveedores cargados (primer uso del sistema)
- [ ] Cargando — spinner mientras trae el listado
- [ ] Error — falla al guardar o al consultar (ej. CUIT duplicado, error de red)
- [ ] Con datos — listado poblado con proveedores activos e inactivos

## Criterios de aceptación

- [ ] El formulario opera en tres modos controlados por parámetro: INSERCIÓN, EDICIÓN y LECTURA.
- [ ] Incluye los campos: razón social, CUIT, dirección, teléfono, email, contacto, forma de pago y plazo de entrega habitual.
- [ ] Valida que el CUIT no se encuentre duplicado entre proveedores activos.
- [ ] La baja es LÓGICA; un proveedor inactivo no puede seleccionarse en nuevas órdenes de compra, pero conserva su historial.
- [ ] Se registra en bitácora de auditoría cada alta, modificación y baja de proveedor.
