"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CircleDollarSign,
  Eye,
  Minus,
  PawPrint,
  Pill,
  Plus,
  Stethoscope,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useEffect, useMemo, useState } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Input } from "@/components/ui/Input";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ComprobanteTurnoModal } from "@/components/turnos/ComprobanteTurnoModal";
import {
  type ComprobanteTurno,
  type MedioPagoItem,
  aTipoMedio,
  ETIQUETA_MEDIO,
} from "@/data/pagos";
import type { Venta } from "@/data/ventas";
import type { Consulta } from "@/data/consultas";
import { ApiError, apiGet, apiSend, mensajeDeError } from "@/lib/api-client";
import { useArticulosVendibles, useMediosCobro, usePagos } from "@/lib/use-ventas";
import { SelectorMediosPago } from "@/components/ventas/SelectorMediosPago";

import { formatearFecha } from "@/data/turnos";
import { useTurnoCompleto } from "@/lib/use-turno";

interface ItemCobro {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  /**
   * Viene de la atención médica (insumos aplicados): su cantidad la fijó el
   * profesional y la base exige que coincida, así que no se edita ni se quita.
   */
  bloqueado?: boolean;
}

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

  // Turno, cliente, mascota, profesional y práctica: todo desde la API.
  const {
    turno,
    cliente,
    mascota,
    practica,
    profesionalDisplay,
    cargando: cargandoTurno,
  } = useTurnoCompleto(turnoId);

  // Atención médica del turno y precarga del cobro, desde la API:
  //   GET  /api/consultas?turnoId=      → la atención (debe estar finalizada)
  //   POST /api/ventas/calcular {consultaId} → servicio + insumos a precio de lista
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [arancelBase, setArancelBase] = useState(0);
  const [cargandoCobro, setCargandoCobro] = useState(true);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);

  // Insumos aplicados en la atención (bloqueados) + ítems adicionales del mostrador.
  const [productos, setProductos] = useState<ItemCobro[]>([]);

  const [productoSeleccionado, setProductoSeleccionado] = useState("");

  // Artículos activos con precio cargado en la Lista de Precios (base).
  const catalogoArticulos = useArticulosVendibles();
  const mediosCobro = useMediosCobro();

  const productoOptions: ComboboxOption[] = useMemo(() => {
    return catalogoArticulos.map((prod) => ({
      value: prod.codigo,
      label: `[${prod.categoria}] ${prod.nombre} (${prod.codigo}) — $${prod.precioUnitario.toLocaleString("es-AR")} / ${prod.unidad}`,
    }));
  }, [catalogoArticulos]);

  // Estado del formulario de cobro
  const [observaciones, setObservaciones] = useState("");
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [fichaModalOpen, setFichaModalOpen] = useState(false);

  // Comprobante: el recién emitido, o el de la venta que ya cobró esta atención
  // (se reconstruye desde GET /api/ventas?consultaId=).
  const [comprobanteData, setComprobanteData] = useState<ComprobanteTurno | null>(null);
  const [ventaExistente, setVentaExistente] = useState<Venta | null>(null);
  const [comprobanteVisible, setComprobanteVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const c = await apiGet<Consulta>(`/api/consultas?turnoId=${turnoId}`).catch((e) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        });
        if (cancelado) return;
        if (c && c.estado === "cerrada") {
          setConsulta(c);

          // ¿Ya está cobrada? Entonces se muestra su comprobante en vez de cobrar de nuevo.
          const ventas = await apiGet<Venta[]>(`/api/ventas?consultaId=${c.id}`);
          if (cancelado) return;
          if (ventas.length > 0) {
            setVentaExistente(ventas[0]);
            setErrorCobro("Esta atención ya fue cobrada.");
            return;
          }

          const calculo = await apiSend<{
            lineas: {
              tipo: "articulo" | "practica";
              articuloId: number | null;
              codigo: string;
              nombre: string;
              categoria: string;
              unidad: string;
              cantidad: number;
              precioUnitario: number;
              subtotal: number;
            }[];
          }>("POST", "/api/ventas/calcular", { consultaId: c.id });
          if (cancelado) return;

          // El servicio de la atención es el arancel; los insumos, ítems bloqueados.
          setArancelBase(
            calculo.lineas.filter((l) => l.tipo === "practica").reduce((acc, l) => acc + l.subtotal, 0),
          );
          setProductos(
            calculo.lineas
              .filter((l) => l.tipo === "articulo")
              .map((l) => ({
                id: l.articuloId as number,
                codigo: l.codigo,
                nombre: l.nombre,
                categoria: l.categoria,
                unidad: l.unidad,
                cantidad: l.cantidad,
                precioUnitario: l.precioUnitario,
                bloqueado: true,
              })),
          );
        } else {
          // Cobro directo en mostrador sin consulta cerrada previa:
          // el arancel base se calcula directamente desde la práctica del turno.
          setConsulta(c ?? null);
        }
        setErrorCobro(null);
      } catch (e) {
        // 409 CONSULTA_YA_COBRADA, SIN_PRECIO, etc.: el mensaje ya viene redactado.
        if (!cancelado) setErrorCobro(mensajeDeError(e));
      } finally {
        if (!cancelado) setCargandoCobro(false);
      }
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [turnoId]);

  const errorCobroEfectivo = turno?.pagado ? "Este turno ya fue cobrado." : errorCobro;

  const comprobanteExistente = useMemo<ComprobanteTurno | null>(() => {
    if (!ventaExistente || !turno) return null;
    return {
      numero: ventaExistente.numeroComprobante,
      fechaHora: ventaExistente.fecha,
      turnoId,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : ventaExistente.clienteNombre,
      clienteDoc: cliente?.documento ?? ventaExistente.clienteDoc,
      clienteTel: cliente?.telefono,
      mascotaNombre: mascota?.nombre ?? "—",
      mascotaEspecie: mascota?.especie ?? "—",
      mascotaRaza: mascota?.raza,
      profesional: profesionalDisplay,
      practicaNombre: ventaExistente.conceptoServicio,
      arancel: ventaExistente.arancelServicio,
      productos: ventaExistente.items.map((it) => ({
        codigo: it.codigo,
        nombre: it.nombre,
        unidad: it.unidad,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
      })),
      total: ventaExistente.total,
      medioPago: ventaExistente.medioPago === "mixto" ? "mixto" : aTipoMedio(ventaExistente.medioPago),
      mediosPago: (ventaExistente.mediosPago ?? []).map((m, i) => ({
        id: String(i + 1),
        medio: aTipoMedio(m.medio),
        monto: m.monto,
      })),
    };
  }, [ventaExistente, turno, turnoId, cliente, mascota, profesionalDisplay]);
  const comprobanteActual = comprobanteData ?? comprobanteExistente;
  const comprobanteModalOpen = comprobanteVisible ?? comprobanteActual !== null;

  // Cálculos de liquidación (HU-VTA-01). Los precios son los de la lista vigente.
  const puedeCobrar = !cargandoCobro && errorCobroEfectivo === null && (turno !== null || consulta !== null);

  const totalProductos = useMemo(() => {
    return productos.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  }, [productos]);

  const arancelEfectivo = arancelBase > 0 ? arancelBase : (practica?.precio ?? 0);
  const totalCobrar = arancelEfectivo + totalProductos;

  // Medios de pago (HU-VTA-02): uno o varios, la suma debe dar el total.
  const {
    pagos,
    setPagos,
    asignado,
    restante: saldoRestante,
    valido: esMontoValido,
  } = usePagos(mediosCobro, totalCobrar);

  // Manejo de cantidades de productos
  function handleIncrementar(id: number) {
    setProductos((prev) =>
      prev.map((item) =>
        item.id === id && !item.bloqueado ? { ...item, cantidad: item.cantidad + 1 } : item,
      ),
    );
  }

  function handleDecrementar(id: number) {
    setProductos((prev) =>
      prev
        .map((item) => {
          if (item.id === id && !item.bloqueado) {
            return { ...item, cantidad: Math.max(1, item.cantidad - 1) };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0),
    );
  }

  function handleEliminar(id: number) {
    setProductos((prev) => prev.filter((item) => item.id !== id || item.bloqueado));
  }

  function handleAgregarProducto() {
    if (!productoSeleccionado) return;
    const prodRef = catalogoArticulos.find((p) => p.codigo === productoSeleccionado);
    if (!prodRef) return;

    setProductos((prev) => {
      const existe = prev.find((p) => p.codigo === prodRef.codigo && !p.bloqueado);
      if (existe) {
        return prev.map((p) =>
          p.codigo === prodRef.codigo && !p.bloqueado ? { ...p, cantidad: p.cantidad + 1 } : p,
        );
      }
      return [
        ...prev,
        {
          id: prodRef.id,
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

  async function handleConfirmarCobro() {
    if (!esMontoValido || (!consulta && !turno)) return;

    // Medios elegidos, con su tipo (para el comprobante) y su monto.
    const medios = pagos.map((p) => ({
      formaPagoId: p.formaPagoId,
      medio: mediosCobro.find((m) => m.id === p.formaPagoId)?.tipo ?? "efectivo",
      monto: Number(p.monto),
      referencia: p.referencia.trim() || undefined,
    }));
    const mediosCobroFinal: MedioPagoItem[] = medios.map((m, i) => ({
      id: String(i + 1),
      medio: m.medio,
      monto: m.monto,
      referencia: m.referencia,
    }));
    const medioPagoResumen = medios.length > 1 ? "mixto" : medios[0].medio;
    const refGeneral = medios
      .filter((m) => m.referencia)
      .map((m) => `${ETIQUETA_MEDIO[m.medio]}: ${m.referencia}`)
      .join(" · ");

    setProcesando(true);
    try {
      let venta: Venta;
      if (consulta && consulta.estado === "cerrada") {
        venta = await apiSend<Venta>("POST", "/api/ventas", {
          consultaId: consulta.id,
          lineas: productos
            .filter((p) => !p.bloqueado)
            .map((p) => ({ articuloId: p.id, cantidad: p.cantidad })),
          mediosPago: medios.map((m) => ({ formaPagoId: m.formaPagoId, monto: m.monto })),
        });
      } else {
        venta = await apiSend<Venta>("POST", "/api/ventas", {
          turnoId,
          sucursalId: turno?.sucursalId,
          lineas: [
            ...(turno?.practicaId ? [{ practicaId: turno.practicaId, cantidad: 1 }] : []),
            ...productos
              .filter((p) => !p.bloqueado)
              .map((p) => ({ articuloId: p.id, cantidad: p.cantidad })),
          ],
          mediosPago: medios.map((m) => ({ formaPagoId: m.formaPagoId, monto: m.monto })),
        });
      }

      const nuevoComp: ComprobanteTurno = {
        numero: venta.numeroComprobante,
        fechaHora: venta.fecha,
        turnoId,
        clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : venta.clienteNombre,
        clienteDoc: cliente?.documento ?? venta.clienteDoc,
        clienteTel: cliente?.telefono,
        mascotaNombre: mascota?.nombre || consulta?.mascotaNombre || "—",
        mascotaEspecie: mascota?.especie || consulta?.mascotaEspecie || "—",
        mascotaRaza: mascota?.raza ?? consulta?.mascotaRaza ?? undefined,
        profesional: profesionalDisplay !== "—" ? profesionalDisplay : (consulta?.profesionalNombre || "—"),
        practicaNombre: venta.conceptoServicio || practica?.nombre || "Consulta",
        arancel: venta.arancelServicio || arancelEfectivo,
        productos: venta.items.map((it) => ({
          id: it.id,
          codigo: it.codigo,
          nombre: it.nombre,
          categoria: it.categoria,
          unidad: it.unidad,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
        total: venta.total,
        medioPago: medioPagoResumen,
        mediosPago: mediosCobroFinal,
        referencia: refGeneral,
        observaciones: observaciones.trim(),
      };

      setComprobanteData(nuevoComp);
      setConfirmarOpen(false);
      setComprobanteVisible(true);
      showToast("success", `Cobro del turno #${turnoId} registrado con éxito.`);
    } catch (e) {
      setConfirmarOpen(false);
      showToast("error", mensajeDeError(e));
    } finally {
      setProcesando(false);
    }
  }


  if (cargandoTurno) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream-50">
        <p className="text-sm font-semibold text-text-secondary" role="status">
          Cargando turno…
        </p>
      </div>
    );
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
                              key={`${item.bloqueado ? "c" : "x"}-${item.id}`}
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
                                {/* Controles de cantidad (los insumos de la atención son de solo lectura) */}
                                {item.bloqueado ? (
                                  <span className="rounded-pill border border-border bg-cream-50 px-3 py-1 text-xs font-bold text-brand-900">
                                    {item.cantidad} · de la atención
                                  </span>
                                ) : (
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
                                )}

                                {/* Total de línea */}
                                <span className="min-w-[80px] text-right text-sm font-extrabold text-brand-900">
                                  ${totalLinea.toLocaleString("es-AR")}
                                </span>

                                {!item.bloqueado && (
                                                                <button
                                  type="button"
                                  onClick={() => handleEliminar(item.id)}
                                  aria-label={`Quitar ${item.nombre} de la cuenta`}
                                  title="Quitar ítem"
                                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                                )}
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
                            ${arancelEfectivo.toLocaleString("es-AR")}
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

                        {/* Total de la venta (HU-VTA-01) */}
                        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3">
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

                    <div className="flex flex-col gap-4">
                      {/* Medios de pago (HU-VTA-02) */}
                      <SelectorMediosPago
                        medios={mediosCobro}
                        total={totalCobrar}
                        pagos={pagos}
                        onChange={setPagos}
                        asignado={asignado}
                        restante={saldoRestante}
                      />

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
                        disabled={!esMontoValido || procesando || !puedeCobrar}
                        onClick={() => setConfirmarOpen(true)}
                        className="w-full text-base font-extrabold shadow-sm"
                      >
                        {procesando ? "Procesando cobro..." : "Confirmar"}
                      </Button>

                      {errorCobroEfectivo !== null && (
                        <p role="alert" className="text-center text-[11px] font-semibold text-destructive">
                          {errorCobroEfectivo}
                        </p>
                      )}

                      {puedeCobrar && !esMontoValido && (
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
          pagos.length > 1
            ? `pago combinado (${pagos.map((p) => `$${Number(p.monto).toLocaleString("es-AR")} en ${mediosCobro.find((m) => m.id === p.formaPagoId)?.nombre ?? "medio"}`).join(" + ")})`
            : (mediosCobro.find((m) => m.id === pagos[0]?.formaPagoId)?.nombre ?? "el medio elegido")
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
          setComprobanteVisible(false);
          router.push("/clientes?tab=turnos");
        }}
        comprobante={comprobanteActual}
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
