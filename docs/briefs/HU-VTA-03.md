# HU-VTA-03: Como cajero, quiero gestionar la caja diaria con apertura, cierre y registro de ingresos y egresos, para tener control del dinero en efectivo al inicio y cierre del día

> Generado con `/brief`. Revisar y ajustar antes de `/disenar`.

## Contexto

- **Ruta propuesta:**
  - `/cajas` — listado de cajas abiertas y cerradas (una fila por **apertura**).
  - `/cajas/[aperturaId]` — detalle de una caja abierta o cerrada: resumen + tabla de movimientos + acciones.
  - Patrón de ruta propia en plural/kebab, igual que `/articulos`, `/stock`, `/movimientos-stock`, `/lista-precios`, `/recepciones`, `/cuentas-corrientes`. Ítem nuevo **"Cajas"** en la sección **Operaciones** del `Sidebar` (Lucide `Wallet`), con breadcrumb "Ventas y cajas" como en la idea original.
- **Relacionada con:**
  - `HU-VTA-01` (Registro de venta en mostrador) — el pago en efectivo de una venta genera un ingreso automático en la caja abierta (`trg_venta_medio_pago_ingreso_caja`).
  - `HU-VTA-02` (Medios de pago) — define `forma_pago`; solo la forma "efectivo" impacta la caja.
  - `HU-SIS-05` / `HU-SIS-01` (Usuarios y sucursales) — alimentan el selector de cajero y de sucursal.
  - `HU-SIS-06` (Bitácora) — **no** se implementa acá: la escritura ya la cubre el trigger genérico `fn_auditoria`.
- **Prioridad:** Alta (cierra el circuito de ventas: sin caja abierta no hay cobro en efectivo).
- **Rol:** Cajero (`rol_id: 6`). Gerente/Administrador pueden consultar y auditar todas las sucursales.

### Reglas de negocio (texto de la HU, ya Translate al esquema)

1. Apertura de caja con **monto inicial declarado**, por sucursal y por cajero.
2. Registro de **ingresos y egresos manuales** durante la jornada, cada uno con **motivo**.
3. El **cierre** pide el conteo final y calcula la **diferencia** contra el monto esperado (`inicial + ingresos − egresos`).
4. **No** se permite abrir una caja nueva en la misma sucursal si hay una caja abierta sin cerrar.
5. Apertura, movimientos y cierre quedan en **bitácora de auditoría** con usuario responsable.

---

## Propuesta inicial (del equipo)

**Pantalla 1 — Gestión de cajas** (listado de aperturas)
- Header "Gestión de cajas", breadcrumb "Ventas y cajas".
- Barra: buscador + botón de filtros + chip de filtro activo.
- Tabla: Fecha · Hora · Sucursal · Cajero · Monto declarado · Estado · Acciones (ver la caja).
- Acción primaria: **Abrir caja**. (Se descarta el botón *Exportar*.)

**Pantalla 2 — Caja de una sucursal** (detalle de la apertura)
- Header con identificación de la caja y acciones **Nuevo movimiento** y **Cerrar caja**.
- Barra: buscador por motivo + filtros + chip.
- Tabla de movimientos: Fecha · Hora · Tipo · Motivo/concepto · Monto · Estado.

**Modales**
- **Abrir caja**: sucursal · cajero responsable · monto inicial declarado. (Fecha/hora automáticas.)
- **Nuevo movimiento**: cajero responsable (solo lectura) · tipo (ingreso/egreso) · monto · motivo.
- **Diálogo de bloqueo**: "Existe una apertura abierta en esa caja. ¿Cierras la caja antes de abrir una nueva?" → `Cancelar` / `Ir a la caja`. *La restricción es por **caja física** (índice único parcial); decir "en esa sucursal" solo es cierto si hay una caja por sucursal (PENDIENTE 4). El wireframe de abajo conserva el texto original de la idea.*

### Correcciones aplicadas a la idea (por conflicto con el esquema)

| En la idea | Decisión | Por qué |
|---|---|---|
| Fila con tipo **"Apertura"** dentro de la tabla de movimientos | **Fuera de la tabla.** La apertura es una fila de `caja_apertura`, no un movimiento | `tipo_movimiento_caja` solo admite `ingreso` / `egreso` |
| Columna **"Código"** (0001, 0002…) en movimientos | **Fuera.** Se usa el `id` como referencia interna (tooltip/`aria-label`) | `movimiento_caja` no tiene columna de correlativo |
| Botón **Exportar** | **Fuera** (indicación del equipo) | — |
| Modal *Nuevo caja* con **fecha y hora editables** | **Fuera.** `fecha_apertura` es `default now()` | Trigger/backend define el momento |
| Buscador "código, nombre o tipo" + chip "Activo x" (texto copiado de artículos) | Buscador por **cajero** (nombre/apellido) en cajas y por **motivo** en movimientos. Chips de **sucursal / estado / rango de fechas / cajero** | Una apertura no tiene nombre, código ni estado activo/inactivo; su estado es abierta/cerrada |
| Botón "Nuevo movimiento" con cajero editable | Cajero **solo lectura**: es el usuario de la sesión | `movimiento_caja.usuario_id` = quien registra |
| Editar o anular un movimiento | **No existe.** Los movimientos son append-only | No hay columna de anulación ni update en el esquema |
| Diálogo "Existe una caja abierta **en esa sucursal**" | Texto corregido: "Existe una **apertura** abierta **en esa caja**" | El índice único parcial es `WHERE estado = true` **por `caja_id`**, no por sucursal. Ver PENDIENTE 4 |

---

## Wireframe (idea)

```
┌──────────────┬────────────────────────────────────────────────────────────────────────────┐
│ Sidebar      │ Gestión de cajas                                                       │
│  [Cajas]     │ Ventas y cajas                              [ Abrir caja ]  ← sin Exportar │
│              ├────────────────────────────────────────────────────────────────────────────┤
│              │ [ Buscar por cajero 🔍 ]      [ Filtros ]  (Sucursal: Todas) (Estado: ▾) │
│              │ (28/09 – 26/09 ✕)  (Cajero: Todos ✕)          [Ordenar: recientes ▾]    │
│              ├────────────┬──────┬──────────────┬──────────────┬────────────┬──────┬─────┤
│              │   FECHA    │ HORA │   SUCURSAL   │    CAJERO    │ MONTO      │ESTADO│ ACC.│
│              ├────────────┼──────┼──────────────┼──────────────┼────────────┼──────┼─────┤
│              │ 26/09/2026 │ 08:05│ Sucursal Centro│ Pablo Celaya │  $ 18.000  │●Abierta│  ➡️│
│              ├────────────┼──────┼──────────────┼──────────────┼────────────┼──────┼─────┤
│              │ 25/09/2026 │ 08:00│ Sucursal Centro│ Carlos Méndez│  $ 20.000  │○Cerrada│  ➡️│
│              └────────────┴──────┴──────────────┴──────────────┴────────────┴──────┴─────┘
│                                                                    Página 1 de 3 · 10/pág│
└──────────────┴────────────────────────────────────────────────────────────────────────────┘

┌──────────────┴────────────────────────────────────────────────────────────────────────────┐
│ ← Cajas / Caja abierta — Sucursal Centro                              [ Nuevo mov. ]     │
│                        [ Cerrar caja ]                                                 │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐┌───────────────┐┌───────────────┐┌───────────────┐┌──────────────────┐ │
│ │ MONTO INICIAL ││ INGRESOS      ││ EGRESOS       ││ ESPERADO      ││ DIFERENCIA       │ │
│ │   $ 18.000    ││   $ 8.500     ││  −$ 24.900    ││   $ 1.600     ││  (al cerrar)     │ │
│ └───────────────┘└───────────────┘└───────────────┘└───────────────┘└──────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────────────────────────┐│
│ │ ABIERTA DESDE 26/09/2026 08:05 · Caja principal (Sucursal Centro) · Pablo Celaya        ││
│ └────────────────────────────────────────────────────────────────────────────────────────┘│
│ [ Buscar por motivo 🔍 ]  [ Filtros ]                                                      │
│ ┌──────┬──────┬─────────────┬──────────────────────────────┬────────────┬────────────────┐│
│ │ FECHA│ HORA │    TIPO     │        MOTIVO / CONCEPTO      │   MONTO    │    ORIGEN      ││
│ ├──────┼──────┼─────────────┼──────────────────────────────┼────────────┼────────────────┤│
│ │26/09 │12:30 │ + Ingreso   │ Fondo sencillo adicional      │  $ 8.500   │ Manual (cajero)││
│ │26/09 │11:45 │ − Egreso    │ Devolución a cliente por       │ −$ 24.900  │ Manual (cajero)││
│ │      │      │             │ error de cobro                │            │                ││
│ └──────┴──────┴─────────────┴──────────────────────────────┴────────────┴────────────────┘│
│                          El movimiento de apertura NO va en esta tabla.                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Modal — Abrir caja** (fecha/hora automáticas, NO editables)
```
┌────────────────────────────────────────────┐
│  Abrir caja                                │
│  Sucursal asignada                         │
│  [ Sucursal Centro            ▼ ]          │
│  Cajero responsable                         │
│  [ Carlos Méndez               ▼ ]        │
│  Monto inicial declarado                    │
│  [ $ 100.000 ]                             │
│         [ Cancelar ]  [ Confirmar y abrir ] │
└────────────────────────────────────────────┘
```

**Modal — Nuevo movimiento** (cajero solo lectura)
```
┌────────────────────────────────────────────┐
│  Nuevo movimiento                          │
│  Cajero responsable (solo lectura)         │
│  [ Carlos Méndez              🔒 ]         │
│  Tipo de movimiento     Monto              │
│  [ Ingreso        ▼ ]   [ $ 25.000 ]       │
│  Motivo / concepto (obligatorio, máx 255)  │
│  [ Fondo sencillo adicional para vueltos ] │
│      [ Cancelar ]  [ Registrar movimiento ]│
└────────────────────────────────────────────┘
```

**Modal — Cerrar caja** (el de la diferencia; la idea no lo dibujó y la HU lo exige)
```
┌────────────────────────────────────────────────────┐
│  Cerrar caja                                        │
│  ┌────────────────────────────────────────────────┐ │
│  │ Monto inicial declarado              $ 18.000  │ │
│  │ Ingresos                              $  8.500  │ │
│  │ Egresos                              −$ 24.900  │ │
│  │ ────────────────────────────────────────────  │ │
│  │ Monto esperado                       $  1.600  │ │
│  └────────────────────────────────────────────────┘ │
│  Conteo final de dinero en efectivo                 │
│  [ $ 1.600 ]                                       │
│                                                     │
│  Diferencia:  $ 0,00 — caja cuadrada  ✓            │
│  (si ≠ 0 → "Faltante $ X" en rojo / "Sobrante"     │
│   en verde + ConfirmarDialog de confirmación)      │
│                                                     │
│  La caja cerrada no se puede reabrir.              │
│        [ Cancelar ]  [ Contar y cerrar caja ]       │
└────────────────────────────────────────────────────┘
```

**Diálogo — Bloqueo de apertura**
```
┌───────────────────────────────┐
│  Existe una caja abierta en  │
│  esa sucursal                 │
│  Cierra la caja antes de abrir│
│  una nueva?                  │
│  [ Cancelar ]   [ Ir a la caja]│
└───────────────────────────────┘
```

---

## User flow

1. **¿De dónde viene el usuario?**
   - Del menú lateral **Operaciones → Cajas** (`/cajas`).
   - Desde el aviso de cobro en efectivo sin caja abierta (HF052: el backend responde error; la UI ofrece "Abrir caja").
   - Desde el diálogo de bloqueo: "Ir a la caja" → `/cajas/[aperturaId]` de la caja abierta.
2. **¿Qué quiere hacer?** Abrir la caja de su turno, cargar ingresos/egresos, y cerrar la jornada.
3. **¿A dónde llega?**
   - Tras abrir: `/cajas/[aperturaId]` de la caja recién abierta, con toast de éxito.
   - Tras registrar un movimiento: la misma pantalla, la tabla se actualiza y los totales del resumen se recalculan.
   - Tras cerrar: la misma pantalla pasa a estado **Cerrada** (sin acciones de movimiento), muestra monto contado / esperado / diferencia, y el botón "Nuevo movimiento" desaparece.
4. **Al día siguiente**, el cajero vuelve a `/cajas`, ve su caja anterior cerrada y abre una nueva.

---

## Fuente de datos (BD)

> Fuente de verdad: `docs/esquema-bd-front.md` (diccionario del incremento Sprint 4). `esquema4.sql` **no está en el repo** y `db/schema.sql` es la base de Sprints 1–3: `caja_apertura` y `movimiento_caja` solo existen en ese diccionario todavía.

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `caja_apertura` | `id`, `caja_id`, `usuario_id`, `monto_inicial`, `fecha_apertura`, `estado` (bool), `monto_contado`, `monto_esperado`, `diferencia` (GENERATED), `fecha_cierre` | `caja_id` → `caja.id` · `usuario_id` → `usuario.id` |
| `movimiento_caja` | `id`, `caja_apertura_id`, `tipo` (enum), `monto`, `motivo`, `venta_id` (nullable), `usuario_id`, `fecha_hora` | `caja_apertura_id` → `caja_apertura.id` · `venta_id` → `venta.id` · `usuario_id` → `usuario.id` |
| `caja` | `id`, `sucursal_id`, `nombre`, `saldo_actual`, `estado` (`estado_activo_inactivo`) | `sucursal_id` → `sucursal.id` |
| `sucursal` | `id`, `nombre` (en la base: "Sucursal Centro", no "Centro") | — |
| `usuario` | `id`, `nombre`, `apellido`, `rol_id` (6 = Cajero), `sucursal_id`, `estado` | filtro de cajeros |
| `venta` | `id` (solo referencia para ingresos automáticos) | `movimiento_caja.venta_id` |
| `auditoria` | `tabla`, `operacion`, `registro_id`, `usuario_id`, `fecha_hora`, valores | escritura por trigger, **sin pantalla en esta HU** |

**Enums y constraints que condicionan la UI**

- `tipo_movimiento_caja` = `ingreso` | `egreso`. Nada más.
- `caja_apertura.estado` es **boolean**: `true` = abierta, `false` = cerrada. No existe enum de estado.
- `monto_inicial >= 0` · `monto > 0` en movimientos · `motivo varchar(255)` NOT NULL.
- CHECK: caja abierta ⇒ `monto_contado`, `monto_esperado`, `fecha_cierre` en NULL; cerrada ⇒ los tres completos.
- `diferencia` es GENERATED: **el front nunca la escribe**, la muestra.
- Índices únicos parciales: una sola apertura abierta por caja; una caja cerrada no se reabre.
- Triggers (los 5 del esquema): `trg_caja_calcular_cierre` (calcula `monto_esperado` y `fecha_cierre`, impide reabrir → `HF043`), `trg_caja_actualizar_saldo_apertura` (AFTER INSERT: **`caja.saldo_actual = monto_inicial`**, se **sobrescribe en cada apertura** y no se acumula en la vida de la caja), `trg_caja_movimiento_validar_abierta` (→ `HF044`), `trg_caja_actualizar_saldo_movimiento` (suma/resta al saldo por cada movimiento), `trg_venta_medio_pago_ingreso_caja` (alta automática → `HF052` si no hay caja abierta), `trg_auditoria_*` (bitácora de `caja_apertura` y `movimiento_caja`).
- Códigos de error de dominio relevantes: `HF042` cerrar sin `monto_contado` · `HF043` reabrir una caja cerrada · `HF044` mover una caja no abierta · `HF052` cobro en efectivo sin caja abierta.
- **Bloqueo de apertura:** no hay un SQLSTATE propio. Dispara **`23505` (unique_violation)** desde el índice único parcial (`estado = true`), y es **por caja física**, no por sucursal. Ver PENDIENTE 4.

### PENDIENTE DBA / decisiones de alcance

1. **Correlativo de movimiento:** no hay columna de número en `movimiento_caja`. Si la cátedra lo exige → `ALTER TABLE movimiento_caja ADD numero varchar(10)` + secuencia por caja.
2. **`caja_id` en el modal de apertura:** `caja_apertura.caja_id` es NOT NULL pero la UI (según la idea) no lo pide. Resolución propuesta: el backend resuelve la caja por sucursal (una `caja` por sucursal, `nombre` default "Caja principal"). ⚠️ `caja` **no tiene UNIQUE sobre `sucursal_id`** y el repo no tiene filas sembradas en `caja`, así que "una caja por sucursal" es un **supuesto**, no una garantía del esquema. Si una sucursal puede tener varias cajas → agregar selector de caja al modal. **Los criterios de aceptación asumen este supuesto:** mientras siga sin resolver, el CA de apertura es correcto solo bajo "una caja por sucursal".
3. **Observación al cerrar:** no existe columna para justificar la diferencia. Si se quiere → `caja_apertura.cierre_observacion varchar(255)` (PENDIENTE DBA, ver `docs/backend/AJUSTES-DER.md` para el formato de las correcciones).
4. **Alcance real del bloqueo:** el índice único parcial es **por caja física**, mientras la HU dice "por sucursal". Si hay una caja por sucursal, ambos son equivalentes; si hay varias, la regla real es "una apertura abierta por caja" y el front debe avisarlo.
5. **Sin cajeros en los datos placeholder:** `src/data/usuarios.ts` tiene Administrador/Gerente/Veterinario/Recepcionista, ninguno con `rol_id: 6`. La HU debe agregarlos **al mismo array `usuarios`** (no duplicar catálogo): para eso hace falta completar `dni` y `email` (ambos **NOT NULL** en `usuario`, `db/schema.sql`), más `estado` y `fecha_creacion`. No alcanza con copiar el objeto mínimo del brief.

---

## Componentes sugeridos (reuso)

| Pieza | Acción | Nota |
|---|---|---|
| `ui/Button`, `ui/Input`, `ui/Select`, `ui/Combobox`, `ui/Modal` | Reusar | Ya resuelven tokens, foco y `prefers-reduced-motion` |
| `ui/StatusBadge` | Reusar | Base obligatoria de los badges de este módulo |
| `ui/ConfirmarDialog` | Reusar | `tone="success"` para el cierre con diferencia; default `danger` para acciones destructivas. Es el diálogo de "existe una caja abierta" (extender con `description` + acción secundaria "Ir a la caja") |
| `ui/Pagination` | Reusar | Tamaños 10/25/50 |
| `ui/OrdenamientoSelect` | Reusar | Orden de la tabla de cajas (recientes/antiguas) |
| `ui/Toast` | Reusar | Feedback de apertura, movimiento y cierre |
| `FiltrosMovimientos` / `FiltrosRecepciones` | Como patrón | `FiltrosCajas` con buscador + sucursal + estado + rango de fechas + cajero, y `FiltrosCajasChips` removibles |
| `EstadoCajaBadge` | **Crear** (módulo `cajas/`) | Recibe el **boolean** `estado` de `caja_apertura` → `StatusBadge` (`true`/Abierta = success, `false`/Cerrada = neutral) |
| `TipoMovimientoCajaBadge` | **Crear** (módulo `cajas/`) | Mapea el enum: `+ Ingreso` = success, `− Egreso` = danger |
| `CajasTable` | **Crear** | Columnas Fecha · Hora · Sucursal · Cajero · Monto declarado · Estado · Acciones; `renderActions?` para extender sin romper |
| `MovimientosCajaTable` | **Crear** | Fecha · Hora · Tipo · Motivo · Monto · Origen (Manual / Venta #N) |
| `FiltrosCajas` + `FiltrosCajasChips` | **Crear** | Espejo de `FiltrosMovimientos` |
| `AbrirCajaModal` | **Crear** | 3 campos (sucursal, cajero, monto); muestra la fecha/hora **informativa**, no editable. `caja_id` es NOT NULL y **no** se pide al usuario → resolver en backend (PENDIENTE 2) |
| `MovimientoCajaFormModal` | **Crear** | Tipo + monto + motivo; cajero en solo lectura |
| `CerrarCajaModal` | **Crear** | Resumen de esperado + campo de conteo + diferencia calculada en vivo |
| `ResumenCaja` (o `CajaStats`) | **Crear** | Tarjetas: monto inicial, ingresos, egresos, esperado, diferencia (solo cuando se cierra) |
| `EstadoMovimientoBadge` | **No crear** | La tabla ya muestra el origen; no hay estado en `movimiento_caja` |
| Formateo de moneda | **Reusar/extender** | No hay componente de monto: reusar el formateo ya usado en `CtaCteListaGlobal` / `PreciosTable`; si está duplicado, extraer a `src/lib/` |

Archivos nuevos previstos: `src/data/cajas.ts` (tipos + datos + helpers) y `src/components/cajas/`. Módulo en **plural** (`cajas/`), como `articulos/`, `movimientos/`, `proveedores/`.

---

## Datos hardcodeados

En `src/data/cajas.ts`. Convención del proyecto: **camelCase** en el front, `id` numérico (la PK que manda la base), y comentario `// BACKEND:` con tabla + endpoint en cada integración. Los `// BACKEND:` son: `GET /api/cajas` (listado de aperturas), `GET /api/cajas/:aperturaId` (detalle con movimientos), `POST /api/cajas/:aperturaId/movimientos`, `POST /api/cajas/:aperturaId/cierre`, `POST /api/cajas` (apertura). Los nombres de sucursal usan el texto real de la base: **"Sucursal Centro"**, no "Centro".

```ts
import { usuarios } from "./usuarios";   // mismo catálogo, no duplicado

// BACKEND: reemplazar por GET /api/sucursales.
// Refleja `caja`: id, sucursal_id, nombre, saldo_actual, estado.
export interface Caja {
  id: number;
  sucursalId: number;
  sucursal: string;
  nombre: string;
  saldoActual: number;
  estado: "activo" | "inactivo";   // enum estado_activo_inactivo (default 'activo')
}

// El estado es boolean en la base (no hay enum). El texto es SOLO de
// presentación y lo arma EstadoCajaBadge.
export type EstadoAperturaTexto = "Abierta" | "Cerrada";
export const etiquetaEstado = (abierto: boolean): EstadoAperturaTexto =>
  abierto ? "Abierta" : "Cerrada";

// Refleja `caja_apertura`. `diferencia` y `monto_esperado` los calcula el
// trigger: el front los RECIBE, nunca los escribe.
// `sucursalId`, `sucursal`, `cajaNombre` y `cajero` NO están en la tabla: son
// el JOIN con `caja` → `sucursal` y con `usuario` (la apertura solo guarda
// `caja_id` y `usuario_id`).
export interface CajaApertura {
  id: number;
  cajaId: number;
  sucursalId: number;
  sucursal: string;
  cajaNombre: string;
  cajeroId: number;
  cajero: { nombre: string; apellido: string };
  montoInicial: number;
  fechaApertura: string;          // ISO timestamp → la tabla separa FECHA y HORA
  estado: boolean;                // TRUE = abierta, FALSE = cerrada (columna boolean, no enum)
  montoContado: number | null;    // NULL mientras está abierta
  montoEsperado: number | null;   // NULL mientras está abierta
  diferencia: number | null;      // GENERATED: positivo = sobrante, negativo = faltante
  fechaCierre: string | null;
}

export type TipoMovimientoCaja = "Ingreso" | "Egreso";

export interface MovimientoCaja {
  id: number;
  cajaAperturaId: number;
  tipo: TipoMovimientoCaja;       // enum tipo_movimiento_caja: ingreso | egreso
  monto: number;                  // CHECK monto > 0
  motivo: string;                 // varchar(255) NOT NULL
  ventaId: number | null;         // NULL = carga manual; con valor = ingreso por cobro en efectivo
  usuarioId: number;
  fechaHora: string;
}

// `saldo_actual` es un valor VIVO por caja, no histórico: lo escribe la base
// en dos lugares (trg_caja_actualizar_saldo_apertura lo SOBRESCRIBE en cada
// apertura con monto_inicial; trg_caja_actualizar_saldo_movimiento suma/resta
// por movimiento). Nunca se acumula entre jornadas, y el cierre no lo toca.
export const cajas: Caja[] = [
  { id: 1, sucursalId: 1, sucursal: "Sucursal Centro", nombre: "Caja principal", saldoActual: 1600.0, estado: "activo" },
  // Apertura 3: monto_inicial 100000 sin movimientos → 100000, no 0.
  { id: 2, sucursalId: 2, sucursal: "Sucursal Norte", nombre: "Caja principal", saldoActual: 100000.0, estado: "activo" },
];

// Los cajeros NO se declaran como catálogo aparte: se derivan del mismo array
// `usuarios` (import { usuarios } from "./usuarios").
// ⚠️ PENDIENTE: `src/data/usuarios.ts` todavía no tiene usuarios con
// rol_id: 6 → agregarlos ahí (requiere dni, email, estado y fecha_creacion,
// todos NOT NULL en `usuario`) y este filtro toma solo esos.
// BACKEND: reemplazar por GET /api/usuarios?rol_id=6
export const cajeros = usuarios.filter((u) => u.rol_id === 6 && u.estado === "Activo");
// El filtro de SUCURSAL se aplica en el uso (una cajera solo ve su sucursal,
// o el gerente ve todas), no acá: rol y sucursal son ejes distintos.

// Escenario alineado con el demo del esquema (25 y 26/09/2026): la apertura 1
// se cierra con 200 de faltante; la 2 sigue abierta. Divergencia deliberada: el
// demo de `docs/esquema-bd-front.md` usa usuario_id 4 en las aperturas y en los
// movimientos; acá se reemplaza por cajeros con rol_id 6 (ids 5, 6 y 7) porque
// la HU exige que el responsable sea un Cajero. Ver PENDIENTE 5.
export const aperturasIniciales: CajaApertura[] = [
  {
    id: 1,
    cajaId: 1,
    sucursalId: 1,
    sucursal: "Sucursal Centro",
    cajaNombre: "Caja principal",
    cajeroId: 5,
    cajero: { nombre: "Carlos", apellido: "Méndez" },
    montoInicial: 20000.0,
    fechaApertura: "2026-09-25T08:00:00",
    estado: false,                 // cerrada
    montoContado: 27300.0,
    montoEsperado: 27500.0,
    diferencia: -200.0,            // faltante
    fechaCierre: "2026-09-25T18:30:00",
  },
  {
    id: 2,
    cajaId: 1,
    sucursalId: 1,
    sucursal: "Sucursal Centro",
    cajaNombre: "Caja principal",
    cajeroId: 6,
    cajero: { nombre: "Pablo", apellido: "Celaya" },
    montoInicial: 18000.0,
    fechaApertura: "2026-09-26T08:05:00",
    estado: true,                  // abierta
    montoContado: null,
    montoEsperado: null,
    diferencia: null,
    fechaCierre: null,
  },
  {
    id: 3,
    cajaId: 2,
    sucursalId: 2,
    sucursal: "Sucursal Norte",
    cajaNombre: "Caja principal",
    // Distinto de los cajeros 5/6 (sucursal 1): el CA de visibilidad obliga a
    // que el cajero pertenezca a la sucursal de la caja.
    cajeroId: 7,
    cajero: { nombre: "Lucía", apellido: "Ferreyra" },
    montoInicial: 100000.0,
    fechaApertura: "2026-09-26T15:00:00",
    estado: true,                  // abierta
    montoContado: null,
    montoEsperado: null,
    diferencia: null,
    fechaCierre: null,
  },
];

export const movimientosCajaIniciales: MovimientoCaja[] = [
  // Apertura 1 (cerrada): esperado = 20.000 + 10.000 − 2.500 = 27.500; contó 27.300.
  { id: 1, cajaAperturaId: 1, tipo: "Ingreso", monto: 10000.0, motivo: "Cobro venta N° 1 (efectivo)", ventaId: 1, usuarioId: 5, fechaHora: "2026-09-25T12:15:00" },
  { id: 2, cajaAperturaId: 1, tipo: "Egreso", monto: 2500.0, motivo: "Compra de artículos de limpieza", ventaId: null, usuarioId: 5, fechaHora: "2026-09-25T15:40:00" },
  // Apertura 2 (abierta): la tabla NO muestra la apertura como movimiento.
  { id: 3, cajaAperturaId: 2, tipo: "Egreso", monto: 24900.0, motivo: "Devolución a cliente por error de cobro", ventaId: null, usuarioId: 6, fechaHora: "2026-09-26T11:45:00" },
  { id: 4, cajaAperturaId: 2, tipo: "Ingreso", monto: 8500.0, motivo: "Fondo sencillo adicional para vueltos", ventaId: null, usuarioId: 6, fechaHora: "2026-09-26T12:30:00" },
  // Apertura 3 (Sucursal Norte) todavía sin movimientos → estado vacío de tabla.
];

// BACKEND: el trigger es la fuente de verdad del esperado y de la diferencia.
// Esta función es SOLO previsualización en vivo antes de cerrar.
// ⚠️ El cálculo tiene que correr sobre TODOS los movimientos de la apertura,
// no sobre la página visible: con `ui/Pagination` (10/25/50) pasar el array
// paginado acá devuelve un esperado malo. Recibir el total del backend o
// calcularlo sobre el dataset completo.
export const esperadoPreview = (a: CajaApertura, movs: MovimientoCaja[]): number =>
  movs.filter((m) => m.cajaAperturaId === a.id && m.tipo === "Ingreso")
      .reduce((acc, m) => acc + m.monto, a.montoInicial)
  - movs.filter((m) => m.cajaAperturaId === a.id && m.tipo === "Egreso")
      .reduce((acc, m) => acc + m.monto, 0);

export const SIMULAR_VACIO = false; // mismas banderas que el resto de módulos
export const SIMULAR_ERROR = false;
```

---

## Estados

- [ ] **Vacío** — sin aperturas: mensaje con CTA "Abrir caja".
- [ ] **Vacío de tabla** — caja abierta sin movimientos (caso real: la apertura 3).
- [ ] **Sin resultados** — filtros aplicados sin coincidencias, con acción para limpiar.
- [ ] **Cargando** — skeleton de tabla y de tarjetas de resumen.
- [ ] **Error** — mensaje con reintento.
- [ ] **Con datos** — listado y detalle.
- [ ] **Error de dominio — apertura duplicada:** `23505` (unique_violation) del índice único parcial sobre `estado = true`, **por caja física** → diálogo de la idea con "Ir a la caja". *No es un `409` ni un código propio de la base; no existe SQLSTATE para este caso.*
- [ ] **Error de dominio — caja no abierta:** `HF044` al intentar registrar un movimiento en una caja cerrada (o `HF052` al cobrar en efectivo sin caja abierta).
- [ ] **Error de dominio — reabrir:** `HF043` si se intenta pasar `estado` a `true` de nuevo; la UI no ofrece la acción.
- [ ] **Validación** — monto 0 o negativo, motivo vacío o > 255, conteo vacío al cerrar (`HF042`).

---

## Criterios de aceptación

- [ ] Se puede abrir una caja declarando **monto inicial**, **sucursal** y **cajero responsable**; la fecha/hora las asigna el sistema y no son editables.
- [ ] No se puede abrir una caja nueva en una **caja** que ya tiene una apertura abierta (el índice es por caja física; con una caja por sucursal equivale a "por sucursal"): el sistema lo informa y ofrece ir a esa caja.
- [ ] Se registran **ingresos y egresos manuales** con monto mayor a 0 y **motivo obligatorio** (máx. 255 caracteres), solo mientras la caja está abierta.
- [ ] El cajero responsable se muestra **en solo lectura** (es el usuario de la sesión) y queda asociado al movimiento.
- [ ] Los movimientos de una caja se listan ordenados por fecha, con tipo, motivo, monto y origen (**manual** o **venta**).
- [ ] Los **ingresos por cobro en efectivo** de una venta (`venta_id`) se muestran en la caja abierta, identificados como automáticos.
- [ ] La apertura **no aparece** como un movimiento de la tabla.
- [ ] El detalle muestra los totales: monto inicial, ingresos, egresos y **monto esperado** (`inicial + ingresos − egresos`). El esperado definitivo lo calcula `trg_caja_calcular_cierre` al cerrar; mientras la caja está abierta el front solo muestra una **previsualización**.
- [ ] El cierre solicita el **conteo final**; la base calcula la **diferencia** (`monto_contado − monto_esperado`, columnas GENERATED/trigger) y la UI la muestra con signo y semántica: positivo = sobrante (verde), negativo = faltante (rojo), cero = caja cuadrada.
- [ ] Una caja con diferencia pide confirmación explícita antes de cerrar.
- [ ] Al cerrar, la caja queda en estado **Cerrada** con monto contado, esperado, diferencia y fecha de cierre; **no se puede reabrir** (`HF043`) **ni registrar movimientos nuevos** (`HF044`).
- [ ] La bitácora registra apertura, cada movimiento y el cierre, con usuario responsable, fecha y hora.
- [ ] Los movimientos **no se pueden editar ni anular** desde la pantalla.
- [ ] El listado permite filtrar por sucursal, estado (abierto/cerrado), rango de fechas y cajero; los filtros activos se muestran como chips removibles; hay orden por fecha y paginación.
- [ ] El cajero ve las cajas de su sucursal; gerente y administrador pueden ver todas las sucursales.
- [ ] Montos alineados a la derecha con cifras tabulares y formato de moneda; fechas en `dd/mm/aaaa` y hora en 24 h.
- [ ] Accesibilidad: focus visible, `aria-label` en acciones de tabla, touch targets ≥ 44×44, contraste verificado, `prefers-reduced-motion` respetado.
- [ ] Responsive: en pantallas chicas la tabla permite scroll horizontal (`min-w-[…]`) y los filtros colapsan.
