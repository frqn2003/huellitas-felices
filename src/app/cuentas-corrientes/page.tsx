"use client";

import { AlertTriangle, Download, Landmark, Printer, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CtaCteListaGlobal } from "@/components/cuentas-corrientes/CtaCteListaGlobal";
import { CtaCorrienteDetalleGlobal } from "@/components/cuentas-corrientes/CtaCorrienteDetalleGlobal";
import { CtaCteImprimible } from "@/components/cuentas-corrientes/CtaCteImprimible";
import {
  RegistrarPagoCtaCteModal,
  type PagoCtaCteNuevo,
} from "@/components/cuentas-corrientes/RegistrarPagoCtaCteModal";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { apiGet, apiSend, mensajeDeError } from "@/lib/api-client";
import type {
  ComprobantePendiente,
  CuentaCorriente,
  EstadoCtaCte,
  Pago,
} from "@/data/cuentas-corrientes";

/**
 * HU-FIN-02 — Cuentas Corrientes de Proveedores.
 *
 * ⚠️ ESTA PANTALLA ERA 100% HARDCODEADA HASTA EL 2026-09-09.
 *
 * Lo que se fue, y por qué ninguna de las tres cosas podía quedarse:
 *
 *  · `CUENTAS_CORRIENTES_GLOBAL` / `COMPROBANTES_GLOBAL` / `PAGOS_GLOBAL` —
 *    datos inventados en el bundle.
 *
 *  · `derivarEstadoCta(saldo, vencimiento)` — decidía en el navegador si un
 *    comprobante estaba vencido. Era la SEGUNDA definición de "vencido" (la
 *    otra vive en `vista_cuenta_corriente_proveedor`), y las dos podían
 *    discrepar: la del front usaba el reloj de la máquina del usuario.
 *
 *  · La aritmética de saldos de `handleRegistrar` — restaba los montos
 *    imputados a mano y recalculaba el saldo con un `reduce`. Era la TERCERA
 *    definición de "saldo pendiente". Ahora el POST devuelve el detalle
 *    completo recalculado por la vista y acá solo se hace `setState`.
 *
 * También se cayó el filtro Proveedor/Cliente: el lado cliente no existe en la
 * base (no hay tabla `cliente` ni `cliente_id` en `pago`, y el enum `tipo_pago`
 * tiene un solo valor). Ofrecer un filtro que nunca puede devolver nada es peor
 * que no ofrecerlo.
 */

type Detalle = {
  cuenta: CuentaCorriente;
  comprobantes: ComprobantePendiente[];
  pagos: Pago[];
};

type ListadoApi = {
  items: CuentaCorriente[];
  total: number;
  pagina: number;
  porPagina: number;
};

const ESTADOS: (EstadoCtaCte | "Todos")[] = [
  "Todos",
  "Vencido",
  "ProximoAVencer",
  "Credito",
  "Saldado",
  "Pendiente",
];

const ETIQUETA_ESTADO: Record<EstadoCtaCte | "Todos", string> = {
  Todos: "Todos",
  Vencido: "Vencido",
  ProximoAVencer: "Próximo a vencer",
  Credito: "Crédito a favor",
  Saldado: "Saldado",
  Pendiente: "Pendiente",
};

function exportarCSV(listado: CuentaCorriente[]) {
  const cabeceras = ["Entidad", "Documento", "Saldo", "Proximo vencimiento", "Estado"];
  const filas = listado.map((c) =>
    [
      `"${c.nombre.replace(/"/g, '""')}"`,
      `"${c.documento.replace(/"/g, '""')}"`,
      String(c.saldoActual),
      c.proximoVencimiento ?? "",
      c.estadoCta,
    ].join(";"),
  );
  const csv = [cabeceras.join(";"), ...filas].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cuentas-corrientes.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function CuentasCorrientesScreen() {
  const { showToast } = useToast();

  const [listado, setListado] = useState<CuentaCorriente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const [registrarOpen, setRegistrarOpen] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoCtaCte | "Todos">("Todos");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [recarga, setRecarga] = useState(0);

  /**
   * El filtrado y la paginación los hace el SERVIDOR, no el navegador.
   *
   * La versión anterior traía todo y filtraba con un `useMemo`. Con cuatro
   * proveedores de mentira daba igual; con el historial real de un año, mandarle
   * al navegador todas las cuentas para que muestre diez es tirar la conexión
   * del usuario a la basura. Y el filtro por estado necesita el saldo de cada
   * proveedor, que solo la base sabe.
   */
  useEffect(() => {
    let cancelado = false;

    // Debounce de la búsqueda: sin esto cada tecla dispara un request y las
    // respuestas pueden llegar desordenadas, dejando en pantalla el resultado
    // de una búsqueda vieja.
    //
    // El `setLoading` va DENTRO del timeout, no antes: sincrónico dentro del
    // efecto encadena renders (lo marca el lint de React), y además hacía
    // parpadear la tabla en cada tecla aunque el request todavía no hubiera
    // salido.
    const t = setTimeout(() => {
      if (cancelado) return;
      setLoading(true);

      const params = new URLSearchParams({
        pagina: String(page),
        porPagina: String(pageSize),
      });
      if (busqueda.trim()) params.set("busqueda", busqueda.trim());
      if (filtroEstado !== "Todos") params.set("estado", filtroEstado);

      apiGet<ListadoApi>(`/api/cuentas-corrientes?${params}`)
        .then((r) => {
          if (cancelado) return;
          setListado(r.items);
          setTotal(r.total);
          setError(false);
        })
        .catch(() => {
          if (!cancelado) setError(true);
        })
        .finally(() => {
          if (!cancelado) setLoading(false);
        });
    }, busqueda ? 300 : 0);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busqueda, filtroEstado, page, pageSize, recarga]);

  const cargarDetalle = useCallback(
    async (proveedorId: number) => {
      setDetalleLoading(true);
      try {
        const d = await apiGet<Detalle>(`/api/cuentas-corrientes/${proveedorId}`);
        setDetalle(d);
        setVista("detalle");
      } catch (e) {
        showToast("error", mensajeDeError(e));
      } finally {
        setDetalleLoading(false);
      }
    },
    [showToast],
  );

  /**
   * Registra el pago.
   *
   * Devuelve el mensaje de error en vez de lanzarlo: el modal lo muestra sin
   * cerrarse, así no se pierden las imputaciones ya cargadas.
   *
   * Cuando sale bien, la respuesta del POST **es el detalle completo con los
   * saldos ya recalculados por la vista**, así que alcanza con un `setState`.
   * Antes acá se restaban los montos a mano y se recalculaba el saldo con un
   * `reduce`: eso era una tercera definición de "saldo pendiente" que podía
   * discrepar de la base sin que nadie se enterara.
   */
  const handleRegistrar = async (pago: PagoCtaCteNuevo): Promise<string | null> => {
    if (!detalle) return "No hay una cuenta corriente abierta.";

    try {
      // El body va todo en camelCase, como el resto de la API. El modal habla
      // el shape del front (que mezcla `numero_comprobante` con `saldoPendiente`),
      // y la traducción se hace acá, que es un solo lugar.
      const actualizado = await apiSend<Detalle>("POST", "/api/pagos", {
        proveedorId: detalle.cuenta.id,
        numeroComprobante: pago.numero_comprobante,
        formaPagoId: pago.forma_pago_id,
        fecha: pago.fecha,
        monto: pago.monto,
        imputaciones: pago.imputaciones,
      });

      setDetalle(actualizado);
      setRegistrarOpen(false);
      // El listado también cambió: bajó el saldo del proveedor y puede haber
      // cambiado su estado.
      setRecarga((n) => n + 1);
      showToast("success", "Pago registrado correctamente");
      return null;
    } catch (e) {
      return mensajeDeError(e);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, total);

  const hayFiltros = busqueda.trim() !== "" || filtroEstado !== "Todos";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("Todos");
    setPage(1);
  };

  const comprobantesImputables = useMemo(
    // Las Notas de Crédito no se imputan: su importe ya descuenta del saldo del
    // proveedor. El backend además lo rechaza (HF013), esto es para no ofrecerlo.
    () => (detalle?.comprobantes ?? []).filter((c) => c.saldoPendiente > 0),
    [detalle],
  );

  return (
    <div className="flex min-h-screen bg-cream-50">
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-cream-50 px-4 py-6 sm:px-8 print:hidden">
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
                    Saldos y vencimientos de proveedores
                  </p>
                </div>
              </div>

              {vista === "lista" && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    exportarCSV(listado);
                    showToast("success", "Exportación completada: el listado se descargó en CSV");
                  }}
                  disabled={loading || error || listado.length === 0}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Exportar
                </Button>
              )}

              {vista === "detalle" && detalle && (
                <Button
                  variant="outline"
                  size="lg"
                  // Antes este botón mostraba "Exportación completada" SIN GENERAR
                  // NADA: un cartel de éxito sobre algo que no pasaba.
                  //
                  // Ahora imprime de verdad. `window.print()` deja que el
                  // navegador ofrezca "Guardar como PDF", que produce un PDF real
                  // sin sumar una librería de ~350 KB al bundle para replicar a
                  // mano un layout que el navegador ya sabe paginar.
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
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
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPage(1);
                    }}
                    disabled={error}
                    placeholder="Buscar por proveedor o CUIT..."
                    aria-label="Buscar por proveedor o CUIT"
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="filtro-estado" className="text-sm font-bold text-text-primary">
                    Estado
                  </label>
                  <select
                    id="filtro-estado"
                    value={filtroEstado}
                    onChange={(e) => {
                      setFiltroEstado(e.target.value as EstadoCtaCte | "Todos");
                      setPage(1);
                    }}
                    disabled={error}
                    className="h-11 cursor-pointer rounded-pill border border-border bg-surface px-4 text-base text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_ESTADO[e]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 print:max-w-none print:px-0 print:py-0">
          {vista === "lista" ? (
            error ? (
              <EstadoError onReintentar={() => setRecarga((n) => n + 1)} />
            ) : loading ? (
              <p role="status" className="py-16 text-center text-sm text-text-secondary">
                Cargando cuentas corrientes…
              </p>
            ) : listado.length === 0 ? (
              <EstadoVacio hayFiltros={hayFiltros} onLimpiar={limpiarFiltros} />
            ) : (
              <>
                <CtaCteListaGlobal
                  cuentas={listado}
                  onVerDetalle={(c) => void cargarDetalle(c.id)}
                  onRegistrar={(c) => {
                    // El modal necesita los comprobantes, y esos vienen con el
                    // detalle: se carga primero y después se abre.
                    void cargarDetalle(c.id).then(() => setRegistrarOpen(true));
                  }}
                />

                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  totalItems={total}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                  }}
                  itemLabel="cuentas corrientes"
                />
              </>
            )
          ) : detalleLoading ? (
            <p role="status" className="py-16 text-center text-sm text-text-secondary">
              Cargando la cuenta corriente…
            </p>
          ) : detalle ? (
            <>
              <div className="print:hidden">
                <CtaCorrienteDetalleGlobal
                  cuenta={detalle.cuenta}
                  comprobantes={detalle.comprobantes}
                  pagos={detalle.pagos}
                  onVolver={() => {
                    setVista("lista");
                    setDetalle(null);
                  }}
                  onRegistrar={() => setRegistrarOpen(true)}
                />
              </div>

              {/*
                El bloque de impresión va SIEMPRE MONTADO, no condicional.
                Renderizarlo recién al hacer clic abre una carrera: `window.print()`
                puede dispararse antes de que el navegador pinte, y sale una hoja
                en blanco. Con `hidden print:block` no se ve en pantalla y no hay
                nada que esperar.
              */}
              <CtaCteImprimible
                cuenta={detalle.cuenta}
                comprobantes={detalle.comprobantes}
                pagos={detalle.pagos}
              />
            </>
          ) : (
            <EstadoError onReintentar={() => setVista("lista")} />
          )}
        </div>
      </main>

      <RegistrarPagoCtaCteModal
        open={registrarOpen}
        entidad={
          detalle
            ? { id: detalle.cuenta.id, nombre: detalle.cuenta.nombre, tipo: "proveedor" }
            : null
        }
        comprobantes={comprobantesImputables}
        pagosExistentes={detalle?.pagos ?? []}
        onClose={() => setRegistrarOpen(false)}
        onConfirm={handleRegistrar}
      />
    </div>
  );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
      <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
        No se pudieron cargar las cuentas corrientes
      </h3>
      <Button variant="secondary" onClick={onReintentar}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </Button>
    </div>
  );
}

function EstadoVacio({
  hayFiltros,
  onLimpiar,
}: {
  hayFiltros: boolean;
  onLimpiar: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
      <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
        <Landmark className="h-7 w-7 text-brand-900" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
        {hayFiltros ? "Ningún proveedor coincide con los filtros" : "No hay cuentas corrientes"}
      </h3>
      {hayFiltros && (
        <Button variant="secondary" onClick={onLimpiar}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Limpiar filtros
        </Button>
      )}
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
