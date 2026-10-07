"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  RotateCcw,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { CajasTable, type CajaRow } from "@/components/cajas/CajasTable";
import {
  FiltrosCajas,
  FiltrosCajasChips,
  FILTROS_CAJAS_VACIOS,
  type FiltrosCajasValues,
} from "@/components/cajas/FiltrosCajas";
import { AbrirCajaModal } from "@/components/cajas/AbrirCajaModal";
import type { Caja, CajaApertura } from "@/data/cajas";
import { ApiError, apiGet, apiGetOpcional, apiSend, mensajeDeError } from "@/lib/api-client";

type Cajero = { id: number; nombre: string; apellido: string; sucursalId: number | null };

interface CajasContentProps {
  /**
   * El alta es UN CTA del header de Recepción (regla Pet Bliss: una sola acción
   * principal por viewport), así que el estado del modal es controlado desde la
   * página — igual que `nuevoTurnoOpen` en TurnosContent.
   */
  abrirCajaOpen: boolean;
  onCerrarAbrirCaja: () => void;
  /** Lo usa el estado vacío para pedir el alta sin pasar por el header. */
  onSolicitarAbrirCaja: () => void;
}

export function CajasContent({
  abrirCajaOpen,
  onCerrarAbrirCaja,
  onSolicitarAbrirCaja,
}: CajasContentProps) {
  const { showToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [aperturas, setAperturas] = useState<CajaApertura[]>([]);
  // Catálogos: cajas (con su sucursal) y cajeros, de la base.
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajeros, setCajeros] = useState<Cajero[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosCajasValues>({ ...FILTROS_CAJAS_VACIOS });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [bloqueoOpen, setBloqueoOpen] = useState(false);
  const [aperturaBloqueada, setAperturaBloqueada] = useState<CajaApertura | null>(null);
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let cancelado = false;
    // `loading` arranca en true y el retry lo setea desde el handler: el effect
    // solo resuelve el resultado (regla react-hooks/set-state-in-effect).
    const t = setTimeout(async () => {
      if (cancelado) return;
      try {
        // El listado manda (si falla, la pantalla no sirve); los catálogos son opcionales.
        const [lista, cajasCat, cajerosCat] = await Promise.all([
          apiGet<CajaApertura[]>("/api/cajas/aperturas"),
          apiGetOpcional<Caja[]>("/api/cajas", []),
          apiGetOpcional<Cajero[]>("/api/cajas/cajeros", []),
        ]);
        if (cancelado) return;
        setAperturas(lista);
        setCajas(cajasCat);
        setCajeros(cajerosCat);
        setError(false);
      } catch {
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [recargar]);

  const sucursales = useMemo(() => {
    const map = new Map<number, string>();
    cajas.forEach((c) => map.set(c.sucursalId, c.sucursal));
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [cajas]);

  const cajerosFiltro = useMemo(
    () => cajeros.map((c) => ({ id: c.id, nombre: c.nombre, apellido: c.apellido })),
    [cajeros]
  );

  const filas = useMemo<CajaRow[]>(() => {
    // `saldoActual` (inicial + ingresos − egresos) lo calcula la API sobre TODOS los movimientos.
    return aperturas.map((a) => ({ ...a, saldoActual: a.saldoActual ?? a.montoInicial }));
  }, [aperturas]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((a) => {
      const matchBusqueda = !q || `${a.cajero.nombre} ${a.cajero.apellido}`.toLowerCase().includes(q);
      const matchSucursal = !filtros.sucursal || String(a.sucursalId) === filtros.sucursal;
      const matchEstado = !filtros.estado || String(a.estado) === filtros.estado;
      const matchFechaDesde = !filtros.fechaDesde || a.fechaApertura.split("T")[0] >= filtros.fechaDesde;
      const matchFechaHasta = !filtros.fechaHasta || a.fechaApertura.split("T")[0] <= filtros.fechaHasta;
      const matchCajero = !filtros.cajero || String(a.cajeroId) === filtros.cajero;
      return matchBusqueda && matchSucursal && matchEstado && matchFechaDesde && matchFechaHasta && matchCajero;
    });
  }, [filas, busqueda, filtros]);

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((x, y) => {
      const d = new Date(x.fechaApertura).getTime() - new Date(y.fechaApertura).getTime();
      return filtros.orden === "antiguas" ? d : -d;
    });
  }, [filtradas, filtros.orden]);

  const totalPages = Math.max(1, Math.ceil(ordenadas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = ordenadas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = ordenadas.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, ordenadas.length);

  const hasActiveFilters =
    busqueda.trim() !== "" ||
    filtros.sucursal !== "" ||
    filtros.estado !== "" ||
    filtros.fechaDesde !== "" ||
    filtros.fechaHasta !== "" ||
    filtros.cajero !== "";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltros({ ...FILTROS_CAJAS_VACIOS });
    setPage(1);
  };

  const handleAbrirCaja = async (data: { cajaId: number; cajeroId: number; montoInicial: number }) => {
    // Una sola caja abierta por sucursal: se avisa antes de ir al servidor (el
    // back y la base lo vuelven a garantizar, HF045).
    const sucursalDeLaCaja = cajas.find((c) => c.id === data.cajaId)?.sucursalId;
    const cajaAbierta = aperturas.find((a) => a.sucursalId === sucursalDeLaCaja && a.estado);
    if (cajaAbierta) {
      setAperturaBloqueada(cajaAbierta);
      setBloqueoOpen(true);
      onCerrarAbrirCaja();
      return;
    }

    try {
      // El usuario que opera sale de la sesión; `cajeroId` es el responsable de la caja.
      const nueva = await apiSend<CajaApertura>("POST", "/api/cajas/aperturas", data);
      onCerrarAbrirCaja();
      showToast("success", "Caja abierta correctamente");
      router.push(`/cajas/${nueva.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.codigo === "CAJA_YA_ABIERTA") {
        // Otra persona la abrió mientras tanto: se refresca el listado.
        setRecargar((n) => n + 1);
      }
      showToast("error", mensajeDeError(e));
    }
  };

  const metricasCajas = useMemo(() => {
    const abiertas = filas.filter((f) => f.estado === true);
    const cerradas = filas.filter((f) => f.estado === false);
    const saldoTotalGaveta = abiertas.reduce((acc, f) => acc + f.saldoActual, 0);
    const totalIniciales = abiertas.reduce((acc, f) => acc + f.montoInicial, 0);

    return {
      totalAbiertas: abiertas.length,
      totalCerradas: cerradas.length,
      saldoTotalGaveta,
      totalIniciales,
      cajaAbiertaPrincipal: abiertas[0] ?? null,
    };
  }, [filas]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas métricas superiores estilo Pet Bliss */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill ${
            metricasCajas.totalAbiertas > 0 ? "bg-emerald-100 text-emerald-800" : "bg-cream-100 text-text-secondary"
          }`}>
            <Wallet className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Cajas Activas
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              {metricasCajas.totalAbiertas} {metricasCajas.totalAbiertas === 1 ? "abierta" : "abiertas"}
            </span>
            <span className="text-[11px] font-semibold text-text-secondary">
              {metricasCajas.totalAbiertas > 0
                ? "Turnos en curso en sucursal"
                : "Sin turnos activos"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-brand-900/10 text-brand-900">
            <Banknote className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Efectivo en Gavetas
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              ${metricasCajas.saldoTotalGaveta.toLocaleString("es-AR")}
            </span>
            <span className="text-[11px] font-semibold text-text-secondary">
              Saldo físico estimado
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-amber-100 text-amber-900">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Fondos de Apertura
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              ${metricasCajas.totalIniciales.toLocaleString("es-AR")}
            </span>
            <span className="text-[11px] font-semibold text-text-secondary">
              Monto inicial declarado
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-cream-100 text-text-secondary">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Jornadas Cerradas
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              {metricasCajas.totalCerradas}
            </span>
            <span className="text-[11px] font-semibold text-text-secondary">
              Arqueos finalizados
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
              placeholder="Buscar por cajero..."
              aria-label="Buscar por cajero"
              disabled={loading || error}
              className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>
          <FiltrosCajas
            filtros={filtros}
            onChange={(value) => {
              setFiltros(value);
              setPage(1);
            }}
            disabled={loading || error}
            sucursales={sucursales}
            cajeros={cajerosFiltro}
            hideChips
          />
        </div>
        <div className="flex flex-wrap items-center">
          <FiltrosCajasChips
            filtros={filtros}
            onChange={(value) => {
              setFiltros(value);
              setPage(1);
            }}
            sucursales={sucursales}
            cajeros={cajerosFiltro}
          />
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-md bg-status-danger/10">
            <AlertTriangle className="h-7 w-7 text-status-danger-strong" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
              No se pudo cargar el listado
            </h3>
            <p className="max-w-sm text-sm text-text-secondary">
              Hubo un problema al consultar las aperturas de caja. Revisá tu conexión e intentá de nuevo.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setError(false);
              setLoading(true);
              setRecargar((n) => n + 1);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <CajasTable
            aperturas={pageItems}
            loading={loading}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={limpiarFiltros}
            onAbrir={onSolicitarAbrirCaja}
            onVer={(a) => router.push(`/cajas/${a.id}`)}
          />
          {!loading && ordenadas.length > 0 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={ordenadas.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              disabled={loading || error}
            />
          )}
        </>
      )}

      <AbrirCajaModal
        open={abrirCajaOpen}
        onClose={onCerrarAbrirCaja}
        onConfirm={handleAbrirCaja}
        sucursales={cajas.map((c) => ({ id: c.sucursalId, nombre: c.sucursal, cajaId: c.id }))}
        cajeros={cajeros.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          apellido: c.apellido,
        }))}
        loading={loading}
      />

      <ConfirmarDialog
        open={bloqueoOpen}
        onClose={() => setBloqueoOpen(false)}
        onConfirm={() => {
          setBloqueoOpen(false);
          if (aperturaBloqueada) router.push(`/cajas/${aperturaBloqueada.id}`);
        }}
        title="Existe una apertura abierta en esa caja"
        description={
          <>
            <p>No se puede abrir una nueva caja mientras haya una apertura abierta en la misma caja física.</p>
            <p className="mt-2">¿Querés ir a la caja abierta?</p>
          </>
        }
        confirmLabel="Ir a la caja"
        cancelLabel="Cancelar"
        tone="neutral"
      />
    </div>
  );
}