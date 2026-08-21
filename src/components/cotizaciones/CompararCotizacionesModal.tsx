"use client";

import { GitCompareArrows } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { articulosIniciales } from "@/data/articulos";
import type { SolicitudCotizacion } from "@/data/cotizaciones";
import { codigoSolicitud, totalCotizacion } from "@/data/cotizaciones";
import type { AsignacionArticulo } from "@/context/CotizacionesContext";
import { formatFecha, formatMoney } from "@/data/ordenes-compra";
import { EstadoSolicitudBadge } from "./EstadoSolicitudBadge";

interface CompararCotizacionesModalProps {
  solicitud: SolicitudCotizacion | null;
  onClose: () => void;
  /** Adjudicación por artículo: cada línea con su cotización elegida. */
  onAdjudicar: (asignaciones: AsignacionArticulo[]) => void;
}

// BACKEND: nombre del artículo resuelto por JOIN del detalle.
function nombreArticulo(articuloId: number): string {
  return (
    articulosIniciales.find((a) => a.id === articuloId)?.nombre ?? `Artículo #${articuloId}`
  );
}

export function CompararCotizacionesModal({
  solicitud,
  onClose,
  onAdjudicar,
}: CompararCotizacionesModalProps) {
  if (!solicitud) return null;
  // Key por solicitud: el contenido remonta y preselecciona el mejor precio
  // por fila en el initializer de useState (sin efectos).
  return (
    <CompararContenido
      key={solicitud.id}
      solicitud={solicitud}
      onClose={onClose}
      onAdjudicar={onAdjudicar}
    />
  );
}

function CompararContenido({
  solicitud,
  onClose,
  onAdjudicar,
}: CompararCotizacionesModalProps & { solicitud: SolicitudCotizacion }) {
  const articulos = useMemo(
    () =>
      solicitud._articulos_solicitados.map((a) => ({
        id: a.articulo_id,
        cantidad: a.cantidad_estimada,
        nombre: nombreArticulo(a.articulo_id),
      })),
    [solicitud],
  );

  // Mejor precio por artículo: preselección inicial de cada Select.
  const mejorPorArticulo = useMemo(() => {
    const mapa = new Map<number, { cotizacionId: number; precio: number }>();
    articulos.forEach((art) => {
      let mejor: { cotizacionId: number; precio: number } | null = null;
      solicitud._cotizaciones.forEach((c) => {
        const detalle = c._detalles.find((d) => d.articulo_id === art.id);
        if (detalle && (!mejor || detalle.precio < mejor.precio)) {
          mejor = { cotizacionId: c.id, precio: detalle.precio };
        }
      });
      if (mejor) mapa.set(art.id, mejor);
    });
    return mapa;
  }, [solicitud, articulos]);

  // articulo_id → cotizacion_id elegida.
  const [asignaciones, setAsignaciones] = useState<Record<number, number>>(() => {
    const inicial: Record<number, number> = {};
    mejorPorArticulo.forEach((m, articuloId) => {
      inicial[articuloId] = m.cotizacionId;
    });
    return inicial;
  });

  const cotizacionesConArticulo = (articuloId: number) =>
    solicitud._cotizaciones.filter((c) =>
      c._detalles.some((d) => d.articulo_id === articuloId),
    );

  const todosAsignados = articulos.every((a) => asignaciones[a.id] !== undefined);

  // Resumen agrupado por proveedor: cuántas órdenes se van a generar y por cuánto.
  const resumenProveedores = useMemo(() => {
    const grupos = new Map<number, { nombre: string; total: number; articulos: number }>();
    articulos.forEach((art) => {
      const cotizacionId = asignaciones[art.id];
      if (cotizacionId === undefined) return;
      const c = solicitud._cotizaciones.find((x) => x.id === cotizacionId);
      if (!c) return;
      const detalle = c._detalles.find((d) => d.articulo_id === art.id);
      const previo = grupos.get(c.id);
      grupos.set(c.id, {
        nombre: c._proveedor.razon_social,
        total: (previo?.total ?? 0) + (detalle ? detalle.precio * art.cantidad : 0),
        articulos: (previo?.articulos ?? 0) + 1,
      });
    });
    return [...grupos.values()];
  }, [asignaciones, articulos, solicitud]);

  const handleSubmit = () => {
    if (!todosAsignados) return;
    onAdjudicar(
      Object.entries(asignaciones).map(([articuloId, cotizacionId]) => ({
        articuloId: Number(articuloId),
        cotizacionId,
      })),
    );
  };

  // Adjudicada: la comparación queda en modo lectura (sin elegir proveedor
  // ni generar órdenes; eso ya ocurrió).
  const adjudicada = solicitud.estado === "Adjudicada";

  return (
    <Modal
      open={!!solicitud}
      onClose={onClose}
      title="Comparar cotizaciones"
      icon={<GitCompareArrows className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-4xl"
      footer={
        adjudicada ? (
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!todosAsignados}>
            Generar órdenes de compra
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="font-mono text-base font-bold text-brand-900">
              {codigoSolicitud(solicitud.id)}
            </p>
            <EstadoSolicitudBadge estado={solicitud.estado} />
          </div>
          <p className="text-sm font-medium text-text-secondary">
            {solicitud._cotizaciones.length} cotizaciones ·{" "}
            {formatFecha(solicitud.fecha)}
          </p>
        </div>

        {solicitud.notas && (
          <div className="rounded-sm border border-border/60 bg-cream-50 px-4 py-3" role="note">
            <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">Notas</p>
            <p className="text-sm font-medium text-text-primary">{solicitud.notas}</p>
          </div>
        )}

        {/* Matriz artículos × proveedores. Primera columna sticky para no
        perder el artículo al hacer scroll horizontal con muchos proveedores.
        Por fila: menor precio en verde, mayor en rojo, intermedios neutros;
        si todos los precios empatan no se colorea nada. Leyenda bajo la
        tabla para no depender solo del color. */}
        <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-card">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Comparación de precios por artículo y proveedor para {codigoSolicitud(solicitud.id)}
            </caption>
            <thead>
              <tr className="border-b border-border bg-cream-50">
                <th scope="col" className="sticky left-0 z-10 bg-cream-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                  Artículo
                </th>
                {solicitud._cotizaciones.map((c) => (
                  <th key={c.id} scope="col" className="px-4 py-3 align-bottom">
                    <span className="block text-xs font-extrabold uppercase tracking-wide text-brand-900">
                      {c._proveedor.razon_social}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium normal-case text-text-secondary">
                      {c.condicion_pago}
                    </span>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                  Comprar a
                </th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((art) => {
                const opciones = cotizacionesConArticulo(art.id);
                const precios = solicitud._cotizaciones
                  .map((c) => c._detalles.find((d) => d.articulo_id === art.id)?.precio)
                  .filter((p): p is number => typeof p === "number");
                const minimo = Math.min(...precios);
                const maximo = Math.max(...precios);
                return (
                  <tr key={art.id} className="border-b border-border/60 last:border-b-0">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-3 text-left font-bold text-text-primary">
                      {art.nombre}
                      <span className="block text-xs font-medium text-text-secondary">
                        ×{art.cantidad}
                      </span>
                    </th>
                    {solicitud._cotizaciones.map((c) => {
                      const detalle = c._detalles.find((d) => d.articulo_id === art.id);
                      const clase =
                        detalle !== undefined && precios.length > 1 && minimo !== maximo
                          ? detalle.precio === minimo
                            ? "font-bold text-status-success-strong"
                            : detalle.precio === maximo
                              ? "font-semibold text-status-danger-strong"
                              : ""
                          : "";
                      return (
                        <td key={c.id} className="px-4 py-3">
                          {detalle ? (
                            <span className={clase}>{formatMoney(detalle.precio)}</span>
                          ) : (
                            <span className="text-text-secondary">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <select
                        value={asignaciones[art.id] ?? ""}
                        onChange={(e) =>
                          setAsignaciones((prev) => ({ ...prev, [art.id]: Number(e.target.value) }))
                        }
                        aria-label={`Proveedor para ${art.nombre}`}
                        className="h-10 w-full min-w-36 cursor-pointer rounded-sm border border-border bg-surface px-2 text-sm font-bold text-text-primary transition-colors duration-fast ease-out focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                      >
                        {opciones.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c._proveedor.razon_social}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-border bg-cream-50">
                <th scope="row" className="sticky left-0 z-10 bg-cream-50 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                  Total estimado
                </th>
                {(() => {
                  const totales = solicitud._cotizaciones.map((x) => totalCotizacion(x, solicitud));
                  const minimo = Math.min(...totales);
                  const maximo = Math.max(...totales);
                  return solicitud._cotizaciones.map((c) => {
                    const total = totalCotizacion(c, solicitud);
                    const clase =
                      totales.length > 1 && minimo !== maximo
                        ? total === minimo
                          ? "text-status-success-strong"
                          : total === maximo
                            ? "text-status-danger-strong"
                            : ""
                        : "";
                    return (
                      <td key={c.id} className="px-4 py-3">
                        <span className={`font-display text-base font-extrabold ${clase}`}>
                          {formatMoney(total)}
                        </span>
                      </td>
                    );
                  });
                })()}
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs font-medium text-text-secondary">
          <span className="font-bold text-status-success-strong">Verde</span> = precio más bajo ·{" "}
          <span className="font-semibold text-status-danger-strong">rojo</span> = precio más alto ·
          sin color = intermedio.
        </p>

        <div className="flex flex-col gap-2 rounded-md border border-border bg-cream-50 p-4">
          <p className="text-sm font-medium text-text-primary" role="status">
            {resumenProveedores.length > 0 ? (
              <>
                Se generarán{" "}
                <strong>
                  {resumenProveedores.length}{" "}
                  {resumenProveedores.length === 1 ? "orden de compra" : "órdenes de compra"}
                </strong>{" "}
                en estado Pendiente:{" "}
                {resumenProveedores.map((g, i) => (
                  <span key={g.nombre}>
                    {i > 0 && "; "}
                    <strong>{g.nombre}</strong> ({formatMoney(g.total)} · {g.articulos}{" "}
                    {g.articulos === 1 ? "artículo" : "artículos"})
                  </span>
                ))}
                .
              </>
            ) : (
              "Elegí un proveedor por artículo para generar las órdenes."
            )}
          </p>
          <p className="text-xs font-medium text-text-secondary">
            Cada proveedor recibe su propia orden con los artículos asignados; quedan Pendientes
            hasta confirmarlas desde Órdenes de Compra.
          </p>
        </div>
      </div>
    </Modal>
  );
}
