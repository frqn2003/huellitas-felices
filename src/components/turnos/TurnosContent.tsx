"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "@/data/clientes";
import type { Mascota } from "@/data/mascotas";
import {
  normalizarBusqueda,
  SIMULAR_ERROR,
  SIMULAR_VACIO,
  type EstadoTurno,
  type Practica,
  type Profesional,
  type Turno,
  type TurnoDraft,
} from "@/data/turnos";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import {
  FiltrosTurnos,
  FILTROS_TURNOS_VACIOS,
  type FiltrosTurnosValues,
} from "./FiltrosTurnos";
import { NuevoTurnoModal } from "./NuevoTurnoModal";
import { TurnoDetalleModal } from "./TurnoDetalleModal";
import { construirFilaTurno } from "./turnoRow";
import { TurnosTable, type TurnoRow } from "./TurnosTable";

interface TurnosContentProps {
  /** Directorio de clientes (los modales y los JOIN de display lo resuelven). */
  clientes: Cliente[];
  /** Fichas de mascotas (Paso 2 del wizard + JOIN de display). */
  mascotas: Mascota[];
  /** Turnos viven en la página (persisten al cambiar de tab, patrón de clientes/mascotas). */
  turnos: Turno[];
  /** Catálogo de veterinarios con sus franjas — GET /api/profesionales. */
  profesionales: Profesional[];
  /** Catálogo de prácticas — GET /api/practicas. */
  practicas: Practica[];
  /** Catálogo `estado_turno` — GET /api/estados-turno. */
  estados: EstadoTurno[];
  /**
   * Manda el turno al backend y devuelve el turno creado, o un mensaje de error.
   *
   * La página es la que hace el POST: este componente no conoce la API.
   */
  onCrearTurno: (draft: TurnoDraft) => Promise<{ turno?: Turno; error?: string }>;
  /** Apertura del wizard controlada por la página (el CTA del header dispara). */
  nuevoTurnoOpen: boolean;
  /** Remount key del wizard: la página la incrementa en cada apertura para
      arrancar siempre en el Paso 1 (técnica remount-key de MascotaFormModal). */
  nuevoTurnoSession: number;
  onSolicitarNuevoTurno: () => void;
  onCerrarNuevoTurno: () => void;
}

export function TurnosContent({
  clientes,
  mascotas,
  turnos,
  profesionales,
  practicas,
  estados,
  onCrearTurno,
  nuevoTurnoOpen,
  nuevoTurnoSession,
  onSolicitarNuevoTurno,
  onCerrarNuevoTurno,
}: TurnosContentProps) {
    const { showToast } = useToast();
    const router = useRouter();

    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(SIMULAR_ERROR);

    const [filtros, setFiltros] = useState<FiltrosTurnosValues>(FILTROS_TURNOS_VACIOS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [detalle, setDetalle] = useState<TurnoRow | null>(null);

    const clientePorId = useMemo(
      () => Object.fromEntries(clientes.map((c) => [c.id, c])) as Record<number, Cliente>,
      [clientes],
    );
    const mascotaPorId = useMemo(
      () => Object.fromEntries(mascotas.map((m) => [m.id, m])) as Record<number, Mascota>,
      [mascotas],
    );

    function aRow(t: Turno): TurnoRow {
      return construirFilaTurno(t, clientePorId, mascotaPorId);
    }

    // Buscador: cliente (nombre/DNI), profesional (nombre) y práctica (nombre),
    // sin distinguir mayúsculas ni acentos. Cálculo directo
    // por render (datos de demo; sin memo, aRow cierra sobre los mapas y
    // cambiarían en cada render).
    const base = SIMULAR_VACIO ? [] : turnos.map(aRow);
    const query = normalizarBusqueda(filtros.busqueda.trim());
    const rows = base.filter((r) => {
      if (filtros.estadoId !== "" && r.estadoId !== Number(filtros.estadoId)) return false;
      if (filtros.desde && r.fecha < filtros.desde) return false;
      if (filtros.hasta && r.fecha > filtros.hasta) return false;
      if (query) {
        const en = (s: string) => normalizarBusqueda(s).includes(query);
        return (
          en(r.clienteNombre) ||
          en(r.dni) ||
          en(r.profesionalNombre) ||
          en(r.practicaNombre)
        );
      }
      return true;
    });

    const hasActiveFilters =
      filtros.busqueda !== "" ||
      filtros.estadoId !== "" ||
      filtros.desde !== "" ||
      filtros.hasta !== "";

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageItems = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
    const pageStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const pageEnd = Math.min(safePage * pageSize, rows.length);

    const handleLimpiarFiltros = () => {
      setFiltros(FILTROS_TURNOS_VACIOS);
      setPage(1);
    };

    const handleReintentar = () => {
      setError(false);
      setCargando(true);
      // BACKEND: acá iría el fetch real (recargar del context).
      window.setTimeout(() => setCargando(false), 400);
    };

    /**
     * Criterio 3: "muestra confirmación visual del turno creado, con resumen".
     *
     * El detalle se abre con el turno que devolvió el SERVIDOR, no con el draft:
     * trae el id real, la sucursal que derivó el trigger y el estado inicial.
     * Antes el id se inventaba acá con `Math.max(...) + 1` y el resumen mostraba
     * datos que no eran los que habían quedado guardados.
     */
    const handleCreado = async (draft: TurnoDraft): Promise<string | null> => {
      const { turno, error } = await onCrearTurno(draft);
      if (error || !turno) return error ?? "No se pudo crear el turno.";

      onCerrarNuevoTurno();
      setDetalle(aRow(turno));
      showToast("success", "Turno creado correctamente");
      setPage(1);
      return null;
    };

    return (
      <div className="flex flex-col gap-6">
        <FiltrosTurnos
          filtros={filtros}
          estados={estados}
          onChange={(f) => {
            setFiltros(f);
            setPage(1);
          }}
        />

        {error ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-md bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
                No se pudieron cargar los turnos
              </h3>
              <p className="max-w-sm text-sm text-text-secondary">
                Hubo un problema al consultar la agenda. Revisá tu conexión e intentá de nuevo.
              </p>
            </div>
            <Button variant="secondary" onClick={handleReintentar}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <TurnosTable
              turnos={pageItems}
              loading={cargando}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleLimpiarFiltros}
              onNuevo={onSolicitarNuevoTurno}
              onVer={setDetalle}
            />

            {!cargando && pageItems.length > 0 && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={rows.length}
                pageStart={pageStart}
                pageEnd={pageEnd}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="turnos"
              />
            )}
          </>
        )}

        <NuevoTurnoModal
          key={nuevoTurnoSession}
          open={nuevoTurnoOpen}
          onClose={onCerrarNuevoTurno}
          clientes={clientes}
          mascotas={mascotas}
          turnos={turnos}
          profesionales={profesionales}
          practicas={practicas}
          onCreado={handleCreado}
          onRegistrarMascota={() => {
            onCerrarNuevoTurno();
            router.replace("/clientes?tab=mascotas");
          }}
        />

        <TurnoDetalleModal
          open={detalle !== null}
          turno={detalle}
          onClose={() => setDetalle(null)}
        />
      </div>
    );
}