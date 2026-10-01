"use client";

import {
  Banknote,
  CircleDollarSign,
  QrCode,
  RotateCcw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { obtenerVentas, subscribeVentas, VENTAS_INICIALES } from "@/data/ventas";
import { VentasTable } from "./VentasTable";

interface VentasContentProps {
  onNuevaVenta?: () => void;
}

export function VentasContent({
  onNuevaVenta,
}: VentasContentProps = {}) {
  const router = useRouter();
  const ventas = useSyncExternalStore(
    subscribeVentas,
    obtenerVentas,
    () => VENTAS_INICIALES,
  );
  const [loading] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroMedio, setFiltroMedio] = useState<string>("todos");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Métricas
  const metricas = useMemo(() => {
    const totalRecaudado = ventas.reduce((acc, v) => acc + v.total, 0);
    let totalEfectivo = 0;
    let totalTransferencia = 0;

    ventas.forEach((v) => {
      if (v.mediosPago && v.mediosPago.length > 0) {
        v.mediosPago.forEach((mp) => {
          if (mp.medio === "efectivo") totalEfectivo += mp.monto;
          if (mp.medio === "transferencia") totalTransferencia += mp.monto;
        });
      } else {
        if (v.medioPago === "efectivo") totalEfectivo += v.total;
        if (v.medioPago === "transferencia") totalTransferencia += v.total;
      }
    });

    return {
      totalRecaudado,
      totalEfectivo,
      totalTransferencia,
      cantidadVentas: ventas.length,
    };
  }, [ventas]);

  // Filtrado
  const filtradas = useMemo(() => {
    return ventas.filter((v) => {
      if (filtroMedio !== "todos") {
        if (filtroMedio === "mixto") {
          const esMix = v.medioPago === "mixto" || (v.mediosPago && v.mediosPago.length > 1);
          if (!esMix) return false;
        } else if (v.medioPago !== filtroMedio) {
          return false;
        }
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideCliente = v.clienteNombre.toLowerCase().includes(q);
        const coincideDoc = v.clienteDoc ? v.clienteDoc.toLowerCase().includes(q) : false;
        const coincideComp = v.numeroComprobante.toLowerCase().includes(q);
        const coincideItems = v.items.some((it) => it.nombre.toLowerCase().includes(q));
        if (!coincideCliente && !coincideDoc && !coincideComp && !coincideItems) return false;
      }

      return true;
    });
  }, [ventas, busqueda, filtroMedio]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtradas.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = filtradas.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filtradas.length);

  const hasActiveFilters = busqueda !== "" || filtroMedio !== "todos";

  const handleClearFilters = () => {
    setBusqueda("");
    setFiltroMedio("todos");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjetas de Métricas del Mostrador */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3.5 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10 text-brand-900">
            <CircleDollarSign className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Total Recaudado
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              ${metricas.totalRecaudado.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
            <Banknote className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              En Efectivo
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              ${metricas.totalEfectivo.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-sky-100 text-sky-800">
            <QrCode className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              En Transferencia / QR
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              ${metricas.totalTransferencia.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-md border border-border bg-surface p-4 shadow-card">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10 text-brand-900">
            <ShoppingBag className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Operaciones
            </span>
            <span className="font-mono text-xl font-extrabold text-brand-900">
              {metricas.cantidadVentas}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por comprobante, cliente, DNI o artículo..."
            className="h-11 w-full rounded-md border border-border bg-cream-50/50 pr-4 pl-9 text-sm text-text-primary placeholder:text-text-secondary focus:border-brand-900 focus:bg-surface focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            Medio:
          </span>
          {[
            { id: "todos", label: "Todos" },
            { id: "efectivo", label: "Efectivo" },
            { id: "transferencia", label: "Transferencia" },
            { id: "mixto", label: "Combinado" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setFiltroMedio(m.id);
                setPage(1);
              }}
              className={`cursor-pointer rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
                filtroMedio === m.id
                  ? "bg-brand-900 text-cream-50"
                  : "border border-border bg-surface text-text-secondary hover:bg-cream-100"
              }`}
            >
              {m.label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-2 flex h-9 cursor-pointer items-center gap-1 rounded-pill px-2.5 text-xs font-bold text-text-secondary hover:bg-cream-100 hover:text-brand-900"
              title="Limpiar filtros"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Ventas */}
      <VentasTable
        ventas={pageItems}
        loading={loading}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onNuevaVenta={onNuevaVenta ?? (() => router.push("/ventas/nueva"))}
      />

      {/* Paginación */}
      {!loading && pageItems.length > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filtradas.length}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="ventas"
        />
      )}
    </div>
  );
}
