"use client";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  Layers,
  Minus,
  Pill,
  Plus,
  QrCode,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Input } from "@/components/ui/Input";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { ComprobanteTurnoModal } from "@/components/turnos/ComprobanteTurnoModal";
import { clientesIniciales, type Cliente, type ClienteDraft } from "@/data/clientes";
import { LISTA_PRECIOS_ARTICULOS } from "@/data/lista-precios";
import {
  guardarComprobanteTurno,
  type ComprobanteTurno,
  type TipoMedioPago,
} from "@/data/pagos";
import { guardarVenta, type Venta, type VentaItemDetalle } from "@/data/ventas";
import { descargarPdfComprobante } from "@/lib/generarPdfComprobante";

function generarNumeroComprobante() {
  const ahora = new Date();
  const fechaStr = ahora.toISOString().slice(0, 16).replace("T", " ");
  const numeroComp = `REC-${ahora.getFullYear()}-${String(ahora.getTime()).slice(-6)}`;
  return { id: ahora.getTime(), fechaStr, numeroComp };
}

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({ title, icon, badge, children }: SectionCardProps) {
  return (
    <section className="flex flex-col rounded-md border border-border bg-surface p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-900/10 text-brand-900">
            {icon}
          </span>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            {title}
          </h2>
        </div>
        {badge}
      </header>
      {children}
    </section>
  );
}

const MEDIOS_PAGO: {
  id: TipoMedioPago;
  label: string;
  descripcion: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  {
    id: "efectivo",
    label: "Efectivo",
    descripcion: "Cobro directo en caja mostrador",
    icon: Banknote,
  },
  {
    id: "transferencia",
    label: "Transferencia / QR",
    descripcion: "MercadoPago, Alias, CBU o tarjeta",
    icon: QrCode,
  },
];

function NuevaVentaScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  // 1. Cliente
  const [listaClientes, setListaClientes] = useState<Cliente[]>(clientesIniciales);
  const [modalNuevoClienteOpen, setModalNuevoClienteOpen] = useState(false);
  const [esConsumidorFinal, setEsConsumidorFinal] = useState(true);
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string>("");

  const clienteSeleccionado = useMemo(() => {
    if (esConsumidorFinal || !clienteIdSeleccionado) return null;
    return listaClientes.find((c) => String(c.id) === clienteIdSeleccionado) ?? null;
  }, [esConsumidorFinal, clienteIdSeleccionado, listaClientes]);

  const opcionesClientes: ComboboxOption[] = useMemo(() => {
    return listaClientes.map((c) => ({
      value: String(c.id),
      label: `${c.nombre} ${c.apellido} (DNI: ${c.documento})`,
    }));
  }, [listaClientes]);

  const handleSaveNuevoCliente = async (draft: ClienteDraft): Promise<{ error?: string }> => {
    const nuevoId = Math.max(0, ...listaClientes.map((c) => c.id)) + 1;
    const nuevo: Cliente = { ...draft, id: nuevoId };
    setListaClientes((prev) => [...prev, nuevo]);
    setClienteIdSeleccionado(String(nuevoId));
    setEsConsumidorFinal(false);
    setModalNuevoClienteOpen(false);
    showToast("success", `Cliente ${nuevo.nombre} ${nuevo.apellido} registrado y seleccionado`);
    return {};
  };

  // 2. Artículos en venta
  const [items, setItems] = useState<VentaItemDetalle[]>([]);
  const [articuloCodigo, setArticuloCodigo] = useState<string>("");
  const [cantidadInput, setCantidadInput] = useState<number>(1);
  const [observaciones, setObservaciones] = useState<string>("");

  const opcionesArticulos: ComboboxOption[] = useMemo(() => {
    return LISTA_PRECIOS_ARTICULOS.map((art) => ({
      value: art.codigo,
      label: `[${art.categoria}] ${art.nombre} (${art.codigo}) — $${art.precioUnitario.toLocaleString("es-AR")} / ${art.unidad}`,
    }));
  }, []);

  // 3. Medios de Pago
  const [modoPago, setModoPago] = useState<"simple" | "combinado">("simple");
  const [medioPagoSimple, setMedioPagoSimple] = useState<TipoMedioPago>("efectivo");
  const [montoEfectivo, setMontoEfectivo] = useState<number>(0);
  const [montoTransferencia, setMontoTransferencia] = useState<number>(0);
  const [referenciaTransferencia, setReferenciaTransferencia] = useState<string>("");
  const [comprobanteRef, setComprobanteRef] = useState<string>("");

  // Diálogo de confirmación y estado posterior a la venta
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState<{
    venta: Venta;
    comprobante: ComprobanteTurno;
  } | null>(null);
  const [modalComprobanteOpen, setModalComprobanteOpen] = useState(false);

  // Cálculos financieros
  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + it.subtotal, 0);
  }, [items]);

  const subtotalNeto = Math.round(total / 1.21);
  const impuestosIva = total - subtotalNeto;

  const totalCubierto = montoEfectivo + montoTransferencia;
  const saldoRestante = total - totalCubierto;
  const balanceCorrecto = modoPago === "simple" || (total > 0 && Math.abs(saldoRestante) === 0);

  // Acciones de artículos
  const handleAgregarArticulo = () => {
    if (!articuloCodigo) return;
    const prod = LISTA_PRECIOS_ARTICULOS.find((p) => p.codigo === articuloCodigo);
    if (!prod) return;

    const cant = Math.max(1, cantidadInput);
    const index = items.findIndex((it) => it.codigo === prod.codigo);

    if (index >= 0) {
      setItems((prev) => {
        const copy = [...prev];
        const exist = copy[index];
        const newCant = exist.cantidad + cant;
        copy[index] = {
          ...exist,
          cantidad: newCant,
          subtotal: newCant * exist.precioUnitario,
        };
        return copy;
      });
    } else {
      const nuevo: VentaItemDetalle = {
        id: prod.id,
        codigo: prod.codigo,
        nombre: prod.nombre,
        categoria: prod.categoria,
        unidad: prod.unidad,
        cantidad: cant,
        precioUnitario: prod.precioUnitario,
        subtotal: cant * prod.precioUnitario,
      };
      setItems((prev) => [...prev, nuevo]);
    }

    setArticuloCodigo("");
    setCantidadInput(1);
  };

  const handleModificarCantidad = (codigo: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.codigo !== codigo) return it;
          const nueva = it.cantidad + delta;
          if (nueva <= 0) return null;
          return {
            ...it,
            cantidad: nueva,
            subtotal: nueva * it.precioUnitario,
          };
        })
        .filter((it): it is VentaItemDetalle => it !== null),
    );
  };

  const handleEliminarItem = (codigo: string) => {
    setItems((prev) => prev.filter((it) => it.codigo !== codigo));
  };

  // Modos de pago
  const handleCambiarModo = (nuevoModo: "simple" | "combinado") => {
    setModoPago(nuevoModo);
    if (nuevoModo === "combinado") {
      setMontoEfectivo(total);
      setMontoTransferencia(0);
      setReferenciaTransferencia("");
    }
  };

  const handleAsignarRestoEfectivo = () => {
    const restante = Math.max(0, total - montoTransferencia);
    setMontoEfectivo(restante);
  };

  const handleAsignarRestoTransferencia = () => {
    const restante = Math.max(0, total - montoEfectivo);
    setMontoTransferencia(restante);
  };

  // Procesamiento de la venta
  const handleRegistrarCobro = () => {
    if (items.length === 0 || !balanceCorrecto) return;
    setProcesando(true);

    const { id: ventaId, fechaStr, numeroComp } = generarNumeroComprobante();

    let clienteNom = "Consumidor Final";
    let clienteDoc = "—";
    let clienteTel = "—";
    let clienteIdFinal = 0;

    if (!esConsumidorFinal && clienteSeleccionado) {
      clienteNom = `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`;
      clienteDoc = clienteSeleccionado.documento;
      clienteTel = clienteSeleccionado.telefono;
      clienteIdFinal = clienteSeleccionado.id;
    }

    const nuevaVenta: Venta = {
      id: ventaId,
      numeroComprobante: numeroComp,
      clienteId: clienteIdFinal,
      clienteNombre: clienteNom,
      clienteDoc: clienteDoc,
      sucursalId: 1,
      consultaId: null,
      turnoId: null,
      usuarioId: 1,
      fecha: fechaStr,
      conceptoServicio: "Venta directa en mostrador",
      arancelServicio: 0,
      items,
      subtotalNeto,
      impuestosIva,
      total,
      medioPago: modoPago === "combinado" ? "mixto" : medioPagoSimple,
      mediosPago:
        modoPago === "combinado"
          ? [
              {
                formaPagoId: 1,
                medio: "efectivo",
                monto: montoEfectivo,
              },
              {
                formaPagoId: 2,
                medio: "transferencia",
                monto: montoTransferencia,
                referencia: referenciaTransferencia.trim() || undefined,
              },
            ]
          : [
              {
                formaPagoId: medioPagoSimple === "efectivo" ? 1 : 2,
                medio: medioPagoSimple,
                monto: total,
                referencia:
                  medioPagoSimple === "transferencia"
                    ? comprobanteRef.trim() || undefined
                    : undefined,
              },
            ],
      estado: "vigente",
    };

    guardarVenta(nuevaVenta);

    const comprobanteObj: ComprobanteTurno = {
      numero: numeroComp,
      fechaHora: fechaStr,
      turnoId: -(nuevaVenta.id),
      clienteNombre: clienteNom,
      clienteDoc: clienteDoc,
      clienteTel: clienteTel,
      mascotaNombre: "",
      mascotaEspecie: "",
      profesional: "Atención Mostrador / Recepción",
      practicaNombre: "Venta de Mostrador",
      arancel: 0,
      productos: items.map((it) => ({
        codigo: it.codigo,
        nombre: it.nombre,
        unidad: it.unidad,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
      })),
      subtotalNeto,
      impuestosIva,
      total,
      medioPago: modoPago === "combinado" ? "mixto" : medioPagoSimple,
      mediosPago: nuevaVenta.mediosPago?.map((mp, i) => ({
        id: `mp-${i}`,
        medio: mp.medio === "efectivo" ? "efectivo" : "transferencia",
        monto: mp.monto,
        referencia: mp.referencia,
      })),
      referencia: modoPago === "combinado" ? referenciaTransferencia : comprobanteRef,
      observaciones: observaciones.trim() || "Venta directa de artículos en mostrador",
    };

    guardarComprobanteTurno(comprobanteObj);

    setTimeout(() => {
      setProcesando(false);
      setConfirmarOpen(false);
      setVentaExitosa({
        venta: nuevaVenta,
        comprobante: comprobanteObj,
      });
      showToast(
        "success",
        `Venta #${numeroComp} registrada y cobrada exitosamente por $${total.toLocaleString("es-AR")}.`,
      );
    }, 400);
  };

  // Reset para continuar vendiendo inmediatamente
  const handleContinuarVendiendo = () => {
    setVentaExitosa(null);
    setEsConsumidorFinal(true);
    setClienteIdSeleccionado("");
    setItems([]);
    setArticuloCodigo("");
    setCantidadInput(1);
    setObservaciones("");
    setModoPago("simple");
    setMedioPagoSimple("efectivo");
    setMontoEfectivo(0);
    setMontoTransferencia(0);
    setReferenciaTransferencia("");
    setComprobanteRef("");
  };

  const handleDescargarPdfPostVenta = () => {
    if (!ventaExitosa) return;
    const c = ventaExitosa.comprobante;
    descargarPdfComprobante({
      numero: c.numero,
      fechaHora: c.fechaHora,
      turnoId: c.turnoId,
      clienteNombre: c.clienteNombre,
      clienteDoc: c.clienteDoc,
      clienteTel: c.clienteTel,
      mascotaNombre: c.mascotaNombre,
      mascotaEspecie: c.mascotaEspecie,
      mascotaRaza: c.mascotaRaza,
      profesional: c.profesional,
      practicaNombre: c.practicaNombre,
      arancel: c.arancel,
      productos: c.productos,
      subtotalNeto: c.subtotalNeto,
      impuestosIva: c.impuestosIva,
      total: c.total,
      medioPago: c.medioPago,
      mediosPago: c.mediosPago,
      referencia: c.referencia,
      observaciones: c.observaciones,
    });
    showToast("success", "Comprobante PDF descargado exitosamente.");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream-50">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Cabecera Pet Bliss */}
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/clientes?tab=ventas")}
                className="inline-flex h-10 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors duration-fast ease-out hover:border-brand-900 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a Ventas
              </button>
              <span className="text-xs font-bold text-text-secondary">/</span>
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Caja y Mostrador
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                  Liquidación en Mostrador
                </p>
                <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-3xl">
                  Nueva Venta de Mostrador
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-24 sm:px-8">
          {/* PANTALLA DE ÉXITO POST-VENTA */}
          {ventaExitosa ? (
            <div className="flex flex-col items-center justify-center gap-6 rounded-md border border-emerald-200 bg-surface p-8 text-center shadow-card sm:p-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
              </div>

              <div className="flex max-w-md flex-col gap-2">
                <span className="rounded-pill bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  Operación Completada
                </span>
                <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
                  ¡Cobro Registrado con Éxito!
                </h2>
                <p className="font-mono text-sm font-bold text-brand-900">
                  {ventaExitosa.comprobante.numero}
                </p>
                <p className="text-sm text-text-secondary">
                  Se emitió el comprobante por un total de{" "}
                  <strong className="text-brand-900">
                    ${ventaExitosa.venta.total.toLocaleString("es-AR")}
                  </strong>{" "}
                  a nombre de <strong>{ventaExitosa.venta.clienteNombre}</strong>.
                </p>
              </div>

              {/* Botones de acción post-venta solicitados */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleDescargarPdfPostVenta}
                  className="gap-2 font-bold shadow-sm"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Descargar Comprobante PDF
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalComprobanteOpen(true)}
                  className="gap-2 font-bold"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Ver Comprobante
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleContinuarVendiendo}
                  className="gap-2 font-bold hover:border-brand-900 hover:text-brand-900"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Continuar Vendiendo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/clientes?tab=ventas")}
                  className="gap-2 font-bold"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Volver a Ventas
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* HEADER RESUMEN / TITULAR DE LA VENTA A LO LARGO */}
              <div className="rounded-md border border-border bg-surface p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                    {/* Selector de Tipo de Cliente (Segmented buttons) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEsConsumidorFinal(true)}
                        className={`cursor-pointer rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
                          esConsumidorFinal
                            ? "bg-brand-900 text-cream-50"
                            : "border border-border bg-cream-50 text-text-secondary hover:bg-cream-100"
                        }`}
                      >
                        Consumidor Final
                      </button>
                      <button
                        type="button"
                        onClick={() => setEsConsumidorFinal(false)}
                        className={`cursor-pointer rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
                          !esConsumidorFinal
                            ? "bg-brand-900 text-cream-50"
                            : "border border-border bg-cream-50 text-text-secondary hover:bg-cream-100"
                        }`}
                      >
                        Cliente Registrado
                      </button>
                    </div>

                    {/* Separador vertical */}
                    <div className="hidden h-5 w-px bg-border sm:block" />

                    {/* Datos del Titular */}
                    {esConsumidorFinal ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                        <div>
                          <span className="font-bold text-text-secondary uppercase">Titular: </span>
                          <span className="font-semibold text-text-primary">Consumidor Final · Venta Directa en Mostrador</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                          <span className="font-bold text-text-secondary uppercase">Titular: </span>
                        </div>
                        <div className="w-64 sm:w-72">
                          <Combobox
                            id="combobox-cliente-cobro"
                            options={opcionesClientes}
                            value={clienteIdSeleccionado}
                            onChange={setClienteIdSeleccionado}
                            placeholder="Buscar por Nombre, DNI..."
                            noResultsText="No se encontró el cliente"
                            emptyAction={{
                              label: "+ Registrar nuevo cliente",
                              onClick: () => setModalNuevoClienteOpen(true),
                            }}
                          />
                        </div>
                        {clienteSeleccionado && (
                          <span className="rounded-pill bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            Activo
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FORMULARIO DE VENTA EN 2 COLUMNAS (ESTILO COBRO DE TURNO) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* COLUMNA IZQUIERDA: CATÁLOGO DE ARTÍCULOS (7 cols) */}
                <div className="flex flex-col gap-6 lg:col-span-7">
                  {/* Catálogo de artículos e insumos */}
                <SectionCard
                  title="Catálogo de Productos y Medicamentos"
                  icon={<Pill className="h-4 w-4" aria-hidden="true" />}
                  badge={
                    <span className="rounded-pill bg-brand-900/10 px-2.5 py-0.5 text-xs font-bold text-brand-900">
                      {items.length} {items.length === 1 ? "ítem" : "ítems"}
                    </span>
                  }
                >
                  <div className="flex flex-col gap-4">
                    {/* Selector de artículo y cantidad */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-8">
                        <label
                          htmlFor="combobox-articulo-cobro"
                          className="mb-1 block text-xs font-bold text-text-secondary"
                        >
                          Buscar artículo / medicamento
                        </label>
                        <Combobox
                          id="combobox-articulo-cobro"
                          options={opcionesArticulos}
                          value={articuloCodigo}
                          onChange={setArticuloCodigo}
                          placeholder="Buscar por código, nombre o categoría..."
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-bold text-text-secondary">
                          Cantidad
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={cantidadInput}
                          onChange={(e) =>
                            setCantidadInput(Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleAgregarArticulo}
                          disabled={!articuloCodigo}
                          className="w-full justify-center gap-1 font-bold"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {/* Tabla de ítems a cobrar */}
                    {items.length > 0 ? (
                      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border bg-cream-50 font-bold uppercase tracking-wider text-text-secondary">
                            <tr>
                              <th className="px-3.5 py-2.5">Artículo</th>
                              <th className="px-3 py-2.5">Precio Unit.</th>
                              <th className="px-3 py-2.5 text-center">Cantidad</th>
                              <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                              <th className="px-2.5 py-2.5 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {items.map((it) => (
                              <tr key={it.codigo} className="hover:bg-cream-50/50">
                                <td className="px-3.5 py-3">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-brand-900">{it.nombre}</span>
                                    <span className="font-mono text-[10px] text-text-secondary">
                                      {it.codigo} · {it.categoria}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 font-mono text-text-primary">
                                  ${it.precioUnitario.toLocaleString("es-AR")}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleModificarCantidad(it.codigo, -1)}
                                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface text-text-secondary hover:bg-cream-100"
                                      aria-label="Restar uno"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-6 text-center font-bold text-brand-900">
                                      {it.cantidad}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleModificarCantidad(it.codigo, 1)}
                                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface text-text-secondary hover:bg-cream-100"
                                      aria-label="Sumar uno"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-brand-900">
                                  ${it.subtotal.toLocaleString("es-AR")}
                                </td>
                                <td className="px-2.5 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarItem(it.codigo)}
                                    className="cursor-pointer text-text-secondary transition-colors hover:text-destructive"
                                    title="Eliminar artículo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-10 text-center text-xs text-text-secondary">
                        <ShoppingCart className="h-8 w-8 text-brand-900/30" aria-hidden="true" />
                        <p className="font-semibold">El carrito de venta está vacío.</p>
                        <p className="text-[11px] text-text-secondary">
                          Buscá arriba los medicamentos o productos que solicita el cliente.
                        </p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* COLUMNA DERECHA: RESUMEN FINANCIERO Y MEDIOS DE PAGO (5 cols) */}
              <div className="flex flex-col gap-6 lg:col-span-5">
                <SectionCard
                  title="Liquidación y Cobro"
                  icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
                >
                  <div className="flex flex-col gap-5">
                    {/* Desglose impositivo */}
                    <div className="rounded-md border border-border bg-cream-50/70 p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                          <span>Subtotal (Neto gravado):</span>
                          <span className="font-mono font-bold text-text-primary">
                            ${subtotalNeto.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                          <span>IVA discriminado (21%):</span>
                          <span className="font-mono font-bold text-text-primary">
                            ${impuestosIva.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2.5">
                          <span className="text-sm font-extrabold uppercase tracking-wide text-brand-900">
                            Total a Cobrar
                          </span>
                          <span className="font-display text-2xl font-black text-brand-900">
                            ${total.toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Modalidad de Pago (Segmented control) */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-text-secondary">
                          Modalidad de Pago
                        </h3>
                        <span className="rounded-pill bg-brand-900/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-900">
                          {modoPago === "simple" ? "1 solo medio" : "Efectivo + Transferencia"}
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

                    {/* VISTA 1: Pago Único */}
                    {modoPago === "simple" && (
                      <div className="flex flex-col gap-3.5">
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
                                    className={`h-4 w-4 ${
                                      isSelected ? "text-brand-900" : "text-text-secondary"
                                    }`}
                                    aria-hidden={true}
                                  />
                                  {isSelected && (
                                    <CheckCircle2
                                      className="h-4 w-4 text-brand-900"
                                      aria-hidden={true}
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

                    {/* VISTA 2: Pago Combinado (Efectivo y Transferencia fijos) */}
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
                                htmlFor="monto-efectivo-venta"
                                className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
                              >
                                Monto en Efectivo ($)
                              </label>
                              <input
                                id="monto-efectivo-venta"
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
                                htmlFor="monto-transferencia-venta"
                                className="text-[11px] font-bold uppercase tracking-wider text-text-secondary"
                              >
                                Monto en Transferencia ($)
                              </label>
                              <input
                                id="monto-transferencia-venta"
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
                                htmlFor="ref-transferencia-venta"
                                className="text-[10px] font-bold text-text-secondary"
                              >
                                Nº de Comprobante / Referencia TRX (opcional)
                              </label>
                              <input
                                id="ref-transferencia-venta"
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
                              ${total.toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-text-secondary">
                            <span>Total asignado:</span>
                            <span className="font-bold text-brand-900">
                              ${totalCubierto.toLocaleString("es-AR")}
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
                      label="Observaciones de mostrador (opcional)"
                      placeholder="Notas internas para el comprobante o caja..."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />

                    {/* Botón Principal de Cobro */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={items.length === 0 || !balanceCorrecto}
                        onClick={() => setConfirmarOpen(true)}
                        className="w-full justify-center gap-2 font-bold shadow-sm"
                      >
                        <Receipt className="h-5 w-5" aria-hidden="true" />
                        Confirmar y Cobrar Venta (${total.toLocaleString("es-AR")})
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </>
        )}
        </div>
      </main>

      {/* Diálogo de Confirmación */}
      <ConfirmarDialog
        open={confirmarOpen}
        onClose={() => setConfirmarOpen(false)}
        onConfirm={handleRegistrarCobro}
        title="¿Confirmar y Emitir Cobro de Venta?"
        description={`Se registrará la venta por $${total.toLocaleString("es-AR")} (${
          items.length
        } ítems) a nombre de ${
          esConsumidorFinal
            ? "Consumidor Final"
            : clienteSeleccionado
              ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
              : "Consumidor Final"
        }.`}
        confirmLabel={procesando ? "Procesando cobro..." : "Confirmar Cobro"}
        tone="success"
      />

      {/* Modal para ver comprobante completo */}
      {modalComprobanteOpen && ventaExitosa && (
        <ComprobanteTurnoModal
          open={modalComprobanteOpen}
          onClose={() => setModalComprobanteOpen(false)}
          comprobante={ventaExitosa.comprobante}
        />
      )}

      {/* Modal para registrar un nuevo cliente en el acto */}
      <ClienteFormModal
        open={modalNuevoClienteOpen}
        modo="crear"
        cliente={null}
        clientes={listaClientes}
        mascotas={[]}
        onClose={() => setModalNuevoClienteOpen(false)}
        onSave={handleSaveNuevoCliente}
      />
    </div>
  );
}

export default function NuevaVentaPage() {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <NuevaVentaScreen />
      </Suspense>
    </ToastProvider>
  );
}
