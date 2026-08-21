"use client";

import { GitCompareArrows } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { articulosIniciales } from "@/data/articulos";
import type { Cotizacion, SolicitudCotizacion } from "@/data/cotizaciones";
import { codigoSolicitud, totalCotizacion } from "@/data/cotizaciones";
import { formatFecha, formatMoney } from "@/data/ordenes-compra";

interface CompararCotizacionesModalProps {
  solicitud: SolicitudCotizacion | null;
  onClose: () => void;
  onAdjudicar: (cotizacionId: number) => void;
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
  // Key por solicitud: el contenido remonta y preselecciona la más conveniente
  // en el initializer de useState (sin efectos).
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
  const [seleccionada, setSeleccionada] = useState(() => {
    const mejor = solicitud._cotizaciones.reduce<Cotizacion | null>(
      (mejor, actual) =>
        !mejor || totalCotizacion(actual, solicitud) < totalCotizacion(mejor, solicitud)
          ? actual
          : mejor,
      null,
    );
    return mejor ? String(mejor.id) : "";
  });

  const articulos = useMemo(
    () =>
      solicitud._articulos_solicitados.map((a) => ({
        id: a.articulo_id,
        cantidad: a.cantidad_estimada,
        nombre: nombreArticulo(a.articulo_id),
      })),
    [solicitud],
  );

  const adjudicada = seleccionada
    ? solicitud._cotizaciones.find((c) => c.id === Number(seleccionada))
    : undefined;
  const totalAdjudicada = adjudicada ? totalCotizacion(adjudicada, solicitud) : 0;

  const mejorPorArticulo = new Map<number, number>();
  articulos.forEach((art) => {
    let mejorPrecio = Number.POSITIVE_INFINITY;
    solicitud._cotizaciones.forEach((c) => {
      const detalle = c._detalles.find((d) => d.articulo_id === art.id);
      if (detalle && detalle.precio < mejorPrecio) mejorPrecio = detalle.precio;
    });
    if (Number.isFinite(mejorPrecio)) mejorPorArticulo.set(art.id, mejorPrecio);
  });

  return (
    <Modal
      open={!!solicitud}
      onClose={onClose}
      title="Comparar cotizaciones"
      icon={<GitCompareArrows className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-4xl"
      footer={
        <Button onClick={() => adjudicada && onAdjudicar(adjudicada.id)} disabled={!adjudicada}>
          Adjudicar y generar orden
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-base font-bold text-brand-900">
            {codigoSolicitud(solicitud.id)}
          </p>
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
        perder el artículo al hacer scroll horizontal con muchos proveedores. */}
        <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
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
              </tr>
            </thead>
            <tbody>
              {articulos.map((art) => (
                <tr key={art.id} className="border-b border-border/60 last:border-b-0">
                  <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-3 text-left font-bold text-text-primary">
                    {art.nombre}
                    <span className="block text-xs font-medium text-text-secondary">
                      ×{art.cantidad}
                    </span>
                  </th>
                  {solicitud._cotizaciones.map((c) => {
                    const detalle = c._detalles.find((d) => d.articulo_id === art.id);
                    const esMejor =
                      detalle !== undefined && mejorPorArticulo.get(art.id) === detalle.precio;
                    return (
                      <td key={c.id} className="px-4 py-3">
                        {detalle ? (
                          esMejor && solicitud._cotizaciones.length > 1 ? (
                            <span className="inline-flex items-center rounded-pill bg-accent-500/20 px-2.5 py-1 text-xs font-bold text-brand-900">
                              <span aria-hidden="true">★</span> Mejor · {formatMoney(detalle.precio)}
                            </span>
                          ) : (
                            formatMoney(detalle.precio)
                          )
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-cream-50">
                <th scope="row" className="sticky left-0 z-10 bg-cream-50 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                  Total estimado
                </th>
                {solicitud._cotizaciones.map((c) => {
                  const total = totalCotizacion(c, solicitud);
                  const esMejorTotal =
                    total === Math.min(...solicitud._cotizaciones.map((x) => totalCotizacion(x, solicitud)));
                  return (
                    <td key={c.id} className="px-4 py-3">
                      <span
                        className={`font-display text-base font-extrabold ${
                          esMejorTotal && solicitud._cotizaciones.length > 1
                            ? "text-brand-900"
                            : "text-text-primary"
                        }`}
                      >
                        {formatMoney(total)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-border bg-cream-50 p-4">
          <Select
            id="adjudicar-select"
            label="Adjudicar a"
            value={seleccionada}
            onChange={(e) => setSeleccionada(e.target.value)}
          >
            {solicitud._cotizaciones.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c._proveedor.razon_social} · {formatMoney(totalCotizacion(c, solicitud))}
              </option>
            ))}
          </Select>
          {adjudicada && (
            <p className="text-sm font-medium text-text-primary" role="status">
              Se generará una orden para{" "}
              <strong>{adjudicada._proveedor.razon_social}</strong> por{" "}
              <strong>{formatMoney(totalAdjudicada)}</strong>.
            </p>
          )}
          <p className="text-xs font-medium text-text-secondary">
            La orden se crea precargada en Órdenes de Compra; ahí se confirma y envía.
          </p>
        </div>
      </div>
    </Modal>
  );
}
