"use client";

import { AlertTriangle, Download, Landmark, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CtaCteListaGlobal } from "@/components/cuentas-corrientes/CtaCteListaGlobal";
import { CtaCorrienteDetalleGlobal } from "@/components/cuentas-corrientes/CtaCorrienteDetalleGlobal";
import {
  RegistrarPagoCtaCteModal,
  type PagoCtaCteNuevo,
} from "@/components/cuentas-corrientes/RegistrarPagoCtaCteModal";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  COMPROBANTES_GLOBAL,
  CUENTAS_CORRIENTES_GLOBAL,
  DIAS_ALERTA_PROXIMO_VENCER,
  PAGOS_GLOBAL,
  type ComprobantePendiente,
  type CuentaCorriente,
  type EntidadCtaCte,
  type EstadoCtaCte,
  type Pago,
} from "@/data/cuentas-corrientes";

export type FiltroTipo = "Todos" | "proveedor" | "cliente";

function exportarCSV(listado: CuentaCorriente[]) {
  const cabeceras = ["Entidad", "Tipo", "Documento", "Saldo", "Proximo vencimiento", "Estado"];
  const filas = listado.map((c) =>
    [
      `"${c.nombre.replace(/"/g, '""')}"`,
      c.tipo,
      `"${c.documento.replace(/"/g, '""')}"`,
      String(c.saldoActual),
      c.proximoVencimiento ?? "",
      c.estadoCta,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cuentas-corrientes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Deriva el estado cta.cte. de una entidad a partir de su saldo y vencimiento. */
function derivarEstadoCta(saldoActual: number, proximoVencimiento: string | null): EstadoCtaCte {
  if (saldoActual < 0) return "Credito";
  if (saldoActual === 0) return "Saldado";
  if (!proximoVencimiento) return "Pendiente";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vto = new Date(`${proximoVencimiento}T00:00:00`);
  const diffDias = Math.round((vto.getTime() - hoy.getTime()) / 86400000);
  if (diffDias < 0) return "Vencido";
  if (diffDias <= DIAS_ALERTA_PROXIMO_VENCER) return "ProximoAVencer";
  return "Pendiente";
}

function CuentasCorrientesScreen() {
  const { showToast } = useToast();

  // Listado y detalle viven en estado local para reflejar pagos/cobranzas en tiempo real.
  const [listado, setListado] = useState<CuentaCorriente[]>(CUENTAS_CORRIENTES_GLOBAL);
  const [comprobantes, setComprobantes] =
    useState<Record<number, ComprobantePendiente[]>>(COMPROBANTES_GLOBAL);
  const [pagos, setPagos] = useState<Record<number, Pago[]>>(PAGOS_GLOBAL);

  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [cuentaActiva, setCuentaActiva] = useState<CuentaCorriente | null>(null);
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [modalEntidad, setModalEntidad] = useState<{ id: number; nombre: string; tipo: EntidadCtaCte } | null>(null);

  // Filtros del listado
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("Todos");

  // Paginación
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtrados = useMemo(() => {
    return listado.filter((c) => {
      if (filtroTipo !== "Todos" && c.tipo !== filtroTipo) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return c.nombre.toLowerCase().includes(q) || c.documento.toLowerCase().includes(q);
      }
      return true;
    });
  }, [listado, busqueda, filtroTipo]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtrados.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtrados.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtrados.length);

  const abrirDetalle = (cuenta: CuentaCorriente) => {
    setCuentaActiva(cuenta);
    setVista("detalle");
  };

  const abrirRegistrar = (cuenta: CuentaCorriente) => {
    setModalEntidad({ id: cuenta.id, nombre: cuenta.nombre, tipo: cuenta.tipo });
    setRegistrarOpen(true);
  };

  const handleRegistrar = (pagoNuevo: PagoCtaCteNuevo) => {
    // BACKEND: reemplazar por POST /api/pagos con { numero, tipo, formaPago, fecha, monto, imputaciones }
    if (!modalEntidad) return;
    const entId = modalEntidad.id;

    // Registrar el nuevo pago/cobranza.
    setPagos((prev) => ({
      ...prev,
      [entId]: [
        ...(prev[entId] ?? []),
        {
          id: Math.max(0, ...(pagos[entId] ?? []).map((p) => p.id)) + 1,
          tipo: pagoNuevo.tipo,
          numero: pagoNuevo.numero,
          fecha: pagoNuevo.fecha,
          formaPago: pagoNuevo.formaPago,
          monto: pagoNuevo.monto,
          imputaciones: pagoNuevo.imputaciones.map((i) => ({
            comprobanteId: i.comprobanteId,
            numero: comprobantes[entId]?.find((c) => c.id === i.comprobanteId)?.numero ?? "",
            monto: i.monto,
          })),
          estado: "Vigente",
        },
      ],
    }));

    // Bajar el saldo pendiente de cada comprobante imputado, recalcular el saldo de la
    // entidad y su estado (en tiempo real).
    setComprobantes((prevComps) => {
      const comps = (prevComps[entId] ?? []).map((c) => {
        const imp = pagoNuevo.imputaciones.find((i) => i.comprobanteId === c.id);
        if (!imp) return c;
        const nuevoSaldo = c.saldoPendiente - imp.monto;
        const estado: EstadoCtaCte = nuevoSaldo <= 0 ? "Saldado" : c.estadoCta;
        return { ...c, saldoPendiente: nuevoSaldo, estadoCta: estado };
      });
      const nuevoSaldo = comps.reduce((acc, c) => acc + c.saldoPendiente, 0);
      setListado((prev) =>
        prev.map((c) =>
          c.id === entId
            ? {
                ...c,
                saldoActual: nuevoSaldo,
                estadoCta: derivarEstadoCta(nuevoSaldo, c.proximoVencimiento),
              }
            : c,
        ),
      );
      setCuentaActiva((prevCuenta) =>
        prevCuenta
          ? {
              ...prevCuenta,
              saldoActual: nuevoSaldo,
              estadoCta: derivarEstadoCta(nuevoSaldo, prevCuenta.proximoVencimiento),
            }
          : prevCuenta,
      );
      return { ...prevComps, [entId]: comps };
    });

    setRegistrarOpen(false);
    const verbo = modalEntidad.tipo === "proveedor" ? "pago" : "cobranza";
    showToast("success", `${verbo === "pago" ? "Pago" : "Cobranza"} registrado correctamente. Se actualizó el saldo.`);
  };

  return (
    <div className="flex min-h-screen bg-cream-50">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-900/10">
                  <Landmark className="h-6 w-6 text-brand-900" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
                    Cuentas corrientes
                  </h1>
                  <p className="text-sm font-medium text-text-secondary">
                    Saldos y movimientos de proveedores y clientes en un solo lugar
                  </p>
                </div>
              </div>

              {vista === "lista" && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      exportarCSV(filtrados);
                      showToast("success", "Exportación completada: el listado filtrado se descargó en CSV");
                    }}
                    disabled={filtrados.length === 0}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Exportar
                  </Button>
                </div>
              )}

              {vista === "detalle" && cuentaActiva && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    // BACKEND: reemplazar por POST /api/entidades/{id}/cta-corriente/pdf
                    showToast("success", "Exportación completada: el detalle se descargó en PDF");
                  }}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar PDF
                </Button>
              )}
            </div>

            {vista === "lista" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                    placeholder="Buscar por entidad o documento..."
                    aria-label="Buscar por entidad o documento"
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="filtro-tipo" className="text-sm font-bold text-text-primary">Tipo</label>
                  <select
                    id="filtro-tipo"
                    value={filtroTipo}
                    onChange={(e) => { setFiltroTipo(e.target.value as FiltroTipo); setPage(1); }}
                    className="h-11 cursor-pointer rounded-pill border border-border bg-surface px-4 text-base text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  >
                    <option value="Todos">Todos</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
          {vista === "lista" ? (
            <>
              <CtaCteListaGlobal
                cuentas={pageItems}
                onVerDetalle={abrirDetalle}
                onRegistrar={abrirRegistrar}
              />

              {pageItems.length > 0 && (
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  totalItems={filtrados.length}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="cuentas corrientes"
                />
              )}
            </>
          ) : cuentaActiva ? (
            <CtaCorrienteDetalleGlobal
              cuenta={cuentaActiva}
              comprobantes={comprobantes[cuentaActiva.id] ?? []}
              pagos={pagos[cuentaActiva.id] ?? []}
              onVolver={() => setVista("lista")}
              onRegistrar={() => abrirRegistrar(cuentaActiva)}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
              </span>
              <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                No se pudo cargar la cuenta corriente
              </h3>
              <Button variant="secondary" onClick={() => setVista("lista")}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Volver al listado
              </Button>
            </div>
          )}
        </div>
      </main>

      <RegistrarPagoCtaCteModal
        open={registrarOpen}
        entidad={modalEntidad}
        comprobantes={modalEntidad ? (comprobantes[modalEntidad.id] ?? []) : []}
        pagosExistentes={modalEntidad ? (pagos[modalEntidad.id] ?? []) : []}
        onClose={() => { setRegistrarOpen(false); setModalEntidad(null); }}
        onConfirm={handleRegistrar}
      />
    </div>
  );
}

export default function CuentasCorrientesPage() {
  return (
    <ToastProvider>
      <CuentasCorrientesScreen />
    </ToastProvider>
  );
}
