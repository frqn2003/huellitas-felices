"use client";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  Minus,
  Pill,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingCart,
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
import type { Cliente, ClienteDraft } from "@/data/clientes";
import {
  type ComprobanteTurno,
  ETIQUETA_MEDIO,
} from "@/data/pagos";
import type { Venta, VentaItemDetalle } from "@/data/ventas";
import { apiSend, mensajeDeError } from "@/lib/api-client";
import { useCatalogo } from "@/lib/use-catalogo";
import { useArticulosVendibles, useMediosCobro, usePagos } from "@/lib/use-ventas";
import { SelectorMediosPago } from "@/components/ventas/SelectorMediosPago";
import { descargarPdfComprobante } from "@/lib/generarPdfComprobante";

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

function NuevaVentaScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  // 0. Sucursal
  const sucursales = useCatalogo<{ id: number; nombre: string }>("/api/sucursales");
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");

  const defaultSucursalId = useMemo(() => {
    if (sucursales.length === 0) return "";
    const def = sucursales.find((s) => s.id === 1) ?? sucursales[0];
    return String(def.id);
  }, [sucursales]);

  const sucursalId = sucursalSeleccionada || defaultSucursalId;

  // 1. Cliente
  // Clientes activos de la base + los que se dan de alta desde esta pantalla.
  const clientesApi = useCatalogo<Cliente>("/api/clientes?estado=activo");
  const [clientesNuevos, setClientesNuevos] = useState<Cliente[]>([]);
  const listaClientes = useMemo(() => [...clientesApi, ...clientesNuevos], [clientesApi, clientesNuevos]);
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
    try {
      const nuevo = await apiSend<Cliente>("POST", "/api/clientes", draft);
      setClientesNuevos((prev) => [...prev, nuevo]);
      setClienteIdSeleccionado(String(nuevo.id));
      setEsConsumidorFinal(false);
      setModalNuevoClienteOpen(false);
      showToast("success", `Cliente ${nuevo.nombre} ${nuevo.apellido} registrado y seleccionado`);
      return {};
    } catch (e) {
      return { error: mensajeDeError(e) };
    }
  };

  // 2. Artículos en venta
  const [items, setItems] = useState<VentaItemDetalle[]>([]);
  const [articuloCodigo, setArticuloCodigo] = useState<string>("");
  const [cantidadInput, setCantidadInput] = useState<number>(1);
  const [observaciones, setObservaciones] = useState<string>("");

  // Catálogo de la base: artículos activos con precio cargado en la Lista de Precios.
  const catalogoArticulos = useArticulosVendibles();
  const mediosCobro = useMediosCobro();

  const opcionesArticulos: ComboboxOption[] = useMemo(() => {
    return catalogoArticulos.map((art) => ({
      value: art.codigo,
      label: `[${art.categoria}] ${art.nombre} (${art.codigo}) — $${art.precioUnitario.toLocaleString("es-AR")} / ${art.unidad}`,
    }));
  }, [catalogoArticulos]);

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


  // 3. Medios de pago (HU-VTA-02): uno o varios, la suma debe dar el total.
  const { pagos, setPagos, asignado, restante, valido: balanceCorrecto, reiniciar } = usePagos(mediosCobro, total);

  // Acciones de artículos
  const handleAgregarArticulo = () => {
    if (!articuloCodigo) return;
    const prod = catalogoArticulos.find((p) => p.codigo === articuloCodigo);
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

  // Procesamiento de la venta
  const handleRegistrarCobro = async () => {
    if (items.length === 0 || !balanceCorrecto) return;

    // Medios elegidos, con su tipo (para el comprobante) y su monto.
    const medios = pagos.map((p) => ({
      formaPagoId: p.formaPagoId,
      medio: mediosCobro.find((m) => m.id === p.formaPagoId)?.tipo ?? "efectivo",
      monto: Number(p.monto),
      referencia: p.referencia.trim() || undefined,
    }));
    const referenciaGeneral = medios
      .filter((m) => m.referencia)
      .map((m) => `${ETIQUETA_MEDIO[m.medio]}: ${m.referencia}`)
      .join(" · ");

    setProcesando(true);
    try {
      if (!sucursalId) {
        showToast("error", "Indicá la sucursal de la venta.");
        return;
      }

      // El body NO lleva precios: la base los toma de la Lista de Precios
      // vigente. Descuenta stock, asienta el efectivo en caja y audita.
      const venta = await apiSend<Venta>("POST", "/api/ventas", {
        sucursalId: Number(sucursalId),
        lineas: items.map((it) => ({ articuloId: it.id, cantidad: it.cantidad })),
        mediosPago: medios.map((m) => ({ formaPagoId: m.formaPagoId, monto: m.monto })),
      });

      // La venta de mostrador es anónima en la base (no hay cliente en `venta`):
      // el cliente elegido solo figura en el comprobante.
      let clienteNom = "Consumidor Final";
      let clienteDoc = "—";
      let clienteTel = "—";
      if (!esConsumidorFinal && clienteSeleccionado) {
        clienteNom = `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`;
        clienteDoc = clienteSeleccionado.documento;
        clienteTel = clienteSeleccionado.telefono;
      }

      const comprobanteObj: ComprobanteTurno = {
        numero: venta.numeroComprobante,
        fechaHora: venta.fecha,
        turnoId: -venta.id,
        clienteNombre: clienteNom,
        clienteDoc,
        clienteTel,
        mascotaNombre: "",
        mascotaEspecie: "",
        profesional: "Atención Mostrador / Recepción",
        practicaNombre: "Venta de Mostrador",
        arancel: 0,
        productos: venta.items.map((it) => ({
          codigo: it.codigo,
          nombre: it.nombre,
          unidad: it.unidad,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
        total: venta.total,
        medioPago: medios.length > 1 ? "mixto" : medios[0].medio,
        mediosPago: medios.map((m, i) => ({
          id: `mp-${i}`,
          medio: m.medio,
          monto: m.monto,
          referencia: m.referencia,
        })),
        referencia: referenciaGeneral,
        observaciones: observaciones.trim() || "Venta directa de artículos en mostrador",
      };

      setConfirmarOpen(false);
      setVentaExitosa({ venta, comprobante: comprobanteObj });
      showToast(
        "success",
        `Venta ${venta.numeroComprobante} registrada y cobrada exitosamente por $${venta.total.toLocaleString("es-AR")}.`,
      );
    } catch (e) {
      // El diálogo se cierra y la pantalla conserva el carrito: se corrige y se reintenta.
      setConfirmarOpen(false);
      showToast("error", mensajeDeError(e));
    } finally {
      setProcesando(false);
    }
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
    reiniciar();
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

                  {/* Selector de Sucursal */}
                  <div className="flex items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                    <Building2 className="h-4 w-4 text-brand-900 shrink-0" aria-hidden="true" />
                    <label htmlFor="select-sucursal-venta" className="text-xs font-bold uppercase tracking-wider text-text-secondary whitespace-nowrap">
                      Sucursal:
                    </label>
                    <select
                      id="select-sucursal-venta"
                      value={sucursalId}
                      onChange={(e) => setSucursalSeleccionada(e.target.value)}
                      className="h-8 cursor-pointer rounded-sm border border-border bg-surface px-3 py-1 text-xs font-bold text-text-primary transition-colors focus:border-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-900"
                    >
                      {sucursales.length === 0 ? (
                        <option value="">Cargando sucursales...</option>
                      ) : (
                        sucursales.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.nombre}
                          </option>
                        ))
                      )}
                    </select>
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
                    {/* Total */}
                    <div className="rounded-md border border-border bg-cream-50/70 p-4">
                      <div className="flex flex-col gap-2">
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

                    {/* Medios de pago (HU-VTA-02) */}
                    <SelectorMediosPago
                      medios={mediosCobro}
                      total={total}
                      pagos={pagos}
                      onChange={setPagos}
                      asignado={asignado}
                      restante={restante}
                    />

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
        description={`Se registrará la venta en ${
          sucursales.find((s) => String(s.id) === sucursalId)?.nombre ?? "la sucursal seleccionada"
        } por $${total.toLocaleString("es-AR")} (${
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
