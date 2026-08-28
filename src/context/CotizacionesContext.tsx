"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { OrdenCompra } from "@/data/ordenes-compra";
import type { SolicitudCotizacion } from "@/data/cotizaciones";
import { apiGet, apiSend, mensajeDeError } from "@/lib/api-client";

export interface NuevaSolicitudInput {
  lineas: { articuloId: string; cantidad: string; nota: string }[];
  notas: string;
}

/** Artículo → cotización elegida en la comparación (adjudicación por artículo). */
export interface AsignacionArticulo {
  articuloId: number;
  cotizacionId: number;
}

export interface NuevaCotizacionInput {
  proveedorId: string;
  /** Id del catálogo `forma_pago`, no el nombre. */
  formaPagoId: string;
  fechaRecepcion: string;
  /** Precio por artículo solicitado (clave = articulo_id). */
  precios: Record<string, number>;
}

type Resultado = { error?: string };

interface CotizacionesContextValue {
  solicitudes: SolicitudCotizacion[];
  loading: boolean;
  error: boolean;
  recargar: () => void;
  crearSolicitud: (input: NuevaSolicitudInput) => Promise<Resultado>;
  registrarCotizacion: (
    solicitudId: number,
    input: NuevaCotizacionInput,
  ) => Promise<Resultado>;
  /**
   * Adjudica y devuelve las órdenes que el BACK generó (una por proveedor
   * ganador). El front ya no las arma: llegan creadas y solo se agregan a la
   * lista.
   */
  adjudicarPorArticulo: (
    solicitudId: number,
    asignaciones: AsignacionArticulo[],
    depositoEntregaId?: number,
  ) => Promise<Resultado & { ordenes?: OrdenCompra[] }>;
  cancelarSolicitud: (solicitudId: number) => Promise<Resultado>;
}

const CotizacionesContext = createContext<CotizacionesContextValue | null>(null);

/**
 * HU-COMP-02 — estado de Solicitudes de Cotización contra la API.
 *
 * Todas las operaciones devuelven la solicitud ya actualizada, con sus
 * cotizaciones y detalles resueltos por JOIN. El front no reconstruye nada:
 * reemplaza la solicitud en la lista con lo que respondió el server.
 *
 * Eso importa especialmente en `adjudicar`: el back crea las órdenes de compra
 * en la misma transacción, así que si algo falla no queda ni la adjudicación ni
 * media orden. Antes el front marcaba el estado y armaba las órdenes por su
 * cuenta, que son dos cosas que podían quedar desincronizadas.
 */
export function CotizacionesProvider({ children }: { children: ReactNode }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudCotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    apiGet<SolicitudCotizacion[]>("/api/solicitudes-cotizacion")
      .then((lista) => {
        if (!cancelado) setSolicitudes(lista);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [recarga]);

  const recargar = useCallback(() => {
    setError(false);
    setLoading(true);
    setRecarga((n) => n + 1);
  }, []);

  /** Reemplaza una solicitud en la lista por la versión que devolvió el server. */
  const reemplazar = useCallback((actualizada: SolicitudCotizacion) => {
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === actualizada.id ? actualizada : s)),
    );
  }, []);

  const crearSolicitud = useCallback(
    async (input: NuevaSolicitudInput): Promise<Resultado> => {
      try {
        const creada = await apiSend<SolicitudCotizacion>(
          "POST",
          "/api/solicitudes-cotizacion",
          {
            notas: input.notas.trim() || undefined,
            lineas: input.lineas.map((l) => ({
              articuloId: Number(l.articuloId),
              cantidadEstimada: Number(l.cantidad),
              nota: l.nota.trim() || undefined,
            })),
          },
        );
        setSolicitudes((prev) => [creada, ...prev]);
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [],
  );

  const registrarCotizacion = useCallback(
    async (solicitudId: number, input: NuevaCotizacionInput): Promise<Resultado> => {
      try {
        const actualizada = await apiSend<SolicitudCotizacion>(
          "POST",
          `/api/solicitudes-cotizacion/${solicitudId}/cotizaciones`,
          {
            proveedorId: Number(input.proveedorId),
            formaPagoId: Number(input.formaPagoId),
            fechaRecepcion: input.fechaRecepcion || undefined,
            // Array y no objeto: así el error de validación puede señalar QUÉ
            // línea falló (`detalles.2.precio`) y marcar ese input en rojo.
            detalles: Object.entries(input.precios).map(([articuloId, precio]) => ({
              articuloId: Number(articuloId),
              precio,
            })),
          },
        );
        reemplazar(actualizada);
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [reemplazar],
  );

  const adjudicarPorArticulo = useCallback(
    async (
      solicitudId: number,
      asignaciones: AsignacionArticulo[],
      depositoEntregaId?: number,
    ) => {
      try {
        const { solicitud, ordenes } = await apiSend<{
          solicitud: SolicitudCotizacion;
          ordenes: OrdenCompra[];
        }>("PATCH", `/api/solicitudes-cotizacion/${solicitudId}/adjudicar`, {
          asignaciones,
          depositoEntregaId,
        });
        reemplazar(solicitud);
        return { ordenes };
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [reemplazar],
  );

  const cancelarSolicitud = useCallback(
    async (solicitudId: number): Promise<Resultado> => {
      try {
        const actualizada = await apiSend<SolicitudCotizacion>(
          "PATCH",
          `/api/solicitudes-cotizacion/${solicitudId}/cancelar`,
        );
        reemplazar(actualizada);
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [reemplazar],
  );

  const value = useMemo(
    () => ({
      solicitudes,
      loading,
      error,
      recargar,
      crearSolicitud,
      registrarCotizacion,
      adjudicarPorArticulo,
      cancelarSolicitud,
    }),
    [
      solicitudes,
      loading,
      error,
      recargar,
      crearSolicitud,
      registrarCotizacion,
      adjudicarPorArticulo,
      cancelarSolicitud,
    ],
  );

  return <CotizacionesContext.Provider value={value}>{children}</CotizacionesContext.Provider>;
}

export function useCotizaciones(): CotizacionesContextValue {
  const ctx = useContext(CotizacionesContext);
  if (!ctx) {
    throw new Error("useCotizaciones debe usarse dentro de CotizacionesProvider");
  }
  return ctx;
}
