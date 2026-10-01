"use client";

import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  Layers,
  Minus,
  PawPrint,
  Pill,
  Plus,
  QrCode,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useMemo, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Input } from "@/components/ui/Input";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ComprobanteTurnoModal } from "@/components/turnos/ComprobanteTurnoModal";
import {
  guardarComprobanteTurno,
  obtenerComprobanteTurno,
  type ComprobanteTurno,
  type MedioPagoItem,
  type TipoMedioPago,
} from "@/data/pagos";
import {
  LISTA_PRECIOS_ARTICULOS,
  LISTA_PRECIOS_PRACTICAS,
  PRECIO_PRACTICA_DEFAULT,
} from "@/data/lista-precios";
import { guardarVenta, type Venta } from "@/data/ventas";

import {
  turnosIniciales,
  profesionalPorFranja,
  practicaPorId,
  formatearFecha,
} from "@/data/turnos";
import { clientesIniciales } from "@/data/clientes";
import { mascotasIniciales } from "@/data/mascotas";
import { obtenerConsultaPorTurno } from "@/data/consultas";

interface ItemCobro {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

const PRODUCTOS_CLINICOS_INICIALES: ItemCobro[] = [
  {
    id: 1,
    codigo: "MED-001",
    nombre: "Amoxicilina 500mg suspensión",
    categoria: "Medicamentos",
    unidad: "Frasco",
    cantidad: 1,
    precioUnitario: 4500,
  },
  {
    id: 8,
    codigo: "INS-014",
    nombre: "Jeringa descartable 5ml c/ aguja",
    categoria: "Insumos",
    unidad: "Unidad",
    cantidad: 2,
    precioUnitario: 950,
  },
  {
    id: 7,
    codigo: "VAC-008",
    nombre: "Vacuna Séxtuple Canina (Refuerzo)",
    categoria: "Medicamentos",
    unidad: "Dosis",
    cantidad: 1,
    precioUnitario: 8900,
  },
  {
    id: 4,
    codigo: "ANT-003",
    nombre: "Pipeta Antiparasitaria Externa 10-20kg",
    categoria: "Medicamentos",
    unidad: "Pipeta",
    cantidad: 1,
    precioUnitario: 6800,
  },
];

interface MedioPagoOption {
  id: TipoMedioPago;
  label: string;
  icon: typeof Banknote;
  descripcion: string;
}

const MEDIOS_PAGO: MedioPagoOption[] = [
  { id: "efectivo", label: "Efectivo", icon: Banknote, descripcion: "Pago en mostrador" },
  { id: "transferencia", label: "Transferencia / QR", icon: QrCode, descripcion: "Alias / CBU o QR" },
];

function SectionCard({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-brand-900">{icon}</span>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-brand-900">
            {title}
          </h2>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary">{value || "—"}</span>
    </div>
  );
}

function PagoTurnoContent({ turnoId }: { turnoId: number }) {
  const router = useRouter();
  const { showToast } = useToast();

  // BACKEND: GET /api/turnos/:id
  const turno = useMemo(
    () => turnosIniciales.find((t) => t.id === turnoId) ?? null,
    [turnoId],
  );

  // BACKEND: JOIN clientes
  const cliente = useMemo(
    () => (turno ? clientesIniciales.find((c) => c.id === turno.clienteId) ?? null : null),
    [turno],
  );

  // BACKEND: JOIN mascotas
  const mascota = useMemo(
    () => (turno ? mascotasIniciales.find((m) => m.id === turno.mascotaId) ?? null : null),
    [turno],
  );

  // BACKEND: GET /api/consultas?turno_id=:id
  const consulta = useMemo(
    () => obtenerConsultaPorTurno(turnoId),
    [turnoId],
  );

  const profesionalDisplay = useMemo(() => {
    if (!turno) return "—";
    const pf = profesionalPorFranja[turno.agendaProfesionalId];
    return pf ? `${pf.nombre} ${pf.apellido}` : "—";
  }, [turno]);

  const practica = turno ? practicaPorId[turno.practicaId] : null;

  // Estado de productos e insumos aplicados en la atención
  const [productos, setProductos] = useState<ItemCobro[]>(() => {
    if (consulta && consulta.insumos && consulta.insumos.length > 0) {
      return consulta.insumos.map((ins, index) => {
        const refProd = LISTA_PRECIOS_ARTICULOS.find((p) => p.codigo === ins.codigo);
        const precioUnitario = refProd ? refProd.precioUnitario : 2500;
        return {
          id: ins.id || index + 1,
          codigo: ins.codigo,
          nombre: ins.nombre,
          categoria: refProd?.categoria || "Insumos",
          unidad: ins.unidadMedida,
          cantidad: ins.cantidad,
          precioUnitario,
        };
      });
    }
    return PRODUCTOS_CLINICOS_INICIALES;
  });

  const [productoSeleccionado, setProductoSeleccionado] = useState("");

  const productoOptions: ComboboxOption[] = useMemo(() => {
    return LISTA_PRECIOS_ARTICULOS.map((prod) => ({
      value: prod.codigo,
      label: `[${prod.categoria}] ${prod.nombre} (${prod.codigo}) — $${prod.precioUnitario.toLocaleString("es-AR")} / ${prod.unidad}`,
    }));
  }, []);

  // Estado del formulario de cobro
  const [modoPago, setModoPago] = useState<"simple" | "combinado">("simple");
  const [medioPagoSimple, setMedioPagoSimple] = useState<TipoMedioPago>("efectivo");
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [montoTransferencia, setMontoTransferencia] = useState<number>(0);
  const [referenciaTransferencia, setReferenciaTransferencia] = useState<string>("");
  const [comprobanteRef, setComprobanteRef] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [fichaModalOpen, setFichaModalOpen] = useState(false);

  // Estado del modal de comprobante emitido
  const [comprobanteData, setComprobanteData] = useState<ComprobanteTurno | null>(
    () => obtenerComprobanteTurno(turnoId),
  );
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(
    () => Boolean(obtenerComprobanteTurno(turnoId)),
  );

  // Cálculos de liquidación y desglose fiscal (HU-VTA-01)
  const arancelBase = practica
    ? LISTA_PRECIOS_PRACTICAS[practica.id] ?? PRECIO_PRACTICA_DEFAULT
    : PRECIO_PRACTICA_DEFAULT;

  const totalProductos = useMemo(() => {
    return productos.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  }, [productos]);

  const totalCobrar = arancelBase + totalProductos;
  const subtotalNeto = Math.round(totalCobrar / 1.21);
  const impuestosIva = totalCobrar - subtotalNeto;

  // Balance y validación de medios de pago
  const totalAsignado = useMemo(() => {
    if (modoPago === "simple") return totalCobrar;
    return (Number(montoEfectivo) || 0) + (Number(montoTransferencia) || 0);
  }, [modoPago, totalCobrar, montoEfectivo, montoTransferencia]);

  const saldoRestante = totalCobrar - totalAsignado;
  const esMontoValido =
    modoPago === "simple" ||
    (saldoRestante === 0 &&
      (Number(montoEfectivo) || 0) >= 0 &&
      (Number(montoTransferencia) || 0) >= 0 &&
      ((Number(montoEfectivo) || 0) > 0 || (Number(montoTransferencia) || 0) > 0));

  // Manejo de cantidades de productos
  function handleIncrementar(id: number) {
    setProductos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item)),
    );
  }

  function handleDecrementar(id: number) {
    setProductos((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            return { ...item, cantidad: Math.max(1, item.cantidad - 1) };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0),
    );
  }

  function handleEliminar(id: number) {
    setProductos((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAgregarProducto() {
    if (!productoSeleccionado) return;
    const prodRef = LISTA_PRECIOS_ARTICULOS.find((p) => p.codigo === productoSeleccionado);
    if (!prodRef) return;

    setProductos((prev) => {
      const existe = prev.find((p) => p.codigo === prodRef.codigo);
      if (existe) {
        return prev.map((p) =>
          p.codigo === prodRef.codigo ? { ...p, cantidad: p.cantidad + 1 } : p,
        );
      }
      return [
        ...prev,
        {
          id: prodRef.id || Date.now(),
          codigo: prodRef.codigo,
          nombre: prodRef.nombre,
          categoria: prodRef.categoria,
          unidad: prodRef.unidad,
          cantidad: 1,
          precioUnitario: prodRef.precioUnitario,
        },
      ];
    });

    setProductoSeleccionado("");
  }

  function handleCambiarModo(nuevoModo: "simple" | "combinado") {
    setModoPago(nuevoModo);
    if (nuevoModo === "combinado") {
      const sum = (Number(montoEfectivo) || 0) + (Number(montoTransferencia) || 0);
      if (sum === 0 || sum !== totalCobrar) {
        const mitad1 = Math.round(totalCobrar / 2);
        const mitad2 = totalCobrar - mitad1;
        setMontoEfectivo(mitad1);
        setMontoTransferencia(mitad2);
      }
    }
  }

  function handleAsignarRestoEfectivo() {
    setMontoEfectivo((prev) => Math.max(0, (Number(prev) || 0) + saldoRestante));
  }

  function handleAsignarRestoTransferencia() {
    setMontoTransferencia((prev) => Math.max(0, (Number(prev) || 0) + saldoRestante));
  }

  function handleConfirmarCobro() {
    if (!esMontoValido) return;
    setProcesando(true);

    const mediosCobroFinal: MedioPagoItem[] =
      modoPago === "simple"
        ? [
            {
              id: "1",
              medio: medioPagoSimple,
              monto: totalCobrar,
              referencia:
                medioPagoSimple === "transferencia" && comprobanteRef.trim()
                  ? comprobanteRef.trim()
                  : undefined,
            },
          ]
        : [
            ...(montoEfectivo > 0
              ? [
                  {
                    id: "1",
                    medio: "efectivo" as TipoMedioPago,
                    monto: Number(montoEfectivo) || 0,
                  },
                ]
              : []),
            ...(montoTransferencia > 0
              ? [
                  {
                    id: "2",
                    medio: "transferencia" as TipoMedioPago,
                    monto: Number(montoTransferencia) || 0,
                    referencia: referenciaTransferencia.trim() || undefined,
                  },
                ]
              : []),
          ];

    const medioPagoResumen = modoPago === "simple" ? medioPagoSimple : "mixto";
    const refGeneral =
      modoPago === "simple"
        ? medioPagoSimple === "transferencia"
          ? comprobanteRef.trim()
          : ""
        : referenciaTransferencia.trim()
        ? `TRX: ${referenciaTransferencia.trim()}`
        : "";

    // BACKEND: POST /api/ventas (crea venta, venta_detalle, venta_medio_pago)
    // Body: {
    //   cliente_id: cliente?.id,
    //   sucursal_id: turno?.sucursalId ?? 1,
    //   consulta_id: consulta?.id ?? null,
    //   turno_id: turnoId,
    //   usuario_id: 2, // Cajero/Recepcionista logueado
    //   fecha: now.toISOString(),
    //   subtotal: subtotalNeto,
    //   impuestos: impuestosIva,
    //   total: totalCobrar,
    //   medio_pago: medioPagoResumen,
    //   referencia: refGeneral,
    //   observaciones: observaciones,
    //   venta_medio_pago: mediosCobroFinal.map(m => ({
    //     forma_pago_id: m.medio === "efectivo" ? 1 : 4,
    //     monto: m.monto,
    //     referencia: m.referencia
    //   })),
    //   lineas: [
    //     { servicio_practica_id: practica?.id, precio_unitario: arancelBase, cantidad: 1 },
    //     ...productos.map(p => ({ articulo_id: p.id, cantidad: p.cantidad, precio_unitario: p.precioUnitario }))
    //   ]
    // }
    // Nota backend: Los triggers de la base de datos se encargan de:
    // 1. trg_venta_medio_pago_validar_total: Valida que SUM(monto) == venta.total.
    // 2. trg_venta_medio_pago_ingreso_caja: Si incluye efectivo, registra ingreso en la caja abierta.
    // 3. Descontar automáticamente el stock físico en el depósito de mostrador (HU-STK-04).
    // 4. Registrar la venta en la bitácora de auditoría (trg_auditoria_venta).
    window.setTimeout(() => {
      const now = new Date();
      const fechaStr = `${now.toLocaleDateString("es-AR")} ${now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
      const numRecibo =
        comprobanteRef.trim() || `REC-2026-${String(turnoId).padStart(6, "0")}`;

      const nuevoComp: ComprobanteTurno = {
        numero: numRecibo,
        fechaHora: fechaStr,
        turnoId,
        clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : `Cliente #${turnoId}`,
        clienteDoc: cliente?.documento,
        clienteTel: cliente?.telefono,
        mascotaNombre: mascota?.nombre || "—",
        mascotaEspecie: mascota?.especie || "—",
        mascotaRaza: mascota?.raza,
        profesional: profesionalDisplay,
        practicaNombre: practica?.nombre || "Atención Clínica Profesional",
        arancel: arancelBase,
        productos: [...productos],
        subtotalNeto,
        impuestosIva,
        total: totalCobrar,
        medioPago: medioPagoResumen,
        mediosPago: mediosCobroFinal,
        referencia: refGeneral,
        observaciones: observaciones.trim(),
      };

      guardarComprobanteTurno(nuevoComp);
      setComprobanteData(nuevoComp);

      if (cliente) {
        const nuevaVenta: Venta = {
          id: Date.now(),
          numeroComprobante: numRecibo,
          clienteId: cliente.id,
          clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
          clienteDoc: cliente.documento,
          sucursalId: turno?.sucursalId ?? 1,
          consultaId: consulta?.id ?? null,
          turnoId,
          usuarioId: 2,
          fecha: fechaStr,
          conceptoServicio: practica?.nombre || "Atención Clínica Profesional",
          arancelServicio: arancelBase,
          items: productos.map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.categoria || "Insumos",
            unidad: p.unidad,
            cantidad: p.cantidad,
            precioUnitario: p.precioUnitario,
            subtotal: p.cantidad * p.precioUnitario,
          })),
          subtotalNeto,
          impuestosIva,
          total: totalCobrar,
          medioPago: medioPagoResumen,
          mediosPago: mediosCobroFinal.map((m) => ({
            formaPagoId: m.medio === "efectivo" ? 1 : 4,
            medio: m.medio,
            monto: m.monto,
            referencia: m.referencia,
          })),
          estado: "vigente",
        };
        guardarVenta(nuevaVenta);
      }

      setProcesando(false);
      setConfirmarOpen(false);
      setComprobanteModalOpen(true);
      showToast("success", `Cobro del turno #${turnoId} registrado con éxito.`);
    }, 350);
  }


  if (!turno) {
    return (
      <div className="flex h-screen overflow-hidden bg-cream-50">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-8">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-md border border-border bg-surface p-8 text-center shadow-card">
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
            <h1 className="font-display text-xl font-extrabold uppercase text-brand-900">
              Turno no encontrado
            </h1>
            <p className="text-sm text-text-secondary">
              No existe el turno con identificador #{turnoId}.
            </p>
            <Button variant="outline" onClick={() => router.push("/clientes?tab=turnos")}>
              Volver a Recepción
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Cabecera estándar Pet Bliss */}
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/clientes?tab=turnos")}
                className="inline-flex h-10 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors duration-fast ease-out hover:border-brand-900 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a Turnos
              </button>
              <span className="text-xs font-bold text-text-secondary">/</span>
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Caja y Facturación
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Liquidación en Mostrador
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Cobro de Turno #{String(turno.id).padStart(4, "0")}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Cuerpo principal en 2 columnas con Header Resumen compacto */}
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-36 sm:px-8">
          {/* Header Resumen Compacto - 1 sola fila con datos clave y botón a Ficha Completa */}
          <div className="rounded-md border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-text-secondary uppercase">Turno: </span>
                    <span className="font-semibold text-text-primary">{formatearFecha(turno.fecha)} · {turno.horaInicio}hs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-text-secondary uppercase">Prof: </span>
                    <span className="font-semibold text-text-primary">{profesionalDisplay}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-text-secondary uppercase">Cliente: </span>
                    <span className="font-semibold text-text-primary">{cliente ? `${cliente.nombre} ${cliente.apellido}` : `Cliente #${turno.clienteId}`}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-bold text-text-secondary uppercase">Mascota: </span>
                    <span className="font-semibold text-text-primary">{mascota?.nombre ?? "—"} ({mascota?.especie ?? "—"})</span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFichaModalOpen(true)}
                className="h-8 gap-1.5 text-xs font-bold shrink-0"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Ver Ficha Completa
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Columna Izquierda: Detalle Clínico de la Atención e Insumos (7 cols) */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              {/* Card único: Detalle Clínico de la Atención */}
              <SectionCard
                title="Detalle Clínico de la Atención"
                icon={<Stethoscope className="h-4 w-4" aria-hidden="true" />}
                badge={
                  consulta ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-status-info/10 px-2.5 py-0.5 text-xs font-bold text-status-info-strong">
                      Consulta #{consulta.id}
                    </span>
                  ) : undefined
                }
              >
                <div className="flex flex-col gap-4 text-sm">
                  <div className="grid grid-cols-1 gap-3">
                    <DataField
                      label="Motivo de Consulta"
                      value={
                        consulta?.motivoConsulta ||
                        "Revisión clínica general, control sanitario y aplicación de medicación."
                      }
                    />
                    <DataField
                      label="Diagnóstico"
                      value={
                        consulta?.diagnostico ||
                        "Paciente en óptimas condiciones. Se aplican insumos preventivos y dosis farmacológica."
                      }
                    />
                  </div>

                  {/* Tabla interactiva de productos / insumos aplicados */}
                  <div className="mt-2 rounded-md border border-border bg-surface shadow-xs">
                    <div className="flex items-center justify-between rounded-t-md border-b border-border bg-cream-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-brand-900" aria-hidden="true" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-brand-900">
                          Medicamentos e Insumos a Cobrar
                        </h3>
                      </div>
                      <span className="rounded-pill bg-brand-900/10 px-2.5 py-0.5 text-xs font-bold text-brand-900">
                        {productos.length} {productos.length === 1 ? "ítem" : "ítems"}
                      </span>
                    </div>

                    {/* Buscador de producto con autocompletado en la parte superior (crece hacia abajo) */}
                    <div className="relative z-30 flex flex-col gap-2.5 border-b border-border bg-cream-50/70 p-3.5 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <Combobox
                          id="buscar-producto-catalogo"
                          value={productoSeleccionado}
                          options={productoOptions}
                          onChange={setProductoSeleccionado}
                          placeholder="Escribí para buscar medicamento o insumo (nombre o código)..."
                          noResultsText="No se encontraron productos coincidentes"
                          maxResults={8}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!productoSeleccionado}
                        onClick={handleAgregarProducto}
                        className="h-11 shrink-0 whitespace-nowrap px-4 font-bold"
                      >
                        <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                        Agregar a la cuenta
                      </Button>
                    </div>

                    {/* Listado de ítems aplicados */}
                    <div className="divide-y divide-border/60">
                      {productos.length === 0 ? (
                        <div className="p-6 text-center text-xs text-text-secondary">
                          No se han indicado medicamentos o insumos adicionales para este turno.
                        </div>
                      ) : (
                        productos.map((item) => {
                          const totalLinea = item.cantidad * item.precioUnitario;
                          return (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 p-3.5 transition-colors duration-fast sm:flex-row sm:items-center sm:justify-between hover:bg-cream-50/50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-brand-900">{item.nombre}</p>
                                  <span className="rounded bg-cream-100 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">
                                    {item.codigo}
                                  </span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                  ${item.precioUnitario.toLocaleString("es-AR")} por {item.unidad}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-4 sm:justify-end">
                                {/* Controles de cantidad */}
                                <div className="flex items-center gap-1.5 rounded-pill border border-border bg-cream-50 px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDecrementar(item.id)}
                                    aria-label={`Disminuir cantidad de ${item.nombre}`}
                                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-900"
                                  >
                                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <span className="min-w-[24px] text-center text-xs font-bold text-brand-900">
                                    {item.cantidad}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementar(item.id)}
                                    aria-label={`Aumentar cantidad de ${item.nombre}`}
                                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-900"
                                  >
                                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>

                                {/* Total de línea */}
                                <span className="min-w-[80px] text-right text-sm font-extrabold text-brand-900">
                                  ${totalLinea.toLocaleString("es-AR")}
                                </span>

                                {/* Quitar */}
                                <button
                                  type="button"
                                  onClick={() => handleEliminar(item.id)}
                                  aria-label={`Quitar ${item.nombre} de la cuenta`}
                                  title="Quitar ítem"
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Columna Derecha: Liquidación, Medio de Pago y Confirmación (5 cols) - Sticky */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              <div className="sticky top-6">
                <SectionCard
                  title="Liquidación y Cobro"
                  icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
                >
                  <div className="flex flex-col gap-5">
                    {/* Desglose de ítems */}
                    <div>
                      <h3 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-text-secondary">
                        Conceptos a facturar
                      </h3>
                      <div className="rounded-md border border-border bg-cream-50 p-4">
                        {/* Arancel de práctica */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-text-primary">
                            {practica?.nombre ?? "Servicio Veterinario"} (Arancel base)
                          </span>
                          <span className="font-bold text-text-primary">
                            ${arancelBase.toLocaleString("es-AR")}
                          </span>
                        </div>

                        {/* Desglose de productos */}
                        {productos.length > 0 && (
                          <div className="mt-3 border-t border-border/80 pt-3">
                            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase text-text-secondary">
                              <span>Productos e Insumos ({productos.length}):</span>
                              <span>${totalProductos.toLocaleString("es-AR")}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {productos.map((prod) => (
                                <div
                                  key={prod.id}
                                  className="flex items-center justify-between text-xs text-text-secondary"
                                >
                                  <span className="truncate pr-2">
                                    {prod.nombre} × {prod.cantidad}
                                  </span>
                                  <span className="shrink-0 font-semibold text-text-primary">
                                    ${(prod.cantidad * prod.precioUnitario).toLocaleString("es-AR")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Desglose fiscal de Subtotal, IVA y Total (HU-VTA-01) */}
                        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
                          <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>Subtotal (Neto gravado):</span>
                            <span className="font-semibold text-text-primary">
                              ${subtotalNeto.toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-text-secondary">
                            <span>IVA discriminado (21%):</span>
                            <span className="font-semibold text-text-primary">
                              ${impuestosIva.toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between border-t border-border/80 pt-2">
                            <span className="text-base font-extrabold uppercase tracking-wide text-brand-900">
                              Total de la venta
                            </span>
                            <span className="font-display text-2xl font-black text-brand-900">
                              ${totalCobrar.toLocaleString("es-AR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selección de Modalidad y Medios de Pago */}
                    <div className="flex flex-col gap-4">
                      {/* Segmented Control: Modo de Pago */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-xs font-extrabold uppercase tracking-widest text-text-secondary">
                            Modalidad de Pago
                          </h3>
                          <span className="rounded-pill bg-brand-900/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-900">
                            {modoPago === "simple"
                              ? "1 solo medio"
                              : "Efectivo + Transferencia"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 rounded-pill border border-border bg-cream-50 p-1">
                          <button
                            type="button"
                            onClick={() => handleCambiarModo("simple")}
                            className={`flex items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-bold transition-all duration-fast ${
                              modoPago === "simple"
                                ? "bg-brand-900 text-cream-50 shadow-xs"
                                : "text-text-secondary hover:text-brand-900"
                            }`}
                          >
                            <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                            Pago Único
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCambiarModo("combinado")}
                            className={`flex items-center justify-center gap-1.5 rounded-pill py-2 text-xs font-bold transition-all duration-fast ${
                              modoPago === "combinado"
                                ? "bg-brand-900 text-cream-50 shadow-xs"
                                : "text-text-secondary hover:text-brand-900"
                            }`}
                          >
                            <Layers className="h-4 w-4" aria-hidden="true" />
                            Pago Combinado
                          </button>
                        </div>
                      </div>

                      {/* VISTA: Pago Único */}
                      {modoPago === "simple" && (
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-2 gap-2">
                            {MEDIOS_PAGO.map((mp) => {
                              const Icon = mp.icon;
                              const isSelected = medioPagoSimple === mp.id;
                              return (
                                <button
                                  key={mp.id}
                                  type="button"
                                  onClick={() => setMedioPagoSimple(mp.id)}
                                  className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-all duration-fast ease-out ${
                                    isSelected
                                      ? "border-brand-900 bg-brand-900/5 ring-2 ring-brand-900"
                                      : "border-border bg-surface hover:border-brand-900/40 hover:bg-cream-50/50"
                                  }`}
                                >
                                  <div className="flex w-full items-center justify-between">
                                    <Icon
                                      className={`h-4 w-4 ${isSelected ? "text-brand-900" : "text-text-secondary"}`}
                                      aria-hidden="true"
                                    />
                                    {isSelected && (
                                      <CheckCircle2
                                        className="h-4 w-4 text-brand-900"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-text-primary">
                                    {mp.label}
                                  </span>
                                  <span className="text-[10px] leading-tight text-text-secondary">
                                    {mp.descripcion}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Campo de comprobante/referencia solo si es transferencia */}
                          {medioPagoSimple === "transferencia" && (
                            <Input
                              label="Nº de comprobante / Referencia de transferencia (opcional)"
                              placeholder="Ej: TRX-98124 o código de transferencia / Alias"
                              value={comprobanteRef}
                              onChange={(e) => setComprobanteRef(e.target.value)}
                            />
                          )}
                        </div>
                      )}

                      {/* VISTA: Pago Combinado (Efectivo y Transferencia fijos) */}
                      {modoPago === "combinado" && (
                        <div className="flex flex-col gap-3.5">
                          <div className="flex flex-col gap-3">
                            {/* Tarjeta 1: Efectivo */}
                            <div className="flex flex-col gap-2.5 rounded-md border border-border bg-cream-50/60 p-3.5 transition-all duration-fast hover:border-brand-900/40">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-900 text-cream-50">
                                    <Banknote className="h-4 w-4 text-cream-50" aria-hidden="true" />
                                  </span>
                                  <div>
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-brand-900">
                                      Efectivo
                                    </span>
                                    <p className="text-[10px] text-text-secondary">Pago en mostrador</p>
                                  </div>
                                </div>

                                {saldoRestante !== 0 && (
                                  <button
                                    type="button"
                                    onClick={handleAsignarRestoEfectivo}
                                    title="Completar el saldo restante en efectivo"
                                    className="inline-flex items-center gap-1 rounded-pill bg-brand-900/10 px-2.5 py-1 text-[10px] font-bold text-brand-900 transition-colors hover:bg-brand-900 hover:text-cream-50"
                                  >
                                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                                    {saldoRestante > 0
                                      ? `+ Asignar resto ($${saldoRestante.toLocaleString("es-AR")})`
                                      : "Ajustar al exacto"}
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor="monto-efectivo"
                                  className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
                                >
                                  Monto en Efectivo ($)
                                </label>
                                <input
                                  id="monto-efectivo"
                                  type="number"
                                  min="0"
                                  step="100"
                                  placeholder="0"
                                  value={montoEfectivo || ""}
                                  onChange={(e) =>
                                    setMontoEfectivo(Math.max(0, Number(e.target.value) || 0))
                                  }
                                  className="h-10 w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm font-extrabold text-brand-900 transition-colors focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                                />
                              </div>
                            </div>

                            {/* Tarjeta 2: Transferencia / QR */}
                            <div className="flex flex-col gap-2.5 rounded-md border border-border bg-cream-50/60 p-3.5 transition-all duration-fast hover:border-brand-900/40">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-900 text-cream-50">
                                    <QrCode className="h-4 w-4 text-cream-50" aria-hidden="true" />
                                  </span>
                                  <div>
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-brand-900">
                                      Transferencia / QR
                                    </span>
                                    <p className="text-[10px] text-text-secondary">Alias / CBU o escaneo QR</p>
                                  </div>
                                </div>

                                {saldoRestante !== 0 && (
                                  <button
                                    type="button"
                                    onClick={handleAsignarRestoTransferencia}
                                    title="Completar el saldo restante en transferencia"
                                    className="inline-flex items-center gap-1 rounded-pill bg-brand-900/10 px-2.5 py-1 text-[10px] font-bold text-brand-900 transition-colors hover:bg-brand-900 hover:text-cream-50"
                                  >
                                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                                    {saldoRestante > 0
                                      ? `+ Asignar resto ($${saldoRestante.toLocaleString("es-AR")})`
                                      : "Ajustar al exacto"}
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor="monto-transferencia"
                                  className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
                                >
                                  Monto en Transferencia ($)
                                </label>
                                <input
                                  id="monto-transferencia"
                                  type="number"
                                  min="0"
                                  step="100"
                                  placeholder="0"
                                  value={montoTransferencia || ""}
                                  onChange={(e) =>
                                    setMontoTransferencia(Math.max(0, Number(e.target.value) || 0))
                                  }
                                  className="h-10 w-full rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm font-extrabold text-brand-900 transition-colors focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                                />
                              </div>

                              {/* Referencia exclusiva de transferencia */}
                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor="ref-transferencia"
                                  className="text-[10px] font-bold text-text-secondary"
                                >
                                  Nº de Comprobante / Referencia TRX (opcional)
                                </label>
                                <input
                                  id="ref-transferencia"
                                  type="text"
                                  placeholder="Ej: TRX-98124 o CBU / Alias..."
                                  value={referenciaTransferencia}
                                  onChange={(e) => setReferenciaTransferencia(e.target.value)}
                                  className="h-8 w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-primary transition-colors focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Estado de Balance en Tiempo Real */}
                          <div className="rounded-md border border-border bg-cream-50 p-3 text-xs">
                            <div className="flex items-center justify-between text-text-secondary">
                              <span>Total a cubrir:</span>
                              <span className="font-bold text-text-primary">
                                ${totalCobrar.toLocaleString("es-AR")}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-text-secondary">
                              <span>Total asignado:</span>
                              <span className="font-bold text-brand-900">
                                ${totalAsignado.toLocaleString("es-AR")}
                              </span>
                            </div>

                            <div className="mt-2.5 border-t border-border/70 pt-2.5">
                              {saldoRestante === 0 ? (
                                <div className="flex items-center justify-between rounded bg-status-success/15 px-2.5 py-1.5 font-bold text-status-success-strong">
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    Total cubierto exactamente
                                  </span>
                                  <span>$0 restante</span>
                                </div>
                              ) : saldoRestante > 0 ? (
                                <div className="flex items-center justify-between rounded bg-status-warning/15 px-2.5 py-1.5 font-bold text-status-warning-strong">
                                  <span>⚠️ Faltan por asignar:</span>
                                  <span className="font-mono">
                                    ${saldoRestante.toLocaleString("es-AR")}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between rounded bg-status-danger/15 px-2.5 py-1.5 font-bold text-status-danger-strong">
                                  <span>❌ Supera el total por:</span>
                                  <span className="font-mono">
                                    ${Math.abs(saldoRestante).toLocaleString("es-AR")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Observaciones generales de caja */}
                      <Input
                        label="Observaciones de caja (opcional)"
                        placeholder="Notas internas para el cierre de caja"
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                      />
                    </div>

                    {/* Acciones principales de cobro */}
                    <div className="mt-2 flex flex-col gap-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        disabled={!esMontoValido || procesando}
                        onClick={() => setConfirmarOpen(true)}
                        className="w-full text-base font-extrabold shadow-sm"
                      >
                        {procesando ? "Procesando cobro..." : "Confirmar"}
                      </Button>

                      {!esMontoValido && (
                        <p className="text-center text-[11px] font-semibold text-status-warning-strong">
                          {saldoRestante > 0
                            ? `Debés asignar los $${saldoRestante.toLocaleString("es-AR")} restantes para continuar.`
                            : `El total asignado supera por $${Math.abs(saldoRestante).toLocaleString("es-AR")} el total a cobrar.`}
                        </p>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/clientes?tab=turnos")}
                        className="w-full"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Emergente de Ficha Completa de Cliente y Paciente */}
      {fichaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-md border border-border bg-surface p-6 shadow-modal animate-in fade-in zoom-in-95 duration-fast">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-brand-900">
                <PawPrint className="h-5 w-5" aria-hidden="true" />
                <h2 className="font-display text-base font-extrabold uppercase tracking-wide">
                  Ficha del Cliente y Paciente
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFichaModalOpen(false)}
                className="rounded-full p-1 text-text-secondary hover:bg-cream-100 hover:text-brand-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 text-sm">
              <div className="rounded-md border border-border bg-cream-50 p-3.5">
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-brand-900">
                  Datos del Titular / Cliente
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <DataField label="Nombre Completo" value={cliente ? `${cliente.nombre} ${cliente.apellido}` : `Cliente #${turno.clienteId}`} />
                  <DataField label="DNI" value={cliente?.documento} />
                  <DataField label="Teléfono" value={cliente?.telefono} />
                  <DataField label="Email" value={cliente?.email} />
                </div>
              </div>

              <div className="rounded-md border border-border bg-cream-50 p-3.5">
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-brand-900">
                  Datos del Paciente
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <DataField label="Nombre" value={mascota?.nombre} />
                  <DataField label="Especie / Raza" value={`${mascota?.especie ?? "—"} · ${mascota?.raza ?? "—"}`} />
                  <DataField label="Sexo / Peso" value={`${mascota?.sexo ?? "—"} · ${mascota?.peso ? `${mascota.peso} kg` : "—"}`} />
                  <DataField label="N° Historia Clínica" value={mascota ? `HC-${String(mascota.id).padStart(5, "0")}` : "—"} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setFichaModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación de Cobro */}
      <ConfirmarDialog
        open={confirmarOpen}
        title="¿Confirmar cobro del turno?"
        description={`Se registrará el cobro de $${totalCobrar.toLocaleString("es-AR")} (${practica?.nombre ?? "Servicio"} + ${productos.length} ítems clínicos) para el turno #${turno.id} (${cliente?.nombre ?? "Cliente"} · ${mascota?.nombre ?? "Mascota"}) abonado mediante ${
          modoPago === "simple"
            ? (MEDIOS_PAGO.find((m) => m.id === medioPagoSimple)?.label || "Efectivo")
            : `pago combinado ($${montoEfectivo.toLocaleString("es-AR")} en Efectivo + $${montoTransferencia.toLocaleString("es-AR")} en Transferencia / QR)`
        }.`}
        confirmLabel="Confirmar"
        cancelLabel="Volver"
        tone="success"
        onClose={() => !procesando && setConfirmarOpen(false)}
        onConfirm={handleConfirmarCobro}
      />

      {/* Ventana Emergente con el Comprobante y Botón de Descarga */}
      <ComprobanteTurnoModal
        open={comprobanteModalOpen}
        onClose={() => {
          setComprobanteModalOpen(false);
          router.push("/clientes?tab=turnos");
        }}
        comprobante={comprobanteData}
      />
    </div>
  );
}

// ── Export con Suspense y params Promise (Next.js 15/16) ───────────────────────

export default function PagoTurnoPage({
  params,
}: {
  params: Promise<{ turnoId: string }>;
}) {
  const { turnoId: turnoIdStr } = use(params);
  const turnoId = parseInt(turnoIdStr, 10);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <PagoTurnoContent turnoId={turnoId} />
      </Suspense>
    </ToastProvider>
  );
}
